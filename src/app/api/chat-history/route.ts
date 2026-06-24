import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { corsJson, preflight } from "@/lib/cors";

export const runtime = "nodejs";

export async function OPTIONS() {
  return preflight();
}

// GET /api/chat-history[?botId=&websiteId=&limit=]  — admin only.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const botId = url.searchParams.get("botId");
  const websiteId = url.searchParams.get("websiteId");
  const limit = Math.min(Number(url.searchParams.get("limit") || 200), 500);

  // RLS limits rows to the user's own chatbots.
  let query = supabase
    .from("chat_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (botId) query = query.eq("chatbot_id", botId);
  if (websiteId) query = query.eq("website_id", websiteId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}

// POST /api/chat-history  { botId, sessionId, role, message, sources? }
// Public logging endpoint (CORS) — useful if you log from a custom client.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { botId, sessionId, role, message } = body;

  if (!botId || !role || !message) {
    return corsJson(
      { error: "botId, role and message are required" },
      { status: 400 }
    );
  }
  if (role !== "user" && role !== "assistant") {
    return corsJson({ error: "role must be user|assistant" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Resolve website_id from the bot to keep the row consistent.
  const { data: bot } = await admin
    .from("chatbots")
    .select("website_id")
    .eq("id", botId)
    .single();
  if (!bot) return corsJson({ error: "Chatbot not found" }, { status: 404 });

  const { error } = await admin.from("chat_messages").insert({
    chatbot_id: botId,
    website_id: bot.website_id,
    session_id: (sessionId || "anonymous").toString().slice(0, 100),
    role,
    message: message.toString().slice(0, 4000),
    sources: Array.isArray(body.sources) ? body.sources : [],
  });

  if (error) return corsJson({ error: error.message }, { status: 500 });
  return corsJson({ ok: true }, { status: 201 });
}
