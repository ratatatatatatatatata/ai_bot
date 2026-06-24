import { NextResponse } from "next/server";

/**
 * Permissive CORS for the public endpoints (the widget is embedded on
 * arbitrary third-party domains, so it must be reachable cross-origin).
 */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/** Standard preflight response. */
export function preflight() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/** JSON response with CORS headers attached. */
export function corsJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...corsHeaders, ...(init?.headers || {}) },
  });
}
