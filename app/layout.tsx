import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://vidzora.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Vidzora — Fast Social Video Downloader", template: "%s | Vidzora" },
  description: "Fast, simple social video downloader. Paste a public video link and get a downloadable result in seconds.",
  keywords: ["video downloader","social video downloader","TikTok downloader","download videos online","Vidzora"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Vidzora — Fast Social Video Downloader",
    description: "Download public social videos with a fast, clean and mobile-first experience.",
    url: siteUrl,
    siteName: "Vidzora",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context":"https://schema.org",
    "@graph":[
      {"@type":"WebSite","@id":siteUrl+"/#website","url":siteUrl,"name":"Vidzora","description":"Fast social video downloader."},
      {"@type":"WebApplication","@id":siteUrl+"/#app","name":"Vidzora","url":siteUrl,"applicationCategory":"MultimediaApplication","operatingSystem":"Web","isAccessibleForFree":true}
    ]
  };
  return <html lang="en"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}} /></body></html>;
}