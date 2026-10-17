-- Unvollständige Zeiteinträge (Ticket #13)
--
-- Ein Zeiteintrag, der länger als 12 Stunden läuft, gilt als unvollständig:
-- Der Stopp wurde wohl vergessen. Das ergibt sich aus der Laufzeit und wird
-- nicht gespeichert. Nichts wird automatisch beendet.
--
-- Mitarbeiter, Vorarbeiter und Büro korrigieren einen unvollständigen
-- Eintrag, indem sie das richtige Ende angeben. Bisher setzte die
-- Datenbank beim Beenden eines laufenden Eintrags immer ihre eigene Uhr
-- (zeiteintrag_ende_jetzt). Das gilt weiter für jeden Stopp in den ersten
-- 12 Stunden. Bei einem unvollständigen Eintrag bleibt das mitgeschickte
-- Ende stehen, und der Eintrag wird zum Nachtrag. Wie jeder Nachtrag liegt
-- das Ende nach dem Beginn und nicht in der Zukunft.
--
-- Wer welche Einträge ändern darf, bleibt unverändert (#11, #12). Die
-- Grenze von 12 Stunden steht auch in der App
-- (src/lib/zeiterfassung/anzeige.ts, UNVOLLSTAENDIG_NACH_STUNDEN).

begin;

-- Stopp mit der Uhr der Datenbank, außer bei unvollständigen Einträgen.
-- Die Bedingung steht hier und im Trigger unten direkt im Code statt in
-- einer gemeinsamen Hilfsfunktion: Diese Funktion läuft auch für den
-- Dienstschlüssel (Test-Setup), der Funktionen im Schema privat nicht
-- aufrufen darf.
create or replace function privat.zeiteintrag_ende_jetzt()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ende is not null and old.beginn >= now() - interval '12 hours' then
    new.ende := now();
  end if;
  return new;
end
$$;

-- Wie bisher, zusätzlich: Wer das Ende eines unvollständigen Eintrags
-- angibt, macht ihn zum Nachtrag.
create or replace function privat.zeiteintrag_nachtrag_erkennen()
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
      or (old.ende is not null and new.ende is distinct from old.ende)
      or (
        old.ende is null
        and new.ende is not null
        and old.beginn < now() - interval '12 hours'
      );
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

-- "create or replace" behält die Rechte; trotzdem ausdrücklich, wie in den
-- anderen Migrationen.
revoke all on function privat.zeiteintrag_ende_jetzt() from public;
revoke all on function privat.zeiteintrag_nachtrag_erkennen() from public;

commit;
