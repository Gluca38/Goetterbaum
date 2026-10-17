import { istAbrechnungsart, type Abrechnungsart } from "@/lib/abrechnung";
import { pruefeAdresse, type Adresse } from "@/lib/adresse";
import { euroInCent } from "@/lib/geld";
import { istId } from "@/lib/id";
import { texte } from "@/texte";

// Die Angaben eines Objekts, wie sie in der Tabelle objekt stehen.
export type ObjektDaten = Adresse & {
  kunde_id: string;
  bezeichnung: string;
  abrechnungsart: Abrechnungsart;
  // Nur bei Abrechnungsart Pauschale, dann Pflicht.
  pauschale_cent: number | null;
};

export type EingabeErgebnis = { ok: true; daten: ObjektDaten } | { ok: false; fehler: string };

// Größter Betrag, den die Datenbank-Spalte pauschale_cent (integer)
// aufnehmen kann: 21.474.836,47 €.
const HOECHSTE_PAUSCHALE_CENT = 2_147_483_647;

// Prüft die Angaben aus dem Objekt-Formular und bringt sie in eine
// einheitliche Form. Ob der Kunde zur Firma gehört und aktiv ist, prüfen
// die Server-Aktion und die Datenbank.
export function pruefeObjektEingabe(formData: FormData): EingabeErgebnis {
  const feld = (name: string) => String(formData.get(name) ?? "").trim();
  const kunde_id = feld("kunde_id");
  const bezeichnung = feld("bezeichnung");
  const abrechnungsart = feld("abrechnungsart");
  const pauschale = feld("pauschale");
  const meldungen = texte.objekte;

  if (!bezeichnung) return { ok: false, fehler: meldungen.fehlerBezeichnung };
  if (!istId(kunde_id)) return { ok: false, fehler: meldungen.fehlerKunde };
  const adresse = pruefeAdresse(formData);
  if (!adresse.ok) return adresse;
  if (!istAbrechnungsart(abrechnungsart)) {
    return { ok: false, fehler: meldungen.fehlerAbrechnungsart };
  }

  let pauschale_cent: number | null = null;
  if (abrechnungsart === "pauschale") {
    if (!pauschale) return { ok: false, fehler: meldungen.fehlerPauschaleFehlt };
    pauschale_cent = euroInCent(pauschale);
    if (!pauschale_cent || pauschale_cent > HOECHSTE_PAUSCHALE_CENT) {
      return { ok: false, fehler: meldungen.fehlerPauschaleUngueltig };
    }
  } else if (pauschale) {
    return { ok: false, fehler: meldungen.fehlerPauschaleBeiStunden };
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
