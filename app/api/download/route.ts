import { NextResponse } from "next/server";

const HOSTS = ["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"];

function isAllowedTikTok(input: string) {
  try {
    const u = new URL(input);
    return (u.protocol === "https:" || u.protocol === "http:") && HOSTS.some(h => u.hostname === h || u.hostname.endsWith("." + h));
  } catch { return false; }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = typeof body?.url === "string" ? body.url.trim() : "";
    if (!input || input.length > 2048) return NextResponse.json({ success:false, error:"Invalid URL." }, { status:400 });
    if (!isAllowedTikTok(input)) return NextResponse.json({ success:false, error:"This version supports public TikTok links. Instagram, YouTube, Facebook and X are coming next." }, { status:400 });

    const endpoint = "https://www.tikwm.com/api/?url=" + encodeURIComponent(input);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const upstream = await fetch(endpoint, { signal: controller.signal, cache: "no-store", headers: { "User-Agent": "Vidzora/1.0" } });
    clearTimeout(timer);

    if (!upstream.ok) return NextResponse.json({ success:false, error:"The video provider is temporarily unavailable. Please try again." }, { status:502 });
    const data = await upstream.json();

    if (data?.code !== 0 || !data?.data) return NextResponse.json({ success:false, error:"Could not process this video. Make sure the link is public and valid." }, { status:422 });

    const d = data.data;
    const formats = [
      d.play ? { type:"Video", quality:"No watermark", url:d.play } : null,
      d.wmplay ? { type:"Video", quality:"With watermark", url:d.wmplay } : null,
      d.music ? { type:"Audio", quality:"MP3", url:d.music } : null
    ].filter(Boolean);

    if (!formats.length) return NextResponse.json({ success:false, error:"No downloadable format was returned." }, { status:422 });
    return NextResponse.json({ success:true, platform:"TikTok", title:d.title || "", thumbnail:d.cover || "", formats });
  } catch {
    return NextResponse.json({ success:false, error:"Request timed out or the provider returned an invalid response." }, { status:504 });
  }
}