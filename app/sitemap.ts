import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://vidzora.vercel.app";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: base + "/#how", changeFrequency: "monthly", priority: 0.7 },
    { url: base + "/#faq", changeFrequency: "monthly", priority: 0.6 }
  ];
}
