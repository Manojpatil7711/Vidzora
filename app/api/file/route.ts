import { NextResponse } from "next/server";

const ALLOWED_MEDIA_HOSTS = [
  "cobalt-production-45cd.up.railway.app",
  "api.cobalt.tools",
  "pipedapi.kavin.rocks",
  "pipedapi.leptons.xyz",
  "www.tikwm.com",
  "v.redd.it"
];

function isAllowedMediaHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return ALLOWED_MEDIA_HOSTS.some((allowed) => host === allowed || host.endsWith("." + allowed));
}

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url);
    const target = requestUrl.searchParams.get("url");

    if (!target) {
      return NextResponse.json({ success: false, error: "Missing download URL." }, { status: 400 });
    }

    const mediaUrl = new URL(target);
    if (mediaUrl.protocol !== "https:" || !isAllowedMediaHost(mediaUrl.hostname)) {
      return NextResponse.json({ success: false, error: "Invalid download URL." }, { status: 400 });
    }

    // Do not proxy the media bytes through a Vercel Function. Large movies can
    // legitimately take minutes to transfer, while serverless execution has a
    // finite lifetime. Redirecting lets the browser download directly from the
    // media engine/origin and removes Vercel from the long-lived data path.
    return NextResponse.redirect(mediaUrl.toString(), 302);
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to start the download. Please generate a fresh link." },
      { status: 400 }
    );
  }
}
