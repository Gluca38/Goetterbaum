-- Vorarbeiter und Büro erfassen für andere (Ticket #12)
--
-- Vorarbeiter und Büro starten, stoppen, tragen nach und ändern
-- Zeiteinträge für jeden Mitarbeiter der eigenen Firma, ohne feste
-- Gruppen. So werden auch Mitarbeiter ohne Handy oder Zugang erfasst.
--
-- Zugriffsrechte, die sich ändern:
-- * Vorarbeiter sehen alle Zeiteinträge der eigenen Firma (bisher nur die
--   eigenen), wie schon das Büro. Normale Mitarbeiter sehen weiterhin nur
--   ihre eigenen.
-- * Vorarbeiter und Büro legen Zeiteinträge für jeden aktiven Mitarbeiter
--   der eigenen Firma an, live oder als Nachtrag.
-- * Vorarbeiter ändern Zeiteinträge aktiver Mitarbeiter der eigenen Firma,
--   das Büro alle Zeiteinträge der eigenen Firma, auch die deaktivierter
--   Mitarbeiter (Fehler beheben). Gesperrt werden freigegebene Einträge für
--   Vorarbeiter mit #14, abgerechnete für alle später.
--
-- Wer einen Eintrag angelegt hat (angelegt_von), setzt weiterhin die
-- Datenbank aus der Anmeldung; wer ihn geändert hat, steht wie bisher im
-- Änderungsprotokoll. Die Regeln zu Live-Start, Nachtrag und
-- Überschneidungen gelten unverändert auch beim Erfassen für andere.

begin;

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: Ist das ein aktiver Mitarbeiter der eigenen Firma?
--
-- "security definer" wie die anderen Hilfsfunktionen, damit die Regeln der
-- Tabelle zeiteintrag nicht von denen der Tabelle mitarbeiter abhängen.
-- ---------------------------------------------------------------------------

create function privat.aktiver_mitarbeiter_meiner_firma(wer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.mitarbeiter m
    where m.id = wer
      and m.aktiv
      and m.firma_id = privat.meine_firma_id()
  )
$$;

revoke all on function privat.aktiver_mitarbeiter_meiner_firma(uuid) from public;
grant execute on function privat.aktiver_mitarbeiter_meiner_firma(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Zugriffsregeln
-- ---------------------------------------------------------------------------

drop policy "Büro sieht alle Zeiteinträge der eigenen Firma" on public.zeiteintrag;

create policy "Vorarbeiter und Büro sehen alle Zeiteinträge der eigenen Firma"
  on public.zeiteintrag
  for select
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) in ('vorarbeiter', 'buero')
  );

create policy "Vorarbeiter und Büro erfassen für aktive Mitarbeiter"
  on public.zeiteintrag
  for insert
  to authenticated
  with check (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) in ('vorarbeiter', 'buero')
    and privat.aktiver_mitarbeiter_meiner_firma(mitarbeiter_id)
  );

create policy "Vorarbeiter ändern Zeiteinträge aktiver Mitarbeiter"
  on public.zeiteintrag
  for update
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'vorarbeiter'
    and privat.aktiver_mitarbeiter_meiner_firma(mitarbeiter_id)
  )
  with check (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'vorarbeiter'
    and privat.aktiver_mitarbeiter_meiner_firma(mitarbeiter_id)
  );

create policy "Büro ändert alle Zeiteinträge der eigenen Firma"
  on public.zeiteintrag
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

-- ---------------------------------------------------------------------------
-- Lesen mit Anleger
-- ---------------------------------------------------------------------------

-- Die Zeiteinträge eines Mitarbeiters ab einem Zeitpunkt, dazu immer der
-- laufende, mit Objekt, Tätigkeit und wer ihn angelegt hat. Jeder bekommt
-- die eigenen, Vorarbeiter und Büro die jedes Mitarbeiters der eigenen
-- Firma. "security definer", damit auch ein normaler Mitarbeiter den Namen
-- dessen sieht, der für ihn erfasst hat.
create function public.zeiteintraege_von(wer uuid, ab timestamptz)
returns table (
  id uuid,
  art public.zeiteintrag_art,
  beginn timestamptz,
  ende timestamptz,
  nachtrag boolean,
  objekt_bezeichnung text,
  taetigkeit_name text,
  angelegt_von uuid,
  angelegt_von_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select z.id, z.art, z.beginn, z.ende, z.nachtrag, o.bezeichnung, t.name, a.id, a.name
  from public.zeiteintrag z
  left join public.mitarbeiter a on a.id = z.angelegt_von
  left join public.objekt o on o.id = z.objekt_id
  left join public.taetigkeit t on t.id = z.taetigkeit_id
  where z.mitarbeiter_id = wer
    and z.firma_id = privat.meine_firma_id()
    and (
      wer = privat.meine_mitarbeiter_id()
      or privat.meine_rolle() in ('vorarbeiter', 'buero')
    )
    and (z.beginn >= ab or z.ende is null)
  order by z.beginn desc
$$;

-- Wie bisher die eigenen Einträge, jetzt mit Anleger.
drop function public.meine_zeiteintraege(timestamptz);
create function public.meine_zeiteintraege(ab timestamptz)
returns table (
  id uuid,
  art public.zeiteintrag_art,
  beginn timestamptz,
  ende timestamptz,
  nachtrag boolean,
  objekt_bezeichnung text,
  taetigkeit_name text,
  angelegt_von uuid,
  angelegt_von_name text
)
language sql
stable
set search_path = ''
as $$
  select * from public.zeiteintraege_von(privat.meine_mitarbeiter_id(), ab)
$$;

-- Wie bisher fürs Büro, jetzt mit Anleger.
drop function public.zeiteintraege_der_firma(timestamptz);
create function public.zeiteintraege_der_firma(ab timestamptz)
returns table (
  id uuid,
  mitarbeiter_name text,
  art public.zeiteintrag_art,
  beginn timestamptz,
  ende timestamptz,
  nachtrag boolean,
  objekt_bezeichnung text,
  taetigkeit_name text,
  angelegt_von_name text
)
language sql
stable
set search_path = ''
as $$
  select z.id, m.name, z.art, z.beginn, z.ende, z.nachtrag, o.bezeichnung, t.name, a.name
  from public.zeiteintrag z
  join public.mitarbeiter m on m.id = z.mitarbeiter_id
  left join public.mitarbeiter a on a.id = z.angelegt_von
  left join public.objekt o on o.id = z.objekt_id
  left join public.taetigkeit t on t.id = z.taetigkeit_id
  where privat.meine_rolle() = 'buero'
    and z.firma_id = privat.meine_firma_id()
    and (z.beginn >= ab or z.ende is null)
  order by z.beginn desc
$$;

revoke all on function public.zeiteintraege_von(uuid, timestamptz) from public, anon;
revoke all on function public.meine_zeiteintraege(timestamptz) from public, anon;
revoke all on function public.zeiteintraege_der_firma(timestamptz) from public, anon;
grant execute on function public.zeiteintraege_von(uuid, timestamptz) to authenticated;
grant execute on function public.meine_zeiteintraege(timestamptz) to authenticated;
grant execute on function public.zeiteintraege_der_firma(timestamptz) to authenticated;

commit;
