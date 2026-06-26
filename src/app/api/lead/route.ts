import { getStore } from "@/lib/store";
import { corsJson, preflight } from "@/lib/cors";

export const runtime = "nodejs";

export async function OPTIONS() {
  return preflight();
}

// POST /api/lead  { botId, name?, email?, phone?, sessionId? }  — public.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const botId: string = (body.botId || "").trim();
  if (!botId) return corsJson({ error: "botId is required" }, { status: 400 });

  const name = body.name ? String(body.name).slice(0, 200) : null;
  const email = body.email ? String(body.email).slice(0, 200) : null;
  const phone = body.phone ? String(body.phone).slice(0, 50) : null;
  if (!name && !email && !phone) {
    return corsJson({ error: "Provide at least one contact field" }, { status: 400 });
  }

  const store = getStore();
  const bot = await store.getChatbot(botId);
  if (!bot) return corsJson({ error: "Chatbot not found" }, { status: 404 });

  await store.createLead({
    chatbot_id: bot.id,
    website_id: bot.website_id,
    session_id: (body.sessionId || "anonymous").toString().slice(0, 100),
    name,
    email,
    phone,
  });

  return corsJson({ ok: true }, { status: 201 });
}
