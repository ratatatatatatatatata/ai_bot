// Central app configuration & runtime-mode detection.

export const APP_NAME = "TBPlan Chat Bot System";
export const APP_SHORT = "TBPlan";

/**
 * Demo mode runs the whole app with a local file-backed store and a preset
 * admin login — no Supabase or external accounts required. It is enabled when:
 *   - NEXT_PUBLIC_DEMO_MODE === "true", OR
 *   - Supabase env vars are not configured (auto-fallback).
 * It is disabled only when NEXT_PUBLIC_DEMO_MODE === "false".
 */
export function isDemo(): boolean {
  const flag = process.env.NEXT_PUBLIC_DEMO_MODE;
  if (flag === "false") return false;
  if (flag === "true") return true;
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

// Preset demo admin credentials (overridable via env). Shown to the user.
export const DEMO_ADMIN = {
  email: process.env.ADMIN_EMAIL || "admin@tbplan.mn",
  password: process.env.ADMIN_PASSWORD || "Tbplan@2026",
  name: "TBPlan Admin",
};

// Secret used to sign the demo session cookie.
export const AUTH_SECRET =
  process.env.AUTH_SECRET || "tbplan-demo-secret-change-me";

export const SESSION_COOKIE = "tbp_session";

// Available chat models per provider (used by the per-bot AI controls UI).
export const AI_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"],
};

export const SUPPORTED_LANGUAGES = [
  { code: "auto", label: "Auto (match user)" },
  { code: "mn", label: "Монгол" },
  { code: "en", label: "English" },
];
