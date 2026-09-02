-- ============================================================================
-- Migración 02 — agenda, repaso espaciado, ejercicios y trabajos
--
-- Pégala entera en Supabase → SQL Editor → New query → Run.
-- Es idempotente: puedes relanzarla sin miedo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- events — exámenes, entregas y demás fechas
-- ----------------------------------------------------------------------------
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  title      text not null,
  kind       text not null default 'examen' check (kind in ('examen', 'entrega', 'otro')),
  date       date not null,
  notes      text,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists events_profile_date_idx on public.events (profile_id, date);

alter table public.events enable row level security;

drop policy if exists "events_all_own" on public.events;
create policy "events_all_own" on public.events
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ----------------------------------------------------------------------------
-- card_reviews — estado de repaso espaciado de cada flashcard
--
-- Un registro por tarjeta y usuario. `due_at` dice cuándo toca volver a verla;
-- `ease` e `interval_days` son los parámetros del algoritmo.
-- ----------------------------------------------------------------------------
create table if not exists public.card_reviews (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  flashcard_id  uuid not null references public.flashcards (id) on delete cascade,
  ease          numeric not null default 2.5,
  interval_days integer not null default 0,
  reps          integer not null default 0,
  lapses        integer not null default 0,
  due_at        timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (profile_id, flashcard_id)
);

create index if not exists card_reviews_due_idx on public.card_reviews (profile_id, due_at);

alter table public.card_reviews enable row level security;

drop policy if exists "card_reviews_all_own" on public.card_reviews;
create policy "card_reviews_all_own" on public.card_reviews
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ----------------------------------------------------------------------------
-- exercises — ejercicios resueltos paso a paso
-- ----------------------------------------------------------------------------
create table if not exists public.exercises (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  prompt     text not null,
  solution   text not null,
  created_at timestamptz not null default now()
);

create index if not exists exercises_profile_idx on public.exercises (profile_id, created_at desc);

alter table public.exercises enable row level security;

drop policy if exists "exercises_all_own" on public.exercises;
create policy "exercises_all_own" on public.exercises
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ----------------------------------------------------------------------------
-- documents — trabajos y redacciones
-- ----------------------------------------------------------------------------
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  subject_id  uuid references public.subjects (id) on delete set null,
  title       text not null,
  kind        text not null default 'trabajo',
  requirements text,
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists documents_profile_idx on public.documents (profile_id, updated_at desc);

alter table public.documents enable row level security;

drop policy if exists "documents_all_own" on public.documents;
create policy "documents_all_own" on public.documents
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
