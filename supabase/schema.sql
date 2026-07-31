-- ============================================================
-- PDPadel — Pádel Americano: marcador y ranking
-- Run this in the Supabase SQL editor once to set up the schema.
-- ============================================================

create extension if not exists "pgcrypto";

-- 1. PLAYERS (historical database)
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  phone text,
  created_at timestamptz not null default now()
);
create index if not exists players_name_lower_idx on public.players (lower(name));

-- 2. SEASONS
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3. EVENTS (Jornadas)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete set null,
  name text,
  event_date date,
  duration_minutes int not null default 120,
  courts int not null default 1 check (courts between 1 and 5),
  status text not null default 'active' check (status in ('active','completed')),
  created_at timestamptz not null default now()
);

-- 4. EVENT REGISTRATION
create table if not exists public.event_players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, player_id)
);

-- 5. MATCHES
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  round_number int not null default 1,
  court_number int not null default 1,

  -- Players
  player1_id uuid references public.players(id) on delete set null,
  player2_id uuid references public.players(id) on delete set null,
  player3_id uuid references public.players(id) on delete set null,
  player4_id uuid references public.players(id) on delete set null,

  -- Scoring
  mode text not null default 'points' check (mode in ('points','sets')),
  target_score int not null default 31,
  max_sets int not null default 3,

  score_team1 int not null default 0,
  score_team2 int not null default 0,
  sets_details jsonb,

  status text not null default 'pending' check (status in ('pending','in_progress','completed','skipped')),
  winner_team int check (winner_team in (1,2)),
  created_at timestamptz not null default now()
);
create index if not exists matches_event_idx on public.matches (event_id);

-- ============================================================
-- RLS
-- Private club app: access is gated at the app layer by the PIN.
-- The anon key is allowed to read/write the four tables directly.
-- ============================================================
alter table public.players enable row level security;
alter table public.seasons enable row level security;
alter table public.events enable row level security;
alter table public.event_players enable row level security;
alter table public.matches enable row level security;

do $$
declare t text;
begin
  foreach t in array array['players','seasons','events','event_players','matches'] loop
    execute format('create policy %I on public.%I for all using (true) with check (true)', t || '_all', t);
  end loop;
end $$;

-- Seed: a default season
insert into public.seasons (name, start_date, is_current)
select 'Temporada ' || extract(year from now()), current_date, true
where not exists (select 1 from public.seasons where is_current = true);
