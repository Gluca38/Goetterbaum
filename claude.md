# Projekt
Diese Web-App ist die zentrale Management-Software für die Gebäudereinigungs- und Gartenpflegeunternehmen und soll schrittweise alle betrieblichen Abläufe digital abbilden. 
Erstes Kernfeature ist die objektbezogene Zeiterfassung der Mitarbeiter vor Ort, deren Daten als Grundlage für die Rechnungsvorbereitung und später für die Rechnungserstellung und den Versand dienen. 

# Über mich
- Ich bin kein Entwickler. Erkläre alles in einfacher Sprache.
- Frag, statt zu raten. Bei technischen Entscheidungen: 2–3 Optionen mit Vor- und Nachteilen.
- Kleinere Entscheidungen triffst du selbst und nennst sie in der PR-Beschreibung.

# Technik
- Next.js mit TypeScript, Node.js 24
- Hosting: Vercel (EU-Region)
- Datenbank: Supabase (Postgres, EU-Region), Login: Supabase Auth (mit Resend)
- Ziel: verbreitete Standardtechnik, für andere Entwickler übernehmbar, Daten jederzeit exportierbar. Nichts Exotisches einführen.

# Arbeitsweise
- Neue Features starten mit /grill-with-docs, nie direkt mit Code.
- Gebaut wird nur, was als Ticket auf GitHub steht, mit /implement.
- Nie direkt auf main: ein Ticket = ein Branch = ein Pull Request.
- Jede PR-Beschreibung enthält: Was ändert sich für Nutzer? Wie teste ich es? Welche Risiken?

# Ohne meine Zustimmung nie
- Neue Pakete hinzufügen
- Login, Rechte oder Datenbankschema ändern
- Tests löschen oder abschwächen- Passwörter oder Schlüssel in den Code schreiben (nur Umgebungsvariablen)
