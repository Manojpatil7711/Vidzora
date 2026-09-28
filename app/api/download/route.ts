import { NextResponse } from "next/server";
import { URL } from "node:url";

const PLATFORM_HOSTS = {
  TikTok: new Set(["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]),
  Instagram: new Set(["instagram.com", "www.instagram.com"]),
  YouTube: new Set(["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"]),
  Facebook: new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"]),
  X: new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"])
} as const;

const MAX_URL_LENGTH = 2048;
const REQUEST_TIMEOUT = 15000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientKey(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonymous";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (current.count >= RATE_LIMIT) return true;
  current.count += 1;
  return false;
}

function detectPlatform(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    for (const [platform, hosts] of Object.entries(PLATFORM_HOSTS)) {
      if ((hosts as Set<string>).has(host)) return platform;
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeFormats(data: any) {
  const formats: Array<{ label: string; url: string }> = [];
  const add = (label: string, url: unknown) => {
    if (typeof url === "string" && /^https?:\/\//i.test(url)) formats.push({ label, url });
  };

  if (data?.status === "picker" && Array.isArray(data.picker)) {
    data.picker.forEach((item: any, index: number) => {
      if (item?.type === "video") add("Video • Item " + (index + 1), item.url);
      else if (item?.type === "gif") add("GIF • Item " + (index + 1), item.url);
    });
    if (data.audio) add("Audio", data.audio);
    return formats;
  }

  add("Video • Best available", data?.url);
  add("Audio", data?.audio);
  add("Video • HD", data?.hd);
  add("Video • 1080p", data?.video1080);
  add("Video • 720p", data?.video720);
  add("Video • 480p", data?.video480);
  return formats;
}

async function callProvider(raw: string, base: string, apiKey?: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const endpoint = new URL(base);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        ...(apiKey ? { Authorization: `Api-Key ${apiKey}` } : {})
      },
      body: JSON.stringify({
        url: raw,
        videoQuality: "max",
        audioFormat: "mp3",
        downloadMode: "auto",
        filenameStyle: "basic"
      }),
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) throw new Error("Download provider request failed.");
    const data = await response.json();

    if (data?.status === "error") {
      throw new Error("The provider could not process this link.");
    }

    const formats = normalizeFormats(data);
    if (!formats.length && typeof data?.url === "string") {
      formats.push({ label: "Video • Download", url: data.url });
    }
    if (!formats.length) throw new Error("No downloadable format was returned.");

    return {
      formats,
      title: data?.filename || "Ready to download",
      thumbnail: data?.thumbnail
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callTikTokFallback(raw: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(
      "https://www.tikwm.com/api/?url=" + encodeURIComponent(raw),
      {
        headers: { "user-agent": "Vidzora/1.0" },
        signal: controller.signal,
        cache: "no-store"
      }
    );

    if (!response.ok) throw new Error("TikTok provider request failed.");
    const data = await response.json();
    if (data?.code !== 0 || !data?.data) {
      throw new Error("This video is unavailable or cannot be processed.");
    }

    const formats = [
      data.data.hdplay ? { label: "Video • HD", url: data.data.hdplay } : null,
      data.data.play ? { label: "Video • No watermark", url: data.data.play } : null,
      data.data.wmplay ? { label: "Video • Watermark", url: data.data.wmplay } : null,
      data.data.music ? { label: "Audio", url: data.data.music } : null
    ].filter(Boolean) as Array<{ label: string; url: string }>;

    if (!formats.length) throw new Error("No downloadable format was returned.");

    return {
      formats,
      title: data.data.title || "TikTok video",
      thumbnail: data.data.cover
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  const rateKey = getClientKey(req);
  if (isRateLimited(rateKey)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { success: false, error: "JSON requests are required." },
      { status: 415 }
    );
  }

  try {
    const body = await req.json();
    const raw = typeof body?.url === "string" ? body.url.trim() : "";

    if (!raw || raw.length > MAX_URL_LENGTH) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid public video URL." },
        { status: 400 }
      );
    }

    const platform = detectPlatform(raw);
    if (!platform) {
      return NextResponse.json(
        { success: false, error: "Unsupported link. Paste a TikTok, Instagram, YouTube, Facebook or X video URL." },
        { status: 400 }
      );
    }

    // Provider chain: primary Cobalt instance -> secondary compatible instance -> TikTok fallback.
    // Provider URLs and keys stay server-side in Vercel Environment Variables.
    const providers = [
      { base: process.env.COBALT_API_URL?.trim(), key: process.env.COBALT_API_KEY?.trim() },
      { base: process.env.SECONDARY_PROVIDER_URL?.trim(), key: process.env.SECONDARY_PROVIDER_API_KEY?.trim() }
    ].filter((p): p is { base: string; key?: string } => Boolean(p.base));

    let result: Awaited<ReturnType<typeof callProvider>> = null;
    let lastProviderError = "";
    for (const provider of providers) {
      try {
        result = await callProvider(raw, provider.base, provider.key);
        if (result) break;
      } catch (error: any) {
        lastProviderError = error?.message || "Provider failed.";
      }
    }

    if (!result && platform === "TikTok") {
      result = await callTikTokFallback(raw);
    }

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          platform,
          error: lastProviderError
            ? platform + " provider failed. Please try again with another public link."
            : platform + " is detected, but no compatible download provider is connected yet."
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      platform,
      title: result.title,
      thumbnail: result.thumbnail,
      formats: result.formats
    });
  } catch (e: any) {
    const message =
      e?.name === "AbortError"
        ? "The request timed out. Please try again."
        : e?.message || "Unable to process this link.";

    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
