import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms for authorized downloads, third-party availability and acceptable use of Vidzora's online tools.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true }
};

export default function Terms() {
  return <main className="legal">
    <a href="/">← Vidzora home</a>
    <h1>Terms of Use</h1>
    <p><strong>Last updated: October 25, 2026</strong></p>
    <p>By using Vidzora, you agree to use the website lawfully and responsibly. If you do not agree with these terms, do not use the service.</p>

    <h2>Rights and permissions</h2>
    <p>Use the downloader only for content you own or are authorized to access and save. You are responsible for respecting copyright, privacy rights, platform terms and any other restrictions that apply to the content. Public availability alone does not mean that a download is permitted.</p>

    <h2>Third-party platforms and availability</h2>
    <p>The downloader relies on public URLs and external processing systems. A link may fail because it is private, deleted, restricted, unsupported or affected by changes made by a third-party platform. Vidzora does not guarantee that every link, format or quality will be available and is not affiliated with the third-party platforms mentioned on the site.</p>

    <h2>Browser-based tools</h2>
    <p>Image, video, subtitle and PDF tools support only the formats and operations described on their individual pages. Results depend on the file, browser capabilities and device resources. Check the output before relying on it, and keep an original copy of important files.</p>

    <h2>Prohibited use</h2>
    <p>Do not use Vidzora for unlawful activity, infringement, privacy violations, abuse, attempts to disrupt the service, or automated high-volume requests. Do not attempt to bypass access controls or download material you are not permitted to use.</p>

    <h2>Service availability and changes</h2>
    <p>Features may be modified, suspended or discontinued as technical conditions change. The website is provided on an “as available” basis to the extent permitted by applicable law.</p>

    <h2>Limitation</h2>
    <p>To the extent permitted by applicable law, Vidzora is not responsible for third-party services, their content or their policies, or for decisions made using files processed by the tools. You remain responsible for verifying the output and ensuring your use is lawful.</p>

    <h2>Contact</h2>
    <p>Questions about these terms can be sent to <a href="mailto:Manojpatil7711@gmail.com">Manojpatil7711@gmail.com</a>.</p>
  </main>;
}
