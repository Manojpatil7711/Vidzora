import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.COBALT_API_URL?.trim();

  if (!base) {
    return NextResponse.json({
      ok: false,
      status: "not-configured",
      message: "Media engine is not configured."
    }, { status: 503 });
  }

  try {
    const response = await fetch(new URL(base), {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        status: "unhealthy",
        message: "Media engine returned an unhealthy response."
      }, { status: 503 });
    }

    const data = await response.json();
    return NextResponse.json({
      ok: true,
      status: "ready",
      version: data?.cobalt?.version ?? null,
      services: Array.isArray(data?.cobalt?.services) ? data.cobalt.services : []
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({
      ok: false,
      status: "unreachable",
      message: "Media engine could not be reached."
    }, { status: 503 });
  }
}
