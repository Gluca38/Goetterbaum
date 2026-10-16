-- Kunden und Objekte (Ticket #7): Pauschale wirklich zur Pflicht machen
--
-- Die Regel aus 20261017120000 ließ ein Pauschal-Objekt ohne Betrag zu:
-- Ist pauschale_cent leer (NULL), ergibt "pauschale_cent > 0" nicht
-- "falsch", sondern "unbekannt", und eine Prüfregel mit Ergebnis
-- "unbekannt" gilt als erfüllt. Deshalb jetzt ausdrücklich "is not null".
--
-- Ein einziger Befehl, damit die alte Regel nie ohne die neue wegfällt.

alter table public.objekt
  drop constraint pauschale_nur_bei_pauschale,
  add constraint pauschale_nur_bei_pauschale check (
    (abrechnungsart = 'pauschale' and pauschale_cent is not null and pauschale_cent > 0)
    or (abrechnungsart = 'stunden' and pauschale_cent is null)
  );
