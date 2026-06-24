import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/websites — list the signed-in admin's websites.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ websites: data });
}

// POST /api/websites — add a website (and auto-create its chatbot).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  let baseUrl: string = (body.base_url || "").trim();
  const name: string | undefined = body.name?.trim() || undefined;

  if (!baseUrl) {
    return NextResponse.json({ error: "base_url is required" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = `https://${baseUrl}`;

  let host: string;
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const { data: website, error } = await supabase
    .from("websites")
    .insert({ user_id: user.id, base_url: baseUrl, name: name || host })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create a default chatbot for this website.
  const { data: chatbot } = await supabase
    .from("chatbots")
    .insert({
      website_id: website.id,
      user_id: user.id,
      name: `${name || host} assistant`,
    })
    .select()
    .single();

  return NextResponse.json({ website, chatbot }, { status: 201 });
}
