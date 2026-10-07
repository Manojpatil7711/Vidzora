import type { MetadataRoute } from "next";

const base = "https://vidzora-pi.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
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

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: base + "/privacy", lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: base + "/terms", lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    ...tools.map((tool) => ({
      url: base + "/tools/" + tool,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8
    }))
  ];
}
