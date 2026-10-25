import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Vidzora",
  description: "Learn what Vidzora does, how its browser-based file tools work, and what users should know before using the downloader.",
  alternates: { canonical: "/about" },
  robots: { index: true, follow: true }
};

export default function About() {
  return <main className="legal">
    <Link href="/">← Vidzora home</Link>
    <h1>About Vidzora</h1>
    <p>Vidzora is a small online media workspace that brings a public-link downloader together with browser-based image, video and PDF utilities. The aim is to make common file tasks understandable and accessible on phones and desktop browsers without requiring an account.</p>

    <h2>What you can do</h2>
    <ul>
      <li>Submit a supported public media link and review the formats returned by the processing service.</li>
      <li>Compress, resize, crop and convert common image formats.</li>
      <li>Create PDFs from images, render PDF pages as images, compress supported PDFs and merge documents.</li>
      <li>Use local video utilities to capture frames, inspect basic file details, create GIFs, or convert subtitle formats.</li>
    </ul>

    <h2>How file processing works</h2>
    <p>Browser-based tools process selected files on your device when the tool says it works locally. The public-link downloader is different: a submitted link may be sent to a third-party processing service to retrieve available formats. Support depends on the source, browser and provider, so results are not guaranteed.</p>

    <h2>Responsible use</h2>
    <p>Only process or download material you own or have permission to use. Respect copyright, privacy rights and the rules of the platform where the content is hosted. Vidzora is not affiliated with the third-party platforms named in its interface.</p>

    <h2>Questions or corrections</h2>
    <p>For feedback, privacy questions or a report about the website, visit our <Link href="/contact">Contact page</Link>. See also our <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Use</Link>.</p>
  </main>;
}
