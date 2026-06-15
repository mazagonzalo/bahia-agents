-- Habilitar extensión de vectores (para memoria semántica futura)
create extension if not exists vector;

-- ── LEADS ────────────────────────────────────────────────────────────
create table leads (
  id           uuid primary key default gen_random_uuid(),
  phone        text unique not null,
  name         text,
  status       text default 'nuevo', -- nuevo | calificado | citado | cerrado | frio
  score        integer default 0,
  source       text default 'whatsapp', -- whatsapp | instagram | facebook | ad
  last_contact timestamptz default now(),
  created_at   timestamptz default now()
);

-- ── CONVERSACIONES ────────────────────────────────────────────────────
create table conversations (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid references leads(id) on delete cascade,
  role       text not null, -- user | assistant
  content    text not null,
  created_at timestamptz default now()
);
create index on conversations(lead_id, created_at);

-- ── MEMORIA DE AGENTES (RAG) ──────────────────────────────────────────
create table agent_memory (
  id         uuid primary key default gen_random_uuid(),
  agent      text not null, -- ventas | tendencias | contenido | meta_ads
  type       text not null, -- resultado | aprendizaje
  content    text not null,
  outcome    text, -- bueno | malo | neutro
  embedding  vector(1536), -- para búsqueda semántica futura
  created_at timestamptz default now()
);

-- ── CREATIVOS ─────────────────────────────────────────────────────────
create table creatives (
  id               uuid primary key default gen_random_uuid(),
  type             text not null, -- carrusel | imagen | video | copy
  content          jsonb,         -- datos del creativo (slides, captions, etc.)
  status           text default 'borrador', -- borrador | aprobado | publicado | rechazado
  meta_campaign_id text,
  metrics          jsonb,         -- CPL, CTR, impresiones (se llena después de publicar)
  created_at       timestamptz default now()
);

-- ── TENDENCIAS ────────────────────────────────────────────────────────
create table trends (
  id         uuid primary key default gen_random_uuid(),
  topic      text not null,
  score      integer default 50,
  angle      text,          -- enfoque específico para Bahía
  source     text,          -- perplexity+claude | google_trends | ad_library
  region     text,
  used       boolean default false,
  created_at timestamptz default now()
);

-- ── FUNCIÓN: incrementar score del lead ───────────────────────────────
create or replace function increment_lead_score(lead_id uuid)
returns void as $$
  update leads set score = score + 1 where id = lead_id;
$$ language sql;

-- ── ROW LEVEL SECURITY (básico) ───────────────────────────────────────
alter table leads enable row level security;
alter table conversations enable row level security;
alter table creatives enable row level security;
alter table trends enable row level security;

-- Solo el service_role (usado en el servidor) puede leer/escribir todo
create policy "service_role_all" on leads for all using (true);
create policy "service_role_all" on conversations for all using (true);
create policy "service_role_all" on creatives for all using (true);
create policy "service_role_all" on trends for all using (true);
