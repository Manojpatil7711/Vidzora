import { NextResponse } from "next/server";

export async function GET() {
  const engineConfigured = Boolean(process.env.COBALT_API_URL?.trim());
  return NextResponse.json({
    ok: true,
    service: "vidzora",
    engine: engineConfigured ? "configured" : "not-configured",
    timestamp: new Date().toISOString()
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}
