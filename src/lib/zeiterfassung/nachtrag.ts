import { berlinerDatum, berlinerZeitpunkt } from "@/lib/berliner-zeit";
import { istId } from "@/lib/id";
import { texte } from "@/texte";

// Die Angaben eines Nachtrags, wie sie in die Tabelle zeiteintrag gehen.
// Dass er als Nachtrag markiert wird, erledigt die Datenbank selbst.
export type NachtragDaten = {
  art: "taetigkeit" | "fahrt";
  objekt_id: string | null;
  taetigkeit_id: string | null;
  // Zeitpunkte als ISO-Text
  beginn: string;
  ende: string;
};

export type NachtragErgebnis = { ok: true; daten: NachtragDaten } | { ok: false; fehler: string };

const UHRZEIT = /^([01]\d|2[0-3]):[0-5]\d$/;

function istDatum(wert: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wert)) return false;
  // Ein Tag wie der 30.02. würde sonst still zum 02.03.
  return new Date(`${wert}T00:00:00Z`).toISOString().slice(0, 10) === wert;
}

// Prüft die Angaben aus dem Nachtrag-Formular: Art, bei einer Tätigkeit
// Objekt und Tätigkeit, dazu Datum und von–bis in Berliner Zeit an diesem
// Tag. jetzt ist der aktuelle Zeitpunkt (ms seit 1970). Ob Objekt und
// Tätigkeit aktiv sind und ob sich der Eintrag mit einem anderen
// überschneidet, prüft die Datenbank.
export function pruefeNachtragEingabe(formData: FormData, jetzt: number): NachtragErgebnis {
  const feld = (name: string) => String(formData.get(name) ?? "").trim();
  const t = texte.nachtrag;
  const art = feld("art");

  let objekt_id: string | null = null;
  let taetigkeit_id: string | null = null;
  if (art === "taetigkeit") {
    objekt_id = feld("objekt");
    taetigkeit_id = feld("taetigkeit");
    if (!istId(objekt_id)) return { ok: false, fehler: texte.erfassung.fehlerObjekt };
    if (!istId(taetigkeit_id)) return { ok: false, fehler: texte.erfassung.fehlerTaetigkeit };
  } else if (art !== "fahrt") {
    return { ok: false, fehler: t.fehlerArt };
  }

  const datum = feld("datum");
  const von = feld("von");
  const bis = feld("bis");
  if (!istDatum(datum)) return { ok: false, fehler: t.fehlerDatum };
  if (!UHRZEIT.test(von) || !UHRZEIT.test(bis)) return { ok: false, fehler: t.fehlerUhrzeit };

  const beginn = berlinerZeitpunkt(datum, von);
  const ende = berlinerZeitpunkt(datum, bis);
  if (ende <= beginn) return { ok: false, fehler: t.fehlerEndeVorBeginn };
  if (ende > jetzt) return { ok: false, fehler: t.fehlerZukunft };

  return {
    ok: true,
    daten: {
      art,
      objekt_id,
      taetigkeit_id,
      beginn: new Date(beginn).toISOString(),
      ende: new Date(ende).toISOString(),
    },
  };
}

// Der heutige Tag in Berlin als "JJJJ-MM-TT", als Vorschlag im Formular.
export function heuteInBerlin(): string {
  return berlinerDatum(Date.now());
}
