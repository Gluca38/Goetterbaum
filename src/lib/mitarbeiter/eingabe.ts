import { istRolle, type Rolle } from "@/lib/rollen";
import { texte } from "@/texte";

export type MitarbeiterDaten = {
  name: string;
  email: string | null;
  rolle: Rolle;
};

export type EingabeErgebnis =
  | { ok: true; daten: MitarbeiterDaten }
  | { ok: false; fehler: string };

// Prüft die Angaben aus dem Mitarbeiter-Formular und bringt sie in eine
// einheitliche Form.
export function pruefeMitarbeiterEingabe(formData: FormData): EingabeErgebnis {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rolle = String(formData.get("rolle") ?? "");

  if (!name) return { ok: false, fehler: texte.mitarbeiter.fehlerName };
  // Bewusst einfach: Ob die Adresse wirklich existiert, zeigt erst die
  // Einladung.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, fehler: texte.mitarbeiter.fehlerEmail };
  }
  if (!istRolle(rolle)) return { ok: false, fehler: texte.mitarbeiter.fehlerRolle };

  return { ok: true, daten: { name, email: email || null, rolle } };
}
