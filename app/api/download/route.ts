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

async function resolveRedditShareUrl(raw: string) {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.toLowerCase();
    const isRedditShare =
      (host === "reddit.com" || host === "www.reddit.com" || host === "old.reddit.com" || host === "m.reddit.com") &&
      /\/s\/[A-Za-z0-9_-]+/.test(u.pathname);

    if (!isRedditShare) return raw;

    // Reddit share URLs can expose the canonical post through their JSON
    // representation even when the normal HTML request stays on /s/.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const jsonUrl = new URL(u.toString());
      jsonUrl.pathname = jsonUrl.pathname.replace(/\/$/, "") + ".json";
      const response = await fetch(jsonUrl.toString(), {
        method: "GET",
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0 (compatible; Vidzora/1.0)"
        },
        redirect: "follow",
        signal: controller.signal,
        cache: "no-store"
      });

      if (response.ok) {
        const data = await response.json();
        const post = data?.[0]?.data?.children?.[0]?.data;
        const permalink = typeof post?.permalink === "string" ? post.permalink : "";
        if (/^\/r\/[^/]+\/comments\//.test(permalink)) {
          return new URL(permalink, "https://www.reddit.com").toString();
        }
        if (response.url && /\/comments\//.test(new URL(response.url).pathname)) {
          return response.url.replace(/\.json(?:\?.*)?$/, "");
        }
      }
    } catch {
      // Fall through to the normal redirect/HTML resolver.
    } finally {
      clearTimeout(timer);
    }

    // Keep the resolver simple and build-safe: Reddit JSON first, then direct HTML.
    const fallbackController = new AbortController();
    const fallbackTimer = setTimeout(() => fallbackController.abort(), 8000);
    try {
      const response = await fetch(u.toString(), {
        method: "GET",
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "Mozilla/5.0 (compatible; Vidzora/1.0)"
        },
        redirect: "follow",
        signal: fallbackController.signal,
        cache: "no-store"
      });

      if (response.url && /\/comments\//.test(new URL(response.url).pathname)) {
        return response.url;
      }

      const html = await response.text();
      const canonical =
        html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ||
        html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<meta[^>]+name=["']twitter:url["'][^>]+content=["']([^"']+)["']/i)?.[1];

      if (canonical) {
        try {
          const resolved = new URL(canonical, u.origin);
          if (
            (resolved.hostname === "www.reddit.com" ||
              resolved.hostname === "reddit.com" ||
              resolved.hostname === "old.reddit.com") &&
            /^\/r\/[^/]+\/comments\//.test(resolved.pathname)
          ) {
            return resolved.toString();
          }
        } catch {
          // Keep trying with the original share URL.
        }
      }
    } finally {
      clearTimeout(fallbackTimer);
    }
  } catch {
    // Keep the original URL so the normal provider flow can still try it.
  }
  return raw;
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

async function callPipedYouTubeFallback(raw: string, mode: "video" | "audio" = "video") {
  const match = raw.match(/(?:v=|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{6,})/);
  const videoId = match?.[1];
  if (!videoId) throw new Error("YouTube video ID could not be extracted.");

  const instances = [
    process.env.PIPED_API_URL?.trim(),
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.leptons.xyz"
  ].filter((value): value is string => Boolean(value));

  for (const base of [...new Set(instances)]) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const response = await fetch(base.replace(/\/$/, "") + "/streams/" + encodeURIComponent(videoId), {
        headers: { "accept": "application/json", "user-agent": "Vidzora/1.0" },
        signal: controller.signal,
        cache: "no-store"
      });
      if (!response.ok) continue;
      const data = await response.json();

      if (mode === "audio") {
        const audio = Array.isArray(data?.audioStreams)
          ? data.audioStreams.find((s: any) => s?.url && /^https?:\/\//i.test(s.url))
          : null;
        if (audio?.url) {
          return {
            formats: [{ label: "Audio • MP3", url: audio.url }],
            title: data?.title || "YouTube audio",
            thumbnail: data?.thumbnailUrl
          };
        }
      } else {
        const streams = Array.isArray(data?.videoStreams) ? data.videoStreams : [];
        const playable = streams
          .filter((s: any) => s?.url && s?.mimeType === "video/mp4" && s?.videoOnly === false)
          .sort((a: any, b: any) => (Number(b?.height) || 0) - (Number(a?.height) || 0));
        if (playable.length) {
          return {
            formats: playable.slice(0, 5).map((s: any) => ({
              label: "Video • " + (s.quality || ((s.height || 0) + "p")),
              url: s.url
            })),
            title: data?.title || "YouTube video",
            thumbnail: data?.thumbnailUrl
          };
        }
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Piped YouTube fallback did not return a playable stream.");
}

async function callRedditFallback(raw: string) {
  if (raw.includes("/s/")) throw new Error("Reddit share link could not be resolved.");

  const u = new URL(raw);
  const commentsMatch = u.pathname.match(/\/comments\/([A-Za-z0-9]+)(?:\/[^/]*)?/);
  if (!commentsMatch?.[1]) throw new Error("Reddit post ID could not be extracted.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const jsonUrl = new URL(u.toString());
    jsonUrl.pathname = jsonUrl.pathname.replace(/\/$/, "") + ".json";
    jsonUrl.search = "?raw_json=1";

    const response = await fetch(jsonUrl.toString(), {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (compatible; Vidzora/1.0)"
      },
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Reddit post API request failed.");

    const data = await response.json();
    const post = data?.[0]?.data?.children?.[0]?.data;
    if (!post) throw new Error("Reddit post was not found.");

    const media = post?.secure_media?.reddit_video || post?.media?.reddit_video;
    const formats: Array<{ label: string; url: string }> = [];

    if (typeof media?.fallback_url === "string" && /^https?:\/\//i.test(media.fallback_url)) {
      formats.push({
        label: "Video • Direct MP4",
        url: media.fallback_url
      });
    }

    const mediaUrls = Array.isArray(post?.media_metadata)
      ? []
      : Array.isArray(post?.mediaUrls)
        ? post.mediaUrls
        : [];

    for (const url of mediaUrls) {
      if (typeof url === "string" && /^https?:\/\//i.test(url)) {
        formats.push({ label: "Media", url });
      }
    }

    if (!formats.length) {
      const direct = typeof post?.url_overridden_by_dest === "string" ? post.url_overridden_by_dest : "";
      if (/^https?:\/\//i.test(direct)) formats.push({ label: "Media", url: direct });
    }

    if (!formats.length) throw new Error("Reddit did not expose a direct media URL.");
    return {
      formats,
      title: post?.title || "Reddit media",
      thumbnail: post?.thumbnail && /^https?:\/\//i.test(post.thumbnail) ? post.thumbnail : undefined
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
      raw = await resolveRedditShareUrl(input);
      raw = normalizeSourceUrl(raw);
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

    if (!result && platform === "YouTube") {
      try {
        result = await callPipedYouTubeFallback(raw, mode);
      } catch (error: any) {
        lastProviderError = error?.message || "YouTube fallback provider failed.";
      }
    }

    if (!result && platform === "Reddit") {
      try {
        result = await callRedditFallback(raw);
      } catch (error: any) {
        lastProviderError = error?.message || "Reddit fallback provider failed.";
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
