"use client";

import { FormEvent, useRef, useState } from "react";

const platforms = [
  { name: "YouTube", url: "https://www.youtube.com/" },
  { name: "Instagram", url: "https://www.instagram.com/" },
  { name: "Facebook", url: "https://www.facebook.com/" },
  { name: "TikTok", url: "https://www.tiktok.com/" },
  { name: "X", url: "https://x.com/" },
  { name: "Reddit", url: "https://www.reddit.com/" },
  { name: "Pinterest", url: "https://www.pinterest.com/" },
  { name: "Vimeo", url: "https://vimeo.com/" },
  { name: "Dailymotion", url: "https://www.dailymotion.com/" },
  { name: "Twitch", url: "https://www.twitch.tv/" },
  { name: "Snapchat", url: "https://www.snapchat.com/" },
  { name: "Tumblr", url: "https://www.tumblr.com/" },
  { name: "VK", url: "https://vk.com/" },
  { name: "Streamable", url: "https://streamable.com/" },
  { name: "SoundCloud", url: "https://soundcloud.com/" },
  { name: "Rutube", url: "https://rutube.ru/" }
];

const sponsorLinks = [
  "https://mergerindirect.com/kf1ujxf25k?key=258266315b32d7e7a6335f103ba86138",
  "https://mergerindirect.com/wh2w1pny3s?key=db5e91a9c2690a70a08a5c3f212d0792",
  "https://mergerindirect.com/bkgdinwpwf?key=42404284f875722fcb453dd529a77edf",
  "https://mergerindirect.com/gki9pg3ue?key=c076db285a55d97b0d4108e71fb80248",
  "https://mergerindirect.com/enjf2abtxj?key=b47585e59da9216b6710b975c9427d62",
  "https://mergerindirect.com/ybu4ut7r?key=dbfefcbb48fa3075cc6df76b00266c70",
  "https://mergerindirect.com/bqy5u1gqks?key=2826d95b950a0e10a9711a02d7bba24b"
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [adIndex, setAdIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!url.trim()) return setError("Paste a public video URL first.");
    setLoading(true);
    try {
      const r = await fetch("/api/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() })
      });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || "Unable to process this link.");
      setResult(d);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function startDownload(e: React.MouseEvent<HTMLAnchorElement>, targetUrl: string) {
    e.preventDefault();
    const sponsor = sponsorLinks[adIndex % sponsorLinks.length];
    setAdIndex((i) => (i + 1) % sponsorLinks.length);
    window.open(sponsor, "_blank", "noopener,noreferrer");
    window.location.href = targetUrl;
  }

  return (
    <main>
      <header className="nav">
        <a className="brand" href="/">Vidzora<span>•</span></a>
        <nav><a href="#how">How it works</a><a href="#faq">FAQ</a></nav>
      </header>

      <section className="hero">
        <div className="eyebrow">FAST • PRIVATE • SIMPLE</div>
        <h1>Download social videos<br/><em>fast, clean, simple.</em></h1>
        <p className="sub">One downloader for public videos across major social and video platforms.</p>

        <form onSubmit={submit} className="search">
          <div className="inputWrap">
            <span>↗</span>
            <input ref={inputRef} value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste a video URL…" aria-label="Video URL" inputMode="url" autoComplete="url" required/>
            {!url && <button type="button" className="pasteBtn" onClick={async () => { try { const text = await navigator.clipboard.readText(); if (text) { setUrl(text.trim()); inputRef.current?.focus(); } } catch { setError("Tap and hold the field, then choose Paste."); } }}>Paste</button>}
            {url && <button type="button" className="clear" aria-label="Clear video URL" onClick={() => setUrl("")}>×</button>}
          </div>
          <button className="downloadBtn" disabled={loading} type="submit">{loading ? "Preparing…" : "Download"}</button>
        </form>

        <div className="platforms" aria-label="Supported platforms">
          {platforms.map((p) => (
            <button
              className="active platformLink"
              type="button"
              key={p.name}
              onClick={() => {
                setError("");
                setUrl("");
                inputRef.current?.focus();
              }}
              aria-label={`Paste a ${p.name} URL`}
              title={`Paste a ${p.name} URL`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <p className="microcopy">16 public media platforms detected by Vidzora. Actual download availability depends on the connected media engine and the source link. • Public links only • Use content you have permission to download.</p>

        {error && <div className="notice error">{error}</div>}

        {result && <div className="result">
          <div className="resultHead">
            <div><small>{result.platform}</small><h2>{result.title || "Ready to download"}</h2></div>
          </div>
          <div className="formats">
            {result.formats?.map((f: any) => (
              <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="format" onClick={(e) => startDownload(e, f.url)}>
                <span>{f.label}</span><b>Download ↘</b>
              </a>
            ))}
          </div>
          <p className="microcopy downloadNote">Choose a quality to download. A sponsor link may open in a separate tab to support free downloads.</p>
          <button className="again" onClick={() => { setResult(null); setUrl(""); }}>Download another</button>
        </div>}

      </section>

      <section id="how" className="section">
        <div><div className="eyebrow">HOW IT WORKS</div><h2>Three steps. No account.</h2></div>
        <div className="steps">
          <article><b>01</b><h3>Copy</h3><p>Copy the link to a public social video.</p></article>
          <article><b>02</b><h3>Paste</h3><p>Paste it into Vidzora and let us detect the platform.</p></article>
          <article><b>03</b><h3>Download</h3><p>Choose an available format and download.</p></article>
        </div>
      </section>

      <section className="section revenue">
        <div><div className="eyebrow">GROWTH ENGINE</div><h2>Built to scale with traffic.</h2></div>
        <div className="growthCards">
          <article><strong>01</strong><h3>Fast mobile UX</h3><p>One clear action, lightweight pages and no account wall.</p></article>
          <article><strong>02</strong><h3>Search-ready</h3><p>Useful FAQs, legal pages, sitemap and crawlable content support organic discovery.</p></article>
          <article><strong>03</strong><h3>Multiple revenue paths</h3><p>Download actions can monetize real user traffic without hiding the sponsor relationship.</p></article>
        </div>
      </section>

      <section id="faq" className="section faq">
        <div><div className="eyebrow">FAQ</div><h2>Good to know.</h2></div>
        <div>
          {[
            ["Is Vidzora free?", "Yes. The downloader is designed to be free to use."],
            ["Do you save my videos?", "Vidzora does not provide a personal video library or download history."],
            ["Which links work?", "Public links from supported platforms. Availability can change when platforms change their systems."],
            ["Why can a link fail?", "Private, deleted, region-restricted or unsupported links may not be downloadable."],
            ["Can Vidzora make ₹1 crore?", "₹1 crore is a business target, not a guaranteed result. Revenue depends on real traffic, geography, ad demand, RPM/CPM, retention and compliant ad engagement."]
          ].map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </section>

      <footer><span>© {new Date().getFullYear()} Vidzora</span><span>Built for speed. Use responsibly.</span></footer>
    </main>
  );
}
