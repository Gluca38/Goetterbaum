-- Kunden und Objekte (Ticket #7)
--
-- Das Büro pflegt Kunden und ihre Objekte. Beide gehören zu genau einer
-- Firma (ADR-0001). Sie werden nie gelöscht, sondern archiviert und können
-- wieder aktiviert werden. Mitarbeiter und Vorarbeiter haben vorerst keinen
-- Zugriff; das Lesen der Objekte kommt mit der Zeiterfassung.

create type public.abrechnungszeitraum as enum ('monatlich', 'quartalsweise');
create type public.abrechnungsart as enum ('pauschale', 'stunden');

create table public.kunde (
  id uuid primary key default gen_random_uuid(),
  -- "on delete cascade" greift nur, wenn eine ganze Firma gelöscht wird
  -- (nur mit dem Dienstschlüssel möglich, z. B. Aufräumen nach Tests).
  firma_id uuid not null references public.firma (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  -- Rechnungsadresse in einzelnen Feldern, damit sie später in
  -- E-Rechnungen übernommen werden kann.
  strasse text not null check (length(trim(strasse)) > 0),
  adresszusatz text,
  plz text not null check (length(trim(plz)) > 0),
  ort text not null check (length(trim(ort)) > 0),
  abrechnungszeitraum public.abrechnungszeitraum not null,
  archiviert boolean not null default false,
  angelegt_am timestamptz not null default now(),
  -- Nötig, damit ein Objekt nur auf einen Kunden derselben Firma zeigen kann.
  unique (id, firma_id)
);

comment on table public.kunde is
  'Wer die Rechnung bekommt. Wird nie gelöscht, sondern archiviert.';

create index kunde_firma_id_idx on public.kunde (firma_id);

create table public.objekt (
  id uuid primary key default gen_random_uuid(),
  firma_id uuid not null references public.firma (id) on delete cascade,
  kunde_id uuid not null,
  bezeichnung text not null check (length(trim(bezeichnung)) > 0),
  strasse text not null check (length(trim(strasse)) > 0),
  adresszusatz text,
  plz text not null check (length(trim(plz)) > 0),
  ort text not null check (length(trim(ort)) > 0),
  abrechnungsart public.abrechnungsart not null,
  -- Monatsbetrag in ganzen Cent, nur bei Abrechnungsart Pauschale.
  pauschale_cent integer,
  archiviert boolean not null default false,
  angelegt_am timestamptz not null default now(),
  -- Genau ein Kunde, und zwar einer derselben Firma.
  foreign key (kunde_id, firma_id) references public.kunde (id, firma_id),
  constraint pauschale_nur_bei_pauschale check (
    (abrechnungsart = 'pauschale' and pauschale_cent > 0)
    or (abrechnungsart = 'stunden' and pauschale_cent is null)
  )
);

comment on table public.objekt is
  'Ein Arbeitsort mit Adresse, der zu genau einem Kunden gehört. Wird nie gelöscht, sondern archiviert.';

create index objekt_firma_id_idx on public.objekt (firma_id);
create index objekt_kunde_id_idx on public.objekt (kunde_id);

-- ---------------------------------------------------------------------------
-- Archivieren
--
-- Wird ein Kunde archiviert, werden seine Objekte mit archiviert. Wieder
-- aktiviert werden sie dabei nicht automatisch. Ein aktives Objekt braucht
-- immer einen aktiven Kunden (beim Anlegen, beim Kundenwechsel und beim
-- Wiederaktivieren).
-- ---------------------------------------------------------------------------

create function privat.objekte_mit_kunde_archivieren()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.objekt
  set archiviert = true
  where kunde_id = new.id
    and not archiviert;
  return new;
end
$$;

create trigger objekte_mit_kunde_archivieren
  after update of archiviert on public.kunde
  for each row
  when (new.archiviert and not old.archiviert)
  execute function privat.objekte_mit_kunde_archivieren();

create function privat.aktives_objekt_braucht_aktiven_kunden()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.archiviert and exists (
    select 1 from public.kunde k where k.id = new.kunde_id and k.archiviert
  ) then
    raise exception 'Ein aktives Objekt braucht einen aktiven Kunden.'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger aktives_objekt_braucht_aktiven_kunden
  before insert or update on public.objekt
  for each row
  execute function privat.aktives_objekt_braucht_aktiven_kunden();

-- Die Trigger-Funktionen laufen mit den Rechten des Aufrufers, die
-- Zugriffsregeln gelten also auch dort. Direkt aufrufen soll sie niemand.
revoke all on function privat.objekte_mit_kunde_archivieren() from public;
revoke all on function privat.aktives_objekt_braucht_aktiven_kunden() from public;

-- ---------------------------------------------------------------------------
-- Zugriffsrechte
--
-- Nur das Büro der eigenen Firma liest, legt an und ändert. Gelöscht wird
-- nie: Es gibt für niemanden außer dem Dienstschlüssel ein Löschrecht.
-- Die Firma lässt sich nach dem Anlegen nicht mehr ändern, archiviert wird
-- erst nach dem Anlegen.
-- ---------------------------------------------------------------------------

revoke all on public.kunde, public.objekt from anon, authenticated;
grant select on public.kunde, public.objekt to authenticated;
grant all on public.kunde, public.objekt to service_role;

grant insert (firma_id, name, strasse, adresszusatz, plz, ort, abrechnungszeitraum)
  on public.kunde to authenticated;
grant update (name, strasse, adresszusatz, plz, ort, abrechnungszeitraum, archiviert)
  on public.kunde to authenticated;

grant insert (firma_id, kunde_id, bezeichnung, strasse, adresszusatz, plz, ort,
              abrechnungsart, pauschale_cent)
  on public.objekt to authenticated;
grant update (kunde_id, bezeichnung, strasse, adresszusatz, plz, ort,
              abrechnungsart, pauschale_cent, archiviert)
  on public.objekt to authenticated;

alter table public.kunde enable row level security;
alter table public.objekt enable row level security;

create policy "Büro sieht Kunden der eigenen Firma"
  on public.kunde
  for select
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

create policy "Büro legt Kunden der eigenen Firma an"
  on public.kunde
  for insert
  to authenticated
  with check (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

create policy "Büro ändert Kunden der eigenen Firma"
  on public.kunde
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

create policy "Büro sieht Objekte der eigenen Firma"
  on public.objekt
  for select
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

create policy "Büro legt Objekte der eigenen Firma an"
  on public.objekt
  for insert
  to authenticated
  with check (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

create policy "Büro ändert Objekte der eigenen Firma"
  on public.objekt
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
