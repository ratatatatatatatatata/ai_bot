import { NextResponse } from "next/server";
import { checkDemoCredentials, signToken } from "@/lib/auth";
import { SESSION_COOKIE, isDemo } from "@/lib/config";

export const runtime = "nodejs";

// POST /api/auth/login  { email, password }  — demo-mode login.
export async function POST(request: Request) {
  if (!isDemo()) {
    return NextResponse.json(
      { error: "Demo login is disabled. Use Supabase sign-in." },
      { status: 400 }
    );
  }

  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const session = checkDemoCredentials(String(email), String(password));
  if (!session) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, user: session });
  res.cookies.set(SESSION_COOKIE, signToken(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
