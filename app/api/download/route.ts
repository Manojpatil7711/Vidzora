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
const REQUEST_TIMEOUT = 15000;
const REDDIT_RESOLVE_TIMEOUT = 12000;
const REDDIT_PROVIDER_TIMEOUT = 7000;

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

async function callProvider(raw: string, base: string, apiKey?: string, mode: "video" | "audio" = "video", alwaysProxy = false) {
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
      youtubeVideoCodec: "h264",
      youtubeVideoContainer: "mp4"
    })
  }, REQUEST_TIMEOUT);

  if (!response.ok) throw new Error("Download provider request failed.");
  const data = await response.json();
  if (data?.status === "error") throw new Error(data?.error?.code || "Provider could not process this link.");
  const formats = normalizeFormats(data, mode);
  if (!formats.length) throw new Error("No downloadable format was returned.");

  return { formats, title: data?.filename || data?.title || "Ready to download", thumbnail: data?.thumbnail };
}

async function callPipedYouTubeFallback(raw: string, mode: "video" | "audio" = "video") {
  const match = raw.match(/(?:v=|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{6,})/);
  const videoId = match?.[1];
  if (!videoId) throw new Error("YouTube video ID could not be extracted.");

  const instances = [process.env.PIPED_API_URL?.trim(), "https://pipedapi.kavin.rocks", "https://pipedapi.leptons.xyz"]
    .filter((value): value is string => Boolean(value));

  for (const base of [...new Set(instances)]) {
    try {
      const response = await fetchWithTimeout(base.replace(/\/$/, "") + "/streams/" + encodeURIComponent(videoId), {
        headers: { accept: "application/json", "user-agent": "Vidzora/1.0" }
      }, REQUEST_TIMEOUT);
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

    let result: Awaited<ReturnType<typeof callProvider>> | null = null;
    let lastProviderError = "";

    if (!result && platform === "Reddit" && mode === "video") {
      try {
        result = await callRedditFallback(raw);
      } catch (error: any) {
        lastProviderError = error?.message || "Reddit native provider failed.";
      }
    }

    if (!result) {
      // Try the primary engine through its stable tunnel first, then retry the
      // same engine without tunneling before falling back to another provider.
      // Some sources reject tunneled preparation even though direct delivery works.
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

    if (!result && platform === "YouTube") {
      try {
        result = await callPipedYouTubeFallback(raw, mode);
      } catch (error: any) {
        lastProviderError = error?.message || "YouTube fallback provider failed.";
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

    if (!result) {
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
      formats: result.formats
    });
  } catch (e: any) {
    const message = e?.name === "AbortError" ? "The media engine timed out. Please try again." : e?.message || "Unable to process this link.";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
