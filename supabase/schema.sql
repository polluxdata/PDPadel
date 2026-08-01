-- ============================================================
-- PDPadel — Pádel Americano: grupos, temporadas, quedadas y ranking
-- Run this in the Supabase SQL editor once to set up the schema.
-- ============================================================

create extension if not exists "pgcrypto";

-- Legacy tables from the first version (not used anymore).
drop table if exists public.event_players cascade;
drop table if exists public.events cascade;
drop table if exists public.players cascade;
drop table if exists public.seasons cascade;
drop table if exists public.matches cascade;

-- ============================================================
-- USERS (jugadores / administradores / super admin "usuario 0")
-- ============================================================
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  pin_hash text not null,
  first_name text not null default '',
  last_name text not null default '',
  email text,
  nickname text,
  role text not null default 'player' check (role in ('super_admin','admin','player')),
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists users_username_lower_idx on public.users (lower(username));

-- ============================================================
-- GROUPS (grupos de jugadores de pádel)
-- ============================================================
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text,
  description text,
  admin_id uuid references public.users(id) on delete set null,
  status text not null default 'active' check (status in ('active','closed')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists groups_code_unique on public.groups (code) where code is not null;

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members (user_id);

-- ============================================================
-- SEASONS (temporadas; solo una activa por grupo)
-- ============================================================
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active','closed')),
  winner_id uuid references public.users(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists seasons_one_active_per_group
  on public.seasons (group_id) where status = 'active';

-- ============================================================
-- QUEDADAS (jornadas dentro de una temporada)
-- ============================================================
create table if not exists public.quedadas (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text,
  quedada_date date,
  duration_minutes int not null default 120,
  courts int not null default 1 check (courts between 1 and 5),
  mode text not null default 'points' check (mode in ('points','sets')),
  target_score int not null default 31,
  max_sets int not null default 3,
  status text not null default 'active' check (status in ('active','completed')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.quedada_players (
  id uuid primary key default gen_random_uuid(),
  quedada_id uuid not null references public.quedadas(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (quedada_id, user_id)
);

-- ============================================================
-- MATCHES (partidos)
-- ============================================================
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  quedada_id uuid not null references public.quedadas(id) on delete cascade,
  round_number int not null default 1,
  court_number int not null default 1,

  player1_id uuid references public.users(id) on delete set null,
  player2_id uuid references public.users(id) on delete set null,
  player3_id uuid references public.users(id) on delete set null,
  player4_id uuid references public.users(id) on delete set null,

  score_team1 int not null default 0,
  score_team2 int not null default 0,
  sets_details jsonb,

  status text not null default 'pending' check (status in ('pending','in_progress','completed','skipped')),
  winner_team int check (winner_team in (1,2)),

  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists matches_quedada_idx on public.matches (quedada_id);

-- ============================================================
-- MAGIC LINKS (login / alta / invitaciones por correo o WhatsApp)
-- ============================================================
drop table if exists public.registration_codes cascade;
create table if not exists public.magic_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  email text not null,
  token text not null unique,
  purpose text not null default 'login' check (purpose in ('login','signup','invite')),
  group_id uuid references public.groups(id) on delete set null,
  role text check (role in ('admin','player')),
  payload jsonb,
  used boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists magic_links_token_idx on public.magic_links (token);

-- email único (cuando exista) y rol por membresía (múltiples admins)
create unique index if not exists users_email_unique on public.users (lower(email)) where email is not null;
alter table public.group_members add column if not exists role text not null default 'player' check (role in ('admin','player'));

-- Privacidad: si `listed` es false, el usuario no aparece en la búsqueda
-- para ser agregado a grupos (solo puede unirse con el código).
alter table public.users add column if not exists listed boolean not null default true;

-- ============================================================
-- AUDIT LOG (trazabilidad de quién hizo qué)
-- ============================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_user_idx on public.audit_log (user_id);
create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id);

-- ============================================================
-- RLS
-- App privada: el acceso se controla en la capa de la app (sesión
-- con PIN). La llave anon puede leer/escribir las tablas directamente.
-- ============================================================alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.seasons enable row level security;
alter table public.quedadas enable row level security;
alter table public.quedada_players enable row level security;
alter table public.matches enable row level security;
alter table public.magic_links enable row level security;
alter table public.audit_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'users','groups','group_members','seasons','quedadas',
    'quedada_players','matches','magic_links','audit_log'
  ] loop
    execute format('create policy %I on public.%I for all using (true) with check (true)', t || '_all', t);
  end loop;
end $$;

-- El usuario 0 (super admin) lo crea la app al primer arranque
-- (POST /api/auth/bootstrap) usando la variable SUPER_ADMIN_PIN.

-- ============================================================
-- TRIGGER: si se borra el dueño de un grupo, el grupo pasa al
-- super admin (evita grupos huérfanos).
-- ============================================================
create or replace function public.reassign_group_on_user_delete()
returns trigger
language plpgsql
security definer
as $$
declare v_super uuid;
begin
  select id into v_super from public.users where role = 'super_admin' limit 1;
  if v_super is null then
    return old;
  end if;
  update public.groups set admin_id = v_super where admin_id = old.id;
  insert into public.group_members (group_id, user_id, role)
    select g.id, v_super, 'admin'
    from public.groups g
    where g.admin_id = v_super
      and not exists (
        select 1 from public.group_members m
        where m.group_id = g.id and m.user_id = v_super
      )
    on conflict (group_id, user_id) do update set role = 'admin';
  return old;
end;
$$;

drop trigger if exists trg_reassign_group_on_user_delete on public.users;
create trigger trg_reassign_group_on_user_delete
  before delete on public.users
  for each row execute function public.reassign_group_on_user_delete();
