import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://vidzora-pi.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Vidzora — Fast Social Video Downloader", template: "%s | Vidzora" },
  description: "Fast, simple social video downloader. Paste a public video link and get a downloadable result in seconds.",
  keywords: ["video downloader", "social video downloader", "TikTok downloader", "download videos online", "Vidzora"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Vidzora — Fast Social Video Downloader",
    description: "Download public social videos with a fast, clean and mobile-first experience.",
    url: siteUrl,
    siteName: "Vidzora",
    type: "website",
  },
  robots: { index: true, follow: true },
  verification: { google: "4dCJJ9eYqXHJqOKHlvTEzfBfLo0TO4k1fthx0LYNL2E" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {"@type": "WebSite", "@id": siteUrl + "/#website", "url": siteUrl, "name": "Vidzora", "description": "Fast social video downloader."},
      {"@type": "WebApplication", "@id": siteUrl + "/#app", "name": "Vidzora", "url": siteUrl, "applicationCategory": "MultimediaApplication", "operatingSystem": "Web", "isAccessibleForFree": true}
    ]
  };

  return (
    <html lang="en">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9655050547873870"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}