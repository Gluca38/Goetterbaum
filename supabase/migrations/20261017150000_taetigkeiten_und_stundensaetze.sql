-- Tätigkeiten und Stundensätze (Ticket #8)
--
-- Das Büro pflegt die feste Liste der Tätigkeiten mit Name, Sparte und
-- Standard-Stundensatz. Tätigkeiten gehören zu genau einer Firma
-- (ADR-0001) und werden nie gelöscht, sondern archiviert. Für einzelne
-- Kunden kann das Büro je Tätigkeit einen abweichenden Stundensatz
-- festlegen und wieder entfernen (dann gilt wieder der Standard).
--
-- Zugriffsrechte: Nur das Büro der eigenen Firma liest, legt an und ändert.
-- Mitarbeiter und Vorarbeiter haben vorerst keinen Zugriff; das Lesen der
-- Tätigkeiten kommt mit der Zeiterfassung. Löschen darf das Büro nur
-- abweichende Stundensätze, Tätigkeiten niemand außer dem Dienstschlüssel.
-- Die Firma lässt sich nach dem Anlegen nicht mehr ändern. Die Regeln
-- stehen jeweils direkt bei ihrer Tabelle (ADR-0003).

begin;

create type public.sparte as enum ('reinigung', 'garten');

-- ---------------------------------------------------------------------------
-- Tätigkeit
-- ---------------------------------------------------------------------------

create table public.taetigkeit (
  id uuid primary key default gen_random_uuid(),
  -- "on delete cascade" greift nur, wenn eine ganze Firma gelöscht wird
  -- (nur mit dem Dienstschlüssel möglich, z. B. Aufräumen nach Tests).
  firma_id uuid not null references public.firma (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sparte public.sparte not null,
  -- Preis pro Stunde in ganzen Cent.
  standard_stundensatz_cent integer not null check (standard_stundensatz_cent > 0),
  archiviert boolean not null default false,
  angelegt_am timestamptz not null default now(),
  -- Nötig, damit ein abweichender Stundensatz nur auf eine Tätigkeit
  -- derselben Firma zeigen kann.
  unique (id, firma_id)
);

alter table public.taetigkeit enable row level security;

revoke all on public.taetigkeit from anon, authenticated;
grant select on public.taetigkeit to authenticated;
grant all on public.taetigkeit to service_role;
grant insert (firma_id, name, sparte, standard_stundensatz_cent)
  on public.taetigkeit to authenticated;
grant update (name, sparte, standard_stundensatz_cent, archiviert)
  on public.taetigkeit to authenticated;

create policy "Büro sieht Tätigkeiten der eigenen Firma"
  on public.taetigkeit
  for select
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

create policy "Büro legt Tätigkeiten der eigenen Firma an"
  on public.taetigkeit
  for insert
  to authenticated
  with check (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

create policy "Büro ändert Tätigkeiten der eigenen Firma"
  on public.taetigkeit
  for update
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  )
  with check (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

comment on table public.taetigkeit is
  'Die Art der ausgeführten Arbeit aus der festen Liste der Firma. Wird nie gelöscht, sondern archiviert.';

-- Jeder Name nur einmal je Firma, ohne Rücksicht auf Groß- und
-- Kleinschreibung, damit Mitarbeiter nicht zwischen zwei gleich klingenden
-- Tätigkeiten wählen müssen. Gilt auch für archivierte.
create unique index taetigkeit_name_je_firma_idx
  on public.taetigkeit (firma_id, lower(name));

-- ---------------------------------------------------------------------------
-- Abweichender Stundensatz eines Kunden
-- ---------------------------------------------------------------------------

create table public.kunden_stundensatz (
  firma_id uuid not null references public.firma (id) on delete cascade,
  kunde_id uuid not null,
  taetigkeit_id uuid not null,
  -- Preis pro Stunde in ganzen Cent; hat Vorrang vor dem Standard.
  stundensatz_cent integer not null check (stundensatz_cent > 0),
  angelegt_am timestamptz not null default now(),
  -- Höchstens ein abweichender Satz je Kunde und Tätigkeit.
  primary key (kunde_id, taetigkeit_id),
  -- Kunde und Tätigkeit gehören beide zur selben Firma.
  foreign key (kunde_id, firma_id) references public.kunde (id, firma_id),
  foreign key (taetigkeit_id, firma_id) references public.taetigkeit (id, firma_id)
);

alter table public.kunden_stundensatz enable row level security;

revoke all on public.kunden_stundensatz from anon, authenticated;
grant select, delete on public.kunden_stundensatz to authenticated;
grant all on public.kunden_stundensatz to service_role;
grant insert (firma_id, kunde_id, taetigkeit_id, stundensatz_cent)
  on public.kunden_stundensatz to authenticated;
grant update (stundensatz_cent) on public.kunden_stundensatz to authenticated;

create policy "Büro sieht abweichende Stundensätze der eigenen Firma"
  on public.kunden_stundensatz
  for select
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

create policy "Büro legt abweichende Stundensätze der eigenen Firma an"
  on public.kunden_stundensatz
  for insert
  to authenticated
  with check (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

create policy "Büro ändert abweichende Stundensätze der eigenen Firma"
  on public.kunden_stundensatz
  for update
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  )
  with check (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

create policy "Büro entfernt abweichende Stundensätze der eigenen Firma"
  on public.kunden_stundensatz
  for delete
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

comment on table public.kunden_stundensatz is
  'Abweichender Stundensatz eines Kunden für eine Tätigkeit. Ohne Eintrag gilt der Standard-Stundensatz der Tätigkeit.';

create index kunden_stundensatz_firma_id_idx on public.kunden_stundensatz (firma_id);
create index kunden_stundensatz_taetigkeit_id_idx on public.kunden_stundensatz (taetigkeit_id);

commit;
