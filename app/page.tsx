"use client";

import { FormEvent, useState } from "react";

const platforms = ["TikTok", "Instagram", "YouTube", "Facebook", "X"];

export default function Home() {
  const [url,setUrl]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const [result,setResult]=useState<any>(null);

  async function submit(e:FormEvent){ e.preventDefault(); setError(""); setResult(null); if(!url.trim()) return setError("Paste a public video URL first."); setLoading(true);
    try { const r=await fetch("/api/download",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:url.trim()})}); const d=await r.json(); if(!r.ok||!d.success) throw new Error(d.error||"Unable to process this link."); setResult(d); } catch(err:any){setError(err.message||"Something went wrong.");} finally{setLoading(false);}
  }
  return <main>
    <header className="nav"><a className="brand" href="/">Vidzora<span>•</span></a><nav><a href="#how">How it works</a><a href="#faq">FAQ</a></nav></header>
    <section className="hero">
      <div className="eyebrow">FAST • PRIVATE • SIMPLE</div>
      <h1>Download social videos<br/><em>without the clutter.</em></h1>
      <p className="sub">Paste a public video link. Vidzora detects the platform and prepares the available download formats.</p>
      <form onSubmit={submit} className="search">
        <div className="inputWrap"><span>↗</span><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste a video URL…" aria-label="Video URL" inputMode="url"/>{url&&<button type="button" className="clear" onClick={()=>setUrl("")}>×</button>}</div>
        <button className="downloadBtn" disabled={loading}>{loading?"Preparing…":"Download"}</button>
      </form>
      <div className="platforms">{platforms.map((p,i)=><span className={i===0?"active":""} key={p}>{p}</span>)}</div>
      {error&&<div className="notice error">{error}</div>}
      {result&&<div className="result">
        <div className="resultHead"><div><small>{result.platform}</small><h2>{result.title||"Ready to download"}</h2></div></div>
        <div className="formats">{result.formats?.map((f:any)=><a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="format"><span>{f.label}</span><b>Download ↘</b></a>)}</div>
        <button className="again" onClick={()=>{setResult(null);setUrl("")}}>Download another</button>
      </div>}
    </section>
    <section id="how" className="section"><div><div className="eyebrow">HOW IT WORKS</div><h2>Three steps. No account.</h2></div><div className="steps"><article><b>01</b><h3>Copy</h3><p>Copy the link to a public social video.</p></article><article><b>02</b><h3>Paste</h3><p>Paste it into Vidzora and let us detect the platform.</p></article><article><b>03</b><h3>Download</h3><p>Choose an available format and download.</p></article></div></section>
    <section id="faq" className="section faq"><div><div className="eyebrow">FAQ</div><h2>Good to know.</h2></div><div>{[
      ["Is Vidzora free?","Yes. The downloader is designed to be free to use."],
      ["Do you save my videos?","Vidzora does not provide a personal video library or download history."],
      ["Which links work?","Public links from supported platforms. Availability can change when platforms change their systems."],
      ["Why can a link fail?","Private, deleted, region-restricted or unsupported links may not be downloadable."]
    ].map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
    <footer><span>© {new Date().getFullYear()} Vidzora</span><span>Built for speed. Use responsibly.</span></footer>
  </main>;
}