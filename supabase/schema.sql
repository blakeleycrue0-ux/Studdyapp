-- ============================================================================
-- Studdy — esquema completo de base de datos
-- Ejecutar en Supabase → SQL Editor → New query → Run
--
-- RLS está activado en TODAS las tablas y las políticas solo permiten a cada
-- usuario leer/escribir sus propios datos. El identificador de usuario es
-- auth.uid(), que existe gracias a la sesión anónima que crea el botón "Entrar".
--
-- REQUISITO PREVIO: activar Authentication → Providers → Anonymous sign-ins
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  name              text not null,
  level             text not null check (level in ('ESO', 'Bachillerato', 'FP', 'Universidad')),
  course            text,
  branch            text,
  fp_grade          text,
  fp_family         text,
  fp_cycle          text,
  university_degree text,
  created_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- subjects
-- ----------------------------------------------------------------------------
create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name       text not null
);

create index if not exists subjects_profile_id_idx on public.subjects (profile_id);

alter table public.subjects enable row level security;

drop policy if exists "subjects_select_own" on public.subjects;
create policy "subjects_select_own" on public.subjects
  for select using (auth.uid() = profile_id);

drop policy if exists "subjects_insert_own" on public.subjects;
create policy "subjects_insert_own" on public.subjects
  for insert with check (auth.uid() = profile_id);

drop policy if exists "subjects_update_own" on public.subjects;
create policy "subjects_update_own" on public.subjects
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "subjects_delete_own" on public.subjects;
create policy "subjects_delete_own" on public.subjects
  for delete using (auth.uid() = profile_id);

-- ----------------------------------------------------------------------------
-- notes
-- ----------------------------------------------------------------------------
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists notes_profile_id_idx on public.notes (profile_id);
create index if not exists notes_subject_id_idx on public.notes (subject_id);

alter table public.notes enable row level security;

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes
  for select using (auth.uid() = profile_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = profile_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = profile_id);

-- ----------------------------------------------------------------------------
-- summaries  (esquemas generados por la IA)
-- ----------------------------------------------------------------------------
create table if not exists public.summaries (
  id                uuid primary key default gen_random_uuid(),
  note_id           uuid not null references public.notes (id) on delete cascade,
  generated_content text not null,
  created_at        timestamptz not null default now()
);

create index if not exists summaries_note_id_idx on public.summaries (note_id);

alter table public.summaries enable row level security;

drop policy if exists "summaries_select_own" on public.summaries;
create policy "summaries_select_own" on public.summaries
  for select using (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  );

drop policy if exists "summaries_insert_own" on public.summaries;
create policy "summaries_insert_own" on public.summaries
  for insert with check (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  );

drop policy if exists "summaries_update_own" on public.summaries;
create policy "summaries_update_own" on public.summaries
  for update using (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  ) with check (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  );

drop policy if exists "summaries_delete_own" on public.summaries;
create policy "summaries_delete_own" on public.summaries
  for delete using (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- flashcards
-- ----------------------------------------------------------------------------
create table if not exists public.flashcards (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid not null references public.notes (id) on delete cascade,
  question   text not null,
  answer     text not null,
  created_at timestamptz not null default now()
);

create index if not exists flashcards_note_id_idx on public.flashcards (note_id);

alter table public.flashcards enable row level security;

drop policy if exists "flashcards_select_own" on public.flashcards;
create policy "flashcards_select_own" on public.flashcards
  for select using (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  );

drop policy if exists "flashcards_insert_own" on public.flashcards;
create policy "flashcards_insert_own" on public.flashcards
  for insert with check (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  );

drop policy if exists "flashcards_update_own" on public.flashcards;
create policy "flashcards_update_own" on public.flashcards
  for update using (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  ) with check (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  );

drop policy if exists "flashcards_delete_own" on public.flashcards;
create policy "flashcards_delete_own" on public.flashcards
  for delete using (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- exams
-- ----------------------------------------------------------------------------
create table if not exists public.exams (
  id             uuid primary key default gen_random_uuid(),
  note_id        uuid not null references public.notes (id) on delete cascade,
  questions_json jsonb not null,
  created_at     timestamptz not null default now()
);

create index if not exists exams_note_id_idx on public.exams (note_id);

alter table public.exams enable row level security;

drop policy if exists "exams_select_own" on public.exams;
create policy "exams_select_own" on public.exams
  for select using (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  );

drop policy if exists "exams_insert_own" on public.exams;
create policy "exams_insert_own" on public.exams
  for insert with check (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  );

drop policy if exists "exams_update_own" on public.exams;
create policy "exams_update_own" on public.exams
  for update using (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  ) with check (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  );

drop policy if exists "exams_delete_own" on public.exams;
create policy "exams_delete_own" on public.exams
  for delete using (
    exists (select 1 from public.notes n where n.id = note_id and n.profile_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- presentations
--
-- NOTA SOBRE EL ESQUEMA: el punto 9 permite generar una presentación "a partir
-- de un apunte, O escribiendo un tema directamente". En el segundo caso no hay
-- note_id del que deducir el propietario, así que note_id es NULLABLE y se
-- añade profile_id. Sin esa columna las presentaciones por tema libre no
-- podrían protegerse con RLS. Es la única desviación de la lista de columnas.
-- ----------------------------------------------------------------------------
create table if not exists public.presentations (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  note_id      uuid references public.notes (id) on delete cascade,
  topic        text,
  content_json jsonb not null,
  created_at   timestamptz not null default now()
);

create index if not exists presentations_profile_id_idx on public.presentations (profile_id);
create index if not exists presentations_note_id_idx on public.presentations (note_id);

alter table public.presentations enable row level security;

drop policy if exists "presentations_select_own" on public.presentations;
create policy "presentations_select_own" on public.presentations
  for select using (auth.uid() = profile_id);

drop policy if exists "presentations_insert_own" on public.presentations;
create policy "presentations_insert_own" on public.presentations
  for insert with check (auth.uid() = profile_id);

drop policy if exists "presentations_update_own" on public.presentations;
create policy "presentations_update_own" on public.presentations
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "presentations_delete_own" on public.presentations;
create policy "presentations_delete_own" on public.presentations
  for delete using (auth.uid() = profile_id);

-- ----------------------------------------------------------------------------
-- exam_attempts  (resultados de cada examen corregido)
--
-- Alimenta el porcentaje de aciertos del Inicio. Es opcional: la app
-- funciona sin esta tabla, simplemente no muestra ese dato.
-- ----------------------------------------------------------------------------
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
