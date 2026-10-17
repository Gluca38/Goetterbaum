# Migrationen werden ganz oder gar nicht eingespielt

Die Supabase-CLI spielt eine Migrationsdatei Befehl für Befehl ein, ohne Transaktion und ohne Schalter dafür. Scheitert ein Befehl in der Mitte, bleibt alles davor stehen, die Datei gilt aber nicht als erledigt (so geschehen beim PR für #7 auf Staging). Deshalb gelten für jede neue Datei in `supabase/migrations/`:

1. **`begin;` als erster und `commit;` als letzter Befehl.** Scheitert etwas dazwischen, macht die Datenbank alles aus dieser Datei rückgängig. Kommentare davor und danach sind erlaubt. `scripts/pruefe-migrationen.sh` prüft das im Job „Migrationen-Probelauf“.
2. **Zugriffsregeln direkt an die Tabelle.** `alter table … enable row level security` und die `create policy`-Befehle stehen direkt nach dem `create table` derselben Tabelle, nicht gesammelt am Dateiende. So gibt es auch beim Lesen und Ändern der Datei keinen Abschnitt, in dem eine Tabelle ungeschützt ist.
3. **Probelauf vor jeder echten Datenbank.** Vor Staging und vor Produktion werden alle Migrationen auf einer frischen Supabase-Datenbank im GitHub-Runner eingespielt. Scheitert das, wird die echte Datenbank nicht angefasst.

Ausgenommen sind die beiden Dateien bis einschließlich `20261017090000_…`: Sie waren schon eingespielt, bevor es diese Regel gab, und werden nicht mehr geändert.

## Bewusst nicht

- **Befehle, die nicht in einer Transaktion laufen dürfen** (z. B. `create index concurrently`): vorerst nicht vorgesehen. Werden sie gebraucht, bekommen sie eine eigene, hier dokumentierte Ausnahme.
- **Fehler, die nur mit echten Daten auftreten** (z. B. eine neue Pflicht-Spalte bei vorhandenen Zeilen) findet der Probelauf nicht. Dafür sorgt Regel 1, dass dann nichts Halbes stehen bleibt.
