"use client";

import { useState } from "react";

type Format = { type: string; url: string; quality?: string };
type Result = { platform: string; title?: string; thumbnail?: string; formats: Format[] };

const platforms = ["TikTok", "Instagram", "YouTube", "Facebook", "X"];

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function download() {
    setError("");
    setResult(null);
    const value = url.trim();
    if (!value) return setError("Paste a video URL first.");
    try { new URL(value); } catch { return setError("Please enter a valid URL."); }

    setLoading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Unable to process this link.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="nav">
        <div className="brand"><span className="brand-mark">V</span><span>Vidzora</span></div>
        <a href="#how">How it works</a>
      </header>

      <section className="hero">
        <div className="eyebrow">FAST • SIMPLE • MOBILE FIRST</div>
        <h1>Download videos.<br /><span>Keep it simple.</span></h1>
        <p className="sub">Paste a social video link and get your download in seconds.</p>

        <div className="downloader">
          <div className="input-wrap">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && download()}
              placeholder="Paste video URL here..."
              inputMode="url"
              autoComplete="off"
              aria-label="Video URL"
            />
            {url && <button className="clear" onClick={() => { setUrl(""); setResult(null); setError(""); }} aria-label="Clear">×</button>}
          </div>
          <button className="download-btn" onClick={download} disabled={loading}>
            {loading ? <><span className="spinner" /> Processing…</> : "Download"}
          </button>
        </div>
        {error && <div className="error">{error}</div>}

        <div className="platforms">
          {platforms.map((p, i) => <span key={p} className={i === 0 ? "active-platform" : ""}>{p}</span>)}
        </div>
      </section>

      {result && (
        <section className="result-card">
          <div className="result-head"><div><small>{result.platform}</small><h2>{result.title || "Your video is ready"}</h2></div></div>
          <div className="formats">
            {result.formats.map((f, i) => (
              <a key={i} href={f.url} target="_blank" rel="noreferrer" className="format">
                <span>{f.type}</span><strong>{f.quality || "Download"} ↗</strong>
              </a>
            ))}
          </div>
          <button className="another" onClick={() => { setResult(null); setUrl(""); }}>Download another</button>
        </section>
      )}

      <section id="how" className="info">
        <div><b>01</b><h3>Paste</h3><p>Copy a public video URL and paste it above.</p></div>
        <div><b>02</b><h3>Process</h3><p>Vidzora detects the supported platform and prepares the media.</p></div>
        <div><b>03</b><h3>Download</h3><p>Choose an available format and save your video.</p></div>
      </section>

      <section className="trust">
        <h2>Built for speed. Designed for phones.</h2>
        <p>No account. No download history. No unnecessary steps.</p>
      </section>

      <footer><span>© {new Date().getFullYear()} Vidzora</span><span>Use Vidzora only for content you have permission to download.</span></footer>
    </main>
  );
}