"use client";

import { useState } from "react";

type K =
  | "image-compressor"
  | "image-resizer"
  | "jpg-to-pdf"
  | "pdf-to-jpg"
  | "compress-pdf"
  | "merge-pdf"
  | "image-converter"
  | "image-cropper"
  | "image-size-reducer";

const cfg: Record<K, { t: string; d: string; a: string; m?: boolean }> = {
  "image-compressor": { t: "Image Compressor", d: "Compress JPG, PNG and WebP images in your browser.", a: "image/jpeg,image/png,image/webp" },
  "image-size-reducer": { t: "Image Size Reducer", d: "Reduce an image to a target KB, MB or GB size in your browser.", a: "image/jpeg,image/png,image/webp" },
  "image-resizer": { t: "Image Resizer", d: "Resize an image to exact dimensions.", a: "image/jpeg,image/png,image/webp" },
  "jpg-to-pdf": { t: "JPG to PDF", d: "Convert one or more images into a single PDF.", a: "image/jpeg,image/png,image/webp", m: true },
  "pdf-to-jpg": { t: "PDF to JPG", d: "Convert PDF pages into JPG images.", a: "application/pdf" },
  "compress-pdf": { t: "Compress PDF", d: "Rebuild image-based PDF pages at a smaller size.", a: "application/pdf" },
  "merge-pdf": { t: "Merge PDF", d: "Combine multiple PDF files into one.", a: "application/pdf", m: true },
  "image-converter": { t: "JPG PNG WebP Converter", d: "Convert images between JPG, PNG and WebP.", a: "image/jpeg,image/png,image/webp" },
  "image-cropper": { t: "Image Cropper", d: "Crop an image and download the result.", a: "image/jpeg,image/png,image/webp" },
};

const bannerPresets = [
  ["Custom", "", ""],
  ["YouTube Channel Banner", "2560", "1440"],
  ["X Header", "1500", "500"],
  ["LinkedIn Profile Banner", "1584", "396"],
  ["LinkedIn Company Banner", "1128", "191"],
  ["Facebook Cover", "820", "312"],
  ["Discord Server Banner", "960", "540"],
  ["GitHub Social Preview", "1280", "640"],
  ["Reddit Community Banner", "1080", "128"],
  ["Website Hero", "1920", "1080"],
  ["Website Wide Hero", "1920", "800"],
  ["Email Header", "600", "200"],
] as const;

const toolSponsorLinks = ["https://omg10.com/4/11918611","https://omg10.com/4/11918610","https://omg10.com/4/11918605","https://omg10.com/4/11565407","https://omg10.com/4/11566837","https://omg10.com/4/11587733"];
const MAX_WORKING_PIXELS = 8_000_000;
const MAX_WORKING_SIDE = 4096;

function fitImageDimensions(width: number, height: number) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const sideScale = MAX_WORKING_SIDE / Math.max(safeWidth, safeHeight);
  const pixelScale = Math.sqrt(MAX_WORKING_PIXELS / (safeWidth * safeHeight));
  const scale = Math.min(1, sideScale, pixelScale);
  return {
    width: Math.max(1, Math.floor(safeWidth * scale)),
    height: Math.max(1, Math.floor(safeHeight * scale)),
    scale,
  };
}

function safeCanvas(width: number, height: number) {
  const safe = fitImageDimensions(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = safe.width;
  canvas.height = safe.height;
  return { canvas, ...safe };
}


function dl(b: Blob, n: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = n;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

function waitForSponsorReturn(adWindow: Window | null, maxWait = 15000) {
  return new Promise<void>((resolve) => {
    const started = Date.now();
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      resolve();
    };

    const onFocus = () => {
      if (Date.now() - started >= 1200) finish();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && Date.now() - started >= 1200) finish();
    };

    const timer = window.setInterval(() => {
      if (adWindow?.closed || Date.now() - started >= maxWait) finish();
    }, 250);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
  });
}

function read(f: File) {
  return new Promise<HTMLImageElement>((ok, no) => {
    const i = new Image();
    const u = URL.createObjectURL(f);
    i.onload = () => { URL.revokeObjectURL(u); ok(i); };
    i.onerror = () => { URL.revokeObjectURL(u); no(Error("Could not read image.")); };
    i.src = u;
  });
}

function blob(c: HTMLCanvasElement, t: string, q?: number) {
  return new Promise<Blob>((ok, no) =>
    c.toBlob((b) => b ? ok(b) : no(Error("Could not create file.")), t, q)
  );
}

async function compressToTargetSize(
  image: HTMLImageElement,
  targetBytes: number,
  onProgress?: (message: string) => void
) {
  if (!Number.isFinite(targetBytes) || targetBytes < 1024) {
    throw Error("Target size must be at least 1 KB.");
  }

  // WebP gives PNG files a practical lossy compression path while keeping
  // JPEG/WebP inputs in their original family. The search prefers quality
  // first and only reduces dimensions when the target cannot be reached.
  const type = "image/webp";
  const sourceW = image.naturalWidth;
  const sourceH = image.naturalHeight;
  const safeSource = fitImageDimensions(sourceW, sourceH);
  let scale = safeSource.scale;

  for (let pass = 0; pass < 8; pass++) {
    const width = Math.max(1, Math.round(sourceW * scale));
    const height = Math.max(1, Math.round(sourceH * scale));
    const safe = fitImageDimensions(width, height);
    const canvas = document.createElement("canvas");
    canvas.width = safe.width;
    canvas.height = safe.height;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw Error("Image processing is not supported on this device.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, safe.width, safe.height);

    // Binary-search quality instead of blindly lowering it. This keeps the
    // highest possible visual quality for the requested target size.
    let low = 0.05;
    let high = 0.95;
    let best: Blob | null = null;

    for (let i = 0; i < 8; i++) {
      const quality = (low + high) / 2;
      const candidate = await blob(canvas, type, quality);
      onProgress?.("Optimizing quality…");
      if (candidate.size <= targetBytes) {
        best = candidate;
        low = quality;
      } else {
        high = quality;
      }
    }

    if (best) {
      return { blob: best, type, width: safe.width, height: safe.height };
    }

    // Target is too small at this resolution even at minimum quality.
    // Reduce pixels gradually rather than destroying quality in one step.
    scale *= 0.82;
    if (width <= 160 || height <= 160) break;
    onProgress?.("Fine-tuning dimensions…");
  }

  // A very aggressive target may be below what the browser encoder can
  // produce. Return the smallest safe result rather than failing silently.
  const fallbackSize = fitImageDimensions(sourceW * scale, sourceH * scale);
  const canvas = document.createElement("canvas");
  canvas.width = fallbackSize.width;
  canvas.height = fallbackSize.height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, fallbackSize.width, fallbackSize.height);
  const fallback = await blob(canvas, type, 0.05);
  return { blob: fallback, type, width: canvas.width, height: canvas.height };
}

async function pdfLib() {
  return import("pdf-lib");
}

async function pdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs";
  return pdfjs;
}

async function imageAsJpegBytes(file: File) {
  const i = await read(file);
  const x = document.createElement("canvas");
  const max = 2200;
  const scale = Math.min(1, max / Math.max(i.naturalWidth, i.naturalHeight));
  x.width = Math.max(1, Math.round(i.naturalWidth * scale));
  x.height = Math.max(1, Math.round(i.naturalHeight * scale));
  x.getContext("2d")!.drawImage(i, 0, 0, x.width, x.height);
  const b = await blob(x, "image/jpeg", 0.92);
  return { bytes: new Uint8Array(await b.arrayBuffer()), width: x.width, height: x.height };
}

function bytesToPdfBlob(bytes: Uint8Array<ArrayBufferLike>) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: "application/pdf" });
}

async function imagesToPdf(files: File[]) {
  const { PDFDocument } = await pdfLib();
  const out = await PDFDocument.create();
  for (const file of files) {
    const { bytes, width, height } = await imageAsJpegBytes(file);
    const img = await out.embedJpg(bytes);
    const page = out.addPage([width, height]);
    page.drawImage(img, { x: 0, y: 0, width, height });
  }
  return bytesToPdfBlob(await out.save());
}

async function mergePdfs(files: File[]) {
  const { PDFDocument } = await pdfLib();
  const out = await PDFDocument.create();
  for (const file of files) {
    const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return bytesToPdfBlob(await out.save());
}

async function renderPdf(file: File, onProgress?: (n: number) => void) {
  const pdfjs = await pdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const items: { blob: Blob; page: number }[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1.35 });
    const max = 1800;
    const scale = Math.min(1.35, max / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
    items.push({ blob: await blob(canvas, "image/jpeg", 0.88), page: n });
    onProgress?.(n);
  }
  await doc.destroy();
  return items;
}

export default function ToolClient({ tool }: { tool: K }) {
  const c = cfg[tool];
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  // Keep dimension fields as strings while typing. Converting with +value on
  // every keystroke turns an empty field into 0, which traps the first 0 and
  // makes inputs such as 0800 awkward to edit on mobile.
  const [w, setW] = useState("1200");
  const [h, setH] = useState("800");
  const [q, setQ] = useState(75);
  const [targetSize, setTargetSize] = useState("500");
  const [targetUnit, setTargetUnit] = useState<"KB" | "MB" | "GB">("KB");
  const [fmt, setFmt] = useState("image/jpeg");
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 800, h: 600 });
  const [sponsorIndex, setSponsorIndex] = useState(0);

  async function run(adWindow: Window | null = null) {
    if (!files.length) return setMsg("Choose a file first.");
    setBusy(true);
    setMsg("");

    const outputs: { blob: Blob; name: string }[] = [];

    try {
      if (tool === "image-compressor" || tool === "image-size-reducer") {
        const i = await read(files[0]);
        const targetValue = Number.parseFloat(targetSize);
        const targetBytes = targetValue * (targetUnit === "GB" ? 1024 * 1024 * 1024 : targetUnit === "MB" ? 1024 * 1024 : 1024);

        if (!Number.isFinite(targetValue) || targetValue <= 0) {
          throw Error("Enter a valid target size.");
        }

        const result = await compressToTargetSize(i, targetBytes, setMsg);
        outputs.push({
          blob: result.blob,
          name: "vidzora-compressed.webp"
        });
      } else if (tool === "image-resizer") {
        const i = await read(files[0]);
        const requestedWidth = Math.max(1, Number.parseInt(w, 10) || 1);
        const requestedHeight = Math.max(1, Number.parseInt(h, 10) || 1);
        const safe = safeCanvas(requestedWidth, requestedHeight);
        const x = safe.canvas;
        if (safe.scale < 1) setMsg("Large output was safely scaled to fit this device's memory."); 
        x.getContext("2d")!.drawImage(i, 0, 0, x.width, x.height);
        outputs.push({
          blob: await blob(x, files[0].type === "image/png" ? "image/png" : "image/jpeg", .9),
          name: "vidzora-resized." + (files[0].type === "image/png" ? "png" : "jpg")
        });
      } else if (tool === "jpg-to-pdf") {
        outputs.push({ blob: await imagesToPdf(files), name: "vidzora-images.pdf" });
      } else if (tool === "merge-pdf") {
        outputs.push({ blob: await mergePdfs(files), name: "vidzora-merged.pdf" });
      } else if (tool === "pdf-to-jpg") {
        const pages = await renderPdf(files[0], (n) => setMsg("Rendering page " + n + "…"));
        pages.forEach((p) => outputs.push({ blob: p.blob, name: "vidzora-page-" + p.page + ".jpg" }));
      } else if (tool === "compress-pdf") {
        const pages = await renderPdf(files[0], (n) => setMsg("Compressing page " + n + "…"));
        const jpgFiles = pages.map((p, i) => new File([p.blob], "page-" + (i + 1) + ".jpg", { type: "image/jpeg" }));
        const out = await imagesToPdf(jpgFiles);
        if (out.size >= files[0].size) {
          outputs.push({ blob: files[0], name: "vidzora-original.pdf" });
          setMsg("Rebuild did not reduce the size, so the original PDF was kept.");
        } else {
          outputs.push({ blob: out, name: "vidzora-compressed.pdf" });
        }
      } else if (tool === "image-converter") {
        const i = await read(files[0]);
        const safe = safeCanvas(i.naturalWidth, i.naturalHeight);
        const x = safe.canvas;
        if (safe.scale < 1) setMsg("Large image was safely downscaled to avoid low-memory errors.");
        x.getContext("2d")!.drawImage(i, 0, 0, x.width, x.height);
        outputs.push({
          blob: await blob(x, fmt, .92),
          name: "vidzora-converted." + fmt.split("/")[1].replace("jpeg", "jpg")
        });
      } else if (tool === "image-cropper") {
        const i = await read(files[0]);
        const x = Math.max(0, Math.min(crop.x, i.naturalWidth - 1));
        const y = Math.max(0, Math.min(crop.y, i.naturalHeight - 1));
        const ww = Math.max(1, Math.min(crop.w, i.naturalWidth - x));
        const hh = Math.max(1, Math.min(crop.h, i.naturalHeight - y));
        const safeCrop = safeCanvas(ww, hh);
        const z = safeCrop.canvas;
        z.getContext("2d")!.drawImage(i, x, y, ww, hh, 0, 0, safeCrop.width, safeCrop.height);
        if (safeCrop.scale < 1) setMsg("Large crop was safely scaled to avoid low-memory errors.");
        outputs.push({ blob: await blob(z, "image/png"), name: "vidzora-crop.png" });
      }

      if (outputs.length) {
        if (adWindow) {
          await waitForSponsorReturn(adWindow);
        } else {
          await new Promise<void>((resolve) => window.setTimeout(resolve, 1200));
        }
        outputs.forEach((item) => dl(item.blob, item.name));
        if (!msg) setMsg("Done — your file is ready.");
      }
    } catch (e: any) {
      const name = String(e?.name || "");
      const message = String(e?.message || "");
      if (/memory|allocation|canvas|indexsize|encoding/i.test(name + " " + message)) {
        setMsg("This image is too large for the device memory. Vidzora could not safely process it.");
      } else {
        setMsg(message || "Could not process this file.");
      }
    } finally {
      setBusy(false);
    }
  }

  function startGenerate() {
    if (busy) return;
    if (!files.length) {
      setMsg("Choose a file first.");
      return;
    }

    const next = (sponsorIndex + 1) % toolSponsorLinks.length;
    setSponsorIndex(next);

    // Monetag SmartLink opens immediately from the user's Generate click.
    let adWindow: Window | null = null;
    try {
      adWindow = window.open(toolSponsorLinks[next], "_blank", "noopener,noreferrer");
    } catch {
      adWindow = null;
    }

    void run(adWindow);
  }

  return <main className="toolShell">
    <header className="nav">
      <a className="brand" href="/">Vidzora<span>•</span></a>
      <nav><a href="/tools">All tools</a><a href="/">Downloader</a></nav>
    </header>
    <section className="toolHero">
      <div className="eyebrow">Vidzora FREE TOOL</div>
      <h1>{c.t}</h1>
      <p>{c.d}</p>
      <div className="toolBox">
        <label className="dropZone">
          <input type="file" accept={c.a} multiple={!!c.m}
            onChange={e => { setFiles(Array.from(e.target.files || [])); setMsg(""); }} />
          <strong>{files.length ? files.length + " file(s) selected" : "Choose file" + (c.m ? "s" : "")}</strong>
          <span>Tap to browse or select from your device</span>
        </label>
        {tool === "image-compressor" && <>
          <div className="controls2">
            <label>Target size
              <input
                type="number"
                min="1"
                step="1"
                inputMode="decimal"
                value={targetSize}
                onChange={e => setTargetSize(e.target.value)}
              />
            </label>
            <label>Unit
              <select value={targetUnit} onChange={e => setTargetUnit(e.target.value as "KB" | "MB" | "GB")}>
                <option value="KB">KB</option>
                <option value="MB">MB</option>
              </select>
            </label>
          </div>
          <div className="toolMessage">Targets the requested size while preserving the highest practical quality.</div>
        </>}
        {tool === "image-resizer" && <>
          <label className="control">Banner / platform preset
            <select
              defaultValue="Custom"
              onChange={e => {
                const preset = bannerPresets.find(([name]) => name === e.target.value);
                if (preset?.[1] && preset?.[2]) {
                  setW(preset[1]);
                  setH(preset[2]);
                }
              }}
            >
              {bannerPresets.map(([name, width, height]) => (
                <option key={name} value={name}>
                  {name}{width ? ` — ${width}×${height}` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="controls2">
            <label>Width<input type="number" min="1" inputMode="numeric" value={w} onChange={e => setW(e.target.value)} onBlur={() => setW(v => String(Math.max(1, Number.parseInt(v, 10) || 1)))} /></label>
            <label>Height<input type="number" min="1" inputMode="numeric" value={h} onChange={e => setH(e.target.value)} onBlur={() => setH(v => String(Math.max(1, Number.parseInt(v, 10) || 1)))} /></label>
          </div>
          <div className="toolMessage">Choose a platform preset or enter any custom pixel dimensions.</div>
        </>}
        {tool === "image-converter" && <label className="control">Output
          <select value={fmt} onChange={e => setFmt(e.target.value)}>
            <option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option>
          </select>
        </label>}
        {tool === "image-cropper" && <div className="controls2">
          <label>X<input type="number" value={crop.x} onChange={e => setCrop({ ...crop, x: +e.target.value })} /></label>
          <label>Y<input type="number" value={crop.y} onChange={e => setCrop({ ...crop, y: +e.target.value })} /></label>
          <label>Width<input type="number" value={crop.w} onChange={e => setCrop({ ...crop, w: +e.target.value })} /></label>
          <label>Height<input type="number" value={crop.h} onChange={e => setCrop({ ...crop, h: +e.target.value })} /></label>
        </div>}
        <button className="toolRun" disabled={busy} onClick={startGenerate}>{busy ? "Preparing file…" : "Generate"}</button>
        {msg && <div className="toolMessage">{msg}</div>}
      </div>
      <div className="toolTrust"><b>✓ Simple</b><b>✓ Mobile friendly</b><b>✓ No account</b></div>

    </section>
  </main>;
}
