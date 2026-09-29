import { NextResponse } from "next/server";

function isPrivateOrLocalHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host === "::1" || host === "0.0.0.0") return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const m = host.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  if (host === "169.254.169.254" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  return false;
}

function extensionFor(contentType: string | null) {
  const type = (contentType || "").split(";")[0].trim().toLowerCase();
  if (type.includes("mp4")) return "mp4";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("webm")) return "webm";
  if (type.includes("m4a") || type.includes("mp4a")) return "m4a";
  if (type.includes("quicktime")) return "mov";
  return "mp4";
}

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url);
    const target = requestUrl.searchParams.get("url");

    if (!target) {
      return NextResponse.json({ success: false, error: "Missing download URL." }, { status: 400 });
    }

    const mediaUrl = new URL(target);
    if (mediaUrl.protocol !== "https:" || isPrivateOrLocalHost(mediaUrl.hostname)) {
      return NextResponse.json({ success: false, error: "Invalid download URL." }, { status: 400 });
    }

    const upstream = await fetch(mediaUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        accept: "video/*,audio/*,application/octet-stream,*/*;q=0.8",
        "user-agent": "Vidzora/1.0"
      }
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { success: false, error: "The media stream expired or is temporarily unavailable. Please generate a fresh link." },
        { status: upstream.status || 502 }
      );
    }

    const contentType = upstream.headers.get("content-type");
    if (contentType && /text\/html|application\/json/i.test(contentType)) {
      return NextResponse.json(
        { success: false, error: "The provider returned an error instead of a media file. Please generate a fresh link." },
        { status: 502 }
      );
    }

    const extension = extensionFor(contentType);
    const headers = new Headers();
    headers.set("Content-Type", contentType || "application/octet-stream");
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    headers.set("Content-Disposition", `attachment; filename="Vidzora-download.${extension}"`);
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(upstream.body, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Unable to start the download." },
      { status: 502 }
    );
  }
}
