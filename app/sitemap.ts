import type { MetadataRoute } from "next";

const base = "https://vidzora.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: base + "/privacy", lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: base + "/terms", lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 }
  ];
}
