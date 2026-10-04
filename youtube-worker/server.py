import asyncio
import os
import re
import secrets
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Vidzora YouTube Extractor", version="1.0.0")

WORKER_SECRET = os.getenv("YOUTUBE_WORKER_SECRET", "").strip()
MAX_CONCURRENCY = max(1, int(os.getenv("YOUTUBE_WORKER_CONCURRENCY", "2")))
REQUEST_TIMEOUT = max(15, int(os.getenv("YOUTUBE_WORKER_TIMEOUT", "45")))
sem = asyncio.Semaphore(MAX_CONCURRENCY)


class ExtractRequest(BaseModel):
    url: str


def valid_youtube_url(value: str) -> bool:
    try:
        u = urlparse(value.strip())
        if u.scheme not in ("http", "https"):
            return False
        host = (u.hostname or "").lower()
        return host in {
            "youtube.com",
            "www.youtube.com",
            "m.youtube.com",
            "music.youtube.com",
            "youtu.be",
        }
    except Exception:
        return False


def run_ytdlp(url: str) -> dict:
    with tempfile.TemporaryDirectory(prefix="vidzora-ytdlp-") as tmp:
        command = [
            "yt-dlp",
            "--dump-single-json",
            "--no-playlist",
            "--no-warnings",
            "--skip-download",
            "--extractor-args",
            "youtube:player_client=mweb,web_safari,web_embedded,tv",
            "--extractor-args",
            "youtubepot-wpc:browser_path=/usr/bin/chromium",
            "--js-runtimes",
            "deno",
            "--remote-components",
            "ejs:github",
            "--format",
            "best[ext=mp4][vcodec!=none][acodec!=none]/best[vcodec!=none][acodec!=none]/best",
            "--",
            url,
        ]

        env = os.environ.copy()
        env["HOME"] = tmp
        env["PATH"] = "/usr/local/bin:/usr/bin:/bin:" + env.get("PATH", "")

        proc = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=REQUEST_TIMEOUT,
            cwd=tmp,
            env=env,
        )
        if proc.returncode != 0:
            detail = (proc.stderr or proc.stdout or "yt-dlp failed").strip()
            detail = re.sub(r"(?i)(authorization|cookie|token)\\s*[:=]\\s*\\S+", r"\\1=[redacted]", detail)
            raise RuntimeError(detail[-1200:])

        import json
        return json.loads(proc.stdout)


def build_formats(info: dict) -> list[dict]:
    formats = []
    seen = set()

    for item in info.get("formats") or []:
        url = item.get("url")
        if not isinstance(url, str) or not url.startswith("http"):
            continue

        # Keep browser-usable direct media URLs. Avoid manifests and storyboards.
        lower = url.lower()
        if ".m3u8" in lower or ".mpd" in lower:
            continue

        height = item.get("height") or 0
        vcodec = item.get("vcodec")
        acodec = item.get("acodec")
        ext = item.get("ext") or "mp4"

        if vcodec != "none" and acodec != "none":
            label = f"Video • {height}p" if height else "Video • Best"
        elif vcodec != "none":
            continue  # Do not expose video-only streams; browser download must have audio.
        elif acodec != "none":
            label = "Audio • Original"
        else:
            continue

        key = url
        if key in seen:
            continue
        seen.add(key)
        formats.append({
            "label": label,
            "url": url,
            "height": height,
            "ext": ext,
            "hasAudio": acodec != "none",
        })

    # Prefer common progressive MP4 results and highest resolution first.
    video = [x for x in formats if x["label"].startswith("Video")]
    video.sort(key=lambda x: (x.get("height", 0), x["ext"] == "mp4"), reverse=True)
    audio = [x for x in formats if x["label"].startswith("Audio")]
    audio.sort(key=lambda x: x["ext"] == "m4a", reverse=True)

    result = video[:8] + audio[:2]
    if not result:
        raise RuntimeError("No browser-downloadable YouTube formats returned.")
    return [{k: v for k, v in item.items() if k in {"label", "url"}} for item in result]


@app.get("/health")
async def health():
    return {
        "ok": True,
        "service": "vidzora-youtube-worker",
        "extractor": "yt-dlp",
        "poTokenProvider": "wpc",
    }


@app.post("/v1/youtube")
async def youtube(req: ExtractRequest, authorization: str | None = Header(default=None)):
    if WORKER_SECRET:
        expected = "Bearer " + WORKER_SECRET
        if not authorization or not secrets.compare_digest(authorization, expected):
            raise HTTPException(status_code=401, detail="Unauthorized")

    if not valid_youtube_url(req.url):
        raise HTTPException(status_code=400, detail="Only public YouTube URLs are accepted.")

    async with sem:
        try:
            info = await asyncio.to_thread(run_ytdlp, req.url.strip())
            return {
                "success": True,
                "title": info.get("title") or "YouTube video",
                "thumbnail": info.get("thumbnail"),
                "formats": build_formats(info),
            }
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="YouTube extraction timed out.")
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)[-1200:])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
