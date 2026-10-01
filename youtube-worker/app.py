from __future__ import annotations

import asyncio
import ipaddress
import os
import re
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

app = FastAPI(title="Vidzora YouTube Worker", version="1.0.0")

BASE_DIR = Path(os.getenv("VIDZORA_DATA_DIR", "/data/vidzora"))
JOB_TTL = int(os.getenv("JOB_TTL_SECONDS", "1800"))
MAX_CONCURRENT = max(1, int(os.getenv("YTDLP_CONCURRENCY", "1")))
REQUEST_TIMEOUT = max(60, int(os.getenv("YTDLP_JOB_TIMEOUT", "900")))
WORKER_SECRET = os.getenv("YOUTUBE_WORKER_SECRET", "")

sem = asyncio.Semaphore(MAX_CONCURRENT)
YOUTUBE_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


class DownloadRequest(BaseModel):
    url: str = Field(min_length=1, max_length=4096)


def validate_youtube_url(raw: str) -> tuple[str, str]:
    try:
        u = urlparse(raw.strip())
    except Exception as exc:
        raise HTTPException(400, "Invalid URL") from exc

    if u.scheme.lower() != "https":
        raise HTTPException(400, "HTTPS is required")

    host = (u.hostname or "").lower().rstrip(".")
    allowed = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"}
    if host not in allowed:
        raise HTTPException(400, "Only public YouTube URLs are accepted")

    if host == "youtu.be":
        video_id = u.path.strip("/").split("/")[0]
    else:
        match = re.match(r"^/shorts/([A-Za-z0-9_-]{11})(?:/|$)", u.path)
        video_id = match.group(1) if match else None
        if not video_id:
            from urllib.parse import parse_qs
            video_id = parse_qs(u.query).get("v", [None])[0]

    if not video_id or not YOUTUBE_ID.fullmatch(video_id):
        raise HTTPException(400, "Invalid YouTube video ID")

    return video_id, f"https://www.youtube.com/watch?v={video_id}"


def ensure_safe_data_dir() -> None:
    BASE_DIR.mkdir(parents=True, exist_ok=True)


def cleanup_old_jobs() -> None:
    ensure_safe_data_dir()
    cutoff = time.time() - JOB_TTL
    for child in BASE_DIR.iterdir():
        try:
            if child.is_dir() and child.stat().st_mtime < cutoff:
                shutil.rmtree(child, ignore_errors=True)
        except OSError:
            pass


def auth_ok(authorization: str | None) -> bool:
    if not WORKER_SECRET:
        return True
    return authorization == f"Bearer {WORKER_SECRET}"


def invalidate_bgutil() -> None:
    import urllib.request

    request = urllib.request.Request(
        "http://127.0.0.1:4416/invalidate_caches",
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            if response.status not in (200, 204):
                raise RuntimeError(f"bgutil returned {response.status}")
    except Exception:
        # Cache invalidation is recovery-only. A failed invalidation must not
        # turn a useful yt-dlp error into a different failure.
        pass


def run_ytdlp(video_id: str, url: str, job_dir: Path) -> Path:
    output = job_dir / f"{video_id}.%(ext)s"
    args = [
        "yt-dlp",
        "--no-warnings",
        "--no-call-home",
        "--no-check-certificates",  # removed below; kept out of production args
    ]
    args = [a for a in args if a != "--no-check-certificates"]
    args += [
        "--js-runtimes", "deno:/usr/local/bin/deno",
        "--extractor-args", "youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416",
        "--extractor-args", "youtube:player_client=mweb",
        "-f", "bv*[vcodec^=avc1][ext=mp4]+ba[acodec^=mp4a]/bv*[vcodec^=avc1]+ba/bv*+ba/b",
        "--merge-output-format", "mp4",
        "--remux-video", "mp4",
        "--postprocessor-args", "Merger+ffmpeg_o:-movflags +faststart",
        "--socket-timeout", "15",
        "--retries", "3",
        "--fragment-retries", "5",
        "--file-access-retries", "3",
        "--paths", f"temp:{job_dir}",
        "-o", str(output),
        "--no-playlist",
        url,
    ]

    proc = subprocess.run(
        args,
        cwd=str(job_dir),
        capture_output=True,
        text=True,
        timeout=REQUEST_TIMEOUT,
        check=False,
    )

    if proc.returncode == 0:
        candidates = sorted(job_dir.glob(f"{video_id}.*"))
        mp4 = next((p for p in candidates if p.suffix.lower() == ".mp4"), None)
        if mp4 and mp4.is_file() and mp4.stat().st_size > 0:
            return mp4

    stderr = (proc.stderr or "")[-12000:]
    raise RuntimeError(stderr or f"yt-dlp exited with {proc.returncode}")


async def process(video_id: str, url: str) -> tuple[str, Path]:
    ensure_safe_data_dir()
    cleanup_old_jobs()
    job_dir = Path(tempfile.mkdtemp(prefix="job-", dir=BASE_DIR))
    try:
        async with sem:
            try:
                result = await asyncio.to_thread(run_ytdlp, video_id, url, job_dir)
            except Exception as first_error:
                message = str(first_error).lower()
                if "403" not in message and "forbidden" not in message:
                    raise
                await asyncio.to_thread(invalidate_bgutil)
                result = await asyncio.to_thread(run_ytdlp, video_id, url, job_dir)

        return job_dir.name, result
    except Exception:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise


@app.get("/health")
async def health() -> dict:
    bgutil = False
    try:
        import urllib.request
        with urllib.request.urlopen("http://127.0.0.1:4416/ping", timeout=2) as response:
            bgutil = response.status == 200
    except Exception:
        pass
    return {"status": "healthy" if bgutil else "degraded", "bgutil": bgutil}


@app.post("/v1/youtube")
async def download(request: DownloadRequest, authorization: str | None = Header(default=None)):
    if not auth_ok(authorization):
        raise HTTPException(401, "Unauthorized")

    video_id, url = validate_youtube_url(request.url)
    try:
        job_id, file_path = await process(video_id, url)
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(504, "YouTube processing timed out") from exc
    except Exception as exc:
        raise HTTPException(502, "YouTube extraction failed") from exc

    public_base = os.getenv("YOUTUBE_WORKER_PUBLIC_URL", "").rstrip("/")
    if not public_base:
        raise HTTPException(500, "Worker public URL is not configured")

    return {
        "success": True,
        "videoId": video_id,
        "jobId": job_id,
        "title": video_id,
        "formats": [{
            "label": "Video • MP4 • H.264",
            "url": f"{public_base}/v1/file/{job_id}/{file_path.name}",
        }],
    }


@app.get("/v1/file/{job_id}/{filename}")
async def file(job_id: str, filename: str):
    if not re.fullmatch(r"job-[A-Za-z0-9_-]+", job_id):
        raise HTTPException(404, "Not found")
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}\.mp4", filename):
        raise HTTPException(404, "Not found")

    target = (BASE_DIR / job_id / filename).resolve()
    root = (BASE_DIR / job_id).resolve()
    if root != target.parent or not target.is_file():
        raise HTTPException(404, "Not found")

    return FileResponse(target, media_type="video/mp4", filename=filename)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "3000")))
