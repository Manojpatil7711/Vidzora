import { NextResponse } from "next/server";
import { URL } from "node:url";

const PLATFORM_HOSTS = {
  TikTok: new Set(["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]),
  Instagram: new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]),
  YouTube: new Set(["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com", "music.youtube.com"]),
  Facebook: new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "mbasic.facebook.com", "fb.watch"]),
  X: new Set(["x.com", "www.x.com", "mobile.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"]),
  Reddit: new Set(["reddit.com", "www.reddit.com", "old.reddit.com", "m.reddit.com", "redd.it"]),
  Pinterest: new Set(["pinterest.com", "www.pinterest.com", "pin.it"]),
  Vimeo: new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]),
  Dailymotion: new Set(["dailymotion.com", "www.dailymotion.com", "m.dailymotion.com", "dai.ly"]),
  Twitch: new Set(["twitch.tv", "www.twitch.tv", "m.twitch.tv", "clips.twitch.tv"]),
  Tumblr: new Set(["tumblr.com", "www.tumblr.com"]),
  Snapchat: new Set(["snapchat.com", "www.snapchat.com", "story.snapchat.com"]),
  VK: new Set(["vk.com", "www.vk.com", "m.vk.com", "vkvideo.ru", "www.vkvideo.ru"]),
  Streamable: new Set(["streamable.com", "www.streamable.com"]),
  SoundCloud: new Set(["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com", "on.soundcloud.com"]),
  Rutube: new Set(["rutube.ru", "www.rutube.ru", "m.rutube.ru"])
} as const;

const MAX_URL_LENGTH = 4096;
const REQUEST_TIMEOUT = 20000;

function detectPlatform(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const host = u.hostname.toLowerCase();

    for (const [platform, hosts] of Object.entries(PLATFORM_HOSTS)) {
      if ((hosts as Set<string>).has(host)) return platform;
      if (platform === "Tumblr" && (host.endsWith(".tumblr.com") || host === "tumblr.com")) return platform;
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeSourceUrl(raw: string) {
  const u = new URL(raw.trim());
  if (u.protocol === "http:") u.protocol = "https:";

  const host = u.hostname.toLowerCase();

  // Normalize YouTube Shorts and short links to a canonical watch URL.
  // This keeps the original query parameters out of the media-engine URL
  // while preserving the actual YouTube video ID.
  if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const shortsMatch = u.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{6,})/);
    if (shortsMatch?.[1]) {
      return `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
    }

    const embedMatch = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]{6,})/);
    if (embedMatch?.[1]) {
      return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
    }

    const videoId = u.searchParams.get("v");
    if (videoId && /^[A-Za-z0-9_-]{6,}$/.test(videoId)) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
  }

  if (host === "youtu.be") {
    const videoId = u.pathname.split("/").filter(Boolean)[0];
    if (videoId && /^[A-Za-z0-9_-]{6,}$/.test(videoId)) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
  }

  return u.toString();
}

function normalizeFormats(data: any, mode: "video" | "audio" = "video") {
  const formats: Array<{ label: string; url: string }> = [];
  const seen = new Set<string>();

  const add = (label: string, url: unknown) => {
    if (typeof url !== "string" || !/^https?:\/\//i.test(url) || seen.has(url)) return;
    seen.add(url);
    formats.push({ label, url });
  };

  if (data?.status === "picker" && Array.isArray(data.picker)) {
    data.picker.forEach((item: any, index: number) => {
      if (item?.type === "video") add("Video • Item " + (index + 1), item.url);
      else if (item?.type === "photo") add("Photo • Item " + (index + 1), item.url);
      else if (item?.type === "gif") add("GIF • Item " + (index + 1), item.url);
    });
    if (typeof data.audio === "string") add("Audio", data.audio);
    return formats;
  }

  if (mode === "audio") {
    add("Audio • MP3", data?.url);
    add("Audio • MP3", data?.audio);
  } else {
    add("Video • Best available", data?.url);
    add("Audio", data?.audio);
  }
  add("Video • HD", data?.hd);
  add("Video • 1080p", data?.video1080);
  add("Video • 720p", data?.video720);
  add("Video • 480p", data?.video480);
  return formats;
}

async function callProvider(raw: string, base: string, apiKey?: string, mode: "video" | "audio" = "video") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const endpoint = new URL(base);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        ...(apiKey ? { Authorization: "Api-Key " + apiKey } : {})
      },
      body: JSON.stringify({
        url: raw,
        videoQuality: "max",
        alwaysProxy: false,
        disableMetadata: false,
        audioFormat: "mp3",
        downloadMode: mode === "audio" ? "audio" : "auto",
        filenameStyle: "basic"
      }),
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) throw new Error("Download provider request failed.");
    const data = await response.json();
    if (data?.status === "error") throw new Error(data?.error?.code || "Provider could not process this link.");

    const formats = normalizeFormats(data, mode);
    if (!formats.length) throw new Error("No downloadable format was returned.");

    return {
      formats,
      title: data?.filename || data?.title || "Ready to download",
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
    const response = await fetch("https://www.tikwm.com/api/?url=" + encodeURIComponent(raw), {
      headers: { "user-agent": "Vidzora/1.0" },
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) throw new Error("TikTok provider request failed.");
    const data = await response.json();
    if (data?.code !== 0 || !data?.data) throw new Error("TikTok video is unavailable.");

    const formats = [
      data.data.hdplay ? { label: "Video • HD", url: data.data.hdplay } : null,
      data.data.play ? { label: "Video • No watermark", url: data.data.play } : null,
      data.data.wmplay ? { label: "Video • Watermark", url: data.data.wmplay } : null,
      data.data.music ? { label: "Audio", url: data.data.music } : null
    ].filter(Boolean) as Array<{ label: string; url: string }>;

    if (!formats.length) throw new Error("No downloadable format was returned.");
    return { formats, title: data.data.title || "TikTok video", thumbnail: data.data.cover };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json({ success: false, error: "JSON requests are required." }, { status: 415 });
  }

  try {
    const body = await req.json();
    const input = typeof body?.url === "string" ? body.url.trim() : "";
    const mode = body?.mode === "audio" ? "audio" : "video";

    if (!input || input.length > MAX_URL_LENGTH) {
      return NextResponse.json({ success: false, error: "Please enter a valid public media URL." }, { status: 400 });
    }

    let raw: string;
    try {
      raw = normalizeSourceUrl(input);
    } catch {
      return NextResponse.json({ success: false, error: "Please enter a valid public media URL." }, { status: 400 });
    }

    const platform = detectPlatform(raw);
    if (!platform) {
      return NextResponse.json({ success: false, error: "Unsupported link. Paste a public link from one of the 16 supported platforms." }, { status: 400 });
    }

    const providers: Array<{ base: string; key?: string }> = [];
    const primaryBase = process.env.COBALT_API_URL?.trim() || "https://cobalt-production-45cd.up.railway.app/";
    const primaryKey = process.env.COBALT_API_KEY?.trim();
    const secondaryBase = process.env.SECONDARY_PROVIDER_URL?.trim() || "https://api.cobalt.tools/";
    const secondaryKey = process.env.SECONDARY_PROVIDER_API_KEY?.trim();

    for (const provider of [
      { base: primaryBase, key: primaryKey },
      { base: secondaryBase, key: secondaryKey }
    ]) {
      if (provider.base && !providers.some((p) => p.base === provider.base)) providers.push(provider);
    }

    type ProviderResult = Awaited<ReturnType<typeof callProvider>>;
    let result: ProviderResult | null = null;
    let lastProviderError = "";

    for (const provider of providers) {
      try {
        result = await callProvider(raw, provider.base, provider.key, mode);
        if (result) break;
      } catch (error: any) {
        lastProviderError = error?.message || "Provider failed.";
      }
    }

    if (!result && platform === "TikTok") {
      try {
        result = await callTikTokFallback(raw);
      } catch (error: any) {
        lastProviderError = error?.message || "TikTok provider failed.";
      }
    }

    if (!result) {
      return NextResponse.json({
        success: false,
        platform,
        error: lastProviderError
          ? platform + " provider is temporarily unavailable. Please try again with another public link."
          : platform + " was detected, but no media format was returned."
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      platform,
      title: result.title,
      thumbnail: result.thumbnail,
      formats: result.formats
    });
  } catch (e: any) {
    const message = e?.name === "AbortError" ? "The media engine timed out. Please try again." : e?.message || "Unable to process this link.";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
