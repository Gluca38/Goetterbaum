// Die Freigabe von Zeiteinträgen durch das Büro: welche Einträge die
// Prüfliste zeigt und welche freigegeben werden sollen. Tage gelten in
// Berlin.
import { berlinerDatum, berlinerMitternacht } from "@/lib/berliner-zeit";
import { istId } from "@/lib/id";
import { texte } from "@/texte";
import { istDatum } from "./nachtrag";

// Was das Büro auf der Freigabe-Seite eingestellt hat. von und bis sind
// Tage ("JJJJ-MM-TT"), beide eingeschlossen; ab und bisVor die Zeitpunkte
// dazu als ISO-Text (Mitternacht am ersten Tag bzw. am Tag nach dem
// letzten). Ohne Mitarbeiter, Kunde oder Objekt wird danach nicht gefiltert.
// freigegebene: statt der wartenden die schon freigegebenen Einträge, um
// eine Freigabe zurückzunehmen.
export type FreigabeFilter = {
  von: string;
  bis: string;
  mitarbeiter: string | null;
  kunde: string | null;
  objekt: string | null;
  freigegebene: boolean;
  ab: string;
  bisVor: string;
};

type Parameter = Record<string, string | string[] | undefined>;

// Ein Tag als "JJJJ-MM-TT"; Monat und Tag dürfen über ihre Grenzen
// hinausgehen (Monat 0 ist der Dezember des Vorjahres).
function datum(jahr: number, monat: number, tag: number): string {
  return new Date(Date.UTC(jahr, monat - 1, tag)).toISOString().slice(0, 10);
}

// Ein einzelner Wert aus der Adresszeile; mehrfach angegeben zählt keiner.
function einzeln(wert: string | string[] | undefined): string {
  return typeof wert === "string" ? wert.trim() : "";
}

function kennung(wert: string | string[] | undefined): string | null {
  const text = einzeln(wert);
  return istId(text) ? text : null;
}

// Liest die Einstellungen aus der Adresszeile. Ohne gültige Tage gilt der
// Zeitraum vom Ersten des Vormonats bis heute: Zu Monatsbeginn prüft das
// Büro meist den abgelaufenen Monat.
export function freigabeFilter(parameter: Parameter, jetzt: number): FreigabeFilter {
  const heute = berlinerDatum(jetzt);
  const [jahr, monat] = heute.split("-").map(Number);
  const tag = (name: string, vorgabe: string) => {
    const text = einzeln(parameter[name]);
    return istDatum(text) ? text : vorgabe;
  };
  // Tage als "JJJJ-MM-TT" lassen sich als Text vergleichen.
  const [von, bis] = [tag("von", datum(jahr, monat - 1, 1)), tag("bis", heute)].sort();
  const [bJahr, bMonat, bTag] = bis.split("-").map(Number);

  return {
    von,
    bis,
    mitarbeiter: kennung(parameter.mitarbeiter),
    kunde: kennung(parameter.kunde),
    objekt: kennung(parameter.objekt),
    freigegebene: einzeln(parameter.freigegebene) === "ja",
    ab: new Date(berlinerMitternacht(von)).toISOString(),
    bisVor: new Date(berlinerMitternacht(datum(bJahr, bMonat, bTag + 1))).toISOString(),
  };
}

export type FreigabeAuswahl = { ok: true; ids: string[] } | { ok: false; fehler: string };

// Welche Einträge das Büro freigeben will: der eine, dessen Knopf in der
// Zeile gedrückt wurde (einzeln), sonst alle angehakten (id). Ob sie
// freigegeben werden können, entscheidet die Datenbank.
export function freigabeAuswahl(formData: FormData): FreigabeAuswahl {
  const einzelner = String(formData.get("einzeln") ?? "");
  const ids = istId(einzelner)
    ? [einzelner]
    : [...new Set(formData.getAll("id").map(String).filter(istId))];
  if (ids.length === 0) return { ok: false, fehler: texte.freigabe.fehlerKeineAuswahl };
  return { ok: true, ids };
}
