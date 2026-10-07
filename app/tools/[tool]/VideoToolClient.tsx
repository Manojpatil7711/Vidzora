/* Video tools are deliberately isolated from the existing image/PDF tool client.
   This keeps the current tools unchanged and makes video-tool failures unable to
   take down the existing tool surface. */
"use client";

import { useEffect, useRef, useState } from "react";
import ToolsAd from "../tools-ad";

type VideoTool =
  | "video-frame-extractor"
  | "video-thumbnail-extractor"
  | "video-metadata"
  | "video-audio-extractor"
  | "video-converter-compressor";

const config: Record<VideoTool, {
  title: string;
  description: string;
  accept: string;
}> = {
  "video-frame-extractor": {
    title: "Video Frame Extractor",
    description: "Capture a precise frame from a video and download it as JPG or PNG.",
    accept: "video/*",
  },
  "video-thumbnail-extractor": {
    title: "Video Thumbnail Extractor",
    description: "Create a clean thumbnail from any point in a video.",
    accept: "video/*",
  },
  "video-metadata": {
    title: "Video Metadata Viewer",
    description: "Inspect duration, dimensions, frame rate when available, and file details locally.",
    accept: "video/*",
  },
  "video-audio-extractor": {
    title: "Video Audio Extractor",
    description: "Extract playable audio from a video in your browser without uploading the source.",
    accept: "video/*",
  },
  "video-converter-compressor": {
    title: "Video Converter & Compressor",
    description: "Convert and reduce compatible videos to WebM locally in your browser.",
    accept: "video/*",
  },
};

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return "—";
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

function readVideo(file: File, video: HTMLVideoElement, onReady: () => void) {
  return new Promise<void>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.src = url;
    video.onloadedmetadata = () => {
      onReady();
      resolve();
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This video format could not be decoded by your browser."));
    };
    video.dataset.objectUrl = url;
  });
}

function seek(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    const clean = () => {
      window.clearTimeout(timer);
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", fail);
    };
    const done = () => { clean(); resolve(); };
    const fail = () => { clean(); reject(new Error("The selected frame could not be decoded.")); };
    const timer = window.setTimeout(() => {
      clean();
      reject(new Error("Video seeking timed out. Try another video or a shorter clip."));
    }, 5000);
    video.addEventListener("seeked", done, { once: true });
    video.addEventListener("error", fail, { once: true });
    try {
      video.currentTime = time;
    } catch {
      clean();
      reject(new Error("This video cannot seek to the selected position."));
    }
  });
}

async function captureFrame(video: HTMLVideoElement, time: number, type: "image/jpeg" | "image/png") {
  await seek(video, time);
  const maxSide = 2560;
  const scale = Math.min(1, maxSide / Math.max(video.videoWidth || 1, video.videoHeight || 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((video.videoWidth || 1) * scale));
  canvas.height = Math.max(1, Math.round((video.videoHeight || 1) * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported on this device.");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error("Could not create the image.")), type, .92)
  );
  return { blob, width: canvas.width, height: canvas.height };
}

export default function VideoToolClient({ tool }: { tool: VideoTool }) {
  const cfg = config[tool];
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const urlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [time, setTime] = useState("0");
  const [format, setFormat] = useState<"image/jpeg" | "image/png">("image/jpeg");
  const [videoQuality, setVideoQuality] = useState<"low" | "medium" | "high">("medium");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [duration, setDuration] = useState(0);
  const [videoInfo, setVideoInfo] = useState({ width: 0, height: 0, fps: 0 });

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    if (audioContextRef.current) void audioContextRef.current.close();
    recorderRef.current?.stop();
  }, []);

  function resetFile() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setFile(null);
    setDuration(0);
    setVideoInfo({ width: 0, height: 0, fps: 0 });
    setMessage("");
    if (videoRef.current) videoRef.current.removeAttribute("src");
  }

  async function choose(next: File | undefined) {
    if (!next) return;
    if (!next.type.startsWith("video/")) {
      setMessage("Please choose a video file.");
      return;
    }
    if (next.size > 500 * 1024 * 1024) {
      setMessage("For reliable mobile processing, videos are limited to 500 MB.");
      return;
    }
    resetFile();
    setFile(next);
    const video = videoRef.current;
    if (!video) return;
    try {
      await readVideo(next, video, () => {
        setDuration(video.duration);
        setVideoInfo({ width: video.videoWidth, height: video.videoHeight, fps: 0 });
        setTime("0");
      });
      urlRef.current = video.dataset.objectUrl || null;
    } catch (e) {
      setFile(null);
      setMessage(e instanceof Error ? e.message : "Could not read the video.");
    }
  }

  async function convertAndCompress() {
    if (!file || !videoRef.current) return;
    const video = videoRef.current;
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      throw new Error("Video conversion is not supported by this browser.");
    }
    const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(m => MediaRecorder.isTypeSupported(m));
    if (!mime) throw new Error("This browser cannot create WebM video.");

    const maxSide = videoQuality === "low" ? 720 : videoQuality === "medium" ? 1080 : 1440;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth || 1, video.videoHeight || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(2, Math.round((video.videoWidth || 2) * scale / 2) * 2);
    canvas.height = Math.max(2, Math.round((video.videoHeight || 2) * scale / 2) * 2);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported on this device.");

    const stream = canvas.captureStream(30);
    const audio = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
    if (audio) audio.getAudioTracks().forEach(track => stream.addTrack(track));

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: videoQuality === "low" ? 900_000 : videoQuality === "medium" ? 1_800_000 : 3_000_000 });
    const finished = new Promise<void>((resolve, reject) => {
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onerror = () => reject(new Error("Video conversion failed."));
      recorder.onstop = () => resolve();
    });

    await seek(video, 0);
    recorder.start(250);
    setMessage("Converting… keep this tab open.");
    await video.play();

    const draw = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(draw);
      }
    };
    draw();

    await new Promise<void>(resolve => { video.onended = () => resolve(); });
    recorder.stop();
    await finished;
    video.pause();
    const out = new Blob(chunks, { type: mime });
    if (!out.size) throw new Error("No converted video was produced.");
    download(out, "vidzora-converted.webm");
    setMessage(`Ready • ${formatBytes(out.size)} • WebM`);
  }

  async function runFrame(downloadName: string) {
    const video = videoRef.current;
    if (!file || !video) return;
    const requested = Number(time);
    if (!Number.isFinite(requested) || requested < 0 || requested > duration) {
      throw new Error(`Choose a time between 0 and ${duration.toFixed(1)} seconds.`);
    }
    const result = await captureFrame(video, requested, format);
    download(result.blob, downloadName);
    setMessage(`Ready • ${result.width}×${result.height} • ${format === "image/png" ? "PNG" : "JPG"}`);
  }

  async function extractAudio() {
    if (!file || !videoRef.current) return;
    const video = videoRef.current;
    if (!window.MediaRecorder || !window.AudioContext) {
      throw new Error("Audio extraction is not supported by this browser.");
    }

    const AudioCtx = window.AudioContext;
    const ctx = audioContextRef.current || new AudioCtx();
    audioContextRef.current = ctx;
    const source = audioSourceRef.current || ctx.createMediaElementSource(video);
    audioSourceRef.current = source;
    const destination = ctx.createMediaStreamDestination();
    source.connect(destination);
    source.connect(ctx.destination);

    const mime = ["audio/webm;codecs=opus", "audio/webm"].find(m => MediaRecorder.isTypeSupported(m));
    if (!mime) throw new Error("This browser cannot create a downloadable audio file.");

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(destination.stream, { mimeType: mime });
    recorderRef.current = recorder;

    const finished = new Promise<void>((resolve, reject) => {
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onerror = () => reject(new Error("Audio recording failed."));
      recorder.onstop = () => resolve();
    });

    await ctx.resume();
    await seek(video, 0);
    recorder.start(250);
    setMessage("Extracting audio… keep this tab open.");
    await video.play();

    await new Promise<void>(resolve => {
      video.onended = () => resolve();
    });

    recorder.stop();
    await finished;
    video.pause();
    const out = new Blob(chunks, { type: mime });
    if (!out.size) throw new Error("No audio track was produced.");
    download(out, "vidzora-audio.webm");
    setMessage(`Audio ready • ${formatBytes(out.size)}`);
    recorderRef.current = null;
    await ctx.suspend();
  }

  async function run() {
    if (!file) {
      setMessage("Choose a video first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (tool === "video-frame-extractor") {
        await runFrame(`vidzora-frame.${format === "image/png" ? "png" : "jpg"}`);
      } else if (tool === "video-thumbnail-extractor") {
        const t = duration > 0 ? Math.min(duration / 3, 10) : 0;
        setTime(String(t.toFixed(2)));
        const result = await captureFrame(videoRef.current!, t, "image/jpeg");
        download(result.blob, "vidzora-thumbnail.jpg");
        setMessage(`Thumbnail ready • ${result.width}×${result.height}`);
      } else if (tool === "video-audio-extractor") {
        await extractAudio();
      } else if (tool === "video-converter-compressor") {
        await convertAndCompress();
      } else {
        setMessage("Metadata is already shown below.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "The operation failed. Please try another video.");
    } finally {
      setBusy(false);
    }
  }

  const meta = file ? [
    ["File", file.name],
    ["Size", formatBytes(file.size)],
    ["Duration", formatDuration(duration)],
    ["Dimensions", videoInfo.width ? `${videoInfo.width} × ${videoInfo.height}` : "—"],
    ["Frame rate", videoInfo.fps ? `${videoInfo.fps} fps` : "Not exposed by browser"],
    ["MIME", file.type || "—"],
  ] : [];

  return <main className="toolsShell">
    <header className="nav">
      <a className="brand" href="/">Vidzora<span>•</span></a>
      <nav><a href="/tools">All Tools</a><a className="toolsNavActive" href="/">Downloader</a></nav>
    </header>

    <section className="toolHero">
      <div className="eyebrow">VIDZORA • VIDEO TOOLS</div>
      <h1>{cfg.title}</h1>
      <p>{cfg.description}</p>

      <div className="toolBox videoToolBox">
        <label className="dropZone videoDropZone">
          <input ref={inputRef} type="file" accept={cfg.accept} onChange={e => void choose(e.target.files?.[0])} />
          <strong>{file ? file.name : "Choose a video"}</strong>
          <span>{file ? `${formatBytes(file.size)} • ${formatDuration(duration)}` : "Up to 500 MB • processed locally in your browser"}</span>
        </label>

        <video ref={videoRef} className="videoToolPreview" controls playsInline preload="metadata" />

        {tool === "video-frame-extractor" && <div className="videoControls">
          <label>Frame time (seconds)
            <input type="number" min="0" max={duration || undefined} step="0.01" value={time} onChange={e => setTime(e.target.value)} />
          </label>
          <label>Format
            <select value={format} onChange={e => setFormat(e.target.value as "image/jpeg" | "image/png")}>
              <option value="image/jpeg">JPG</option>
              <option value="image/png">PNG</option>
            </select>
          </label>
        </div>}

        {tool === "video-metadata" && <div className="videoMetadataGrid">
          {meta.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}
        </div>}

        {tool === "video-thumbnail-extractor" && <div className="toolMessage">The thumbnail is captured from about one-third into the video. Use Frame Extractor when you need an exact timestamp.</div>}

        {tool === "video-audio-extractor" && <div className="toolMessage">Output is WebM/Opus and is created locally. The video plays once while audio is captured, so keep this tab open.</div>}
        {tool === "video-converter-compressor" && <div className="videoControls"><label>Output quality<select value={videoQuality} onChange={e => setVideoQuality(e.target.value as "low" | "medium" | "high")}><option value="low">Low • smaller</option><option value="medium">Medium • balanced</option><option value="high">High • better quality</option></select></label></div>}

        <button className="toolRun" disabled={busy || !file} onClick={() => void run()}>
          {busy ? "Processing…" : tool === "video-metadata" ? "Refresh Metadata" : "Create & Download"}
        </button>

        {message && <div className="toolMessage" role="status">{message}</div>}
      </div>

      <div className="toolTrust"><b>✓ Browser-first</b><b>✓ No account</b><b>✓ No video upload</b></div>
      <div className="toolPageAd"><ToolsAd variant="rectangle" /></div>
    </section>
  </main>;
}
