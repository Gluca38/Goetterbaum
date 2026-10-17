-- Rundungsregel für die Rechnungsvorbereitung (Ticket #15)
--
-- Die Firma legt fest, wie erfasste Minuten für die Stundenabrechnung
-- gerundet werden (Standard: auf angefangene 15 Minuten). Je Kunde kann
-- das Büro eine abweichende Regel festlegen; ohne gilt der Standard der
-- Firma. Gerundet wird im Rechenbaustein, nicht in der Datenbank.
--
-- Zugriffsrechte, die sich ändern:
-- * Das Büro darf an der eigenen Firma die Standard-Rundungsregel ändern,
--   sonst nichts. Mitarbeiter und Vorarbeiter ändern an der Firma nichts.
-- * Das Büro darf die Rundungsregel eines Kunden beim Anlegen und Ändern
--   setzen und wieder leeren (dann gilt der Standard). Die Regeln für
--   Kunden bleiben, wie sie sind.

begin;

create type public.rundungsregel as enum ('minutengenau', '15-minuten');

-- ---------------------------------------------------------------------------
-- Standard der Firma
-- ---------------------------------------------------------------------------

alter table public.firma
  add column rundungsregel public.rundungsregel not null default '15-minuten';

comment on column public.firma.rundungsregel is
  'Standard-Rundungsregel der Stundenabrechnung für alle Kunden ohne eigene Regel.';

grant update (rundungsregel) on public.firma to authenticated;

create policy "Büro ändert die eigene Firma"
  on public.firma
  for update
  to authenticated
  using (
    id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  )
  with check (
    id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

-- ---------------------------------------------------------------------------
-- Abweichende Regel eines Kunden
-- ---------------------------------------------------------------------------

alter table public.kunde
  add column rundungsregel public.rundungsregel;

comment on column public.kunde.rundungsregel is
  'Abweichende Rundungsregel des Kunden; leer heißt: Es gilt der Standard der Firma.';

grant insert (rundungsregel), update (rundungsregel) on public.kunde to authenticated;

commit;
