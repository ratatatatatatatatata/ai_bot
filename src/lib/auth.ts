import crypto from "node:crypto";
import { cookies } from "next/headers";
import { AUTH_SECRET, SESSION_COOKIE, DEMO_ADMIN, isDemo } from "@/lib/config";

export interface Session {
  email: string;
  name: string;
}

// --- Signed token helpers (demo mode) -------------------------------------

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function signToken(payload: Session): string {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(
    crypto.createHmac("sha256", AUTH_SECRET).update(body).digest()
  );
  return `${body}.${sig}`;
}

export function verifyToken(token: string | undefined | null): Session | null {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = b64url(
    crypto.createHmac("sha256", AUTH_SECRET).update(body).digest()
  );
  // constant-time compare
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, "base64").toString("utf8")) as Session;
  } catch {
    return null;
  }
}

export function checkDemoCredentials(email: string, password: string): Session | null {
  if (
    email.trim().toLowerCase() === DEMO_ADMIN.email.toLowerCase() &&
    password === DEMO_ADMIN.password
  ) {
    return { email: DEMO_ADMIN.email, name: DEMO_ADMIN.name };
  }
  return null;
}

// --- Session access (works for demo + supabase) ---------------------------

export async function getSession(): Promise<Session | null> {
  if (isDemo()) {
    const store = await cookies();
    return verifyToken(store.get(SESSION_COOKIE)?.value);
  }
  // Supabase mode: derive session from the auth cookie.
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { email: user.email || "", name: user.email || "Admin" } : null;
}

/** For API routes: returns the session or null (caller should 401). */
export async function requireSession(): Promise<Session | null> {
  return getSession();
}
