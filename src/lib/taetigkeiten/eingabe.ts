import { istSparte, type Sparte } from "@/lib/sparte";
import { stundensatzInCent } from "@/lib/stundensaetze/eingabe";
import { texte } from "@/texte";

// Die Angaben einer Tätigkeit, wie sie in der Tabelle taetigkeit stehen.
export type TaetigkeitsDaten = {
  name: string;
  sparte: Sparte;
  standard_stundensatz_cent: number;
};

export type EingabeErgebnis = { ok: true; daten: TaetigkeitsDaten } | { ok: false; fehler: string };

// Prüft die Angaben aus dem Tätigkeits-Formular und bringt sie in eine
// einheitliche Form.
export function pruefeTaetigkeitsEingabe(formData: FormData): EingabeErgebnis {
  const feld = (name: string) => String(formData.get(name) ?? "").trim();
  const name = feld("name");
  const sparte = feld("sparte");
  const meldungen = texte.taetigkeiten;

  if (!name) return { ok: false, fehler: meldungen.fehlerName };
  if (!istSparte(sparte)) return { ok: false, fehler: meldungen.fehlerSparte };
  const standard_stundensatz_cent = stundensatzInCent(feld("standard_stundensatz"));
  if (!standard_stundensatz_cent) {
    return { ok: false, fehler: texte.stundensaetze.fehlerStundensatz };
  }

  return { ok: true, daten: { name, sparte, standard_stundensatz_cent } };
}
