import type { MetadataRoute } from "next";

const siteUrl = "https://vidzora-pi.vercel.app";

/**
 * Public, canonical, indexable pages only.
 * Do not add API routes, query-string URLs, preview deployments, or
 * unsupported tool slugs here. Keep this list aligned with app routes.
 */
const toolSlugs = [
  // Image tools
  "image-compressor",
  "image-size-reducer",
  "image-resizer",
  "image-converter",
  "image-cropper",

  // PDF tools
  "jpg-to-pdf",
  "pdf-to-jpg",
  "compress-pdf",
  "merge-pdf",

  // Video and subtitle tools
  "video-frame-extractor",
  "video-thumbnail-extractor",
  "video-metadata",
  "video-audio-extractor",
  "video-converter-compressor",
  "video-gif-creator",
  "subtitle-converter"
] as const;

const staticPages = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/tools", changeFrequency: "weekly", priority: 0.9 },

  // Category landing pages
  { path: "/tools/category/image", changeFrequency: "weekly", priority: 0.8 },
  { path: "/tools/category/video", changeFrequency: "weekly", priority: 0.8 },
  { path: "/tools/category/pdf", changeFrequency: "weekly", priority: 0.8 },

  // Trust and support pages
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 }
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: `${siteUrl}${page.path}`,
    changeFrequency: page.changeFrequency,
    priority: page.priority
  }));

  const tools: MetadataRoute.Sitemap = toolSlugs.map((slug) => ({
    url: `${siteUrl}/tools/${slug}`,
    changeFrequency: "monthly",
    priority: 0.7
  }));

  return [...pages, ...tools];
}
