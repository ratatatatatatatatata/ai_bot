-- ===========================================================================
-- TBPlan Chat Bot System — Supabase schema (production mode)
-- Run this in the Supabase SQL Editor. Demo mode does NOT need this.
-- ===========================================================================

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- Profiles -----------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  role        text not null default 'admin',
  created_at  timestamptz not null default now()
);

-- Knowledge bases ----------------------------------------------------------
create table if not exists public.websites (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text,
  base_url        text not null,
  status          text not null default 'idle',
  status_message  text,
  pages_count     integer not null default 0,
  last_crawled_at timestamptz,
  created_at      timestamptz not null default now()
);

-- Indexed pages (from crawl / sitemap / file / text) -----------------------
create table if not exists public.pages (
  id          uuid primary key default gen_random_uuid(),
  website_id  uuid not null references public.websites (id) on delete cascade,
  url         text not null,
  title       text,
  content     text,
  source      text not null default 'crawl',
  created_at  timestamptz not null default now(),
  unique (website_id, url)
);

-- Embedded chunks (1536 dims = OpenAI text-embedding-3-small) ---------------
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

-- Custom Q&A pairs ----------------------------------------------------------
create table if not exists public.qa_pairs (
  id          uuid primary key default gen_random_uuid(),
  website_id  uuid not null references public.websites (id) on delete cascade,
  question    text not null,
  answer      text not null,
  created_at  timestamptz not null default now()
);

-- Uploaded training documents (metadata) -----------------------------------
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  website_id  uuid not null references public.websites (id) on delete cascade,
  name        text not null,
  type        text,
  source      text not null default 'file',
  chars       integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Chatbots (one or more per knowledge base) --------------------------------
create table if not exists public.chatbots (
  id                  uuid primary key default gen_random_uuid(),
  website_id          uuid not null references public.websites (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  name                text not null default 'Assistant',
  status              text not null default 'active',         -- active | paused
  welcome_message     text not null default 'Сайн байна уу! Та юу асуумаар байна?',
  primary_color       text not null default '#4f46e5',
  theme               text not null default 'light',          -- light | dark | auto
  position            text not null default 'right',          -- right | left
  logo_url            text,
  avatar_url          text,
  launcher_text       text,
  fallback_message    text not null default 'Уучлаарай, энэ мэдээлэл website дээр байхгүй байна.',
  suggested_questions jsonb not null default '[]'::jsonb,
  language            text not null default 'auto',
  ai_provider         text not null default 'openai',
  ai_model            text not null default 'gpt-4o-mini',
  temperature         real not null default 0.1,
  lead_capture        boolean not null default false,
  lead_message        text not null default 'Холбоо барих мэдээллээ үлдээгээрэй.',
  created_at          timestamptz not null default now()
);

-- Logged chat turns --------------------------------------------------------
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  chatbot_id  uuid references public.chatbots (id) on delete cascade,
  website_id  uuid references public.websites (id) on delete set null,
  session_id  text,
  role        text not null,
  message     text not null,
  sources     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- Captured leads -----------------------------------------------------------
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  chatbot_id  uuid references public.chatbots (id) on delete cascade,
  website_id  uuid references public.websites (id) on delete set null,
  session_id  text,
  name        text,
  email       text,
  phone       text,
  created_at  timestamptz not null default now()
);

-- Indexes ------------------------------------------------------------------
create index if not exists idx_pages_website    on public.pages (website_id);
create index if not exists idx_chunks_website   on public.chunks (website_id);
create index if not exists idx_qa_website        on public.qa_pairs (website_id);
create index if not exists idx_messages_chatbot  on public.chat_messages (chatbot_id, created_at desc);
create index if not exists idx_leads_website     on public.leads (website_id, created_at desc);
create index if not exists idx_chunks_embedding
  on public.chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Similarity search --------------------------------------------------------
create or replace function public.match_chunks (
  query_embedding      vector(1536),
  match_website_id     uuid,
  match_count          int default 5,
  similarity_threshold float default 0.0
)
returns table (
  id uuid, page_url text, page_title text, chunk_text text, similarity float
)
language sql stable as $$
  select c.id, c.page_url, c.page_title, c.chunk_text,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  where c.website_id = match_website_id
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- New-user trigger ---------------------------------------------------------
create or replace function public.handle_new_user ()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user ();

-- ===========================================================================
-- Row Level Security. Public widget endpoints (/api/chat, /api/widget,
-- /api/lead) run server-side with the service-role key and bypass RLS.
-- ===========================================================================
alter table public.users         enable row level security;
alter table public.websites      enable row level security;
alter table public.pages         enable row level security;
alter table public.chunks        enable row level security;
alter table public.qa_pairs      enable row level security;
alter table public.documents     enable row level security;
alter table public.chatbots      enable row level security;
alter table public.chat_messages enable row level security;
alter table public.leads         enable row level security;

drop policy if exists "users self" on public.users;
create policy "users self" on public.users for select using (auth.uid() = id);

drop policy if exists "websites owner" on public.websites;
create policy "websites owner" on public.websites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chatbots owner" on public.chatbots;
create policy "chatbots owner" on public.chatbots for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Child tables: access if the parent website belongs to you.
do $$
declare t text;
begin
  foreach t in array array['pages','chunks','qa_pairs','documents'] loop
    execute format('drop policy if exists "%s owner" on public.%I;', t, t);
    execute format(
      'create policy "%s owner" on public.%I for all using (exists (select 1 from public.websites w where w.id = %I.website_id and w.user_id = auth.uid())) with check (exists (select 1 from public.websites w where w.id = %I.website_id and w.user_id = auth.uid()));',
      t, t, t, t);
  end loop;
end $$;

drop policy if exists "messages owner read" on public.chat_messages;
create policy "messages owner read" on public.chat_messages for select
  using (exists (select 1 from public.chatbots b where b.id = chat_messages.chatbot_id and b.user_id = auth.uid()));

drop policy if exists "leads owner read" on public.leads;
create policy "leads owner read" on public.leads for select
  using (exists (select 1 from public.websites w where w.id = leads.website_id and w.user_id = auth.uid()));

-- Done.
