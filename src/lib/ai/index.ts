/**
 * Provider-agnostic AI layer for embeddings + chat completion.
 *
 * Set AI_PROVIDER=openai (default) or AI_PROVIDER=gemini in your env.
 * Implemented with fetch so there is no SDK version coupling.
 */

type Provider = "openai" | "gemini";

function provider(): Provider {
  return (process.env.AI_PROVIDER || "openai").toLowerCase() === "gemini"
    ? "gemini"
    : "openai";
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

/** Embed an array of texts, returning one vector per input (same order). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return provider() === "gemini"
    ? embedGemini(texts)
    : embedOpenAI(texts);
}

/** Convenience wrapper for a single string. */
export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  if (!vector) throw new Error("Embedding provider returned no vector.");
  return vector;
}

async function embedOpenAI(texts: string[]): Promise<number[][]> {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI embeddings failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as {
    data: { embedding: number[]; index: number }[];
  };
  // Ensure original order.
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

async function embedGemini(texts: string[]): Promise<number[][]> {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const model = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        })),
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini embeddings failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as { embeddings: { values: number[] }[] };
  return json.embeddings.map((e) => e.values);
}

// ---------------------------------------------------------------------------
// Chat completion
// ---------------------------------------------------------------------------

export interface ChatArgs {
  system: string;
  user: string;
  temperature?: number;
  /** Optional per-call overrides (e.g. per-bot AI controls). */
  provider?: string;
  model?: string;
}

/** Single-turn chat completion (system + user) returning plain text. */
export async function chat(args: ChatArgs): Promise<string> {
  const p =
    (args.provider || provider()).toLowerCase() === "gemini" ? "gemini" : "openai";
  return p === "gemini" ? chatGemini(args) : chatOpenAI(args);
}

async function chatOpenAI({ system, user, temperature = 0.1, model }: ChatArgs): Promise<string> {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const chatModel = model || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: chatModel,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI chat failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return json.choices[0]?.message?.content?.trim() ?? "";
}

async function chatGemini({ system, user, temperature = 0.1, model }: ChatArgs): Promise<string> {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const chatModel = model || process.env.GEMINI_CHAT_MODEL || "gemini-1.5-flash";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${chatModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini chat failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
