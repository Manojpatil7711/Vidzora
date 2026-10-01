import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const engineBase = process.env.COBALT_API_URL?.trim() || "https://cobalt-production-45cd.up.railway.app/";

  if (!engineBase) {
    return NextResponse.json({
      ok: false,
      service: "vidzora",
      engine: "not-configured",
      timestamp: new Date().toISOString()
    }, {
      status: 503,
      headers: { "Cache-Control": "no-store" }
    });
  }

  try {
    const response = await fetch(new URL(engineBase), {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        service: "vidzora",
        engine: "unhealthy",
        timestamp: new Date().toISOString()
      }, {
        status: 503,
        headers: { "Cache-Control": "no-store" }
      });
    }

    const data = await response.json();

    return NextResponse.json({
      ok: true,
      service: "vidzora",
      engine: "ready",
      engineVersion: data?.cobalt?.version ?? null,
      timestamp: new Date().toISOString()
    }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch {
    return NextResponse.json({
      ok: false,
      service: "vidzora",
      engine: "unreachable",
      timestamp: new Date().toISOString()
    }, {
      status: 503,
      headers: { "Cache-Control": "no-store" }
    });
  }
}
