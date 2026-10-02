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

    // The URL is authenticated by a short-lived server-issued token. Redirecting
    // keeps large media bytes out of the Vercel Function data path.
    return NextResponse.redirect(target, 302);
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to start the download. Please generate a fresh link." },
      { status: 400 }
    );
  }
}
