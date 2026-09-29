"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

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
  "https://omg10.com/4/11565407",
  "https://mergerindirect.com/kf1ujxf25k?key=258266315b32d7e7a6335f103ba86138",
  "https://mergerindirect.com/wh2w1pny3s?key=db5e91a9c2690a70a08a5c3f212d0792",
  "https://mergerindirect.com/bkgdinwpwf?key=42404284f875722fcb453dd529a77edf",
  "https://mergerindirect.com/gki9pg3ue?key=c076db285a55d97b0d4108e71fb80248",
  "https://mergerindirect.com/enjf2abtxj?key=b47585e59da9216b6710b975c9427d62",
  "https://mergerindirect.com/ybu4ut7r?key=dbfefcbb48fa3075cc6df76b00266c70",
  "https://mergerindirect.com/bqy5u1gqks?key=2826d95b950a0e10a9711a02d7bba24b"
];

type Format = { label: string; url: string };

function AdUnit({ variant }: { variant: "leaderboard" | "rail" | "native" }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host || host.dataset.loaded === "true") return;
    host.dataset.loaded = "true";

    const load = (src: string, attrs: Record<string, string> = {}) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
      host.appendChild(script);
    };

    if (variant === "rail") {
      const config = document.createElement("script");
      config.text = `atOptions = { 'key' : 'c6cb4978ec0abd9a946ab81ad19949df', 'format' : 'iframe', 'height' : 300, 'width' : 160, 'params' : {} };`;
      host.appendChild(config);
      load("https://mergerindirect.com/c6cb4978ec0abd9a946ab81ad19949df/invoke.js");
    } else if (variant === "leaderboard") {
      const config = document.createElement("script");
      config.text = `atOptions = { 'key' : 'b3cb606d29e82761d924c3596c020a6b', 'format' : 'iframe', 'height' : 50, 'width' : 320, 'params' : {} };`;
      host.appendChild(config);
      load("https://mergerindirect.com/b3cb606d29e82761d924c3596c020a6b/invoke.js");
    } else {
      load("https://mergerindirect.com/6434934b5a2b0ca0af1a76e0e9f70834/invoke.js", {
        "data-cfasync": "false"
      });
      const container = document.createElement("div");
      container.id = "container-6434934b5a2b0ca0af1a76e0e9f70834";
      container.className = "nativeAdContainer";
      host.appendChild(container);
    }

    // Auxiliary network scripts are loaded once, after the main UI is ready.
    if (variant === "native") {
      load("https://mergerindirect.com/b9/ff/bc/b9ffbca321bc3df764cceba5eb902ea2.js");
      load("https://mergerindirect.com/97/d2/e4/97d2e4b2177f582889d754c1e4096aca.js");
    }
  }, [variant]);

  return (
    <div ref={ref} className={`adSlot adSlot--${variant}`} aria-label="Advertisement">
      <span className="adLabel">ADVERTISEMENT</span>
    </div>
  );
}

function isAudio(f: Format) {
  return /audio|mp3|music/i.test(f.label);
}

function qualityName(label: string) {
  const match = label.match(/(2160p|1440p|1080p|720p|480p|360p|240p|144p|HD)/i);
  if (match) return match[1].toUpperCase() === "HD" ? "HD" : match[1];
  if (/best/i.test(label)) return "Best available";
  return label.replace(/^Video\s*[•·-]?\s*/i, "").trim() || "Available";
}

function DownloadSponsorModal({
  href,
  onContinue,
  onClose
}: {
  href: string;
  onContinue: () => void;
  onClose: () => void;
}) {
  return (
    <div className="sponsorModal" role="dialog" aria-modal="true" aria-label="Sponsored offer">
      <div className="sponsorModalCard">
        <div className="sponsorBannerLabel">ADVERTISEMENT</div>
        <h3>Support Vidzora</h3>
        <p>Vidzora is free to use. A sponsored offer is shown before the download. You can open it or continue directly.</p>
        <a href={href} target="_blank" rel="nofollow sponsored noopener noreferrer" className="sponsorModalSponsor">View sponsor ↗</a>
        <div className="sponsorModalActions">
          <button type="button" className="sponsorModalContinue" onClick={onContinue}>Continue to download</button>
          <button type="button" className="sponsorModalClose" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [mediaType, setMediaType] = useState<"mp4" | "mp3">("mp4");
  const [audioLoading, setAudioLoading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<Format | null>(null);
  const [sponsorHref, setSponsorHref] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const sponsorIndexRef = useRef(0);

  const formats: Format[] = Array.isArray(result?.formats) ? result.formats : [];
  const videoFormats = useMemo(() => formats.filter((f) => !isAudio(f)), [formats]);
  const audioFormats = useMemo(() => formats.filter(isAudio), [formats]);
  const activeFormats = mediaType === "mp3" ? audioFormats : videoFormats;

  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [result]);

  useEffect(() => {
    if (mediaType === "mp3" && !audioFormats.length && videoFormats.length) setMediaType("mp4");
    if (mediaType === "mp4" && !videoFormats.length && audioFormats.length) setMediaType("mp3");
  }, [mediaType, audioFormats.length, videoFormats.length]);

  useEffect(() => {
    setSelectedFormat(activeFormats[0] || null);
  }, [mediaType, result]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setSelectedFormat(null);
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
      setMediaType(Array.isArray(d.formats) && d.formats.some(isAudio) && !d.formats.some((f: Format) => !isAudio(f)) ? "mp3" : "mp4");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function selectMediaType(type: "mp4" | "mp3") {
    if (type === "mp4") {
      setMediaType("mp4");
      return;
    }

    if (audioFormats.length) {
      setMediaType("mp3");
      return;
    }

    if (!url.trim() || audioLoading) return;
    setAudioLoading(true);
    setError("");
    try {
      const r = await fetch("/api/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim(), mode: "audio" })
      });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || "MP3 audio is not available for this link.");
      setResult((prev: any) => prev ? { ...prev, formats: [...(Array.isArray(prev.formats) ? prev.formats : []), ...(Array.isArray(d.formats) ? d.formats : [])] } : d);
      setMediaType("mp3");
    } catch (err: any) {
      setError(err.message || "Unable to prepare MP3 audio.");
    } finally {
      setAudioLoading(false);
    }
  }

  function chooseFormat(format: Format) {
    setSelectedFormat(format);
    sponsorIndexRef.current = (sponsorIndexRef.current + 1) % sponsorLinks.length;
    setSponsorHref(sponsorLinks[sponsorIndexRef.current]);
  }

  function continueDownload() {
    const target = selectedFormat?.url;
    setSponsorHref("");
    if (!target) return;
    window.open("/api/file?url=" + encodeURIComponent(target), "_blank", "noopener,noreferrer");
  }

  function copyVidzoraLink() {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(
      () => setError("Source link copied."),
      () => setError("Copy failed. Long-press the source link to copy it.")
    );
  }

  return (
    <main>
      <header className="nav">
        <a className="brand" href="/">Vidzora<span>•</span></a>
        <nav><a className="homeDownloaderLink" href="/"><strong>DOWNLOADER</strong></a><a className="homeToolsLink" href="/tools"><strong>FREE TOOLS</strong><small>Compress • Convert • PDF • Crop</small></a><a href="#how">How it works</a><a href="#faq">FAQ</a></nav>
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
            <button className="active platformLink" type="button" key={p.name} onClick={() => { setError(""); setUrl(""); inputRef.current?.focus(); }} aria-label={`Paste a ${p.name} URL`} title={`Paste a ${p.name} URL`}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="heroAdRail"><AdUnit variant="rail" /></div>
        <p className="microcopy">16 public media platforms detected by Vidzora. Actual download availability depends on the connected media engine and the source link. • Public links only • Use content you have permission to download.</p>

        {error && <div className="notice error">{error}</div>}

        {result && <div className="result" ref={resultRef}>
          <div className="resultHead">
            <div>
              <small>{result.platform}</small>
              <h2>{result.title || "Ready to download"}</h2>
            </div>
            <button type="button" className="sourceLinkBtn" onClick={copyVidzoraLink}>Copy source link</button>
          </div>

          <div className="mediaTypeTabs" role="tablist" aria-label="Download format">
            <button type="button" className={mediaType === "mp4" ? "mediaTab activeTab" : "mediaTab"} disabled={!videoFormats.length} onClick={() => selectMediaType("mp4")}>MP4 Video</button>
            <button type="button" className={mediaType === "mp3" ? "mediaTab activeTab" : "mediaTab"} disabled={audioLoading} onClick={() => selectMediaType("mp3")}>{audioLoading ? "Preparing MP3…" : "MP3 Music"}</button>
          </div>

          <div className="qualityHeader">
            <span>{mediaType === "mp3" ? "Choose audio" : "Choose video quality"}</span>
            <span className="qualityHint">{activeFormats.length} option{activeFormats.length === 1 ? "" : "s"}</span>
          </div>

          <div className="formats">
            {activeFormats.map((f) => (
              <button
                key={f.url}
                type="button"
                className={selectedFormat?.url === f.url ? "format formatSelected" : "format"}
                onClick={() => chooseFormat(f)}
              >
                <span>
                  <strong>{mediaType === "mp3" ? "MP3" : qualityName(f.label)}</strong>
                  <small>{mediaType === "mp3" ? "Best available audio" : f.label}</small>
                </span>
                <b>Download ↘</b>
              </button>
            ))}
          </div>

          {!activeFormats.length && <div className="notice error">This source did not return a {mediaType.toUpperCase()} format.</div>}
          <AdUnit variant="native" />
          <p className="microcopy downloadNote">{mediaType === "mp3" && audioLoading ? "Preparing MP3 audio…" : "Select MP4 or MP3, choose the available quality, then download. Sponsored offers rotate between download actions."}</p>
          <button className="again" onClick={() => { setResult(null); setUrl(""); setSelectedFormat(null); }}>Download another</button>
        </div>}
      </section>

      <section id="how" className="section">
        <div><div className="eyebrow">HOW IT WORKS</div><h2>Three steps. No account.</h2></div>
        <div className="steps">
          <article><b>01</b><h3>Copy</h3><p>Copy the link to a public social video.</p></article>
          <article><b>02</b><h3>Paste</h3><p>Paste it into Vidzora and let us detect the platform.</p></article>
          <article><b>03</b><h3>Choose & download</h3><p>Select MP4 video or MP3 music, then choose the format returned by the media engine.</p></article>
        </div>
      </section>

      <section className="section revenue">
        <div><div className="eyebrow">SUPPORTED SOURCES</div><h2>One simple workflow for public video links.</h2></div>
        <div className="growthCards">
          <article><strong>01</strong><h3>Popular platforms</h3><p>Vidzora can analyze supported public links from services such as YouTube, Instagram, Facebook and TikTok.</p></article>
          <article><strong>02</strong><h3>MP4 + MP3</h3><p>When the media engine returns both, users can switch between video and music without pasting the link again.</p></article>
          <article><strong>03</strong><h3>Mobile-first</h3><p>After processing, the page gently scrolls to the result so the quality selector is immediately visible on phones.</p></article>
        </div>
      </section>

      <section className="section faq">
        <div><div className="eyebrow">FAQ</div><h2>Good to know.</h2></div>
        <div>
          {[
            ["Is Vidzora free?", "Yes. The downloader is designed to be free to use."],
            ["Do you save my videos?", "Vidzora does not provide a personal video library or download history."],
            ["Which links work?", "Public links from supported platforms. Availability can change when platforms change their systems."],
            ["Why can a link fail?", "Private, deleted, region-restricted or unsupported links may not be downloadable."],
            ["Can I download only music?", "Yes, when the connected media engine returns an audio URL, the MP3 Music tab appears and can be selected without processing the link again."]
          ].map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </section>

      <div style={{position:"fixed",right:"12px",bottom:"10px",zIndex:20,maxWidth:"320px",fontSize:"10px",lineHeight:1.4,textAlign:"right",opacity:0.62}}>
        <span>Vidzora is a tool for publicly accessible content. Users are responsible for ensuring they have the necessary rights or permission to download and use content.</span>
      </div>

      <footer><span>© {new Date().getFullYear()} Vidzora</span><span><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · Built for speed. Use responsibly.</span></footer>

      {sponsorHref && <DownloadSponsorModal href={sponsorHref} onContinue={continueDownload} onClose={() => setSponsorHref("")} />}
    </main>
  );
}
