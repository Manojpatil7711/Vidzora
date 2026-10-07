"use client";

import { useState } from "react";
import ToolsAd from "../tools-ad";

function convert(text: string, target: "srt" | "vtt") {
  if (target === "vtt") {
    let out = text.replace(/^\uFEFF/, "").replace(/\r/g, "");
    out = out.replace(/^(\d{2}:\d{2}:\d{2}),(\d{3})/gm, "$1.$2");
    if (!/^WEBVTT\b/m.test(out.trimStart())) out = "WEBVTT\n\n" + out.trim();
    return out + "\n";
  }
  let out = text.replace(/^\uFEFF/, "").replace(/^WEBVTT\s*\n\s*/i, "").replace(/\r/g, "");
  out = out.replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, "$1,$2");
  const blocks = out.split(/\n\s*\n/).filter(Boolean);
  return blocks.map((block, i) => {
    const lines = block.split("\n").filter(Boolean);
    if (/^\d+$/.test(lines[0]?.trim() || "")) return block;
    return (i + 1) + "\n" + lines.join("\n");
  }).join("\n\n") + "\n";
}

function download(text: string, name: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function SubtitleToolClient() {
  const [text, setText] = useState("");
  const [target, setTarget] = useState<"srt" | "vtt">("vtt");
  const [message, setMessage] = useState("");

  async function choose(file?: File) {
    if (!file) return;
    if (!/\.(srt|vtt)$/i.test(file.name)) return setMessage("Choose an SRT or VTT subtitle file.");
    setText(await file.text());
    setMessage(file.name + " loaded.");
  }

  function run() {
    if (!text.trim()) return setMessage("Choose a subtitle file first.");
    try {
      const out = convert(text, target);
      download(out, "vidzora-subtitles." + target);
      setMessage("Subtitle file ready.");
    } catch {
      setMessage("Could not process this subtitle file.");
    }
  }

  return <main className="toolsShell">
    <header className="nav"><a className="brand" href="/">Vidzora<span>•</span></a><nav><a href="/tools">All Tools</a><a className="toolsNavActive" href="/">Downloader</a></nav></header>
    <section className="toolHero">
      <div className="eyebrow">VIDZORA • SUBTITLE TOOL</div>
      <h1>Subtitle Converter</h1>
      <p>Convert SRT and WebVTT subtitle files locally without uploading them.</p>
      <div className="toolBox">
        <label className="dropZone"><input type="file" accept=".srt,.vtt,text/vtt,application/x-subrip" onChange={e => void choose(e.target.files?.[0])}/><strong>Choose subtitle file</strong><span>SRT or VTT • browser-first</span></label>
        <label className="control">Output<select value={target} onChange={e => setTarget(e.target.value as "srt" | "vtt")}><option value="vtt">WebVTT (.vtt)</option><option value="srt">SubRip (.srt)</option></select></label>
        <textarea className="subtitlePreview" value={text} onChange={e => setText(e.target.value)} placeholder="Subtitle text preview…" aria-label="Subtitle preview"/>
        <button className="toolRun" disabled={!text.trim()} onClick={run}>Convert & Download</button>
        {message && <div className="toolMessage" role="status">{message}</div>}
      </div>
      <div className="toolTrust"><b>✓ Browser-first</b><b>✓ No account</b><b>✓ No upload</b></div>
      <div className="toolPageAd"><ToolsAd variant="rectangle" /></div>
    </section>
  </main>;
}
