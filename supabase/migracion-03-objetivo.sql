-- ============================================================================
-- Migración 03 — el objetivo del onboarding
--
-- Pégala entera en Supabase → SQL Editor → New query → Run.
-- Es idempotente: puedes relanzarla sin miedo.
--
-- Guarda lo que el usuario responde en las pantallas de objetivo: por qué nota
-- va, a cuál quiere llegar y cuántos días a la semana va a estudiar. Con eso
-- la app dibuja su curva y calcula la fecha estimada.
--
-- Si no la ejecutas, la app sigue funcionando: el onboarding detecta que las
-- columnas no existen y guarda el perfil sin ellas.
-- ============================================================================

alter table public.profiles add column if not exists goal_now    numeric(3,1);
alter table public.profiles add column if not exists goal_target numeric(3,1);
alter table public.profiles add column if not exists goal_days   smallint;
alter table public.profiles add column if not exists goal_date   date;

-- Rango razonable para una nota española.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_goal_now_rango'
  ) then
    alter table public.profiles add constraint profiles_goal_now_rango
      check (goal_now is null or (goal_now >= 0 and goal_now <= 10));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_goal_target_rango'
  ) then
    alter table public.profiles add constraint profiles_goal_target_rango
      check (goal_target is null or (goal_target >= 0 and goal_target <= 10));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_goal_days_rango'
  ) then
    alter table public.profiles add constraint profiles_goal_days_rango
      check (goal_days is null or (goal_days >= 1 and goal_days <= 7));
  end if;
end $$;

-- Las políticas RLS de profiles ya cubren estas columnas: son de la misma
-- tabla y las políticas son por fila, no por columna. No hay nada más que
-- activar.
