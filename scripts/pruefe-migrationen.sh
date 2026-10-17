#!/usr/bin/env bash
# Prüft, dass jede neue Migration in supabase/migrations/ ganz oder gar nicht
# eingespielt wird: Der erste Befehl muss `begin;` sein, der letzte `commit;`
# (ADR-0003). Leerzeilen und Kommentarzeilen (--) davor und danach zählen nicht.
#
# Die beiden Migrationen bis einschließlich 20261017090000 waren schon auf
# Staging und Produktion, bevor es diese Regel gab. Sie bleiben, wie sie sind.

set -euo pipefail

LETZTE_ALTE_MIGRATION=20261017090000
ordner="${1:-supabase/migrations}"
fehler=0

for datei in "$ordner"/*.sql; do
  [ -e "$datei" ] || continue
  version="$(basename "$datei" | cut -d_ -f1)"
  if [[ "$version" =~ ^[0-9]+$ ]] && [ "$version" -le "$LETZTE_ALTE_MIGRATION" ]; then
    continue
  fi

  # Nur die Zeilen mit echten Befehlen, ohne Windows-Zeilenenden
  befehle="$(tr -d '\r' < "$datei" | grep -Ev '^[[:space:]]*(--.*)?$' || true)"
  erste="$(printf '%s\n' "$befehle" | head -n 1 | tr -d '[:space:]' | tr '[:upper:]' '[:lower:]')"
  letzte="$(printf '%s\n' "$befehle" | tail -n 1 | tr -d '[:space:]' | tr '[:upper:]' '[:lower:]')"

  if [ "$erste" != "begin;" ] || [ "$letzte" != "commit;" ]; then
    echo "::error file=$datei::Die Migration $datei muss mit 'begin;' anfangen und mit 'commit;' enden, damit sie ganz oder gar nicht eingespielt wird (siehe docs/adr/0003-migrationen-ganz-oder-gar-nicht.md)."
    fehler=1
  fi
done

if [ "$fehler" -ne 0 ]; then
  exit 1
fi
echo "Alle neuen Migrationen stehen in begin; … commit;."
