-- Freigabe von Zeiteinträgen (Ticket #14)
--
-- Das Büro gibt Zeiteinträge frei, einzeln oder viele auf einmal, und kann
-- eine Freigabe zurücknehmen. Wann und von wem freigegeben wurde, setzt
-- die Datenbank selbst (Uhr der Datenbank, angemeldeter Nutzer); niemand
-- kann das über die Schnittstelle vorgeben. Jede Freigabe und jede
-- Rücknahme steht wie jede andere Änderung im Änderungsprotokoll (#11).
--
-- Freigegeben werden nur beendete Zeiteinträge. Laufende und damit auch
-- unvollständige (#13) lassen sich nicht freigeben; die Regel steckt fest
-- an der Tabelle.
--
-- Zugriffsrechte, die sich ändern:
-- * Freigeben und Freigaben zurücknehmen darf nur das Büro der eigenen
--   Firma.
-- * Freigegebene Zeiteinträge können Mitarbeiter und Vorarbeiter nicht
--   mehr ändern, auch nicht ihre eigenen. Das Büro ändert sie weiterhin
--   (Fehler beheben); gesperrt werden abgerechnete Einträge für alle später.
-- * Mitarbeiter sehen in ihrer Liste, welche ihrer Einträge freigegeben
--   sind.

begin;

-- ---------------------------------------------------------------------------
-- Freigabe
-- ---------------------------------------------------------------------------

alter table public.zeiteintrag
  add column freigegeben_am timestamptz,
  add column freigegeben_von uuid,
  -- Wer freigibt, gehört zur selben Firma wie der Zeiteintrag.
  add constraint zeiteintrag_freigegeben_von_fkey
    foreign key (freigegeben_von, firma_id) references public.mitarbeiter (id, firma_id),
  add constraint nur_beendete_freigeben
    check (freigegeben_am is null or ende is not null),
  add constraint freigegeben_von_nur_mit_freigabe
    check (freigegeben_von is null or freigegeben_am is not null);

comment on column public.zeiteintrag.freigegeben_am is
  'Wann das Büro den Zeiteintrag freigegeben hat; leer, solange er nicht freigegeben ist. Setzt die Datenbank.';
comment on column public.zeiteintrag.freigegeben_von is
  'Wer ihn freigegeben hat. Setzt die Datenbank aus der Anmeldung.';

create index zeiteintrag_freigegeben_von_idx on public.zeiteintrag (freigegeben_von);

-- Freigeben heißt: freigegeben_am setzen, zurücknehmen: leeren. Welcher
-- Wert dabei mitkommt, ist egal (siehe Trigger unten). freigegeben_von
-- lässt sich nicht selbst setzen.
grant update (freigegeben_am) on public.zeiteintrag to authenticated;

-- Freigegebene Einträge sind für Mitarbeiter und Vorarbeiter gesperrt,
-- und beide können nichts freigeben (with check). Die Regel "Büro ändert
-- alle Zeiteinträge der eigenen Firma" bleibt, wie sie ist; sie gilt auch
-- für die eigenen Einträge eines Büro-Nutzers.
drop policy "Eigene Zeiteinträge ändern" on public.zeiteintrag;

create policy "Eigene Zeiteinträge ändern, solange nicht freigegeben"
  on public.zeiteintrag
  for update
  to authenticated
  using (
    mitarbeiter_id = (select privat.meine_mitarbeiter_id())
    and freigegeben_am is null
  )
  with check (
    mitarbeiter_id = (select privat.meine_mitarbeiter_id())
    and freigegeben_am is null
  );

drop policy "Vorarbeiter ändern Zeiteinträge aktiver Mitarbeiter" on public.zeiteintrag;

create policy "Vorarbeiter ändern nicht freigegebene Zeiteinträge aktiver Mitarbeiter"
  on public.zeiteintrag
  for update
  to authenticated
  using (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'vorarbeiter'
    and privat.aktiver_mitarbeiter_meiner_firma(mitarbeiter_id)
    and freigegeben_am is null
  )
  with check (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'vorarbeiter'
    and privat.aktiver_mitarbeiter_meiner_firma(mitarbeiter_id)
    and freigegeben_am is null
  );

-- Wann und von wem: Beim Freigeben die Uhr der Datenbank und der
-- angemeldete Nutzer, beim Zurücknehmen beides leer. Wer einen schon
-- freigegebenen Eintrag noch einmal freigibt, ändert nichts: Es bleibt die
-- erste Freigabe. Wie bei den anderen Regeln entscheidet die Rolle aus der
-- Anmeldung; mit dem Dienstschlüssel (Test-Setup) gelten sie nicht.
create function privat.zeiteintrag_freigabe_setzen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;

  if old.freigegeben_am is not null and new.freigegeben_am is not null then
    new.freigegeben_am := old.freigegeben_am;
    new.freigegeben_von := old.freigegeben_von;
  elsif new.freigegeben_am is not null then
    new.freigegeben_am := now();
    new.freigegeben_von := privat.meine_mitarbeiter_id();
  else
    new.freigegeben_von := null;
  end if;
  return new;
end
$$;

create trigger zeiteintrag_freigabe_setzen
  before update on public.zeiteintrag
  for each row
  when (old.freigegeben_am is distinct from new.freigegeben_am)
  execute function privat.zeiteintrag_freigabe_setzen();

revoke all on function privat.zeiteintrag_freigabe_setzen() from public;

-- ---------------------------------------------------------------------------
-- Lesen mit Freigabe
-- ---------------------------------------------------------------------------

-- Wie bisher, zusätzlich: ob der Eintrag freigegeben ist. meine_zeiteintraege
-- baut darauf auf und muss deshalb mit neu angelegt werden.
drop function public.meine_zeiteintraege(timestamptz);
drop function public.zeiteintraege_von(uuid, timestamptz);

create function public.zeiteintraege_von(wer uuid, ab timestamptz)
returns table (
  id uuid,
  art public.zeiteintrag_art,
  beginn timestamptz,
  ende timestamptz,
  nachtrag boolean,
  freigegeben boolean,
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
  select
    z.id, z.art, z.beginn, z.ende, z.nachtrag, z.freigegeben_am is not null,
    o.bezeichnung, t.name, a.id, a.name
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

create function public.meine_zeiteintraege(ab timestamptz)
returns table (
  id uuid,
  art public.zeiteintrag_art,
  beginn timestamptz,
  ende timestamptz,
  nachtrag boolean,
  freigegeben boolean,
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

-- Wie bisher fürs Büro, zusätzlich mit den Kennungen von Mitarbeiter und
-- Objekt, dem Kunden des Objekts (zum Filtern bei der Freigabe) und der
-- Freigabe.
drop function public.zeiteintraege_der_firma(timestamptz);
create function public.zeiteintraege_der_firma(ab timestamptz)
returns table (
  id uuid,
  mitarbeiter_id uuid,
  mitarbeiter_name text,
  art public.zeiteintrag_art,
  beginn timestamptz,
  ende timestamptz,
  nachtrag boolean,
  objekt_id uuid,
  objekt_bezeichnung text,
  kunde_id uuid,
  kunde_name text,
  taetigkeit_name text,
  angelegt_von_name text,
  freigegeben_am timestamptz,
  freigegeben_von_name text
)
language sql
stable
set search_path = ''
as $$
  select
    z.id, m.id, m.name, z.art, z.beginn, z.ende, z.nachtrag,
    o.id, o.bezeichnung, k.id, k.name, t.name, a.name,
    z.freigegeben_am, f.name
  from public.zeiteintrag z
  join public.mitarbeiter m on m.id = z.mitarbeiter_id
  left join public.mitarbeiter a on a.id = z.angelegt_von
  left join public.mitarbeiter f on f.id = z.freigegeben_von
  left join public.objekt o on o.id = z.objekt_id
  left join public.kunde k on k.id = o.kunde_id
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
