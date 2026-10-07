import type { MetadataRoute } from "next";

const base = "https://vidzora-pi.vercel.app";

const tools = [
  "image-compressor",
  "image-size-reducer",
  "image-resizer",
  "jpg-to-pdf",
  "pdf-to-jpg",
  "compress-pdf",
  "merge-pdf",
  "image-converter",
  "image-cropper",
  "video-frame-extractor",
  "video-thumbnail-extractor",
  "video-metadata",
  "video-audio-extractor",
  "video-converter-compressor",
  "video-gif-creator",
  "subtitle-converter"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: base + "/tools", lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: base + "/privacy", lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: base + "/terms", lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    ...tools.map((tool) => ({
      url: base + "/tools/" + tool,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8
    }))
  ];
}
