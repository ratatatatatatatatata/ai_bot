import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/pages?websiteId=...  — list crawled pages for a website.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const websiteId = new URL(request.url).searchParams.get("websiteId");
  if (!websiteId) {
    return NextResponse.json({ error: "websiteId is required" }, { status: 400 });
  }

  // RLS restricts results to pages of websites the user owns.
  const { data, error } = await supabase
    .from("pages")
    .select("id, website_id, url, title, created_at")
    .eq("website_id", websiteId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pages: data });
}
