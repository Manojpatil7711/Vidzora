import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const categories = {
  image: {
    title: "Free Online Image Tools",
    description: "Compress images, reduce image size, resize pictures, convert JPG PNG and WebP, crop images and prepare files for forms or social media.",
    intro: "Choose the image task you need. Vidzora's browser-based image tools are designed for quick edits without creating an account. Check the output dimensions and file size before using the result.",
    tools: [
      ["image-compressor", "Image Compressor", "Reduce JPG, PNG or WebP file size by adjusting image quality."],
      ["image-size-reducer", "Image Size Reducer", "Target a smaller file size for upload limits and online forms."],
      ["image-resizer", "Image Resizer", "Set exact pixel dimensions for profiles, banners and thumbnails."],
      ["image-converter", "Image Format Converter", "Convert between supported JPG, PNG and WebP formats."],
      ["image-cropper", "Image Cropper", "Crop an image to focus on the subject or fit a layout."]
    ],
    tips: ["Keep a copy of the original image before compressing or converting.", "Use pixel dimensions for resizing and check the final file size separately.", "Choose JPG for many photographs, PNG when transparency matters, and WebP when your destination supports it."]
  },
  video: {
    title: "Free Online Video Tools",
    description: "Use browser-based video utilities to extract frames, make thumbnails, inspect metadata, create GIFs, extract compatible audio and convert subtitles.",
    intro: "These utilities focus on common creator tasks. Browser support, device memory and input format can affect the result, especially for large video files. Where a tool processes locally, the source file stays in your browser.",
    tools: [
      ["video-frame-extractor", "Video Frame Extractor", "Capture a still image from a chosen timestamp."],
      ["video-thumbnail-extractor", "Video Thumbnail Extractor", "Create a thumbnail image from a video."],
      ["video-metadata", "Video Metadata Viewer", "Inspect file size, duration, dimensions and media type."],
      ["video-audio-extractor", "Video Audio Extractor", "Create an audio output when the browser and source format are compatible."],
      ["video-converter-compressor", "Video Converter & Compressor", "Convert compatible video to WebM and adjust output bitrate."],
      ["video-gif-creator", "Video to GIF Creator", "Create a short animated GIF with output controls."],
      ["subtitle-converter", "Subtitle Converter", "Convert between SRT and WebVTT subtitle formats."]
    ],
    tips: ["For large files, close other tabs and allow the browser time to finish processing.", "Use metadata to check dimensions and duration before editing.", "Preview the exported file before sharing it; output formats depend on browser support."]
  },
  pdf: {
    title: "Free Online PDF Tools",
    description: "Convert images and PDF pages, compress PDF files and merge documents with Vidzora's free online PDF utilities.",
    intro: "Use these PDF tools for everyday document tasks such as combining scans, preparing image-based documents and reducing file size. Always open the exported PDF and confirm that the pages look correct before submitting it.",
    tools: [
      ["jpg-to-pdf", "JPG to PDF", "Combine supported images into a PDF document."],
      ["pdf-to-jpg", "PDF to JPG", "Render PDF pages as JPG images."],
      ["compress-pdf", "Compress PDF", "Try to reduce the file size of a PDF."],
      ["merge-pdf", "Merge PDF", "Combine PDF documents into one file."]
    ],
    tips: ["Keep the original PDF before compressing or merging.", "Check page order and orientation after combining files.", "Scanned PDFs and image-heavy PDFs may behave differently from text-based documents."]
  }
} as const;

type CategoryKey = keyof typeof categories;

export function generateStaticParams() {
  return Object.keys(categories).map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  if (!(category in categories)) return {};
  const item = categories[category as CategoryKey];
  const canonical = "/tools/category/" + category;
  return {
    title: item.title,
    description: item.description,
    alternates: { canonical },
    openGraph: { title: item.title + " | Vidzora", description: item.description, url: canonical, siteName: "Vidzora", type: "website" },
    twitter: { card: "summary", title: item.title + " | Vidzora", description: item.description },
    robots: { index: true, follow: true }
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!(category in categories)) notFound();
  const item = categories[category as CategoryKey];

  return (
    <main className="toolsShell">
      <header className="nav">
        <Link className="brand" href="/">Vidzora<span>•</span></Link>
        <nav><Link href="/">Downloader</Link><Link href="/tools">All tools</Link></nav>
      </header>
      <section className="toolsHero">
        <div className="eyebrow">VIDZORA • FREE ONLINE TOOLS</div>
        <h1>{item.title}<br /><em>Simple tools for everyday tasks.</em></h1>
        <p>{item.description}</p>
      </section>
      <section className="toolsInfo">
        <h2>Choose the right tool</h2>
        <p>{item.intro}</p>
      </section>
      <section className="toolsGrid" aria-label={item.title}>
        {item.tools.map(([slug, title, description]) => (
          <Link className="toolCard" href={"/tools/" + slug} key={slug}>
            <span className="toolIcon" aria-hidden="true">↗</span>
            <div><h2>{title}</h2><p>{description}</p></div>
            <b>Open tool →</b>
          </Link>
        ))}
      </section>
      <section className="toolsInfo">
        <h2>Tips for better results</h2>
        <ul>{item.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
        <p>For step-by-step instructions, open a tool above. You can also <Link className="freeToolsCta" href="/tools">browse every free tool</Link> or return to the <Link className="freeToolsCta" href="/">Vidzora downloader</Link>.</p>
      </section>
      <footer>
        <span>© {new Date().getFullYear()} Vidzora</span>
        <span><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></span>
      </footer>
    </main>
  );
}
