import { NextResponse } from "next/server";

const DEFAULT_ENGINE = "https://cobalt-production-45cd.up.railway.app/";

function allowedHost(url: URL) {
  const configured = process.env.COBALT_API_URL?.trim() || DEFAULT_ENGINE;
  try {
    const engine = new URL(configured);
    return url.hostname === engine.hostname;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url);
    const target = requestUrl.searchParams.get("url");

    if (!target) {
      return NextResponse.json({ success: false, error: "Missing download URL." }, { status: 400 });
    }

    const mediaUrl = new URL(target);
    if (mediaUrl.protocol !== "https:" || !allowedHost(mediaUrl)) {
      return NextResponse.json({ success: false, error: "Invalid download URL." }, { status: 400 });
    }

    const upstream = await fetch(mediaUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        accept: "*/*",
        "user-agent": "Vidzora/1.0"
      }
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { success: false, error: "The download stream expired or is temporarily unavailable. Please generate a fresh link." },
        { status: upstream.status || 502 }
      );
    }

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    const contentLength = upstream.headers.get("content-length");

    if (contentType) headers.set("Content-Type", contentType);
    if (contentLength) headers.set("Content-Length", contentLength);
    headers.set("Content-Disposition", 'attachment; filename="Vidzora-download"');
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
