import Link from "next/link";

const tools=[
["image-compressor","Image Compressor","Compress JPG, PNG and WebP","🗜️"],
["image-resizer","Image & Banner Resizer","Resize images exactly or use platform banner presets","↔️"],
["jpg-to-pdf","JPG to PDF","Turn images into PDF","📄"],
["pdf-to-jpg","PDF to JPG","Convert PDF pages to JPG","🖼️"],
["compress-pdf","Compress PDF","Reduce PDF file size","📦"],
["merge-pdf","Merge PDF","Combine PDFs into one","🔗"],
["image-converter","JPG PNG WebP","Convert image formats","🔄"],
["image-cropper","Image Cropper","Crop and download images","✂️"]
] as const;

export const metadata={title:"Free Online Tools",description:"Free browser-based image and PDF tools for compressing, resizing, converting, cropping and merging files."};

export default function Tools(){return <main className="toolsShell">
<header className="nav"><Link className="brand" href="/">Vidzora<span>•</span></Link><nav><Link href="/">Downloader</Link><a className="toolsNavActive" href="#tools">Free Tools</a></nav></header>
<section className="toolsHero"><div className="eyebrow">Vidzora • FREE TOOLS</div><h1>Free tools.<br/><em>Fast, private, simple.</em></h1><p>Compress images • Convert formats • Create & merge PDFs • Crop & resize — with ready-made social banner sizes, directly in your browser.</p></section>
<section id="tools" className="toolsGrid">{tools.map(([s,t,d,i])=><Link className="toolCard" href={"/tools/"+s} key={s}><span className="toolIcon">{i}</span><div><h2>{t}</h2><p>{d}</p></div><b>Open →</b></Link>)}</section>
<section className="toolsInfo"><h2>Private by design</h2><p>Image tools process files in your browser. No account is required.</p></section>
<footer><span>© {new Date().getFullYear()} Vidzora</span><span><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></span></footer>
</main>}