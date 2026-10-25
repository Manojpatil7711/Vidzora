import Link from "next/link";

const tools = [
  ["image-compressor", "Image Compressor", "Compress JPG, PNG and WebP", "🗜️"],
  ["image-size-reducer", "Image Size Reducer", "Target an exact KB, MB or GB size", "📉"],
  ["image-resizer", "Image & Banner Resizer", "Resize images exactly or use platform banner presets", "↔️"],
  ["jpg-to-pdf", "JPG to PDF", "Turn images into PDF", "📄"],
  ["pdf-to-jpg", "PDF to JPG", "Convert PDF pages to JPG", "🖼️"],
  ["compress-pdf", "Compress PDF", "Reduce PDF file size", "📦"],
  ["merge-pdf", "Merge PDF", "Combine PDFs into one", "🔗"],
  ["image-converter", "JPG PNG WebP", "Convert image formats", "🔄"],
  ["image-cropper", "Image Cropper", "Crop and download images", "✂️"],
  ["video-frame-extractor", "Video Frame Extractor", "Extract an exact frame from video", "🎞️"],
  ["video-thumbnail-extractor", "Video Thumbnail Extractor", "Create a video thumbnail locally", "🖼️"],
  ["video-metadata", "Video Metadata Viewer", "Inspect video file details locally", "ℹ️"],
  ["video-audio-extractor", "Video Audio Extractor", "Extract playable audio locally", "🎧"],
  ["video-converter-compressor", "Video Converter & Compressor", "Convert and reduce video size locally", "🎬"],
  ["video-gif-creator", "Video to GIF Creator", "Create short animated GIFs locally", "🎞️"],
  ["subtitle-converter", "Subtitle Converter", "Convert SRT and WebVTT files locally", "💬"]
] as const;

export const metadata = {
  title: "Free Online Image, Video & PDF Tools",
  description:
    "Choose the right browser-based utility for image compression, exact image sizing, PDF conversion, video inspection and subtitle conversion. Practical workflows and file-handling notes included.",
  alternates: { canonical: "/tools" },
  openGraph: {
    title: "Free Online Image, Video & PDF Tools | Vidzora",
    description:
      "Compress and convert images, work with PDFs, and use browser-based video utilities without an account.",
    url: "/tools",
    siteName: "Vidzora",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Free Online Image, Video & PDF Tools | Vidzora",
    description: "Free browser-based image, PDF and video utilities from Vidzora."
  },
  robots: { index: true, follow: true }
};

export default function Tools() {
  return (
    <main className="toolsShell">
      <header className="nav">
        <Link className="brand" href="/">Vidzora<span>•</span></Link>
        <nav><Link href="/">Downloader</Link><a className="toolsNavActive" href="#tools">Free Tools</a></nav>
      </header>

      <section className="toolsHero">
        <div className="eyebrow">VIDZORA • FREE TOOLS</div>
        <h1>Free tools.<br /><em>Fast, private, simple.</em></h1>
        <p>Pick a task below to compress images, convert formats, create or merge PDFs, inspect video files, or prepare subtitles. Each tool opens its own workspace with controls for that task.</p>
      </section>

      <section className="categoryGrid" aria-label="Browse tools by category">
        <Link className="categoryCard" href="/tools/category/image">
          <span aria-hidden="true">▧</span><div><h2>Image Tools</h2><p>Compress, resize, crop and convert images.</p></div><b>Explore →</b>
        </Link>
        <Link className="categoryCard" href="/tools/category/video">
          <span aria-hidden="true">▶</span><div><h2>Video Tools</h2><p>Extract frames, inspect metadata and create GIFs.</p></div><b>Explore →</b>
        </Link>
        <Link className="categoryCard" href="/tools/category/pdf">
          <span aria-hidden="true">▤</span><div><h2>PDF Tools</h2><p>Convert pages, compress files and merge documents.</p></div><b>Explore →</b>
        </Link>
      </section>

      <div className="toolsContentFrame">
        <section id="tools" className="toolsGrid" aria-label="All free tools">
          {tools.map(([slug, title, description, icon]) => (
            <Link className="toolCard" href={"/tools/" + slug} key={slug}>
              <span className="toolIcon">{icon}</span>
              <div><h2>{title}</h2><p>{description}</p></div>
              <b>Open tool →</b>
            </Link>
          ))}
        </section>
      </div>

      <section className="toolsInfo">
        <h2>Choose the right tool for your file</h2>
        <div className="toolGuides">
          <article>
            <h3>Make an image smaller</h3>
            <p>Use Image Compressor when you want a smaller file while keeping the same dimensions. Choose Image Size Reducer when a form or upload limit specifies a target size in KB or MB. Use Image Resizer when the pixel width and height must change.</p>
            <p><Link href="/tools/image-compressor">Compress an image</Link> · <Link href="/tools/image-size-reducer">Target a file size</Link> · <Link href="/tools/image-resizer">Resize dimensions</Link></p>
          </article>
          <article>
            <h3>Prepare or combine documents</h3>
            <p>Use JPG to PDF to place images into a document, PDF to JPG when you need page images, Compress PDF when the file is too large to upload, and Merge PDF when several documents should become one file. Check the final page order and readability before sharing.</p>
            <p><Link href="/tools/jpg-to-pdf">JPG to PDF</Link> · <Link href="/tools/compress-pdf">Compress PDF</Link> · <Link href="/tools/merge-pdf">Merge PDFs</Link></p>
          </article>
          <article>
            <h3>Work with video and subtitles</h3>
            <p>Extract a frame when you need a still image, use the thumbnail tool to prepare a preview, and check metadata before editing or uploading a clip. Subtitle Converter is for changing between supported SRT and WebVTT text formats; review timing and special characters after conversion.</p>
            <p><Link href="/tools/video-frame-extractor">Extract a frame</Link> · <Link href="/tools/video-metadata">Inspect metadata</Link> · <Link href="/tools/subtitle-converter">Convert subtitles</Link></p>
          </article>
        </div>
      </section>

      <section className="toolsInfo">
        <h2>How to get a reliable result</h2>
        <ol>
          <li>Open the tool that matches the change you need, then select a file from your device.</li>
          <li>Choose the available settings. For compression, compare the output size with the original; stronger compression can reduce image or video quality.</li>
          <li>Preview the result when the tool offers a preview. Check dimensions, page order, audio, or subtitle timing as appropriate.</li>
          <li>Download the processed file and open it once before sending or uploading it elsewhere.</li>
        </ol>
        <p>Results depend on the source file, browser capabilities, and the options offered by each tool. Very large files may take longer or exceed available device memory. Keep an untouched copy of important originals.</p>
      </section>

      <section className="toolsInfo">
        <h2>Privacy and file handling</h2>
        <p>Vidzora does not require an account. Image and video utilities are designed to process files in your browser where supported, rather than create a personal file library. Processing behavior can differ by tool; avoid uploading confidential or sensitive material unless you have checked that tool’s on-page file-handling details.</p>
      </section>

      <section className="toolsInfo">
        <h2>Frequently asked questions</h2>
        <details><summary>Which tool should I use to reduce a photo for an online form?</summary><p>First check whether the form specifies a maximum file size, pixel dimensions, or both. Use Image Size Reducer for a size limit and Image Resizer for width and height. If both limits apply, resize first and then compress the result.</p></details>
        <details><summary>Will compression always keep the original quality?</summary><p>No. Compression may remove data or reduce visual quality, especially at stronger settings. Keep the original and compare the downloaded result before using it.</p></details>
        <details><summary>Why might a file fail to process?</summary><p>The format may not be supported, the file may be damaged, or the file may be too large for the browser or device. Try a supported format, a smaller copy, or another browser if the problem continues.</p></details>
        <details><summary>Do I need to install an app?</summary><p>No installation or account is required for the web tools. A modern browser is recommended, and some large media tasks may work better on a device with more memory.</p></details>
      </section>

      <footer>
        <span>© {new Date().getFullYear()} Vidzora</span>
        <span><Link href="/about">About</Link> · <Link href="/contact">Contact</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></span>
      </footer>
    </main>
  );
}
