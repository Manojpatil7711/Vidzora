import { NextResponse } from "next/server";
import { URL } from "node:url";
import { createHmac, randomUUID } from "node:crypto";

const PLATFORM_HOSTS = {
  TikTok: new Set(["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]),
  Instagram: new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]),
  YouTube: new Set(["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com", "music.youtube.com"]),
  Facebook: new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "mbasic.facebook.com", "fb.watch"]),
  X: new Set(["x.com", "www.x.com", "mobile.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"]),
  Reddit: new Set(["reddit.com", "www.reddit.com", "old.reddit.com", "m.reddit.com", "redd.it", "v.redd.it"]),
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
const REQUEST_TIMEOUT = 15000;
const YOUTUBE_PROVIDER_TIMEOUT = 10000;
const PIPED_INSTANCE_TIMEOUT = 4500;
const REDDIT_RESOLVE_TIMEOUT = 12000;
const REDDIT_PROVIDER_TIMEOUT = 7000;
const DOWNLOAD_TOKEN_SECRET = process.env.DOWNLOAD_TOKEN_SECRET?.trim() || process.env.COBALT_API_KEY?.trim() || "";

function createDownloadToken(target: string) {
  if (!DOWNLOAD_TOKEN_SECRET) throw new Error("Download signing secret is not configured.");
  const payload = Buffer.from(JSON.stringify({ url: target, exp: Date.now() + 10 * 60 * 1000 }), "utf8").toString("base64url");
  const signature = createHmac("sha256", DOWNLOAD_TOKEN_SECRET).update(payload).digest("base64url");
  return payload + "." + signature;
}

// Allow the server-side orchestration layer enough time to try the primary
// engine and its safe fallbacks without making the browser wait indefinitely.
export const maxDuration = 60;

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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function resolveRedditShareUrl(raw: string) {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.toLowerCase();
    if (host === "redd.it" && /^[A-Za-z0-9]+$/.test(u.pathname.replace(/^\//, ""))) {
      const postId = u.pathname.replace(/^\//, "");
      return `https://www.reddit.com/comments/${postId}`;
    }

    const isShare =
      ["reddit.com", "www.reddit.com", "old.reddit.com", "m.reddit.com"].includes(host) &&
      /\/s\/[A-Za-z0-9_-]+/.test(u.pathname);
    if (!isShare) return raw;

    try {
      const response = await fetchWithTimeout(u.toString(), {
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "Mozilla/5.0 (compatible; Vidzora/1.0)"
        },
        redirect: "follow"
      }, REDDIT_RESOLVE_TIMEOUT);

      if (response.url && /\/r\/[^/]+\/comments\//.test(new URL(response.url).pathname)) {
        return response.url;
      }
    } catch {}

    try {
      const jsonUrl = new URL(u.toString());
      jsonUrl.pathname = jsonUrl.pathname.replace(/\/$/, "") + ".json";
      const response = await fetchWithTimeout(jsonUrl.toString(), {
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0 (compatible; Vidzora/1.0)"
        },
        redirect: "follow"
      }, REDDIT_RESOLVE_TIMEOUT);

      if (response.ok) {
        const data = await response.json();
        const post = data?.[0]?.data?.children?.[0]?.data;
        const permalink = typeof post?.permalink === "string" ? post.permalink : "";
        if (/^\/r\/[^/]+\/comments\//.test(permalink)) {
          return new URL(permalink, "https://www.reddit.com").toString();
        }
      }
    } catch {}

    try {
      const oembed = "https://www.reddit.com/oembed?url=" + encodeURIComponent(u.toString()) + "&format=json";
      const response = await fetchWithTimeout(oembed, {
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0 (compatible; Vidzora/1.0)"
        }
      }, REDDIT_RESOLVE_TIMEOUT);
      if (response.ok) {
        const data = await response.json();
        const html = typeof data?.html === "string" ? data.html : "";
        const marker = 'data-embed-url="';
        const start = html.indexOf(marker);
        if (start >= 0) {
          const end = html.indexOf('"', start + marker.length);
          if (end > start) {
            const candidate = html.slice(start + marker.length, end).replace(/&amp;/g, "&");
            if (candidate.includes("/comments/")) return candidate;
          }
        }
      }
    } catch {}

    // Reddit share redirects can return a bot-check page to cloud/serverless
    // IPs instead of exposing the Location header. Use Jina as a last-mile
    // reader and extract canonical/og:url/comments URLs from its output.
    for (const proxyHost of ["www.reddit.com", "old.reddit.com"]) {
      try {
        const proxy = "https://r.jina.ai/http://" + proxyHost + u.pathname + u.search;
        const response = await fetchWithTimeout(proxy, {
          headers: { accept: "text/plain", "user-agent": "Vidzora/1.0" }
        }, REDDIT_RESOLVE_TIMEOUT);
        if (!response.ok) continue;

        const text = await response.text();

        const directCandidates = [
          text.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1],
          text.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)?.[1],
          text.match(new RegExp("https?://(?:www\\.|old\\.)?reddit\\.com/r/[^\\s<>]+/comments/[A-Za-z0-9]+[^\\s<>]*", "i"))?.[0],
          text.match(new RegExp("https?://(?:www\\.|old\\.)?reddit\\.com/comments/[A-Za-z0-9]+[^\\s<>]*", "i"))?.[0]
        ].filter((value): value is string => Boolean(value));

        for (const candidateRaw of directCandidates) {
          try {
            const candidate = new URL(candidateRaw.replace(/&amp;/g, "&"));
            if (candidate.pathname.includes("/comments/")) {
              candidate.search = "";
              candidate.hash = "";
              return candidate.toString();
            }
          } catch {}
        }
      } catch {}
    }
  } catch {}

  return raw;
}

function normalizeSourceUrl(raw: string) {
  const u = new URL(raw.trim());
  if (u.protocol === "http:") u.protocol = "https:";
  const host = u.hostname.toLowerCase();

  if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
    const shorts = u.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{6,})/);
    if (shorts?.[1]) return `https://www.youtube.com/watch?v=${shorts[1]}`;
    const embed = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]{6,})/);
    if (embed?.[1]) return `https://www.youtube.com/watch?v=${embed[1]}`;
    const id = u.searchParams.get("v");
    if (id && /^[A-Za-z0-9_-]{6,}$/.test(id)) return `https://www.youtube.com/watch?v=${id}`;
  }

  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    if (id && /^[A-Za-z0-9_-]{6,}$/.test(id)) return `https://www.youtube.com/watch?v=${id}`;
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

  // Newer Cobalt versions may return local-processing instead of one URL.
  // The tunnel array contains the server-owned downloadable outputs.
  if (data?.status === "local-processing" && Array.isArray(data.tunnel)) {
    data.tunnel.forEach((url: unknown, index: number) => {
      if (mode === "audio") add("Audio • MP3", url);
      else add("Video • " + (index + 1), url);
    });
    if (mode === "audio" && data?.audio?.url) add("Audio • MP3", data.audio.url);
    if (formats.length) return formats;
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

async function callProvider(raw: string, base: string, apiKey?: string, mode: "video" | "audio" = "video", alwaysProxy = false, timeoutMs = REQUEST_TIMEOUT) {
  let lastError: unknown = null;

  // A short, bounded retry handles transient Railway/network 5xx/429 failures
  // without creating an endless retry loop or noticeably delaying normal users.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(base, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          ...(apiKey ? { Authorization: "Api-Key " + apiKey } : {})
        },
        body: JSON.stringify({
          url: raw,
          videoQuality: "max",
          // Prefer a server-owned Cobalt tunnel for the primary engine. This avoids
          // exposing short-lived origin URLs to the browser and gives the user a
          // stable download target for the duration of the tunnel lifespan.
          alwaysProxy,
          disableMetadata: false,
          audioFormat: "mp3",
          downloadMode: mode === "audio" ? "audio" : "auto",
          filenameStyle: "basic",
          audioBitrate: "128",
          youtubeVideoCodec: "h264",
          youtubeVideoContainer: "mp4"
        })
      }, timeoutMs);

      if (!response.ok) {
        const transient = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
        if (transient && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 350));
          continue;
        }
        throw new Error("Download provider request failed.");
      }

      const data = await response.json();
      if (data?.status === "error") {
        const code = typeof data?.error?.code === "string" ? data.error.code : "";
        const service = typeof data?.error?.context?.service === "string" ? data.error.context.service : "";
        const error = new Error(code || "Provider could not process this link.");
        (error as any).providerCode = code;
        (error as any).providerService = service;
        throw error;
      }
      const formats = normalizeFormats(data, mode);
      if (!formats.length) throw new Error("No downloadable format was returned.");

      return { formats, title: data?.filename || data?.title || "Ready to download", thumbnail: data?.thumbnail };
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Download provider request failed.");
}

async function callYouTubeWorker(raw: string) {
  const workerBase = process.env.YOUTUBE_WORKER_URL?.trim().replace(/\/$/, "");
  if (!workerBase) return null;

  const workerSecret = process.env.YOUTUBE_WORKER_SECRET?.trim();
  const response = await fetchWithTimeout(workerBase + "/v1/youtube", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(workerSecret ? { Authorization: "Bearer " + workerSecret } : {})
    },
    body: JSON.stringify({ url: raw })
  }, 1000 * 20);

  if (!response.ok) throw new Error("YouTube worker request failed.");
  const data = await response.json();
  if (!data?.success || !Array.isArray(data?.formats) || !data.formats.length) {
    throw new Error("YouTube worker returned no downloadable format.");
  }
  return {
    formats: data.formats,
    title: data.title || "YouTube video",
    thumbnail: data.thumbnail
  };
}

async function callPipedYouTubeFallback(raw: string, mode: "video" | "audio" = "video") {
  const match = raw.match(/(?:v=|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{6,})/);
  const videoId = match?.[1];
  if (!videoId) throw new Error("YouTube video ID could not be extracted.");

  const instances = [
    process.env.PIPED_API_URL?.trim(),
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.leptons.xyz",
    "https://pipedapi.syncpundit.io",
    "https://api-piped.mha.fi",
    "https://piped-api.garudalinux.org",
    "https://pipedapi.tokhmi.xyz",
    "https://pipedapi.moomoo.me",
    "https://api.piped.yt",
    "https://pipedapi.adminforge.de"
  ]
    .filter((value): value is string => Boolean(value));

  for (const base of [...new Set(instances)]) {
    try {
      const response = await fetchWithTimeout(base.replace(/\/$/, "") + "/streams/" + encodeURIComponent(videoId), {
        headers: { accept: "application/json", "user-agent": "Vidzora/1.0" }
      }, PIPED_INSTANCE_TIMEOUT);
      if (!response.ok) continue;
      const data = await response.json();

      if (mode === "audio") {
        const audio = Array.isArray(data?.audioStreams)
          ? data.audioStreams.find((s: any) => s?.url && /^https?:\/\//i.test(s.url))
          : null;
        if (audio?.url) return { formats: [{ label: "Audio • MP3", url: audio.url }], title: data?.title || "YouTube audio", thumbnail: data?.thumbnailUrl };
      } else {
        const streams = Array.isArray(data?.videoStreams) ? data.videoStreams : [];
        const playable = streams
          .filter((s: any) => s?.url && s?.mimeType === "video/mp4" && s?.videoOnly === false)
          .sort((a: any, b: any) => (Number(b?.height) || 0) - (Number(a?.height) || 0));
        if (playable.length) {
          return {
            formats: playable.slice(0, 5).map((s: any) => ({ label: "Video • " + (s.quality || ((s.height || 0) + "p")), url: s.url })),
            title: data?.title || "YouTube video",
            thumbnail: data?.thumbnailUrl
          };
        }
      }
    } catch {}
  }

  throw new Error("Piped YouTube fallback did not return a playable stream.");
}

async function callRedditFallback(raw: string) {
  if (raw.includes("/s/")) throw new Error("REDDIT_SHARE_UNRESOLVED");

  const u = new URL(raw);

  if (u.hostname.toLowerCase() === "v.redd.it" && /\.(mp4|webm|mov|gif)(?:[?#]|$)/i.test(u.toString())) {
    return {
      formats: [{ label: "Video • Direct MP4", url: u.toString() }],
      title: "Reddit video",
      thumbnail: undefined
    };
  }

  const match = u.pathname.match(/\/comments\/([A-Za-z0-9]+)/);
  if (!match?.[1]) throw new Error("REDDIT_POST_ID_MISSING");

  const postId = match[1];
  const basePath = u.pathname.endsWith("/") ? u.pathname.slice(0, -1) : u.pathname;

  // Prefer the canonical short JSON endpoint first. It avoids failures caused
  // by long /r/subreddit/comments/title/id paths and works for public posts.
  const candidates = [
    `https://www.reddit.com/comments/${postId}.json?raw_json=1`,
    `https://www.reddit.com/comments/${postId}.json`,
    `https://old.reddit.com/comments/${postId}.json?raw_json=1`,
    `https://www.reddit.com${basePath}.json?raw_json=1`,
    `https://old.reddit.com${basePath}.json?raw_json=1`,
    `https://api.reddit.com/comments/${postId}.json?raw_json=1`
  ];

  const jinaCandidates = candidates.slice(0, 3).map((endpoint) =>
    "https://r.jina.ai/http://" + endpoint.replace(/^https?:\/\//, "")
  );

  let post: any = null;
  let lastStatus = 0;

  for (const endpoint of [...candidates, ...jinaCandidates]) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        headers: {
          accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
          "user-agent": "Mozilla/5.0 (compatible; Vidzora/1.0)"
        }
      }, REDDIT_PROVIDER_TIMEOUT);

      lastStatus = response.status;
      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") || "";
      const body = await response.text();
      let data: any;

      try {
        data = JSON.parse(body);
      } catch {
        // Jina can return the Reddit JSON as text/markdown. Try to recover a
        // JSON object from that response instead of assuming application/json.
        const first = body.indexOf("[");
        const last = body.lastIndexOf("]");
        if (first >= 0 && last > first) {
          try { data = JSON.parse(body.slice(first, last + 1)); } catch {}
        }
      }

      const candidate =
        data?.[0]?.data?.children?.[0]?.data ||
        data?.data?.children?.[0]?.data ||
        data?.post ||
        data;

      if (candidate && (candidate.id || candidate.name || candidate.title)) {
        post = candidate;
        break;
      }

      if (contentType.includes("text/html")) {
        const mediaMatch = body.match(/https:\/\/v\.redd\.it\/[^"\\\s]+(?:\.mp4[^"\\\s]*)?/);
        if (mediaMatch?.[0]) {
          post = { title: "Reddit video", secure_media: { reddit_video: { fallback_url: mediaMatch[0] } } };
          break;
        }
      }
    } catch {}
  }

  if (!post) throw new Error("REDDIT_POST_FETCH_FAILED_" + lastStatus);

  const posts = [post, ...(Array.isArray(post?.crosspost_parent_list) ? post.crosspost_parent_list : [])];
  const formats: Array<{ label: string; url: string }> = [];
  const seen = new Set<string>();

  const add = (label: string, value: unknown) => {
    if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return;
    const url = value.replace(/&amp;/g, "&");
    if (seen.has(url)) return;
    seen.add(url);
    formats.push({ label, url });
  };

  for (const item of posts) {
    const media = item?.secure_media?.reddit_video || item?.media?.reddit_video || item?.media?.redditVideo;
    add("Video • Direct MP4", media?.fallback_url || media?.fallbackUrl);
    add("Video • DASH", media?.dash_url || media?.dashUrl);
    add("Video • HLS", media?.hls_url || media?.hlsUrl);

    const mediaUrls = media?.mediaUrls || item?.mediaUrls;
    if (Array.isArray(mediaUrls)) for (const url of mediaUrls) add("Video • Media", url);

    const metadata = item?.media_metadata && typeof item.media_metadata === "object" ? Object.values(item.media_metadata) : [];
    for (const entry of metadata as any[]) {
      const source = entry?.s || entry?.source || entry?.o || {};
      add("Media", source?.mp4);
      add("Media", source?.u);
      add("Media", source?.gif);
    }

    add("Media • Destination", item?.url_overridden_by_dest || item?.url);
  }

  // /api/file can stream direct media URLs. Do not present DASH/HLS playlists
  // as if they were MP4 downloads; keep only browser-downloadable media here.
  const directFormats = formats.filter((format) => {
    const lower = format.url.toLowerCase();
    if (/\.(mpd|m3u8)(?:[?#]|$)/i.test(lower)) return false;
    return /\.(mp4|webm|mov|gif)(?:[?#]|$)/i.test(lower);
  });

  if (!directFormats.length) throw new Error("REDDIT_NO_DIRECT_MEDIA");

  return {
    formats: directFormats,
    title: post?.title || "Reddit media",
    thumbnail: post?.thumbnail && /^https?:\/\//i.test(post.thumbnail) ? post.thumbnail : undefined
  };
}

async function callFacebookHtmlFallback(raw: string) {
  const sourceUrls = [
    raw.replace(/^https:\/\/www\.facebook\.com/i, "https://m.facebook.com"),
    raw.replace(/^https:\/\/facebook\.com/i, "https://m.facebook.com"),
    raw
  ];

  const decodeCandidate = (value: string) => {
    let decoded = value
      .replace(/\\u0025/gi, "%")
      .replace(/\\u003A/gi, ":")
      .replace(/\\u002F/gi, "/")
      .replace(/\\u003D/gi, "=")
      .replace(/\\u0026/gi, "&")
      .replace(/\\u0022/gi, '"')
      .replace(/\\\//g, "/")
      .replace(/&amp;/gi, "&");
    try { decoded = JSON.parse('"'+decoded.replace(/"/g, '\\"')+'"'); } catch {}
    return decoded;
  };

  for (const sourceUrl of [...new Set(sourceUrls)]) {
    try {
      const response = await fetchWithTimeout(sourceUrl, {
        redirect: "follow",
        headers: {
          accept: "text/html,application/xhtml+xml",
          "accept-language": "en-US,en;q=0.9",
          "user-agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/154.0.0.0 Mobile Safari/537.36"
        }
      }, 12000);

      if (!response.ok) continue;
      const html = await response.text();
      const candidates = [
        ...Array.from(html.matchAll(/"playable_url(?:_quality_hd)?":"([^"]+)"/gi), (m) => m[1]),
        ...Array.from(html.matchAll(/"hd_src":"([^"]+)"/gi), (m) => m[1]),
        ...Array.from(html.matchAll(/"sd_src":"([^"]+)"/gi), (m) => m[1]),
        ...Array.from(html.matchAll(/"playable_url":"([^"]+)"/gi), (m) => m[1])
      ];

      const formats: Array<{ label: string; url: string }> = [];
      const seen = new Set<string>();
      for (const rawCandidate of candidates) {
        const url = decodeCandidate(rawCandidate);
        if (!/^https?:\/\//i.test(url) || !/(facebook|fbcdn|fbsbx)/i.test(url) || seen.has(url)) continue;
        seen.add(url);
        formats.push({
          label: formats.length === 0 ? "Video • HD" : "Video • SD",
          url
        });
      }

      if (formats.length) {
        return {
          formats: formats.slice(0, 2),
          title: "Facebook video",
          thumbnail: undefined
        };
      }
    } catch {}
  }

  throw new Error("FACEBOOK_HTML_FALLBACK_FAILED");
}


async function callDirectMediaFallback(raw: string, platform: string) {
  const response = await fetchWithTimeout(raw, {
    redirect: "follow",
    headers: {
      accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      "user-agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/154.0.0.0 Mobile Safari/537.36"
    }
  }, 12000);
  if (!response.ok) throw new Error(platform + "_PAGE_FETCH_FAILED");
  const html = await response.text();
  const formats: Array<{ label: string; url: string }> = [];
  const seen = new Set<string>();
  const add = (label: string, value: unknown) => {
    if (typeof value !== "string") return;
    let url = value.replace(/\\u0026/g, "&").replace(/\\u002F/g, "/").replace(/\\u003A/g, ":").replace(/&amp;/g, "&");
    try { url = JSON.parse('"' + url.replace(/"/g, '\\"') + '"'); } catch {}
    if (!/^https?:\/\//i.test(url) || seen.has(url)) return;
    if (/\.(mpd|m3u8)(?:[?#]|$)/i.test(url)) return;
    seen.add(url);
    formats.push({ label, url });
  };

  if (platform === "Streamable") {
    for (const m of html.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
      const candidate = m[0];
      if (/(?:streamable|streamablecdn)/i.test(candidate)) add("Video • Direct", candidate);
    }
  }

  if (platform === "Pinterest") {
    const normalizedHtml = html
      .replace(/\\u0025/gi, "%")
      .replace(/\\u003A/gi, ":")
      .replace(/\\u002F/gi, "/")
      .replace(/\\u003D/gi, "=")
      .replace(/\\u0026/gi, "&")
      .replace(/\\\//g, "/")
      .replace(/&amp;/gi, "&");

    for (const m of normalizedHtml.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
      const candidate = m[0].replace(/[\\",]+$/g, "");
      if (/\.(?:mp4|mov|webm)(?:[?#]|$)/i.test(candidate)) add("Video • Direct", candidate);
    }

    const fieldPatterns = [
      /"(?:contentUrl|content_url|videoUrl|video_url)"\s*:\s*"([^"]+)"/gi,
      /"(?:url|src)"\s*:\s*"([^"]+\.(?:mp4|mov|webm)(?:\\?[^"]*)?)"/gi
    ];
    for (const pattern of fieldPatterns) {
      for (const m of normalizedHtml.matchAll(pattern)) add("Video • Direct", m[1]);
    }
  }

  if (formats.length) {
    return { formats: formats.slice(0, 5), title: platform + " video", thumbnail: undefined };
  }
  throw new Error(platform + "_DIRECT_FALLBACK_FAILED");
}

async function callVimeoDirectFallback(raw: string) {
  const pathParts = new URL(raw).pathname.split("/").filter(Boolean);
  const id = pathParts[pathParts.length - 1] || "";
  if (!/^\d+$/.test(id)) throw new Error("VIMEO_ID_MISSING");

  const configUrls = [
    `https://player.vimeo.com/video/${id}/config`,
    `https://player.vimeo.com/video/${id}/config?autoplay=1`
  ];

  let config: any = null;
  let lastStatus = 0;

  for (const configUrl of configUrls) {
    try {
      const response = await fetchWithTimeout(
        configUrl,
        {
          headers: {
            accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
            referer: "https://vimeo.com/",
            "user-agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/154.0.0.0 Mobile Safari/537.36"
          }
        },
        10000
      );
      lastStatus = response.status;
      if (!response.ok) continue;
      config = await response.json();
      if (config) break;
    } catch {}
  }

  // Vimeo can expose the same player configuration inside the public page
  // when the standalone /config endpoint is unavailable to serverless IPs.
  if (!config) {
    try {
      const pageResponse = await fetchWithTimeout(
        raw,
        {
          headers: {
            accept: "text/html,application/xhtml+xml",
            referer: "https://vimeo.com/",
            "user-agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/154.0.0.0 Mobile Safari/537.36"
          }
        },
        12000
      );
      lastStatus = pageResponse.status;
      if (pageResponse.ok) {
        const html = await pageResponse.text();
        const directMatches = Array.from(
          html.matchAll(/https?:\\/\\/player\\.vimeo\\.com\\/progressive_redirect\\/[^"\\s<>\\\\]+/gi),
          (m) => m[0].replace(/\\\\u0026/g, "&").replace(/\\\\\\//g, "/")
        );

        const directUrls = [...new Set(directMatches)].filter((url) => /^https?:\\/\\//i.test(url));
        if (directUrls.length) {
          return {
            formats: directUrls.slice(0, 5).map((url, index) => ({
              label: "Video • Direct " + (index + 1),
              url
            })),
            title: "Vimeo video",
            thumbnail: undefined
          };
        }

        // Some Vimeo pages embed JSON containing progressive file records.
        const progressiveUrlMatches = Array.from(
          html.matchAll(/"url"\\s*:\\s*"(https?:\\/\\/[^"]+)"[^}]{0,800}"(?:quality|height)"\\s*:/gi),
          (m) => m[1].replace(/\\\\u0026/g, "&").replace(/\\\\\\//g, "/")
        ).filter((url) => /(?:vimeo|vimeocdn|progressive_redirect)/i.test(url));

        if (progressiveUrlMatches.length) {
          return {
            formats: [...new Set(progressiveUrlMatches)].slice(0, 5).map((url, index) => ({
              label: "Video • Direct " + (index + 1),
              url
            })),
            title: "Vimeo video",
            thumbnail: undefined
          };
        }
      }
    } catch {}
  }

  if (!config) throw new Error("VIMEO_CONFIG_FAILED_" + lastStatus);

  const progressive = Array.isArray(config?.request?.files?.progressive)
    ? config.request.files.progressive
    : [];

  const cdnGroups = [
    config?.request?.files?.hls?.cdns,
    config?.request?.files?.dash?.cdns
  ].filter(Boolean);

  const cdnProgressive: string[] = [];
  for (const group of cdnGroups) {
    for (const cdn of Object.values(group as Record<string, any>)) {
      const avc = (cdn as any)?.avc_url;
      if (typeof avc === "string") cdnProgressive.push(avc);
      if (Array.isArray(avc)) {
        for (const url of avc) if (typeof url === "string") cdnProgressive.push(url);
      }
    }
  }

  const formats = progressive
    .filter((f: any) => f?.url && /^https?:\\/\\//i.test(f.url))
    .sort((a: any, b: any) => (Number(b?.height) || 0) - (Number(a?.height) || 0))
    .slice(0, 5)
    .map((f: any) => ({
      label: "Video • " + (f.quality || ((f.height || 0) + "p")),
      url: f.url
    }));

  if (!formats.length) {
    for (const url of [...new Set(cdnProgressive)].slice(0, 5)) {
      if (/^https?:\\/\\//i.test(url) && !/\\.(?:m3u8|mpd)(?:[?#]|$)/i.test(url)) {
        formats.push({ label: "Video • Direct", url });
      }
    }
  }

  if (!formats.length) throw new Error("VIMEO_NO_PROGRESSIVE_MEDIA");
  return {
    formats,
    title: config?.video?.title || "Vimeo video",
    thumbnail: config?.video?.thumbs?.base
  };
}

async function callTikTokFallback(raw: string) {
  const response = await fetchWithTimeout("https://www.tikwm.com/api/?url=" + encodeURIComponent(raw), {
    headers: { "user-agent": "Vidzora/1.0" }
  }, REQUEST_TIMEOUT);

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
      raw = normalizeSourceUrl(await resolveRedditShareUrl(input));
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

    const requestId = randomUUID();
    let result: Awaited<ReturnType<typeof callProvider>> | null = null;
    let lastProviderError = "";

    if (!result && platform === "Reddit" && mode === "video") {
      try {
        result = await callRedditFallback(raw);
      } catch (error: any) {
        lastProviderError = error?.message || "Reddit native provider failed.";
      }
    }

    if (!result && platform === "YouTube") {
      // Prefer the dedicated yt-dlp + EJS + Deno + bgutil worker when configured.
      // Existing Cobalt/Piped paths remain intact as fallbacks.
      if (process.env.YOUTUBE_WORKER_URL?.trim()) {
        try {
          result = await callYouTubeWorker(raw);
        } catch (error: any) {
          lastProviderError = error?.message || "YouTube worker failed.";
        }
      }

      if (!result) {
        for (const provider of providers) {
          const attempts = provider.base === primaryBase ? [true, false] : [false];
          for (const alwaysProxy of attempts) {
            try {
              result = await callProvider(
                raw,
                provider.base,
                provider.key,
                mode,
                alwaysProxy,
                YOUTUBE_PROVIDER_TIMEOUT
              );
              if (result) break;
            } catch (error: any) {
              lastProviderError = error?.message || "Provider failed.";
            }
          }
          if (result) break;
        }
      }

      if (!result) {
        try {
          result = await callPipedYouTubeFallback(raw, mode);
        } catch (error: any) {
          lastProviderError = error?.message || "Piped YouTube fallback failed.";
        }
      }
    }

    if (!result && platform !== "YouTube") {
      // Non-YouTube platforms keep the existing provider order and behavior.
      for (const provider of providers) {
        const attempts = provider.base === primaryBase ? [true, false] : [false];
        for (const alwaysProxy of attempts) {
          try {
            result = await callProvider(raw, provider.base, provider.key, mode, alwaysProxy);
            if (result) break;
          } catch (error: any) {
            lastProviderError = error?.message || "Provider failed.";
          }
        }
        if (result) break;
      }
    }

    // Facebook can intermittently fail on a single Cobalt instance when Meta changes
    // media delivery. Keep a small, bounded Facebook-only failover pool so the other
    // platforms retain their existing provider order and behavior.
    if (!result && platform === "Facebook") {
      // Last-mile fallback for public Facebook videos when Cobalt's Facebook
      // extractor returns a transient 4xx after Meta changes its page format.
      try {
        result = await callFacebookHtmlFallback(raw);
      } catch (error: any) {
        lastProviderError = error?.message || "Facebook HTML fallback failed.";
      }
    }

    if (!result && platform === "Reddit" && mode === "audio") {
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

    // Dedicated last-mile fallbacks for platforms whose upstream Cobalt
    // extractor can intermittently fail. These are bounded and only run
    // after the configured primary/secondary engines have failed.
    if (!result && (platform === "Streamable" || platform === "Pinterest")) {
      try {
        result = await callDirectMediaFallback(raw, platform);
      } catch (error: any) {
        lastProviderError = error?.message || platform + " direct fallback failed.";
      }
    }

    if (!result && platform === "Vimeo") {
      try {
        result = await callVimeoDirectFallback(raw);
      } catch (error: any) {
        lastProviderError = error?.message || "Vimeo direct fallback failed.";
      }
    }

    if (!result) {
      const normalizedProviderError = lastProviderError.toLowerCase();
      if (platform === "Vimeo" && (normalizedProviderError.includes("error.api.fetch.fail") || normalizedProviderError.includes("vimeo"))) {
        return NextResponse.json({
          success: false,
          platform,
          error: "Vimeo downloads are temporarily unavailable because the connected Vimeo extractor is failing upstream. Please try another public platform for now."
        }, { status: 503 });
      }

      return NextResponse.json({
        success: false,
        platform,
        error: platform + " provider is temporarily unavailable. Please try again with another public link."
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      platform,
      title: result.title,
      thumbnail: result.thumbnail,
      formats: result.formats.map((format) => ({
        ...format,
        url: "/api/file?token=" + encodeURIComponent(createDownloadToken(format.url))
      }))
    });
  } catch (e: any) {
    const message = e?.name === "AbortError" ? "The media engine timed out. Please try again." : e?.message || "Unable to process this link.";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
