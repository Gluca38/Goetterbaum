import {
  istAbrechnungszeitraum,
  type Abrechnungszeitraum,
} from "@/lib/abrechnung";
import { pruefeAdresse, type Adresse } from "@/lib/adresse";
import { texte } from "@/texte";

// Name, Rechnungsadresse und Abrechnungszeitraum eines Kunden.
export type KundenDaten = Adresse & {
  name: string;
  abrechnungszeitraum: Abrechnungszeitraum;
};

export type EingabeErgebnis =
  | { ok: true; daten: KundenDaten }
  | { ok: false; fehler: string };

// Prüft die Angaben aus dem Kunden-Formular und bringt sie in eine
// einheitliche Form.
export function pruefeKundenEingabe(formData: FormData): EingabeErgebnis {
  const name = String(formData.get("name") ?? "").trim();
  const abrechnungszeitraum = String(formData.get("abrechnungszeitraum") ?? "");

  if (!name) return { ok: false, fehler: texte.kunden.fehlerName };
  const adresse = pruefeAdresse(formData);
  if (!adresse.ok) return adresse;
  if (!istAbrechnungszeitraum(abrechnungszeitraum)) {
    return { ok: false, fehler: texte.kunden.fehlerAbrechnungszeitraum };
  }

  return { ok: true, daten: { name, ...adresse.adresse, abrechnungszeitraum } };
}
