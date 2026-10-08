import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

const DOWNLOAD_TOKEN_SECRET = process.env.DOWNLOAD_TOKEN_SECRET?.trim() || process.env.COBALT_API_KEY?.trim() || "";

function verifyDownloadToken(token: string) {
  if (!DOWNLOAD_TOKEN_SECRET) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", DOWNLOAD_TOKEN_SECRET).update(payload).digest("base64url");
  try {
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  } catch { return null; }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data?.url !== "string" || typeof data?.exp !== "number" || data.exp < Date.now()) return null;
    const target = new URL(data.url);
    if (target.protocol !== "https:") return null;
    return target.toString();
  } catch {
    return null;
  }
}

function extensionForContentType(contentType: string) {
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (type === "video/mp4") return ".mp4";
  if (type === "video/webm") return ".webm";
  if (type === "video/quicktime") return ".mov";
  if (type === "audio/mpeg") return ".mp3";
  if (type === "audio/mp4") return ".m4a";
  return "";
}

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url);
    const token = requestUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing download token." }, { status: 400 });
    }

    const target = verifyDownloadToken(token);
    if (!target) {
      return NextResponse.json({ success: false, error: "This download link has expired. Please generate a fresh link." }, { status: 410 });
    }

    // Do not redirect the browser to the provider CDN. Some mobile browsers use
    // the final CDN URL/filename to decide the download extension and can save a
    // video as .jpg when the provider response has an image-like URL.
    //
    // Proxy the response instead, validate its actual media type, and explicitly
    // tell the browser that this is an attachment with the correct extension.
    const upstream = await fetch(target, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        accept: "video/mp4,video/*;q=0.9,audio/*;q=0.8,*/*;q=0.5",
        "user-agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/154.0 Mobile Safari/537.36"
      }
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { success: false, error: "The media provider did not return a downloadable file. Please generate a fresh link." },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const extension = extensionForContentType(contentType);

    // Never allow an image response to be silently downloaded as the requested
    // video. This makes provider/CDN regressions visible instead of producing a
    // misleading JPG file on mobile.
    if (contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "The provider returned an image instead of a video. Please generate the download again." },
        { status: 502 }
      );
    }

    const isVideo = contentType.toLowerCase().startsWith("video/");
    const isAudio = contentType.toLowerCase().startsWith("audio/");
    if (!isVideo && !isAudio && !extension) {
      // Some CDNs incorrectly omit the MIME type. Keep the download usable, but
      // force a safe generic binary filename instead of inheriting an image name.
      const headers = new Headers();
      headers.set("Content-Type", "application/octet-stream");
      headers.set("Content-Disposition", 'attachment; filename="vidzora-download.bin"');
      headers.set("Cache-Control", "no-store");
      const length = upstream.headers.get("content-length");
      if (length) headers.set("Content-Length", length);
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    const filename = isVideo
      ? "vidzora-video" + (extension || ".mp4")
      : isAudio
        ? "vidzora-audio" + (extension || ".mp3")
        : "vidzora-download" + extension;

    const headers = new Headers();
    headers.set("Content-Type", isVideo ? (extension === ".mp4" ? "video/mp4" : contentType) : contentType);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");

    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);

    return new Response(upstream.body, {
      status: upstream.status,
      headers
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to start the download. Please generate a fresh link." },
      { status: 502 }
    );
  }
}
