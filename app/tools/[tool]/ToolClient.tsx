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
  | "image-cropper";

const cfg: Record<K, { t: string; d: string; a: string; m?: boolean }> = {
  "image-compressor": { t: "Image Compressor", d: "Compress JPG, PNG and WebP images in your browser.", a: "image/jpeg,image/png,image/webp" },
  "image-resizer": { t: "Image Resizer", d: "Resize an image to exact dimensions.", a: "image/jpeg,image/png,image/webp" },
  "jpg-to-pdf": { t: "JPG to PDF", d: "Convert one or more images into a single PDF.", a: "image/jpeg,image/png,image/webp", m: true },
  "pdf-to-jpg": { t: "PDF to JPG", d: "Convert PDF pages into JPG images.", a: "application/pdf" },
  "compress-pdf": { t: "Compress PDF", d: "Rebuild image-based PDF pages at a smaller size.", a: "application/pdf" },
  "merge-pdf": { t: "Merge PDF", d: "Combine multiple PDF files into one.", a: "application/pdf", m: true },
  "image-converter": { t: "JPG PNG WebP Converter", d: "Convert images between JPG, PNG and WebP.", a: "image/jpeg,image/png,image/webp" },
  "image-cropper": { t: "Image Cropper", d: "Crop an image and download the result.", a: "image/jpeg,image/png,image/webp" },
};

function dl(b: Blob, n: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = n;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
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

async function imagesToPdf(files: File[]) {
  const { PDFDocument } = await pdfLib();
  const out = await PDFDocument.create();
  for (const file of files) {
    const { bytes, width, height } = await imageAsJpegBytes(file);
    const img = await out.embedJpg(bytes);
    const page = out.addPage([width, height]);
    page.drawImage(img, { x: 0, y: 0, width, height });
  }
  const bytes = await out.save();
  return new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: "application/pdf" });
}

async function mergePdfs(files: File[]) {
  const { PDFDocument } = await pdfLib();
  const out = await PDFDocument.create();
  for (const file of files) {
    const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return new Blob([await out.save()], { type: "application/pdf" });
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
  const [w, setW] = useState(1200);
  const [h, setH] = useState(800);
  const [q, setQ] = useState(75);
  const [fmt, setFmt] = useState("image/jpeg");
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 800, h: 600 });

  async function run() {
    if (!files.length) return setMsg("Choose a file first.");
    setBusy(true);
    setMsg("");
    try {
      if (tool === "image-compressor") {
        const i = await read(files[0]), x = document.createElement("canvas");
        x.width = i.naturalWidth; x.height = i.naturalHeight;
        x.getContext("2d")!.drawImage(i, 0, 0);
        const t = files[0].type === "image/png" ? "image/webp" : files[0].type;
        const b = await blob(x, t, q / 100);
        dl(b, "vidzora-compressed." + t.split("/")[1].replace("jpeg", "jpg"));
      } else if (tool === "image-resizer") {
        const i = await read(files[0]), x = document.createElement("canvas");
        x.width = Math.max(1, w); x.height = Math.max(1, h);
        x.getContext("2d")!.drawImage(i, 0, 0, x.width, x.height);
        dl(await blob(x, files[0].type === "image/png" ? "image/png" : "image/jpeg", .9),
          "vidzora-resized." + (files[0].type === "image/png" ? "png" : "jpg"));
      } else if (tool === "jpg-to-pdf") {
        dl(await imagesToPdf(files), "vidzora-images.pdf");
      } else if (tool === "merge-pdf") {
        dl(await mergePdfs(files), "vidzora-merged.pdf");
      } else if (tool === "pdf-to-jpg") {
        const pages = await renderPdf(files[0], (n) => setMsg("Rendering page " + n + "…"));
        pages.forEach((p) => dl(p.blob, "vidzora-page-" + p.page + ".jpg"));
        setMsg(pages.length + " JPG file(s) ready.");
      } else if (tool === "compress-pdf") {
        const pages = await renderPdf(files[0], (n) => setMsg("Compressing page " + n + "…"));
        const jpgFiles = pages.map((p, i) => new File([p.blob], "page-" + (i + 1) + ".jpg", { type: "image/jpeg" }));
        const out = await imagesToPdf(jpgFiles);
        if (out.size >= files[0].size) {
          dl(files[0], "vidzora-original.pdf");
          setMsg("Rebuild did not reduce the size, so the original PDF was kept.");
        } else {
          dl(out, "vidzora-compressed.pdf");
          setMsg("Compressed PDF ready.");
        }
      } else if (tool === "image-converter") {
        const i = await read(files[0]), x = document.createElement("canvas");
        x.width = i.naturalWidth; x.height = i.naturalHeight;
        x.getContext("2d")!.drawImage(i, 0, 0);
        dl(await blob(x, fmt, .92), "vidzora-converted." + fmt.split("/")[1].replace("jpeg", "jpg"));
      } else if (tool === "image-cropper") {
        const i = await read(files[0]);
        const x = Math.max(0, Math.min(crop.x, i.naturalWidth - 1));
        const y = Math.max(0, Math.min(crop.y, i.naturalHeight - 1));
        const ww = Math.max(1, Math.min(crop.w, i.naturalWidth - x));
        const hh = Math.max(1, Math.min(crop.h, i.naturalHeight - y));
        const z = document.createElement("canvas");
        z.width = ww; z.height = hh;
        z.getContext("2d")!.drawImage(i, x, y, ww, hh, 0, 0, ww, hh);
        dl(await blob(z, "image/png"), "vidzora-crop.png");
      }
      if (tool.startsWith("image-")) setMsg("Done — your file is ready.");
    } catch (e: any) {
      setMsg(e?.message || "Could not process this file.");
    } finally {
      setBusy(false);
    }
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
        {tool === "image-compressor" && <label className="control">Quality
          <input type="range" min="20" max="95" value={q} onChange={e => setQ(+e.target.value)} /><b>{q}%</b>
        </label>}
        {tool === "image-resizer" && <div className="controls2">
          <label>Width<input type="number" value={w} onChange={e => setW(+e.target.value)} /></label>
          <label>Height<input type="number" value={h} onChange={e => setH(+e.target.value)} /></label>
        </div>}
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
        <button className="toolRun" disabled={busy} onClick={run}>{busy ? "Processing…" : "Process & Download"}</button>
        {msg && <div className="toolMessage">{msg}</div>}
      </div>
      <div className="toolTrust"><b>✓ Simple</b><b>✓ Mobile friendly</b><b>✓ No account</b></div>
    </section>
  </main>;
}
