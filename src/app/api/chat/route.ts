import { getStore } from "@/lib/store";
import { corsJson, preflight } from "@/lib/cors";
import { embedText, chat } from "@/lib/ai";
import { embeddingsAvailable } from "@/lib/ingest";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";
import type { ChatMessage, Source } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function OPTIONS() {
  return preflight();
}

// POST /api/chat  { botId, message, sessionId? }  — public grounded answer.
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

  const store = getStore();
  const bot = await store.getChatbot(botId);
  if (!bot) return corsJson({ error: "Chatbot not found" }, { status: 404 });

  const fallback = bot.fallback_message;

  if (bot.status === "paused") {
    return corsJson({
      answer: "This assistant is currently unavailable. Please check back later.",
      sources: [],
      leadCapture: false,
    });
  }

  try {
    let answer = fallback;
    let sources: Source[] = [];

    // 1) Custom Q&A takes priority (exact-intent answers).
    const qa = await store.matchQA(bot.website_id, message);
    if (qa) {
      answer = qa.answer;
    } else {
      // 2) Retrieve relevant website chunks.
      const useEmb = embeddingsAvailable();
      const embedding = useEmb ? await embedText(message).catch(() => null) : null;
      const chunks = await store.matchChunks(
        bot.website_id,
        { text: message, embedding },
        6,
        embedding ? 0.3 : 0.15
      );

      if (chunks.length > 0) {
        if (useEmb) {
          // 3a) Compose a grounded answer with the LLM.
          const system = buildSystemPrompt(fallback);
          const user = buildUserPrompt(message, chunks);
          const raw = await chat({
            system,
            user,
            temperature: bot.temperature,
            provider: bot.ai_provider,
            model: bot.ai_model,
          });
          answer = raw && raw.trim() ? raw.trim() : fallback;
        } else {
          // 3b) No LLM key (demo): return the best matching site content.
          answer = chunks
            .slice(0, 2)
            .map((c) => c.chunk_text)
            .join(" ")
            .slice(0, 500)
            .trim();
        }

        if (answer && answer !== fallback) {
          const seen = new Set<string>();
          for (const c of chunks) {
            if (c.page_url && !seen.has(c.page_url) && !c.page_url.startsWith("manual://")) {
              seen.add(c.page_url);
              sources.push({ title: c.page_title || c.page_url, url: c.page_url });
            }
            if (sources.length >= 3) break;
          }
        }
      }
    }

    // 4) Log the turn (best effort).
    const base = {
      chatbot_id: bot.id,
      website_id: bot.website_id,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    };
    const rows: Omit<ChatMessage, "id">[] = [
      { ...base, role: "user", message, sources: [] },
      { ...base, role: "assistant", message: answer, sources },
    ];
    await store.createMessages(rows);

    return corsJson({
      answer,
      sources,
      leadCapture: bot.lead_capture,
      leadMessage: bot.lead_message,
    });
  } catch (err) {
    console.error("[/api/chat]", err instanceof Error ? err.message : err);
    return corsJson({ answer: fallback, sources: [], leadCapture: false });
  }
}
