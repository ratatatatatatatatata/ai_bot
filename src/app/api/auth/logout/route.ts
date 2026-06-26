import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/config";

export const runtime = "nodejs";

// POST /api/auth/logout — clears the demo session cookie.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
