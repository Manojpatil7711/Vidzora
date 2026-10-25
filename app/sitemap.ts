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
  return [
    { url: base + "/", changeFrequency: "weekly", priority: 1 },
    { url: base + "/tools", changeFrequency: "weekly", priority: 0.9 },
    { url: base + "/tools/category/image", changeFrequency: "weekly", priority: 0.8 },
    { url: base + "/tools/category/video", changeFrequency: "weekly", priority: 0.8 },
    { url: base + "/tools/category/pdf", changeFrequency: "weekly", priority: 0.8 },
    { url: base + "/about", changeFrequency: "monthly", priority: 0.5 },
    { url: base + "/contact", changeFrequency: "monthly", priority: 0.5 },
    { url: base + "/privacy", changeFrequency: "yearly", priority: 0.4 },
    { url: base + "/terms", changeFrequency: "yearly", priority: 0.4 },
    ...tools.map((tool) => ({
      url: base + "/tools/" + tool,
      changeFrequency: "weekly" as const,
      priority: 0.8
    }))
  ];
}
