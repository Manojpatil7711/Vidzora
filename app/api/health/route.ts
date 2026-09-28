import { NextResponse } from "next/server";

export async function GET() {
  const engineBase = process.env.COBALT_API_URL?.trim() || "https://cobalt-production-45cd.up.railway.app/";
  const engineConfigured = Boolean(engineBase);
  return NextResponse.json({
    ok: true,
    service: "vidzora",
    engine: engineConfigured ? "configured" : "not-configured",
    timestamp: new Date().toISOString()
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}
