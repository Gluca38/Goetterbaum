-- Live-Erfassung: Start, Stopp und Fahrten (Ticket #10)
--
-- Mitarbeiter erfassen ihre Zeit vor Ort per Start und Stopp. Ein
-- Zeiteintrag ist entweder eine Tätigkeit in einem Objekt oder eine Fahrt
-- (ohne Objekt und Tätigkeit). Er gehört zu genau einer Firma (ADR-0001).
--
-- Beginn und Ende setzt die Datenbank mit ihrer eigenen Uhr, damit niemand
-- Zeiten über das Handy verstellen kann. Je Mitarbeiter läuft höchstens ein
-- Zeiteintrag. Gestartet wird nur mit aktivem Objekt und aktiver
-- Tätigkeit.
--
-- Zugriffsrechte: Jeder aktive Nutzer (Mitarbeiter, Vorarbeiter, Büro)
-- sieht, startet und stoppt vorerst nur seine eigenen Zeiteinträge.
-- Nachträge (#11), Erfassen für andere (#12) und die Freigabe durch das
-- Büro (#14) kommen mit eigenen Tickets. Gelöscht wird nie.
--
-- Zum Auswählen bekommen alle Nutzer über eigene Funktionen nur die aktiven
-- Objekte (Bezeichnung, Adresse) und Tätigkeiten (Name, Sparte) ihrer
-- Firma. Preise, Pauschalen und Kunden bleiben dem Büro vorbehalten; die
-- Tabellen objekt und taetigkeit selbst liest weiterhin nur das Büro.

begin;

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: der angemeldete Mitarbeiter
--
-- Wie privat.meine_firma_id(): Ein deaktivierter Mitarbeiter hat keine
-- Kennung und kann damit nichts erfassen.
-- ---------------------------------------------------------------------------

create function privat.meine_mitarbeiter_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.mitarbeiter m
  where m.auth_user_id = auth.uid()
    and m.aktiv
$$;

revoke all on function privat.meine_mitarbeiter_id() from public;
grant execute on function privat.meine_mitarbeiter_id() to authenticated;

-- Nötig, damit ein Zeiteintrag nur auf Mitarbeiter und Objekte derselben
-- Firma zeigen kann.
alter table public.mitarbeiter
  add constraint mitarbeiter_id_firma_id_key unique (id, firma_id);
alter table public.objekt
  add constraint objekt_id_firma_id_key unique (id, firma_id);

-- ---------------------------------------------------------------------------
-- Zeiteintrag
-- ---------------------------------------------------------------------------

create type public.zeiteintrag_art as enum ('taetigkeit', 'fahrt');

create table public.zeiteintrag (
  id uuid primary key default gen_random_uuid(),
  -- "on delete cascade" greift nur, wenn eine ganze Firma gelöscht wird
  -- (nur mit dem Dienstschlüssel möglich, z. B. Aufräumen nach Tests).
  firma_id uuid not null references public.firma (id) on delete cascade,
  mitarbeiter_id uuid not null,
  art public.zeiteintrag_art not null,
  objekt_id uuid,
  taetigkeit_id uuid,
  -- Setzt die Datenbank beim Start.
  beginn timestamptz not null default now(),
  -- Leer, solange der Zeiteintrag läuft. Setzt die Datenbank beim Stopp.
  ende timestamptz,
  -- Wer den Zeiteintrag angelegt hat. Über die App immer der angemeldete
  -- Nutzer selbst; die Spalte lässt sich dort nicht setzen.
  angelegt_von uuid not null default privat.meine_mitarbeiter_id()
    references public.mitarbeiter (id),
  angelegt_am timestamptz not null default now(),
  -- Mitarbeiter, Objekt und Tätigkeit gehören zur selben Firma.
  foreign key (mitarbeiter_id, firma_id) references public.mitarbeiter (id, firma_id),
  foreign key (objekt_id, firma_id) references public.objekt (id, firma_id),
  foreign key (taetigkeit_id, firma_id) references public.taetigkeit (id, firma_id),
  constraint objekt_und_taetigkeit_passen_zur_art check (
    (art = 'taetigkeit' and objekt_id is not null and taetigkeit_id is not null)
    or (art = 'fahrt' and objekt_id is null and taetigkeit_id is null)
  ),
  constraint ende_nach_beginn check (ende is null or ende >= beginn)
);

alter table public.zeiteintrag enable row level security;

-- Beginn, Ende beim Anlegen und angelegt_von sind bewusst nicht dabei: Die
-- setzt die Datenbank. Geändert werden darf nur das Ende (Stopp).
revoke all on public.zeiteintrag from anon, authenticated;
grant select on public.zeiteintrag to authenticated;
grant all on public.zeiteintrag to service_role;
grant insert (firma_id, mitarbeiter_id, art, objekt_id, taetigkeit_id)
  on public.zeiteintrag to authenticated;
grant update (ende) on public.zeiteintrag to authenticated;

create policy "Eigene Zeiteinträge sehen"
  on public.zeiteintrag
  for select
  to authenticated
  using (mitarbeiter_id = (select privat.meine_mitarbeiter_id()));

create policy "Eigene Zeiteinträge starten"
  on public.zeiteintrag
  for insert
  to authenticated
  with check (
    firma_id = (select privat.meine_firma_id())
    and mitarbeiter_id = (select privat.meine_mitarbeiter_id())
  );

create policy "Eigenen laufenden Zeiteintrag stoppen"
  on public.zeiteintrag
  for update
  to authenticated
  using (
    mitarbeiter_id = (select privat.meine_mitarbeiter_id())
    and ende is null
  )
  with check (mitarbeiter_id = (select privat.meine_mitarbeiter_id()));

comment on table public.zeiteintrag is
  'Ein ununterbrochener Zeitblock eines Mitarbeiters: eine Tätigkeit in einem Objekt oder eine Fahrt. Wird nie gelöscht.';

-- Je Mitarbeiter höchstens ein laufender Zeiteintrag.
create unique index zeiteintrag_ein_laufender_je_mitarbeiter_idx
  on public.zeiteintrag (mitarbeiter_id)
  where ende is null;

create index zeiteintrag_firma_id_idx on public.zeiteintrag (firma_id);
create index zeiteintrag_mitarbeiter_beginn_idx on public.zeiteintrag (mitarbeiter_id, beginn);
create index zeiteintrag_objekt_id_idx on public.zeiteintrag (objekt_id);
create index zeiteintrag_taetigkeit_id_idx on public.zeiteintrag (taetigkeit_id);
create index zeiteintrag_angelegt_von_idx on public.zeiteintrag (angelegt_von);

-- ---------------------------------------------------------------------------
-- Start nur mit aktivem Objekt und aktiver Tätigkeit
--
-- "security definer", weil Mitarbeiter die Tabellen objekt und taetigkeit
-- selbst nicht lesen dürfen. Dass beide zur Firma des Zeiteintrags
-- gehören, sichern die Fremdschlüssel.
-- ---------------------------------------------------------------------------

create function privat.zeiteintrag_nur_mit_aktiver_auswahl()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.objekt o where o.id = new.objekt_id and o.archiviert)
     or exists (select 1 from public.taetigkeit t where t.id = new.taetigkeit_id and t.archiviert)
  then
    raise exception 'Objekt oder Tätigkeit ist archiviert.'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger zeiteintrag_nur_mit_aktiver_auswahl
  before insert on public.zeiteintrag
  for each row
  execute function privat.zeiteintrag_nur_mit_aktiver_auswahl();

-- ---------------------------------------------------------------------------
-- Stopp mit der Uhr der Datenbank
--
-- Wer das Ende setzt, bekommt immer die aktuelle Zeit der Datenbank, egal
-- welchen Wert er schickt. Nachträge (#11) regeln das Ändern von Zeiten
-- später eigens.
-- ---------------------------------------------------------------------------

create function privat.zeiteintrag_ende_jetzt()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ende is not null then
    new.ende := now();
  end if;
  return new;
end
$$;

create trigger zeiteintrag_ende_jetzt
  before update of ende on public.zeiteintrag
  for each row
  when (old.ende is null)
  execute function privat.zeiteintrag_ende_jetzt();

-- Die Trigger-Funktionen soll niemand direkt aufrufen.
revoke all on function privat.zeiteintrag_nur_mit_aktiver_auswahl() from public;
revoke all on function privat.zeiteintrag_ende_jetzt() from public;

-- ---------------------------------------------------------------------------
-- Auswahl und eigene Einträge für die Erfassung
--
-- Diese Funktionen liefern nur die Spalten, die zum Erfassen nötig sind,
-- und nur aus der eigenen Firma. Sie sind über die Supabase-Schnittstelle
-- aufrufbar (rpc), aber nur für angemeldete Nutzer.
-- ---------------------------------------------------------------------------

create function public.objekte_zur_auswahl()
returns table (
  id uuid,
  bezeichnung text,
  strasse text,
  adresszusatz text,
  plz text,
  ort text
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.bezeichnung, o.strasse, o.adresszusatz, o.plz, o.ort
  from public.objekt o
  where o.firma_id = privat.meine_firma_id()
    and not o.archiviert
  order by o.bezeichnung
$$;

create function public.taetigkeiten_zur_auswahl()
returns table (id uuid, name text, sparte public.sparte)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name, t.sparte
  from public.taetigkeit t
  where t.firma_id = privat.meine_firma_id()
    and not t.archiviert
  order by t.sparte, t.name
$$;

-- Die eigenen Zeiteinträge ab einem Zeitpunkt, dazu immer der laufende,
-- mit Objekt-Bezeichnung und Tätigkeitsname (auch wenn diese inzwischen
-- archiviert sind).
create function public.meine_zeiteintraege(ab timestamptz)
returns table (
  id uuid,
  art public.zeiteintrag_art,
  beginn timestamptz,
  ende timestamptz,
  objekt_bezeichnung text,
  taetigkeit_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select z.id, z.art, z.beginn, z.ende, o.bezeichnung, t.name
  from public.zeiteintrag z
  left join public.objekt o on o.id = z.objekt_id
  left join public.taetigkeit t on t.id = z.taetigkeit_id
  where z.mitarbeiter_id = privat.meine_mitarbeiter_id()
    and (z.beginn >= ab or z.ende is null)
  order by z.beginn desc
$$;

revoke all on function public.objekte_zur_auswahl() from public, anon;
revoke all on function public.taetigkeiten_zur_auswahl() from public, anon;
revoke all on function public.meine_zeiteintraege(timestamptz) from public, anon;
grant execute on function public.objekte_zur_auswahl() to authenticated;
grant execute on function public.taetigkeiten_zur_auswahl() to authenticated;
grant execute on function public.meine_zeiteintraege(timestamptz) to authenticated;

commit;
