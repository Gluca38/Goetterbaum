-- Grundgerüst: Firma und Mitarbeiter (Ticket #5)
--
-- Jede fachliche Information gehört zu genau einer Firma (ADR-0001).
-- Die Trennung der Firmen wird hier in der Datenbank durchgesetzt
-- (Row Level Security), nicht erst in der Oberfläche.

create type public.rolle as enum ('mitarbeiter', 'vorarbeiter', 'buero');

create table public.firma (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  angelegt_am timestamptz not null default now()
);

comment on table public.firma is
  'Das Unternehmen, das die Software nutzt. Jede fachliche Information gehört zu genau einer Firma.';

create table public.mitarbeiter (
  id uuid primary key default gen_random_uuid(),
  -- "on delete cascade" greift nur, wenn eine ganze Firma gelöscht wird.
  -- Das kann kein Nutzer der App, nur der Dienstschlüssel (z. B. das
  -- Aufräumen nach einem Testlauf).
  firma_id uuid not null references public.firma (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  -- Optional: Nur Mitarbeiter mit E-Mail können einen Zugang bekommen.
  email text,
  rolle public.rolle not null default 'mitarbeiter',
  -- Mitarbeiter werden nie gelöscht, sondern deaktiviert.
  aktiv boolean not null default true,
  -- Verknüpfung zum Login. Rolle, Firma und Aktiv-Status hängen am
  -- Mitarbeiter, nicht am Login.
  auth_user_id uuid unique references auth.users (id) on delete set null,
  angelegt_am timestamptz not null default now()
);

comment on table public.mitarbeiter is
  'Eine Person, die für die Firma arbeitet. Rolle und Aktiv-Status bestimmen, was sie in der App darf.';

create index mitarbeiter_firma_id_idx on public.mitarbeiter (firma_id);

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen für die Zugriffsregeln
--
-- Sie liegen in einem eigenen Schema, das nicht über die Supabase-API
-- erreichbar ist. "security definer" ist nötig, damit die Regeln der
-- Tabelle mitarbeiter sich nicht selbst aufrufen.
-- Ein deaktivierter Mitarbeiter hat keine Firma und keine Rolle und sieht
-- damit nichts, selbst wenn er noch eine gültige Sitzung hat.
-- ---------------------------------------------------------------------------

create schema privat;

create function privat.meine_firma_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.firma_id
  from public.mitarbeiter m
  where m.auth_user_id = auth.uid()
    and m.aktiv
$$;

create function privat.meine_rolle()
returns public.rolle
language sql
stable
security definer
set search_path = ''
as $$
  select m.rolle
  from public.mitarbeiter m
  where m.auth_user_id = auth.uid()
    and m.aktiv
$$;

revoke all on schema privat from public;
revoke all on all functions in schema privat from public;
grant usage on schema privat to authenticated;
grant execute on all functions in schema privat to authenticated;

-- ---------------------------------------------------------------------------
-- Zugriffsrechte
--
-- Ohne Anmeldung (Rolle "anon") gibt es keinen Zugriff. Angemeldete Nutzer
-- dürfen vorerst nur lesen; Anlegen und Ändern kommt mit eigenen Tickets.
-- ---------------------------------------------------------------------------

revoke all on public.firma, public.mitarbeiter from anon, authenticated;
grant select on public.firma, public.mitarbeiter to authenticated;
grant all on public.firma, public.mitarbeiter to service_role;

alter table public.firma enable row level security;
alter table public.mitarbeiter enable row level security;

create policy "Eigene Firma sehen"
  on public.firma
  for select
  to authenticated
  using (id = (select privat.meine_firma_id()));

create policy "Sich selbst sehen, solange aktiv"
  on public.mitarbeiter
  for select
  to authenticated
  using (auth_user_id = (select auth.uid()) and aktiv);

create policy "Büro und Vorarbeiter sehen alle Mitarbeiter der eigenen Firma"
  on public.mitarbeiter
  for select
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) in ('buero', 'vorarbeiter')
  );
