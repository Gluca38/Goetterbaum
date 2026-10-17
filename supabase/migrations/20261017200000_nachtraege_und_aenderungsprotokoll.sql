-- Nachträge und Änderungsprotokoll (Ticket #11)
--
-- Mitarbeiter tragen Zeiteinträge nachträglich ein (mit eigenem Beginn und
-- Ende) und ändern ihre eigenen Einträge. Solche Einträge markiert die
-- Datenbank selbst als Nachtrag: jeden, der mit Ende angelegt wird, und
-- jeden, dessen Beginn oder Ende nachträglich geändert wird. Ein Nachtrag
-- liegt nie in der Zukunft. Die Markierung lässt sich nicht selbst setzen
-- oder zurücknehmen.
--
-- Zeiteinträge desselben Mitarbeiters überschneiden sich nie; ein
-- laufender reicht dabei bis "unendlich". Die Regel steckt fest an der
-- Tabelle und braucht die Postgres-Erweiterung btree_gist (gehört zum
-- Standardumfang von Postgres und Supabase).
--
-- Jedes Anlegen und Ändern eines Zeiteintrags schreibt die Datenbank ins
-- Änderungsprotokoll (wer, wann, vorher, nachher). Das Protokoll kann kein
-- Nutzer schreiben, ändern oder löschen, auch nicht mit dem
-- Dienstschlüssel. Es verschwindet nur mit seinem Zeiteintrag, also beim
-- Löschen einer ganzen Firma (Aufräumen nach Tests). Lesen darf es das
-- Büro der eigenen Firma.
--
-- Zugriffsrechte, die sich ändern:
-- * Mitarbeiter ändern alle ihre eigenen Zeiteinträge (bisher nur das Ende
--   des laufenden). Gesperrt werden freigegebene Einträge mit #14.
-- * Das Büro sieht alle Zeiteinträge der eigenen Firma (bisher nur die
--   eigenen). Ändern darf es fremde Einträge erst mit #12.
--
-- Der Dienstschlüssel (Test-Setup) setzt Zeiten weiterhin frei; die
-- Regeln zu Live-Start und Nachtrag gelten für alle Anfragen angemeldeter
-- Nutzer, auch über künftige Datenbank-Funktionen.

begin;

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Nachtrag
-- ---------------------------------------------------------------------------

alter table public.zeiteintrag
  add column nachtrag boolean not null default false;

comment on column public.zeiteintrag.nachtrag is
  'Nachträglich eingetragen oder Beginn bzw. Ende nachträglich geändert. Setzt die Datenbank.';

-- Nachträge bringen Beginn und Ende mit; geändert werden dürfen alle
-- Angaben außer Mitarbeiter, Firma und Nachtrag.
grant insert (beginn, ende) on public.zeiteintrag to authenticated;
grant update (art, objekt_id, taetigkeit_id, beginn) on public.zeiteintrag to authenticated;

drop policy "Eigenen laufenden Zeiteintrag stoppen" on public.zeiteintrag;

create policy "Eigene Zeiteinträge ändern"
  on public.zeiteintrag
  for update
  to authenticated
  using (mitarbeiter_id = (select privat.meine_mitarbeiter_id()))
  with check (mitarbeiter_id = (select privat.meine_mitarbeiter_id()));

create policy "Büro sieht alle Zeiteinträge der eigenen Firma"
  on public.zeiteintrag
  for select
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

-- Live-Start, Nachtrag und Änderung unterscheiden
--
-- Ohne Ende angelegt ist ein Live-Start: Der Beginn ist immer die Uhr der
-- Datenbank. Mit Ende angelegt ist ein Nachtrag. Beim Ändern wird ein
-- Eintrag zum Nachtrag, sobald sich Beginn oder Ende ändern; den Stopp
-- eines laufenden Eintrags (Ende = jetzt, siehe zeiteintrag_ende_jetzt)
-- zählt nicht dazu. Ein beendeter Eintrag läuft nie wieder, und ein
-- Nachtrag hat immer eine Dauer.
--
-- Ob die Regeln gelten, entscheidet die Rolle aus der Anmeldung (nicht
-- current_user), damit sie auch in künftigen "security definer"-Funktionen
-- greifen. Ohne Anmeldung (Migrationen) bzw. mit dem Dienstschlüssel
-- gelten sie nicht.
create function privat.zeiteintrag_nachtrag_erkennen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.ende is null then
      new.beginn := now();
      new.nachtrag := false;
    else
      new.nachtrag := true;
    end if;
  else
    if old.ende is not null and new.ende is null then
      raise exception 'Ein beendeter Zeiteintrag kann nicht wieder laufen.'
        using errcode = 'check_violation';
    end if;
    new.nachtrag := old.nachtrag
      or new.beginn is distinct from old.beginn
      or (old.ende is not null and new.ende is distinct from old.ende);
  end if;

  if new.beginn > now() or new.ende > now() then
    raise exception 'Ein Zeiteintrag kann nicht in der Zukunft liegen.'
      using errcode = 'check_violation';
  end if;
  if new.nachtrag and new.ende <= new.beginn then
    raise exception 'Ein Nachtrag endet nach seinem Beginn.'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger zeiteintrag_nachtrag_erkennen
  before insert or update on public.zeiteintrag
  for each row
  execute function privat.zeiteintrag_nachtrag_erkennen();

-- Auch beim Ändern nur aktive Objekte und Tätigkeiten, aber nur wenn sie
-- sich ändern: Ein Eintrag mit inzwischen archiviertem Objekt bleibt
-- änderbar.
create or replace function privat.zeiteintrag_nur_mit_aktiver_auswahl()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.objekt_id is not distinct from old.objekt_id
     and new.taetigkeit_id is not distinct from old.taetigkeit_id
  then
    return new;
  end if;
  if exists (select 1 from public.objekt o where o.id = new.objekt_id and o.archiviert)
     or exists (select 1 from public.taetigkeit t where t.id = new.taetigkeit_id and t.archiviert)
  then
    raise exception 'Objekt oder Tätigkeit ist archiviert.'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

drop trigger zeiteintrag_nur_mit_aktiver_auswahl on public.zeiteintrag;
create trigger zeiteintrag_nur_mit_aktiver_auswahl
  before insert or update of objekt_id, taetigkeit_id on public.zeiteintrag
  for each row
  execute function privat.zeiteintrag_nur_mit_aktiver_auswahl();

-- ---------------------------------------------------------------------------
-- Keine Überschneidungen je Mitarbeiter
--
-- Zeiträume von Beginn (eingeschlossen) bis Ende (ausgeschlossen): Ein
-- Eintrag darf genau dort beginnen, wo der vorige endet.
-- ---------------------------------------------------------------------------

alter table public.zeiteintrag
  add constraint zeiteintrag_keine_ueberschneidung
  exclude using gist (
    mitarbeiter_id with =,
    tstzrange(beginn, coalesce(ende, 'infinity'::timestamptz)) with &&
  );

-- ---------------------------------------------------------------------------
-- Änderungsprotokoll
-- ---------------------------------------------------------------------------

create type public.protokoll_aktion as enum ('angelegt', 'geaendert');

create table public.zeiteintrag_protokoll (
  id bigint generated always as identity primary key,
  -- "on delete cascade" greift nur, wenn eine ganze Firma gelöscht wird
  -- (nur mit dem Dienstschlüssel möglich, z. B. Aufräumen nach Tests).
  firma_id uuid not null references public.firma (id) on delete cascade,
  zeiteintrag_id uuid not null references public.zeiteintrag (id) on delete cascade,
  aktion public.protokoll_aktion not null,
  -- Wer geändert hat. Leer, wenn die Änderung nicht über die App kam
  -- (Dienstschlüssel).
  geaendert_von uuid references public.mitarbeiter (id),
  geaendert_am timestamptz not null default now(),
  -- Der ganze Zeiteintrag vor und nach der Änderung. Beim Anlegen gibt es
  -- kein Vorher.
  vorher jsonb,
  nachher jsonb not null
);

alter table public.zeiteintrag_protokoll enable row level security;

-- Nur lesen, für alle. Schreiben tut allein die Datenbank (Trigger unten).
revoke all on public.zeiteintrag_protokoll from anon, authenticated, service_role;
grant select on public.zeiteintrag_protokoll to authenticated, service_role;

create policy "Büro sieht das Protokoll der eigenen Firma"
  on public.zeiteintrag_protokoll
  for select
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

comment on table public.zeiteintrag_protokoll is
  'Jedes Anlegen und Ändern eines Zeiteintrags: wer, wann, vorher, nachher. Schreibt nur die Datenbank; unveränderlich.';

create index zeiteintrag_protokoll_zeiteintrag_idx
  on public.zeiteintrag_protokoll (zeiteintrag_id, geaendert_am);
create index zeiteintrag_protokoll_firma_id_idx on public.zeiteintrag_protokoll (firma_id);
create index zeiteintrag_protokoll_geaendert_von_idx on public.zeiteintrag_protokoll (geaendert_von);

-- "security definer", weil niemand sonst ins Protokoll schreiben darf.
-- Wer geändert hat, kommt trotzdem aus der Anmeldung des Nutzers.
create function privat.zeiteintrag_protokollieren()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old is not distinct from new then
    return null;
  end if;
  insert into public.zeiteintrag_protokoll
    (firma_id, zeiteintrag_id, aktion, geaendert_von, vorher, nachher)
  values (
    new.firma_id,
    new.id,
    case when tg_op = 'INSERT' then 'angelegt' else 'geaendert' end::public.protokoll_aktion,
    privat.meine_mitarbeiter_id(),
    case when tg_op = 'UPDATE' then to_jsonb(old) end,
    to_jsonb(new)
  );
  return null;
end
$$;

create trigger zeiteintrag_protokollieren
  after insert or update on public.zeiteintrag
  for each row
  execute function privat.zeiteintrag_protokollieren();

revoke all on function privat.zeiteintrag_nachtrag_erkennen() from public;
revoke all on function privat.zeiteintrag_protokollieren() from public;

-- ---------------------------------------------------------------------------
-- Lesen für Mitarbeiter und Büro
-- ---------------------------------------------------------------------------

-- Wie bisher, zusätzlich mit der Nachtrag-Markierung.
drop function public.meine_zeiteintraege(timestamptz);
create function public.meine_zeiteintraege(ab timestamptz)
returns table (
  id uuid,
  art public.zeiteintrag_art,
  beginn timestamptz,
  ende timestamptz,
  nachtrag boolean,
  objekt_bezeichnung text,
  taetigkeit_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select z.id, z.art, z.beginn, z.ende, z.nachtrag, o.bezeichnung, t.name
  from public.zeiteintrag z
  left join public.objekt o on o.id = z.objekt_id
  left join public.taetigkeit t on t.id = z.taetigkeit_id
  where z.mitarbeiter_id = privat.meine_mitarbeiter_id()
    and (z.beginn >= ab or z.ende is null)
  order by z.beginn desc
$$;

-- Für das Büro: alle Zeiteinträge der Firma ab einem Zeitpunkt, dazu alle
-- laufenden, mit Mitarbeiter, Objekt und Tätigkeit. Läuft mit den Rechten
-- des Aufrufers; andere Rollen bekommen nichts.
create function public.zeiteintraege_der_firma(ab timestamptz)
returns table (
  id uuid,
  mitarbeiter_name text,
  art public.zeiteintrag_art,
  beginn timestamptz,
  ende timestamptz,
  nachtrag boolean,
  objekt_bezeichnung text,
  taetigkeit_name text
)
language sql
stable
set search_path = ''
as $$
  select z.id, m.name, z.art, z.beginn, z.ende, z.nachtrag, o.bezeichnung, t.name
  from public.zeiteintrag z
  join public.mitarbeiter m on m.id = z.mitarbeiter_id
  left join public.objekt o on o.id = z.objekt_id
  left join public.taetigkeit t on t.id = z.taetigkeit_id
  where privat.meine_rolle() = 'buero'
    and z.firma_id = privat.meine_firma_id()
    and (z.beginn >= ab or z.ende is null)
  order by z.beginn desc
$$;

-- Das Protokoll eines Zeiteintrags, älteste Änderung zuerst, mit dem
-- Namen dessen, der geändert hat. Läuft mit den Rechten des Aufrufers.
create function public.protokoll_zum_zeiteintrag(eintrag uuid)
returns table (
  id bigint,
  aktion public.protokoll_aktion,
  geaendert_am timestamptz,
  geaendert_von_name text,
  vorher jsonb,
  nachher jsonb
)
language sql
stable
set search_path = ''
as $$
  select p.id, p.aktion, p.geaendert_am, m.name, p.vorher, p.nachher
  from public.zeiteintrag_protokoll p
  left join public.mitarbeiter m on m.id = p.geaendert_von
  where p.zeiteintrag_id = eintrag
  order by p.geaendert_am, p.id
$$;

revoke all on function public.meine_zeiteintraege(timestamptz) from public, anon;
revoke all on function public.zeiteintraege_der_firma(timestamptz) from public, anon;
revoke all on function public.protokoll_zum_zeiteintrag(uuid) from public, anon;
grant execute on function public.meine_zeiteintraege(timestamptz) to authenticated;
grant execute on function public.zeiteintraege_der_firma(timestamptz) to authenticated;
grant execute on function public.protokoll_zum_zeiteintrag(uuid) to authenticated;

commit;
