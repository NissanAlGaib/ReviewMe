import { NextResponse } from "next/server";

// Unauthenticated on purpose — the client polls this to detect a new
// deployment even on public/auth pages. Must never be cached, otherwise the
// CDN/browser would keep serving the old build id and the check would never
// see a new deploy.
export async function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID },
    { headers: { "Cache-Control": "no-store" } }
  );
}
