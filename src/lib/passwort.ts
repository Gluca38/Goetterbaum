import { texte } from "@/texte";

// Strenger als die Mindestlänge von Supabase (6 Zeichen).
export const MINDESTLAENGE_PASSWORT = 8;

export type PasswortErgebnis = { ok: true; passwort: string } | { ok: false; fehler: string };

// Prüft das neue Passwort aus dem Formular "Passwort festlegen".
export function pruefeNeuesPasswort(formData: FormData): PasswortErgebnis {
  const passwort = String(formData.get("passwort") ?? "");
  if (passwort.length < MINDESTLAENGE_PASSWORT) {
    return { ok: false, fehler: texte.passwortFestlegen.fehlerZuKurz };
  }
  if (passwort !== String(formData.get("wiederholung") ?? "")) {
    return { ok: false, fehler: texte.passwortFestlegen.fehlerUngleich };
  }
  return { ok: true, passwort };
}
