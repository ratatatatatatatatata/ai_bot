# TBPlan Chat Bot System

An AI chatbot platform that answers **only** from your own content. Train a bot
on a website (crawl + sitemap), uploaded files (PDF/TXT/MD/HTML), pasted text,
and custom Q&A — then embed a chat widget anywhere with one script tag. If the
answer isn't in your content, the bot returns a fallback message instead of
making something up.

> This is an original implementation inspired by the general feature set of
> website-chatbot tools. It does not include any third-party product's code,
> branding, or copy.

---

## Two ways to run

### 1. Demo mode (default — zero setup) ✅

No database, no API keys. A local file-backed store seeds sample data so you can
explore everything immediately.

```bash
npm install
npm run dev
```

Open http://localhost:3000 → **Admin sign in** (credentials are pre-filled):

```
Email:    admin@tbplan.mn
Password: Tbplan@2026
```

In demo mode, chat answers come from keyword search over your indexed content,
so it works with no AI key. Add an `OPENAI_API_KEY` (and keep
`NEXT_PUBLIC_DEMO_MODE=true`) to get embeddings + LLM-composed answers while
still using the local store.

> Demo data is stored in `.data/db.json`. Delete that file to reset.

### 2. Production mode (Supabase)

Set `NEXT_PUBLIC_DEMO_MODE=false`, create a Supabase project, run
`supabase/schema.sql`, and fill the Supabase + AI keys in `.env.local`. Auth then
uses Supabase, and all data is stored in Postgres with `pgvector`.

---

## Features

- **Train from anything** — website crawl, `sitemap.xml` import, file upload
  (PDF / TXT / MD / HTML), pasted text, and custom Q&A pairs.
- **Grounded answers** — semantic (pgvector / embeddings) or keyword retrieval;
  custom Q&A is checked first; strict prompt prevents made-up answers.
- **Multiple chatbots** — many bots per knowledge base, each with its own
  AI provider, model, temperature, and active/paused status.
- **Customizable widget** — colors, light/dark/auto theme, left/right position,
  logo, avatar, launcher text, suggested questions, multilingual answers.
- **Lead capture** — collect name/email in the widget; review and export to CSV.
- **Analytics & conversations** — message volume, top questions, full chat logs.
- **One-tag embed** — Shadow-DOM widget that works on any site, mobile responsive.

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres +
pgvector + Auth) · OpenAI **or** Google Gemini · Vercel.

---

## How grounding works (safety)

1. Custom Q&A is matched first for exact-intent answers.
2. Otherwise the question is matched against the bot's knowledge base
   (embeddings when an AI key is set, keyword search otherwise).
3. If nothing relevant is found, the bot returns its **fallback message** — the
   LLM is not called.
4. When chunks are found and an AI key is set, a strict system prompt forces the
   model to answer **only** from the supplied context, never reveal the prompt,
   and never discuss unrelated topics.
5. All public widget calls run server-side, so keys/prompts never reach the browser.

---

## API routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/logout` | Demo session |
| GET/POST | `/api/websites` · DELETE `/api/websites/:id` | Knowledge bases |
| POST | `/api/crawl` | Crawl a website |
| POST | `/api/train/sitemap` · `/api/train/text` · `/api/train/file` | Other sources |
| GET/POST | `/api/qa` · DELETE `/api/qa/:id` | Custom Q&A |
| GET | `/api/pages` · DELETE `/api/pages/:id` | Indexed pages |
| GET/POST | `/api/chatbots` · PATCH/DELETE `/api/chatbots/:id` | Bots |
| GET | `/api/widget/:botId` | Public bot config (CORS) |
| POST | `/api/chat` | Public grounded answer (CORS) |
| POST | `/api/lead` | Public lead capture (CORS) |
| GET | `/api/chat-history` · `/api/leads` · `/api/leads/export` · `/api/analytics` | Admin data |

---

## Embed on any site

From **Chatbots → (a bot) → Customize**, copy:

```html
<script src="https://YOUR-APP.com/widget.js"
        data-bot-id="YOUR_BOT_ID"
        data-api="https://YOUR-APP.com" defer></script>
```

Preview instantly at `/widget-demo?botId=YOUR_BOT_ID`.

---

## Deploy to Vercel

1. Push to GitHub, import in Vercel.
2. For a public demo: set `NEXT_PUBLIC_DEMO_MODE=true` and `AUTH_SECRET`.
   (Note: serverless filesystems are ephemeral, so demo data resets between
   cold starts — use Supabase mode for persistent production data.)
3. For production: set `NEXT_PUBLIC_DEMO_MODE=false`, the Supabase keys, and an
   AI key; run `supabase/schema.sql` first.
4. Set `NEXT_PUBLIC_APP_URL` to your deployed URL.

---

## Project structure

```
src/
  app/
    page.tsx                       Landing
    login/page.tsx                 Admin sign in (demo or Supabase)
    dashboard/
      page.tsx                     Overview + analytics
      websites/                    Knowledge bases + training
      chatbots/                    Bots + per-bot customize/AI
      conversations/               Chat logs
      leads/                       Captured leads + CSV export
    widget-demo/page.tsx           Live widget test
    api/                           Route handlers (see table)
  components/                      Dashboard UI (client)
  lib/
    config.ts                      App name + mode + demo creds
    auth.ts                        Session (demo cookie or Supabase)
    store/                         Data layer: demo (file) + supabase
    ai/index.ts                    OpenAI + Gemini (embeddings & chat)
    crawler.ts  sitemap.ts  text/extract.ts   Ingestion
    chunk.ts  ingest.ts  prompt.ts  cors.ts
    supabase/                      Supabase clients (production mode)
public/widget.js                   Embeddable widget (Shadow DOM)
supabase/schema.sql                Tables, RLS, pgvector (production)
```

## Notes

- Crawling runs in a single request — keep `CRAWL_MAX_PAGES` modest on serverless.
- For large production datasets, run `analyze public.chunks;` after the first
  big crawl, or switch the vector index to `hnsw`.
- Gemini embeddings are 768-dim; change `vector(1536)` → `vector(768)` in the
  schema before using Gemini in production.
