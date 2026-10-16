import { istAbrechnungsart, type Abrechnungsart } from "@/lib/abrechnung";
import { pruefeAdresse, type Adresse } from "@/lib/adresse";
import { euroInCent } from "@/lib/geld";
import { texte } from "@/texte";

// Die Angaben eines Objekts, wie sie in der Tabelle objekt stehen.
export type ObjektDaten = Adresse & {
  kunde_id: string;
  bezeichnung: string;
  abrechnungsart: Abrechnungsart;
  // Nur bei Abrechnungsart Pauschale, dann Pflicht.
  pauschale_cent: number | null;
};

export type EingabeErgebnis =
  | { ok: true; daten: ObjektDaten }
  | { ok: false; fehler: string };

// Prüft die Angaben aus dem Objekt-Formular und bringt sie in eine
// einheitliche Form. Ob der Kunde existiert und aktiv ist, prüft die
// Datenbank.
export function pruefeObjektEingabe(formData: FormData): EingabeErgebnis {
  const feld = (name: string) => String(formData.get(name) ?? "").trim();
  const kunde_id = feld("kunde_id");
  const bezeichnung = feld("bezeichnung");
  const abrechnungsart = feld("abrechnungsart");
  const pauschale = feld("pauschale");
  const fehler = texte.objekte;

  if (!bezeichnung) return { ok: false, fehler: fehler.fehlerBezeichnung };
  if (!/^[0-9a-f-]{36}$/i.test(kunde_id)) {
    return { ok: false, fehler: fehler.fehlerKunde };
  }
  const adresse = pruefeAdresse(formData);
  if (!adresse.ok) return adresse;
  if (!istAbrechnungsart(abrechnungsart)) {
    return { ok: false, fehler: fehler.fehlerAbrechnungsart };
  }

  let pauschale_cent: number | null = null;
  if (abrechnungsart === "pauschale") {
    if (!pauschale) return { ok: false, fehler: fehler.fehlerPauschaleFehlt };
    pauschale_cent = euroInCent(pauschale);
    if (!pauschale_cent) {
      return { ok: false, fehler: fehler.fehlerPauschaleUngueltig };
    }
  } else if (pauschale) {
    return { ok: false, fehler: fehler.fehlerPauschaleBeiStunden };
  }

  return {
    ok: true,
    daten: {
      kunde_id,
      bezeichnung,
      ...adresse.adresse,
      abrechnungsart,
      pauschale_cent,
    },
  };
}
