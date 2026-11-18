-- =============================================================================
-- Gest-Deport410 — Esquema PostgreSQL para Supabase
-- Campeonato Interno de Aniversario U.E. 410 Hospital de Quillabamba
-- =============================================================================

create extension if not exists "pgcrypto";

-- 1. Campeonatos / Ligas (encapsula toda la gestión por torneo)
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
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 2. Equipos inscritos por campeonato
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null references public.championships(id) on delete cascade,
  name text not null,
  service_area text not null,
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

-- 4. Encuentros / Programación (Todos contra Todos, Liguilla, Semifinales, Final)
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

-- Índices de rendimiento
create index if not exists idx_teams_championship on public.teams(championship_id);
create index if not exists idx_players_team on public.players(team_id);
create index if not exists idx_matches_championship_date on public.matches(championship_id, scheduled_at);
create index if not exists idx_news_championship_date on public.news_posts(championship_id, published_at desc);

-- =============================================================================
-- Row Level Security (RLS):
-- Lectura pública para espectadores sin login.
-- Escritura exclusiva para administradores autenticados.
-- =============================================================================

alter table public.championships enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.news_posts enable row level security;

-- Políticas de lectura pública (Modo Vista Espectador)
create policy "Lectura pública de campeonatos"
  on public.championships for select using (true);

create policy "Lectura pública de equipos"
  on public.teams for select using (true);

create policy "Lectura pública de jugadores"
  on public.players for select using (true);

create policy "Lectura pública de encuentros"
  on public.matches for select using (true);

create policy "Lectura pública de noticias"
  on public.news_posts for select using (true);

-- Políticas de escritura solo para administradores autenticados
create policy "Admin gestiona campeonatos"
  on public.championships for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Admin gestiona equipos"
  on public.teams for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Admin gestiona jugadores"
  on public.players for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Admin gestiona encuentros"
  on public.matches for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Admin gestiona noticias"
  on public.news_posts for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Habilitar Realtime para actualización automática de tabla y programación
alter publication supabase_realtime add table public.championships;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.news_posts;
