-- Mitarbeiter verwalten (Ticket #6)
--
-- Das Büro legt Mitarbeiter der eigenen Firma an, ändert Name, E-Mail und
-- Rolle und deaktiviert bzw. aktiviert sie wieder. Mitarbeiter und
-- Vorarbeiter dürfen weiterhin nur lesen. Gelöscht wird nie.
--
-- Weil die Zugriffsregeln Rolle und Aktiv-Status bei jeder Abfrage frisch
-- aus der Tabelle lesen, wirkt eine Änderung sofort, auch für bereits
-- angemeldete Nutzer.

-- Nur diese Spalten dürfen über die App gesetzt werden. Die Verknüpfung
-- zum Login (auth_user_id) setzt ausschließlich der Server beim Einladen,
-- sonst könnte sich jemand mit einem fremden Login verbinden. Die Firma
-- lässt sich nach dem Anlegen nicht mehr ändern.
grant insert (firma_id, name, email, rolle) on public.mitarbeiter to authenticated;
grant update (name, email, rolle, aktiv) on public.mitarbeiter to authenticated;

create policy "Büro legt Mitarbeiter der eigenen Firma an"
  on public.mitarbeiter
  for insert
  to authenticated
  with check (
    firma_id = (select privat.meine_firma_id())
    and (select privat.meine_rolle()) = 'buero'
  );

create policy "Büro ändert Mitarbeiter der eigenen Firma"
  on public.mitarbeiter
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
