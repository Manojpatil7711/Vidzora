import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://vidzora-pi.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Free Social Video Downloader & Online File Tools | Vidzora",
    template: "%s | Vidzora"
  },
  description:
    "Download publicly accessible social videos in available MP4 or audio formats, and use free online tools to compress images, convert files and work with PDFs. No account required; support varies by platform.",
  keywords: [
    "video downloader",
    "social video downloader",
    "online video downloader",
    "Instagram video downloader",
    "Facebook video downloader",
    "TikTok video downloader",
    "download public videos",
    "Vidzora"
  ],
  alternates: { canonical: siteUrl + "/" },
  openGraph: {
    title: "Free Social Video Downloader & Online File Tools | Vidzora",
    description:
      "Get available MP4 or audio downloads for supported public video links, plus free browser-based image and PDF tools. No account required; platform availability varies.",
    url: siteUrl + "/",
    siteName: "Vidzora",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Free Social Video Downloader & Online File Tools | Vidzora",
    description:
      "Fast, clean and mobile-friendly public video downloader."
  },
  robots: { index: true, follow: true },
  verification: { google: "4dCJJ9eYqXHJqOKHlvTEzfBfLo0TO4k1fthx0LYNL2E" }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": siteUrl + "/#website",
        "url": siteUrl + "/",
        "name": "Vidzora",
        "description": "Fast social video downloader for publicly accessible media."
      },
      {
        "@type": "WebApplication",
        "@id": siteUrl + "/#app",
        "name": "Vidzora",
        "url": siteUrl + "/",
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Web",
        "isAccessibleForFree": true,
        "featureList": [
          "Public video URL detection",
          "Multiple downloadable formats when available",
          "Mobile-friendly interface",
          "No account required"
        ]
      }
    ]
  };

  return (
    <html lang="en">
      <head>
        <meta name="google-adsense-account" content="ca-pub-9655050547873870" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9655050547873870" crossOrigin="anonymous" />
</head>
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
