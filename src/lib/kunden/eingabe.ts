import {
  istAbrechnungszeitraum,
  istRundungsregel,
  type Abrechnungszeitraum,
  type Rundungsregel,
} from "@/lib/abrechnung";
import { pruefeAdresse, type Adresse } from "@/lib/adresse";
import { texte } from "@/texte";

// Name, Rechnungsadresse, Abrechnungszeitraum und Rundungsregel eines
// Kunden. Ohne eigene Rundungsregel (null) gilt der Standard der Firma.
export type KundenDaten = Adresse & {
  name: string;
  abrechnungszeitraum: Abrechnungszeitraum;
  rundungsregel: Rundungsregel | null;
};

export type EingabeErgebnis = { ok: true; daten: KundenDaten } | { ok: false; fehler: string };

// Prüft die Angaben aus dem Kunden-Formular und bringt sie in eine
// einheitliche Form.
export function pruefeKundenEingabe(formData: FormData): EingabeErgebnis {
  const name = String(formData.get("name") ?? "").trim();
  const abrechnungszeitraum = String(formData.get("abrechnungszeitraum") ?? "");
  const rundungsregel = String(formData.get("rundungsregel") ?? "");

  if (!name) return { ok: false, fehler: texte.kunden.fehlerName };
  const adresse = pruefeAdresse(formData);
  if (!adresse.ok) return adresse;
  if (!istAbrechnungszeitraum(abrechnungszeitraum)) {
    return { ok: false, fehler: texte.kunden.fehlerAbrechnungszeitraum };
  }

  if (rundungsregel !== "" && !istRundungsregel(rundungsregel)) {
    return { ok: false, fehler: texte.kunden.fehlerRundungsregel };
  }

  return {
    ok: true,
    daten: {
      name,
      ...adresse.adresse,
      abrechnungszeitraum,
      rundungsregel: rundungsregel === "" ? null : rundungsregel,
    },
  };
}
