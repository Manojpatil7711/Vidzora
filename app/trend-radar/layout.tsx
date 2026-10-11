import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trend Radar — Trending Topics for Content Creators",
  description:
    "Discover country-specific search trends and news signals, save creator interests, and turn topics into video ideas with source links.",
  alternates: {
    canonical: "https://vidzora-pi.vercel.app/trend-radar",
  },
  openGraph: {
    title: "Trend Radar — Discover Your Next Creator Topic",
    description:
      "Find fresh topics, verify sources, and plan your next video with Vidzora Trend Radar.",
    url: "https://vidzora-pi.vercel.app/trend-radar",
    siteName: "Vidzora",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function TrendRadarLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
