import Link from "next/link";
import ToolsAd from "./tools-ad";

const tools=[
["image-compressor","Image Compressor","Compress JPG, PNG and WebP","🗜️"],
["image-size-reducer","Image Size Reducer","Target an exact KB, MB or GB size","📉"],
["image-resizer","Image & Banner Resizer","Resize images exactly or use platform banner presets","↔️"],
["jpg-to-pdf","JPG to PDF","Turn images into PDF","📄"],
["pdf-to-jpg","PDF to JPG","Convert PDF pages to JPG","🖼️"],
["compress-pdf","Compress PDF","Reduce PDF file size","📦"],
["merge-pdf","Merge PDF","Combine PDFs into one","🔗"],
["image-converter","JPG PNG WebP","Convert image formats","🔄"],
["image-cropper","Image Cropper","Crop and download images","✂️"],
["video-frame-extractor","Video Frame Extractor","Extract an exact frame from video","🎞️"],
["video-thumbnail-extractor","Video Thumbnail Extractor","Create a video thumbnail locally","🖼️"],
["video-metadata","Video Metadata Viewer","Inspect video file details locally","ℹ️"],
["video-audio-extractor","Video Audio Extractor","Extract playable audio locally","🎧"],
["video-converter-compressor","Video Converter & Compressor","Convert and reduce video size locally","🎬"],
["video-gif-creator","Video to GIF Creator","Create short animated GIFs locally","🎞️"],
["subtitle-converter","Subtitle Converter","Convert SRT and WebVTT files locally","💬"]
] as const;

export const metadata={
  title:"Free Online Tools",
  description:"Free browser-based image and PDF tools for compressing, resizing, converting, cropping and merging files."
};

export default function Tools(){
  return <main className="toolsShell">
    <header className="nav">
      <Link className="brand" href="/">Vidzora<span>•</span></Link>
      <nav><Link href="/">Downloader</Link><a className="toolsNavActive" href="#tools">Free Tools</a></nav>
    </header>

    <section className="toolsHero">
      <div className="eyebrow">Vidzora • FREE TOOLS</div>
      <h1>Free tools.<br/><em>Fast, private, simple.</em></h1>
      <p>Compress images • Convert formats • Create & merge PDFs • Crop & resize — with ready-made social banner sizes, directly in your browser.</p>
    </section>

    <ToolsAd variant="leaderboard" />

    <div className="toolsContentFrame">
      <section id="tools" className="toolsGrid">
        {tools.map(([s,t,d,i])=>
          <Link className="toolCard" href={"/tools/"+s} key={s}>
            <span className="toolIcon">{i}</span>
            <div><h2>{t}</h2><p>{d}</p></div>
            <b>Open →</b>
          </Link>
        )}
      </section>
      <aside className="toolsRail" aria-label="Advertisement">
        <ToolsAd variant="rail" />
      </aside>
    </div>

    <section className="toolsMidAd"><ToolsAd variant="rectangle" /></section>

    <section className="toolsInfo">
      <h2>Private by design</h2>
      <p>Image and video tools process files in your browser. No account is required. Video tools are currently browser-first and do not upload the source file.</p>
    </section>

    <footer>
      <span>© {new Date().getFullYear()} Vidzora</span>
      <span><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></span>
    </footer>
  </main>;
}