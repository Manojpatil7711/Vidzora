import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://vidzora-pi.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Vidzora — Fast Social Video Downloader",
    template: "%s | Vidzora"
  },
  description:
    "Vidzora is a fast, mobile-friendly downloader for publicly accessible videos from YouTube, Instagram, Facebook, TikTok and other supported platforms.",
  keywords: [
    "video downloader",
    "social video downloader",
    "online video downloader",
    "YouTube video downloader",
    "Instagram video downloader",
    "Facebook video downloader",
    "TikTok video downloader",
    "download public videos",
    "Vidzora"
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Vidzora — Fast Social Video Downloader",
    description:
      "Download publicly accessible social videos with a fast, clean and mobile-first experience.",
    url: siteUrl,
    siteName: "Vidzora",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Vidzora — Fast Social Video Downloader",
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
        "url": siteUrl,
        "name": "Vidzora",
        "description": "Fast social video downloader for publicly accessible media."
      },
      {
        "@type": "WebApplication",
        "@id": siteUrl + "/#app",
        "name": "Vidzora",
        "url": siteUrl,
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
        <meta name="monetag" content="f17969125c8c4941410a44ce66d071ca" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9655050547873870"
          crossOrigin="anonymous"
        />
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
