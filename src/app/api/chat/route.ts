import { createAdminClient } from "@/lib/supabase/admin";
import { corsJson, preflight } from "@/lib/cors";
import { embedText, chat } from "@/lib/ai";
import { matchChunks } from "@/lib/retrieval";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";
import type { Source } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function OPTIONS() {
  return preflight();
}

// POST /api/chat  { botId, message, sessionId? }  — public, grounded answer.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const botId: string = (body.botId || "").trim();
  const message: string = (body.message || "").trim();
  const sessionId: string = (body.sessionId || "anonymous").toString().slice(0, 100);

  if (!botId || !message) {
    return corsJson({ error: "botId and message are required" }, { status: 400 });
  }
  if (message.length > 1000) {
    return corsJson({ error: "Message too long" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Load the bot + its website + fallback message.
  const { data: bot, error: botErr } = await admin
    .from("chatbots")
    .select("id, website_id, fallback_message")
    .eq("id", botId)
    .single();

  if (botErr || !bot) {
    return corsJson({ error: "Chatbot not found" }, { status: 404 });
  }

  const fallback = bot.fallback_message as string;

  try {
    // 1) Embed the question and retrieve relevant website chunks.
    const queryEmbedding = await embedText(message);
    const chunks = await matchChunks(admin, {
      websiteId: bot.website_id,
      queryEmbedding,
      matchCount: 6,
      similarityThreshold: 0.3,
    });

    let answer = fallback;
    let sources: Source[] = [];

    if (chunks.length > 0) {
      // 2) Ask the model to answer ONLY from the retrieved context.
      const system = buildSystemPrompt(fallback);
      const user = buildUserPrompt(message, chunks);
      const raw = await chat({ system, user, temperature: 0.1 });

      answer = raw && raw.trim() ? raw.trim() : fallback;

      // 3) Attach sources only when we actually answered from content.
      if (answer !== fallback) {
        const seen = new Set<string>();
        for (const c of chunks) {
          if (c.page_url && !seen.has(c.page_url)) {
            seen.add(c.page_url);
            sources.push({ title: c.page_title || c.page_url, url: c.page_url });
          }
          if (sources.length >= 3) break;
        }
      }
    }

    // 4) Log the turn (best-effort; never block the answer on logging).
    await admin.from("chat_messages").insert([
      {
        chatbot_id: bot.id,
        website_id: bot.website_id,
        session_id: sessionId,
        role: "user",
        message,
        sources: [],
      },
      {
        chatbot_id: bot.id,
        website_id: bot.website_id,
        session_id: sessionId,
        role: "assistant",
        message: answer,
        sources,
      },
    ]);

    return corsJson({ answer, sources });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error";
    console.error("[/api/chat]", detail);
    // Fail safe: never leak internals, return the bot's fallback.
    return corsJson({ answer: fallback, sources: [] });
  }
}
