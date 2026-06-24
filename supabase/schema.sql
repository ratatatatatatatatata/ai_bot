-- ===========================================================================
-- Website Knowledge Chatbot — Supabase schema
-- Run this in the Supabase SQL Editor (or `supabase db push`).
-- ===========================================================================

-- Extensions -----------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "vector";      -- pgvector for embeddings

-- ===========================================================================
-- TABLES
-- ===========================================================================

-- Mirror of auth.users so we can attach an app-level role / profile.
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  role        text not null default 'admin',
  created_at  timestamptz not null default now()
);

-- A website that has been (or will be) crawled.
create table if not exists public.websites (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text,
  base_url        text not null,
  status          text not null default 'idle', -- idle | crawling | done | error
  status_message  text,
  pages_count     integer not null default 0,
  last_crawled_at timestamptz,
  created_at      timestamptz not null default now()
);

-- A single crawled page.
create table if not exists public.pages (
  id          uuid primary key default gen_random_uuid(),
  website_id  uuid not null references public.websites (id) on delete cascade,
  url         text not null,
  title       text,
  content     text,
  created_at  timestamptz not null default now(),
  unique (website_id, url)
);

-- A small chunk of page text + its embedding vector.
-- NOTE: 1536 dims = OpenAI text-embedding-3-small. For Gemini
-- text-embedding-004 change this to vector(768) before crawling.
create table if not exists public.chunks (
  id          uuid primary key default gen_random_uuid(),
  website_id  uuid not null references public.websites (id) on delete cascade,
  page_id     uuid not null references public.pages (id) on delete cascade,
  page_url    text,
  page_title  text,
  chunk_text  text not null,
  embedding   vector(1536),
  created_at  timestamptz not null default now()
);

-- One configurable chatbot per website (auto-created when a website is added).
create table if not exists public.chatbots (
  id               uuid primary key default gen_random_uuid(),
  website_id       uuid not null references public.websites (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  name             text not null default 'Assistant',
  welcome_message  text not null default 'Сайн байна уу! Та юу асуумаар байна?',
  primary_color    text not null default '#4f46e5',
  logo_url         text,
  fallback_message text not null default 'Уучлаарай, энэ мэдээлэл website дээр байхгүй байна.',
  created_at       timestamptz not null default now()
);

-- Logged chat turns (one row per message).
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  chatbot_id  uuid references public.chatbots (id) on delete cascade,
  website_id  uuid references public.websites (id) on delete set null,
  session_id  text,
  role        text not null,            -- 'user' | 'assistant'
  message     text not null,
  sources     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- Helpful indexes ------------------------------------------------------------
create index if not exists idx_pages_website   on public.pages (website_id);
create index if not exists idx_chunks_website  on public.chunks (website_id);
create index if not exists idx_messages_chatbot on public.chat_messages (chatbot_id, created_at desc);

-- Vector similarity index (cosine). IVFFlat needs ANALYZE after data load.
create index if not exists idx_chunks_embedding
  on public.chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ===========================================================================
-- SIMILARITY SEARCH FUNCTION
-- ===========================================================================
create or replace function public.match_chunks (
  query_embedding      vector(1536),
  match_website_id     uuid,
  match_count          int default 5,
  similarity_threshold float default 0.0
)
returns table (
  id         uuid,
  page_url   text,
  page_title text,
  chunk_text text,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.page_url,
    c.page_title,
    c.chunk_text,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  where c.website_id = match_website_id
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ===========================================================================
-- NEW USER TRIGGER  (create a public.users row when someone signs up)
-- ===========================================================================
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user ();

-- ===========================================================================
-- ROW LEVEL SECURITY
-- Admins manage ONLY their own rows. The public widget never uses these
-- policies: the /api/chat and /api/widget routes run server-side with the
-- service-role key, which bypasses RLS.
-- ===========================================================================
alter table public.users         enable row level security;
alter table public.websites      enable row level security;
alter table public.pages         enable row level security;
alter table public.chunks        enable row level security;
alter table public.chatbots      enable row level security;
alter table public.chat_messages enable row level security;

-- users: a user can read/update only their own profile row.
drop policy if exists "users self read"   on public.users;
drop policy if exists "users self update" on public.users;
create policy "users self read"   on public.users for select using (auth.uid() = id);
create policy "users self update" on public.users for update using (auth.uid() = id);

-- websites: full CRUD on rows you own.
drop policy if exists "websites owner all" on public.websites;
create policy "websites owner all" on public.websites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- pages: accessible if the parent website belongs to you.
drop policy if exists "pages owner all" on public.pages;
create policy "pages owner all" on public.pages
  for all using (
    exists (select 1 from public.websites w
            where w.id = pages.website_id and w.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.websites w
            where w.id = pages.website_id and w.user_id = auth.uid())
  );

-- chunks: accessible if the parent website belongs to you.
drop policy if exists "chunks owner all" on public.chunks;
create policy "chunks owner all" on public.chunks
  for all using (
    exists (select 1 from public.websites w
            where w.id = chunks.website_id and w.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.websites w
            where w.id = chunks.website_id and w.user_id = auth.uid())
  );

-- chatbots: full CRUD on rows you own.
drop policy if exists "chatbots owner all" on public.chatbots;
create policy "chatbots owner all" on public.chatbots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- chat_messages: owners can read messages for their own chatbots.
drop policy if exists "messages owner read" on public.chat_messages;
create policy "messages owner read" on public.chat_messages
  for select using (
    exists (select 1 from public.chatbots b
            where b.id = chat_messages.chatbot_id and b.user_id = auth.uid())
  );

-- ===========================================================================
-- Done. After your first crawl, optionally run:  analyze public.chunks;
-- ===========================================================================
