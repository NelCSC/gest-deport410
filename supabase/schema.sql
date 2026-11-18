-- =============================================================================
-- Gest-Deport410 — Esquema PostgreSQL Completo para Supabase
-- Campeonato Interno de Aniversario U.E. 410 Hospital de Quillabamba
-- =============================================================================

create extension if not exists "pgcrypto";

-- 1. Campeonatos / Ligas (encapsula toda la gestión por torneo y portada personalizada)
create table if not exists public.championships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport text not null default 'Fulbito',
  season_year integer not null default 2026,
  description text not null default '',
  win_points integer not null default 3 check (win_points >= 0),
  draw_points integer not null default 1 check (draw_points >= 0),
  loss_points integer not null default 0 check (loss_points >= 0),
  liguilla_qualifiers integer not null default 4 check (liguilla_qualifiers >= 2),
  status text not null default 'activo' check (status in ('activo', 'finalizado')),
  hero_image_url text not null default '/images/hero-hospital-stadium.jpg',
  hero_image_position text not null default '50% 50%',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Si ya habías ejecutado el script anterior, estas líneas añaden las columnas de portada sin borrar tus datos:
alter table public.championships
  add column if not exists hero_image_url text not null default '/images/hero-hospital-stadium.jpg';
alter table public.championships
  add column if not exists hero_image_position text not null default '50% 50%';

-- 2. Equipos inscritos por campeonato
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null references public.championships(id) on delete cascade,
  name text not null,
  service_area text not null default '',
  primary_color text not null default '#0D5C63',
  responsible_1_name text not null,
  responsible_1_phone text not null default '',
  responsible_2_name text not null default '',
  responsible_2_phone text not null default '',
  created_at timestamptz not null default now()
);

-- 3. Jugadores por equipo
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  championship_id uuid not null references public.championships(id) on delete cascade,
  full_name text not null,
  jersey_number integer not null check (jersey_number between 1 and 99),
  birth_date date not null,
  service_area text not null,
  photo_url text not null default '',
  is_provisional_photo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (team_id, jersey_number)
);

-- 4. Encuentros / Programación
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null references public.championships(id) on delete cascade,
  stage text not null default 'todos_contra_todos' check (
    stage in ('todos_contra_todos', 'liguilla', 'semifinal', 'tercer_puesto', 'final')
  ),
  matchday integer not null default 1,
  home_team_id uuid not null references public.teams(id) on delete cascade,
  away_team_id uuid not null references public.teams(id) on delete cascade,
  home_score integer check (home_score >= 0),
  away_score integer check (away_score >= 0),
  scheduled_at timestamptz not null,
  venue text not null default 'Loza Deportiva U.E. 410',
  status text not null default 'programado' check (
    status in ('programado', 'en_juego', 'finalizado')
  ),
  notes text not null default '',
  created_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

-- 5. Noticias del campeonato (estilo Facebook: comentario superior + foto)
create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null references public.championships(id) on delete cascade,
  commentary text not null,
  image_url text not null default '',
  author_name text not null default 'Comisión de Deportes U.E. 410',
  published_at timestamptz not null default now()
);

-- 6. Reacciones públicas anónimas sobre noticias (única reacción por visitor_id en cada post)
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.news_posts(id) on delete cascade,
  visitor_id uuid not null,
  reaction_type text not null check (reaction_type in ('like', 'love', 'haha', 'wow')),
  created_at timestamptz not null default now(),
  constraint unique_post_visitor_reaction unique (post_id, visitor_id)
);

-- 7. Comentarios públicos sin registro sobre noticias
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.news_posts(id) on delete cascade,
  visitor_id uuid not null,
  author_alias text not null default 'Visitante Anónimo' check (char_length(author_alias) between 1 and 30),
  content text not null check (char_length(trim(content)) between 2 and 500),
  created_at timestamptz not null default now()
);

-- Índices de rendimiento
create index if not exists idx_teams_championship on public.teams(championship_id);
create index if not exists idx_players_team on public.players(team_id);
create index if not exists idx_matches_championship_date on public.matches(championship_id, scheduled_at);
create index if not exists idx_news_championship_date on public.news_posts(championship_id, published_at desc);
create index if not exists idx_reactions_post on public.reactions(post_id);
create index if not exists idx_comments_post_date on public.comments(post_id, created_at asc);

-- =============================================================================
-- Row Level Security (RLS):
-- 1. Lectura pública para espectadores sin login en todas las tablas.
-- 2. Escritura administrativa (campeonatos, equipos, jugadores, partidos, noticias)
--    restringida a usuarios autenticados (Admin).
-- 3. Reacciones y Comentarios públicos:
--    La escritura se valida estrictamente en el servidor (API Routes de Next.js)
--    usando SUPABASE_SERVICE_ROLE_KEY (que omite RLS tras validar Honeypot, XSS y Rate Limit).
--    Por seguridad, NO se permite INSERT/UPDATE anónimo directo desde el navegador en RLS.
-- =============================================================================

alter table public.championships enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.news_posts enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;

-- Lectura pública (Modo Vista Espectador)
drop policy if exists "Lectura pública de campeonatos" on public.championships;
create policy "Lectura pública de campeonatos"
  on public.championships for select using (true);

drop policy if exists "Lectura pública de equipos" on public.teams;
create policy "Lectura pública de equipos"
  on public.teams for select using (true);

drop policy if exists "Lectura pública de jugadores" on public.players;
create policy "Lectura pública de jugadores"
  on public.players for select using (true);

drop policy if exists "Lectura pública de encuentros" on public.matches;
create policy "Lectura pública de encuentros"
  on public.matches for select using (true);

drop policy if exists "Lectura pública de noticias" on public.news_posts;
create policy "Lectura pública de noticias"
  on public.news_posts for select using (true);

drop policy if exists "Lectura pública de reacciones" on public.reactions;
create policy "Lectura pública de reacciones"
  on public.reactions for select using (true);

drop policy if exists "Lectura pública de comentarios" on public.comments;
create policy "Lectura pública de comentarios"
  on public.comments for select using (true);

-- Políticas de escritura solo para administradores autenticados
drop policy if exists "Admin gestiona campeonatos" on public.championships;
create policy "Admin gestiona campeonatos"
  on public.championships for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Admin gestiona equipos" on public.teams;
create policy "Admin gestiona equipos"
  on public.teams for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Admin gestiona jugadores" on public.players;
create policy "Admin gestiona jugadores"
  on public.players for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Admin gestiona encuentros" on public.matches;
create policy "Admin gestiona encuentros"
  on public.matches for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Admin gestiona noticias" on public.news_posts;
create policy "Admin gestiona noticias"
  on public.news_posts for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Admin modera reacciones" on public.reactions;
create policy "Admin modera reacciones"
  on public.reactions for delete
  using (auth.role() = 'authenticated');

drop policy if exists "Admin modera comentarios" on public.comments;
create policy "Admin modera comentarios"
  on public.comments for delete
  using (auth.role() = 'authenticated');

-- Realtime para actualización en vivo (ejecutar ignorando si ya están agregadas)
do $$
begin
  alter publication supabase_realtime add table public.championships;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.teams;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.news_posts;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.reactions;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object then null;
end $$;
