import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
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
import { cosineSim, keywordScore, tokenize } from "@/lib/store/retrieve";

const DEMO_USER = "demo-admin";

interface DB {
  websites: Website[];
  chatbots: Chatbot[];
  pages: Page[];
  chunks: Chunk[];
  qa: QAPair[];
  docs: TrainingDoc[];
  messages: ChatMessage[];
  leads: Lead[];
}

const DATA_DIR = path.join(process.cwd(), process.env.DATA_DIR || ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function now(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86400000).toISOString();
}
function id(): string {
  return crypto.randomUUID();
}

export function defaultChatbot(websiteId: string, name: string): Chatbot {
  return {
    id: id(),
    website_id: websiteId,
    user_id: DEMO_USER,
    name: `${name} assistant`,
    status: "active",
    welcome_message: "Сайн байна уу! Та юу асуумаар байна?",
    primary_color: "#4f46e5",
    theme: "light",
    position: "right",
    logo_url: null,
    avatar_url: null,
    launcher_text: "Танд тусламж хэрэгтэй юу?",
    fallback_message: "Уучлаарай, энэ мэдээлэл website дээр байхгүй байна.",
    suggested_questions: [],
    language: "auto",
    ai_provider: process.env.AI_PROVIDER || "openai",
    ai_model: "gpt-4o-mini",
    temperature: 0.1,
    lead_capture: false,
    lead_message: "Холбоо барих мэдээллээ үлдээгээрэй, бид тантай эргэн холбогдоно.",
    created_at: now(),
  };
}

function seed(): DB {
  const website: Website = {
    id: id(),
    user_id: DEMO_USER,
    name: "TBPlan Demo",
    base_url: "https://tbplan.example.com",
    status: "done",
    status_message: "Indexed 3 pages, 6 chunks.",
    pages_count: 3,
    last_crawled_at: now(-1),
    created_at: now(-7),
  };

  const bot = defaultChatbot(website.id, "TBPlan");
  bot.suggested_questions = [
    "What is TBPlan?",
    "How much does it cost?",
    "How do I contact support?",
  ];
  bot.lead_capture = true;

  const pageData = [
    {
      url: "https://tbplan.example.com/",
      title: "TBPlan — Home",
      content:
        "TBPlan is a planning platform that helps teams build, share and track project plans. " +
        "It offers timelines, task boards and reporting in one place. Start free and upgrade anytime.",
    },
    {
      url: "https://tbplan.example.com/pricing",
      title: "Pricing",
      content:
        "TBPlan pricing: the Free plan includes 1 project and basic boards. " +
        "The Pro plan is 19 USD per user per month and adds unlimited projects, timelines and reporting. " +
        "The Business plan is 39 USD per user per month with SSO and priority support.",
    },
    {
      url: "https://tbplan.example.com/contact",
      title: "Contact & Support",
      content:
        "You can contact TBPlan support by email at support@tbplan.example.com. " +
        "Support is available Monday to Friday, 9am to 6pm. We usually reply within one business day.",
    },
  ];

  const pages: Page[] = [];
  const chunks: Chunk[] = [];
  for (const p of pageData) {
    const page: Page = {
      id: id(),
      website_id: website.id,
      url: p.url,
      title: p.title,
      content: p.content,
      source: "crawl",
      created_at: now(-1),
    };
    pages.push(page);
    // split into ~2 chunks per page on sentence boundary
    const parts = p.content.split(/(?<=\.)\s+/).reduce<string[]>((acc, s) => {
      if (acc.length && (acc[acc.length - 1] + " " + s).length < 180)
        acc[acc.length - 1] += " " + s;
      else acc.push(s);
      return acc;
    }, []);
    for (const text of parts) {
      chunks.push({
        id: id(),
        website_id: website.id,
        page_id: page.id,
        page_url: page.url,
        page_title: page.title ?? "",
        chunk_text: text.trim(),
        embedding: null,
        created_at: now(-1),
      });
    }
  }

  const qa: QAPair[] = [
    {
      id: id(),
      website_id: website.id,
      question: "Do you offer a free trial?",
      answer:
        "Yes — TBPlan has a Free plan you can use indefinitely, and Pro features can be trialed for 14 days.",
      created_at: now(-2),
    },
  ];

  // A couple of sample conversations + leads spread over recent days.
  const messages: ChatMessage[] = [];
  const sessions = ["sess-demo-1", "sess-demo-2", "sess-demo-3"];
  const samples: [string, string, number][] = [
    ["How much does Pro cost?", "The Pro plan is 19 USD per user per month.", -3],
    ["What is TBPlan?", "TBPlan is a planning platform for building and tracking project plans.", -2],
    ["How do I contact support?", "You can email support@tbplan.example.com, Mon–Fri 9am–6pm.", -1],
    ["Where are you located?", "Уучлаарай, энэ мэдээлэл website дээр байхгүй байна.", 0],
  ];
  samples.forEach(([q, a, d], i) => {
    const s = sessions[i % sessions.length];
    messages.push({
      id: id(),
      chatbot_id: bot.id,
      website_id: website.id,
      session_id: s,
      role: "user",
      message: q,
      sources: [],
      created_at: now(d),
    });
    messages.push({
      id: id(),
      chatbot_id: bot.id,
      website_id: website.id,
      session_id: s,
      role: "assistant",
      message: a,
      sources: [],
      created_at: now(d),
    });
  });

  const leads: Lead[] = [
    {
      id: id(),
      chatbot_id: bot.id,
      website_id: website.id,
      session_id: "sess-demo-1",
      name: "Bat-Erdene",
      email: "bat@example.com",
      phone: null,
      created_at: now(-3),
    },
  ];

  return {
    websites: [website],
    chatbots: [bot],
    pages,
    chunks,
    qa,
    docs: [],
    messages,
    leads,
  };
}

function load(): DB {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const seeded = seed();
      fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2));
      return seeded;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as DB;
  } catch {
    return seed();
  }
}

function save(db: DB): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// --- Store implementation --------------------------------------------------

export const demoStore = {
  // Websites
  async listWebsites(): Promise<Website[]> {
    return load().websites.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },
  async getWebsite(wid: string): Promise<Website | null> {
    return load().websites.find((w) => w.id === wid) || null;
  },
  async createWebsite(input: { name?: string; base_url: string }): Promise<{
    website: Website;
    chatbot: Chatbot;
  }> {
    const db = load();
    const host = (() => {
      try {
        return new URL(input.base_url).hostname;
      } catch {
        return input.base_url;
      }
    })();
    const website: Website = {
      id: id(),
      user_id: DEMO_USER,
      name: input.name || host,
      base_url: input.base_url,
      status: "idle",
      status_message: null,
      pages_count: 0,
      last_crawled_at: null,
      created_at: now(),
    };
    const chatbot = defaultChatbot(website.id, website.name || host);
    db.websites.push(website);
    db.chatbots.push(chatbot);
    save(db);
    return { website, chatbot };
  },
  async updateWebsite(wid: string, patch: Partial<Website>): Promise<void> {
    const db = load();
    const w = db.websites.find((x) => x.id === wid);
    if (w) Object.assign(w, patch);
    save(db);
  },
  async deleteWebsite(wid: string): Promise<void> {
    const db = load();
    db.websites = db.websites.filter((w) => w.id !== wid);
    db.chatbots = db.chatbots.filter((c) => c.website_id !== wid);
    db.pages = db.pages.filter((p) => p.website_id !== wid);
    db.chunks = db.chunks.filter((c) => c.website_id !== wid);
    db.qa = db.qa.filter((q) => q.website_id !== wid);
    db.docs = db.docs.filter((d) => d.website_id !== wid);
    save(db);
  },

  // Chatbots
  async listChatbots(websiteId?: string): Promise<Chatbot[]> {
    const all = load().chatbots;
    return (websiteId ? all.filter((c) => c.website_id === websiteId) : all).sort(
      (a, b) => (a.created_at < b.created_at ? 1 : -1)
    );
  },
  async getChatbot(cid: string): Promise<Chatbot | null> {
    return load().chatbots.find((c) => c.id === cid) || null;
  },
  async createChatbot(websiteId: string, patch?: Partial<Chatbot>): Promise<Chatbot> {
    const db = load();
    const w = db.websites.find((x) => x.id === websiteId);
    const bot = defaultChatbot(websiteId, w?.name || "Bot");
    Object.assign(bot, patch || {});
    db.chatbots.push(bot);
    save(db);
    return bot;
  },
  async updateChatbot(cid: string, patch: Partial<Chatbot>): Promise<Chatbot | null> {
    const db = load();
    const c = db.chatbots.find((x) => x.id === cid);
    if (!c) return null;
    Object.assign(c, patch);
    save(db);
    return c;
  },
  async deleteChatbot(cid: string): Promise<void> {
    const db = load();
    db.chatbots = db.chatbots.filter((c) => c.id !== cid);
    save(db);
  },

  // Pages
  async listPages(websiteId: string): Promise<Page[]> {
    return load()
      .pages.filter((p) => p.website_id === websiteId)
      .sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
  },
  async createPage(input: Omit<Page, "id" | "created_at">): Promise<Page> {
    const db = load();
    const page: Page = { ...input, id: id(), created_at: now() };
    db.pages.push(page);
    save(db);
    return page;
  },
  async deletePage(pid: string): Promise<void> {
    const db = load();
    db.pages = db.pages.filter((p) => p.id !== pid);
    db.chunks = db.chunks.filter((c) => c.page_id !== pid);
    save(db);
  },
  async clearKnowledge(websiteId: string, sources: SourceType[]): Promise<void> {
    const db = load();
    const removed = db.pages.filter(
      (p) => p.website_id === websiteId && sources.includes(p.source)
    );
    const ids = new Set(removed.map((p) => p.id));
    db.pages = db.pages.filter((p) => !ids.has(p.id));
    db.chunks = db.chunks.filter((c) => !ids.has(c.page_id));
    db.docs = db.docs.filter(
      (d) => !(d.website_id === websiteId && sources.includes(d.source))
    );
    save(db);
  },

  // Chunks
  async insertChunks(rows: Omit<Chunk, "id" | "created_at">[]): Promise<void> {
    if (rows.length === 0) return;
    const db = load();
    for (const r of rows) db.chunks.push({ ...r, id: id(), created_at: now() });
    save(db);
  },
  async matchChunks(
    websiteId: string,
    query: { text: string; embedding: number[] | null },
    k = 6,
    threshold = 0.15
  ): Promise<MatchedChunk[]> {
    const chunks = load().chunks.filter((c) => c.website_id === websiteId);
    const qTokens = tokenize(query.text);
    const scored = chunks.map((c) => {
      let score: number;
      if (query.embedding && c.embedding) {
        score = cosineSim(query.embedding, c.embedding);
      } else {
        score = keywordScore(qTokens, c.chunk_text);
      }
      return { c, score };
    });
    return scored
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

  // Q&A
  async listQA(websiteId: string): Promise<QAPair[]> {
    return load().qa.filter((q) => q.website_id === websiteId);
  },
  async createQA(input: { website_id: string; question: string; answer: string }): Promise<QAPair> {
    const db = load();
    const qa: QAPair = { ...input, id: id(), created_at: now() };
    db.qa.push(qa);
    save(db);
    return qa;
  },
  async deleteQA(qid: string): Promise<void> {
    const db = load();
    db.qa = db.qa.filter((q) => q.id !== qid);
    save(db);
  },
  async matchQA(websiteId: string, text: string): Promise<QAPair | null> {
    const qTokens = tokenize(text);
    const items = load().qa.filter((q) => q.website_id === websiteId);
    let best: { q: QAPair; score: number } | null = null;
    for (const q of items) {
      const score = keywordScore(qTokens, q.question);
      if (!best || score > best.score) best = { q, score };
    }
    return best && best.score >= 0.45 ? best.q : null;
  },

  // Training docs
  async listDocs(websiteId: string): Promise<TrainingDoc[]> {
    return load().docs.filter((d) => d.website_id === websiteId);
  },
  async createDoc(input: Omit<TrainingDoc, "id" | "created_at">): Promise<TrainingDoc> {
    const db = load();
    const doc: TrainingDoc = { ...input, id: id(), created_at: now() };
    db.docs.push(doc);
    save(db);
    return doc;
  },

  // Messages
  async listMessages(opts: {
    botId?: string;
    websiteId?: string;
    limit?: number;
  }): Promise<ChatMessage[]> {
    let m = load().messages;
    if (opts.botId) m = m.filter((x) => x.chatbot_id === opts.botId);
    if (opts.websiteId) m = m.filter((x) => x.website_id === opts.websiteId);
    m = m.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return m.slice(0, opts.limit || 200);
  },
  async createMessages(rows: Omit<ChatMessage, "id">[]): Promise<void> {
    const db = load();
    for (const r of rows) db.messages.push({ ...r, id: id() });
    save(db);
  },

  // Leads
  async listLeads(opts: { botId?: string; websiteId?: string }): Promise<Lead[]> {
    let l = load().leads;
    if (opts.botId) l = l.filter((x) => x.chatbot_id === opts.botId);
    if (opts.websiteId) l = l.filter((x) => x.website_id === opts.websiteId);
    return l.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },
  async createLead(input: Omit<Lead, "id" | "created_at">): Promise<Lead> {
    const db = load();
    const lead: Lead = { ...input, id: id(), created_at: now() };
    db.leads.push(lead);
    save(db);
    return lead;
  },

  // Analytics
  async getAnalytics(websiteId?: string): Promise<Analytics> {
    const db = load();
    const msgs = websiteId
      ? db.messages.filter((m) => m.website_id === websiteId)
      : db.messages;
    const leads = websiteId
      ? db.leads.filter((l) => l.website_id === websiteId)
      : db.leads;
    const pages = websiteId
      ? db.pages.filter((p) => p.website_id === websiteId)
      : db.pages;

    const sessions = new Set(msgs.map((m) => m.session_id));
    const userMsgs = msgs.filter((m) => m.role === "user");

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
      const d = m.created_at.slice(0, 10);
      if (perDayMap.has(d)) perDayMap.set(d, (perDayMap.get(d) || 0) + 1);
    }
    const perDay = [...perDayMap.entries()].map(([date, count]) => ({ date, count }));

    return {
      totalConversations: sessions.size,
      totalMessages: msgs.length,
      totalLeads: leads.length,
      totalPages: pages.length,
      topQuestions,
      perDay,
    };
  },
};

export type DemoStore = typeof demoStore;
