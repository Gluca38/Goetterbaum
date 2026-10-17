-- Abgerechnete Pauschal-Monate mit ihrer Firma löschen (Nachtrag zu #16)
--
-- Wird eine ganze Firma gelöscht (nur mit dem Dienstschlüssel, beim
-- Aufräumen nach Tests), muss jede ihrer Tabellen direkt mitgelöscht
-- werden. abrechnung_pauschal_monat hing bisher nur über die Abrechnung an
-- der Firma. Postgres löscht dann zuerst die Objekte und prüft deren
-- Verweise, bevor die Pauschal-Monate an der Reihe sind, und bricht ab.
-- Mit einem direkten Verweis auf die Firma verschwinden sie im selben
-- Schritt wie Objekte und Abrechnungen. Sonst ändert sich nichts.

begin;

alter table public.abrechnung_pauschal_monat
  add constraint abrechnung_pauschal_monat_firma_id_fkey
    foreign key (firma_id) references public.firma (id) on delete cascade;

commit;
