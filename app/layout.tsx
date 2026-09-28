import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vidzora.vercel.app"),
  title: {
    default: "Vidzora — Fast Social Video Downloader",
    template: "%s | Vidzora"
  },
  description: "Download social videos quickly with Vidzora. A clean, fast and mobile-first downloader.",
  applicationName: "Vidzora",
  keywords: ["video downloader", "TikTok downloader", "social media downloader", "Vidzora"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Vidzora — Fast Social Video Downloader",
    description: "A clean, fast and mobile-first social video downloader.",
    url: "/",
    siteName: "Vidzora",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}