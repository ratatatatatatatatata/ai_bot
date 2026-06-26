"use client";

import { useRouter } from "next/navigation";

const DEMO =
  process.env.NEXT_PUBLIC_DEMO_MODE === "false"
    ? false
    : process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    if (DEMO) {
      await fetch("/api/auth/logout", { method: "POST" });
    } else {
      const { createClient } = await import("@/lib/supabase/client");
      await createClient().auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      Sign out
    </button>
  );
}
