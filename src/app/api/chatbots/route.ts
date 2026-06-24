import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/chatbots[?websiteId=...] — list the admin's chatbots.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const websiteId = new URL(request.url).searchParams.get("websiteId");

  let query = supabase
    .from("chatbots")
    .select("*")
    .order("created_at", { ascending: false });
  if (websiteId) query = query.eq("website_id", websiteId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chatbots: data });
}
