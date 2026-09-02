-- ============================================================================
-- Migración 01 — intentos de examen
--
-- Necesaria solo para el porcentaje de aciertos que aparece en Inicio.
-- La app funciona sin ella: si esta tabla no existe, ese dato simplemente
-- no se muestra y nada más falla.
--
-- Pégala en Supabase → SQL Editor → New query → Run.
-- ============================================================================

create table if not exists public.exam_attempts (
  id         uuid primary key default gen_random_uuid(),
  exam_id    uuid not null references public.exams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  score      integer not null,
  total      integer not null,
  created_at timestamptz not null default now()
);

create index if not exists exam_attempts_profile_id_idx on public.exam_attempts (profile_id);

alter table public.exam_attempts enable row level security;

drop policy if exists "exam_attempts_select_own" on public.exam_attempts;
create policy "exam_attempts_select_own" on public.exam_attempts
  for select using (auth.uid() = profile_id);

drop policy if exists "exam_attempts_insert_own" on public.exam_attempts;
create policy "exam_attempts_insert_own" on public.exam_attempts
  for insert with check (auth.uid() = profile_id);

drop policy if exists "exam_attempts_update_own" on public.exam_attempts;
create policy "exam_attempts_update_own" on public.exam_attempts
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "exam_attempts_delete_own" on public.exam_attempts;
create policy "exam_attempts_delete_own" on public.exam_attempts
  for delete using (auth.uid() = profile_id);
