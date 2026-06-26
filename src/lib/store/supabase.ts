import { createAdminClient } from "@/lib/supabase/admin";
import { keywordScore, tokenize } from "@/lib/store/retrieve";
import type {
  Analytics,
  Chatbot,
  ChatMessage,
  Chunk,
  Lead,
  MatchedChunk,
  Page,
  QAPair,
  SourceType,
  TrainingDoc,
  Website,
} from "@/lib/types";

/**
 * Supabase-backed store (production). Uses the service-role client; the app's
 * own session layer gates access. Rows are scoped to the signed-in user.
 */

async function uid(): Promise<string> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || "";
}

function chatbotDefaults(websiteId: string, userId: string, name: string): Partial<Chatbot> {
  return {
    website_id: websiteId,
    user_id: userId,
    name: `${name} assistant`,
    status: "active",
    welcome_message: "Сайн байна уу! Та юу асуумаар байна?",
    primary_color: "#4f46e5",
    theme: "light",
    position: "right",
    fallback_message: "Уучлаарай, энэ мэдээлэл website дээр байхгүй байна.",
    suggested_questions: [],
    language: "auto",
    ai_provider: process.env.AI_PROVIDER || "openai",
    ai_model: "gpt-4o-mini",
    temperature: 0.1,
    lead_capture: false,
    lead_message: "Холбоо барих мэдээллээ үлдээгээрэй.",
  };
}

export const supabaseStore = {
  async listWebsites(): Promise<Website[]> {
    const db = createAdminClient();
    const { data } = await db
      .from("websites")
      .select("*")
      .eq("user_id", await uid())
      .order("created_at", { ascending: false });
    return (data as Website[]) || [];
  },
  async getWebsite(wid: string): Promise<Website | null> {
    const db = createAdminClient();
    const { data } = await db.from("websites").select("*").eq("id", wid).single();
    return (data as Website) || null;
  },
  async createWebsite(input: { name?: string; base_url: string }): Promise<{
    website: Website;
    chatbot: Chatbot;
  }> {
    const db = createAdminClient();
    const userId = await uid();
    const host = (() => {
      try {
        return new URL(input.base_url).hostname;
      } catch {
        return input.base_url;
      }
    })();
    const { data: website } = await db
      .from("websites")
      .insert({ user_id: userId, base_url: input.base_url, name: input.name || host })
      .select()
      .single();
    const { data: chatbot } = await db
      .from("chatbots")
      .insert(chatbotDefaults(website.id, userId, input.name || host))
      .select()
      .single();
    return { website: website as Website, chatbot: chatbot as Chatbot };
  },
  async updateWebsite(wid: string, patch: Partial<Website>): Promise<void> {
    const db = createAdminClient();
    await db.from("websites").update(patch).eq("id", wid);
  },
  async deleteWebsite(wid: string): Promise<void> {
    const db = createAdminClient();
    await db.from("websites").delete().eq("id", wid);
  },

  async listChatbots(websiteId?: string): Promise<Chatbot[]> {
    const db = createAdminClient();
    let q = db.from("chatbots").select("*").eq("user_id", await uid());
    if (websiteId) q = q.eq("website_id", websiteId);
    const { data } = await q.order("created_at", { ascending: false });
    return (data as Chatbot[]) || [];
  },
  async getChatbot(cid: string): Promise<Chatbot | null> {
    const db = createAdminClient();
    const { data } = await db.from("chatbots").select("*").eq("id", cid).single();
    return (data as Chatbot) || null;
  },
  async createChatbot(websiteId: string, patch?: Partial<Chatbot>): Promise<Chatbot> {
    const db = createAdminClient();
    const userId = await uid();
    const { data: w } = await db.from("websites").select("name").eq("id", websiteId).single();
    const { data } = await db
      .from("chatbots")
      .insert({ ...chatbotDefaults(websiteId, userId, w?.name || "Bot"), ...(patch || {}) })
      .select()
      .single();
    return data as Chatbot;
  },
  async updateChatbot(cid: string, patch: Partial<Chatbot>): Promise<Chatbot | null> {
    const db = createAdminClient();
    const { data } = await db.from("chatbots").update(patch).eq("id", cid).select().single();
    return (data as Chatbot) || null;
  },
  async deleteChatbot(cid: string): Promise<void> {
    const db = createAdminClient();
    await db.from("chatbots").delete().eq("id", cid);
  },

  async listPages(websiteId: string): Promise<Page[]> {
    const db = createAdminClient();
    const { data } = await db
      .from("pages")
      .select("id, website_id, url, title, source, created_at")
      .eq("website_id", websiteId)
      .order("created_at", { ascending: true });
    return (data as Page[]) || [];
  },
  async createPage(input: Omit<Page, "id" | "created_at">): Promise<Page> {
    const db = createAdminClient();
    const { data } = await db.from("pages").insert(input).select().single();
    return data as Page;
  },
  async deletePage(pid: string): Promise<void> {
    const db = createAdminClient();
    await db.from("pages").delete().eq("id", pid);
  },
  async clearKnowledge(websiteId: string, sources: SourceType[]): Promise<void> {
    const db = createAdminClient();
    await db.from("pages").delete().eq("website_id", websiteId).in("source", sources);
    await db.from("documents").delete().eq("website_id", websiteId).in("source", sources);
    // chunks cascade via page_id FK on delete.
  },

  async insertChunks(rows: Omit<Chunk, "id" | "created_at">[]): Promise<void> {
    if (rows.length === 0) return;
    const db = createAdminClient();
    await db.from("chunks").insert(rows);
  },
  async matchChunks(
    websiteId: string,
    query: { text: string; embedding: number[] | null },
    k = 6,
    threshold = 0.15
  ): Promise<MatchedChunk[]> {
    const db = createAdminClient();
    if (query.embedding) {
      const { data, error } = await db.rpc("match_chunks", {
        query_embedding: query.embedding,
        match_website_id: websiteId,
        match_count: k,
        similarity_threshold: threshold,
      });
      if (error) throw new Error(error.message);
      return (data as MatchedChunk[]) || [];
    }
    // Keyword fallback (no embeddings configured).
    const { data } = await db
      .from("chunks")
      .select("id, page_url, page_title, chunk_text")
      .eq("website_id", websiteId)
      .limit(500);
    const qTokens = tokenize(query.text);
    return ((data as Chunk[]) || [])
      .map((c) => ({ c, score: keywordScore(qTokens, c.chunk_text) }))
      .filter((s) => s.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map(({ c, score }) => ({
        id: c.id,
        page_url: c.page_url,
        page_title: c.page_title,
        chunk_text: c.chunk_text,
        similarity: score,
      }));
  },

  async listQA(websiteId: string): Promise<QAPair[]> {
    const db = createAdminClient();
    const { data } = await db
      .from("qa_pairs")
      .select("*")
      .eq("website_id", websiteId)
      .order("created_at", { ascending: false });
    return (data as QAPair[]) || [];
  },
  async createQA(input: { website_id: string; question: string; answer: string }): Promise<QAPair> {
    const db = createAdminClient();
    const { data } = await db.from("qa_pairs").insert(input).select().single();
    return data as QAPair;
  },
  async deleteQA(qid: string): Promise<void> {
    const db = createAdminClient();
    await db.from("qa_pairs").delete().eq("id", qid);
  },
  async matchQA(websiteId: string, text: string): Promise<QAPair | null> {
    const items = await this.listQA(websiteId);
    const qTokens = tokenize(text);
    let best: { q: QAPair; score: number } | null = null;
    for (const q of items) {
      const score = keywordScore(qTokens, q.question);
      if (!best || score > best.score) best = { q, score };
    }
    return best && best.score >= 0.45 ? best.q : null;
  },

  async listDocs(websiteId: string): Promise<TrainingDoc[]> {
    const db = createAdminClient();
    const { data } = await db
      .from("documents")
      .select("*")
      .eq("website_id", websiteId)
      .order("created_at", { ascending: false });
    return (data as TrainingDoc[]) || [];
  },
  async createDoc(input: Omit<TrainingDoc, "id" | "created_at">): Promise<TrainingDoc> {
    const db = createAdminClient();
    const { data } = await db.from("documents").insert(input).select().single();
    return data as TrainingDoc;
  },

  async listMessages(opts: {
    botId?: string;
    websiteId?: string;
    limit?: number;
  }): Promise<ChatMessage[]> {
    const db = createAdminClient();
    let q = db.from("chat_messages").select("*");
    if (opts.botId) q = q.eq("chatbot_id", opts.botId);
    if (opts.websiteId) q = q.eq("website_id", opts.websiteId);
    const { data } = await q
      .order("created_at", { ascending: false })
      .limit(opts.limit || 200);
    return (data as ChatMessage[]) || [];
  },
  async createMessages(rows: Omit<ChatMessage, "id">[]): Promise<void> {
    const db = createAdminClient();
    await db.from("chat_messages").insert(rows);
  },

  async listLeads(opts: { botId?: string; websiteId?: string }): Promise<Lead[]> {
    const db = createAdminClient();
    let q = db.from("leads").select("*");
    if (opts.botId) q = q.eq("chatbot_id", opts.botId);
    if (opts.websiteId) q = q.eq("website_id", opts.websiteId);
    const { data } = await q.order("created_at", { ascending: false });
    return (data as Lead[]) || [];
  },
  async createLead(input: Omit<Lead, "id" | "created_at">): Promise<Lead> {
    const db = createAdminClient();
    const { data } = await db.from("leads").insert(input).select().single();
    return data as Lead;
  },

  async getAnalytics(websiteId?: string): Promise<Analytics> {
    const db = createAdminClient();
    const base = (t: string) => {
      const q = db.from(t).select("*");
      return websiteId ? q.eq("website_id", websiteId) : q;
    };
    const [{ data: msgs }, { data: leads }, { data: pages }] = await Promise.all([
      base("chat_messages"),
      base("leads"),
      base("pages"),
    ]);
    const messages = (msgs as ChatMessage[]) || [];
    const userMsgs = messages.filter((m) => m.role === "user");
    const sessions = new Set(messages.map((m) => m.session_id));

    const counts = new Map<string, number>();
    for (const m of userMsgs) {
      const key = m.message.trim().toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const topQuestions = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([question, count]) => ({ question, count }));

    const perDayMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      perDayMap.set(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), 0);
    }
    for (const m of userMsgs) {
      const d = (m.created_at || "").slice(0, 10);
      if (perDayMap.has(d)) perDayMap.set(d, (perDayMap.get(d) || 0) + 1);
    }
    const perDay = [...perDayMap.entries()].map(([date, count]) => ({ date, count }));

    return {
      totalConversations: sessions.size,
      totalMessages: messages.length,
      totalLeads: ((leads as Lead[]) || []).length,
      totalPages: ((pages as Page[]) || []).length,
      topQuestions,
      perDay,
    };
  },
};

export type SupabaseStore = typeof supabaseStore;
