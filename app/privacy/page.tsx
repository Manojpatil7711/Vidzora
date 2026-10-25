import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Vidzora handles submitted links, local file processing, hosting logs and advertising technologies.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true }
};

export default function Privacy() {
  return <main className="legal">
    <a href="/">← Vidzora home</a>
    <h1>Privacy Policy</h1>
    <p><strong>Last updated: October 25, 2026</strong></p>
    <p>Vidzora provides a public-link media downloader and browser-based image, video and PDF utilities. This policy explains the main data flows that may occur when you use the website.</p>

    <h2>Information you submit</h2>
    <p>Vidzora does not require an account and does not provide a personal download history or permanent video library. If you use the public-link downloader, the URL you submit is sent to the website's processing endpoint and may be passed to a third-party media-processing provider to retrieve available formats. Do not submit private, confidential or sensitive links.</p>

    <h2>Files processed in your browser</h2>
    <p>Tools described as browser-based or local process selected image, video, subtitle or PDF files on your device. These tools are designed not to upload the source file for the stated local operation. Browser extensions, device software and network infrastructure outside Vidzora may behave independently.</p>

    <h2>Hosting and technical logs</h2>
    <p>The website is hosted by a third-party hosting provider. Hosting and security systems may process technical information such as IP address, request time, browser details and error logs to deliver, protect and troubleshoot the service. Retention and handling may be governed by the provider's own policies.</p>

    <h2>Advertising and third parties</h2>
    <p>Advertising may be provided by third-party partners. When ads are active, those partners may use cookies, device identifiers or similar technologies according to their own policies and applicable settings. Vidzora does not control third-party websites, processing services or their privacy practices. Review the relevant provider's policy before using its service.</p>

    <h2>Children and sensitive information</h2>
    <p>Do not submit sensitive personal information or private media links. The website is not designed as a service for collecting personal information from children.</p>

    <h2>Your choices</h2>
    <p>You can choose not to submit a URL or file and can stop using the website at any time. You may also control cookies through your browser and review available advertising privacy settings where applicable.</p>

    <h2>Policy changes</h2>
    <p>This policy may be updated when the website's features or service providers change. The latest version will be published on this page with its update date.</p>

    <h2>Contact</h2>
    <p>For privacy questions, contact <a href="mailto:Manojpatil7711@gmail.com">Manojpatil7711@gmail.com</a> or visit the <a href="/contact">Contact page</a>.</p>
  </main>;
}
