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

export async function POST(req: Request) {
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

    // TikTok provider is production-connected. Other platform adapters are
    // deliberately gated until a reliable provider is configured, so the UI
    // never pretends that an unverified downloader works.
    if (platform !== "TikTok") {
      return NextResponse.json(
        {
          success: false,
          platform,
          error: platform + " is detected successfully, but its download provider is not connected yet."
        },
        { status: 503 }
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const r = await fetch(
        "https://www.tikwm.com/api/?url=" + encodeURIComponent(raw),
        {
          headers: { "user-agent": "Vidzora/1.0" },
          signal: controller.signal,
          cache: "no-store"
        }
      );

      if (!r.ok) throw new Error("Provider request failed.");

      const d = await r.json();

      if (d?.code !== 0 || !d?.data) {
        throw new Error("This video is unavailable or cannot be processed.");
      }

      const formats = [
        d.data.play ? { label: "Video • No watermark", url: d.data.play } : null,
        d.data.hdplay ? { label: "Video • HD", url: d.data.hdplay } : null,
        d.data.wmplay ? { label: "Video • Watermark", url: d.data.wmplay } : null,
        d.data.music ? { label: "Audio", url: d.data.music } : null
      ].filter(Boolean);

      if (!formats.length) throw new Error("No downloadable format was returned.");

      return NextResponse.json({
        success: true,
        platform,
        title: d.data.title || "TikTok video",
        thumbnail: d.data.cover,
        formats
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (e: any) {
    const message =
      e?.name === "AbortError"
        ? "The request timed out. Please try again."
        : e?.message || "Unable to process this link.";

    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
