// Welchen Abrechnungszeitraum das Büro in der Rechnungsvorbereitung sieht.
// Ein Kunde wird monatlich oder je Kalenderquartal abgerechnet; Tage
// gelten in Berlin.
import type { Abrechnungszeitraum } from "@/lib/abrechnung";
import { berlinerDatum, berlinerMitternacht } from "@/lib/berliner-zeit";
import type { Monat } from "@/lib/rechnungsvorbereitung";

// ersterMonat geht so an den Rechenbaustein; ab und bisVor sind die
// Zeitpunkte als ISO-Text (Mitternacht am Ersten des ersten Monats bzw. des
// Monats nach dem Zeitraum).
export type RechnungsZeitraum = {
  ersterMonat: Monat;
  bezeichnung: string;
  ab: string;
  bisVor: string;
};

const MONATSNAMEN = new Intl.DateTimeFormat("de-DE", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// Ein Monat ("JJJJ-MM") als Text, z. B. „März 2026“.
export function monatAlsText(monat: Monat): string {
  return MONATSNAMEN.format(Date.parse(`${monat}-01T00:00:00Z`));
}

// Der Monat, der `anzahl` Monate nach dem Monat `nummer` (1–12) von `jahr`
// liegt; die Nummer darf über ihre Grenzen hinausgehen.
function monat(jahr: number, nummer: number, anzahl = 0): Monat {
  return new Date(Date.UTC(jahr, nummer - 1 + anzahl, 1)).toISOString().slice(0, 7);
}

// Liest den Monat aus der Adresszeile ("JJJJ-MM"). Ohne gültige Angabe
// gilt der letzte abgeschlossene Zeitraum: Abgerechnet wird meist zu
// Beginn des nächsten. Quartalsweise zählt immer das ganze Kalenderquartal
// des gewählten Monats.
export function rechnungsZeitraum(
  wert: string | string[] | undefined,
  abrechnungszeitraum: Abrechnungszeitraum,
  jetzt: number,
): RechnungsZeitraum {
  const quartalsweise = abrechnungszeitraum === "quartalsweise";
  const [hJahr, hMonat] = berlinerDatum(jetzt).split("-").map(Number);
  const gewaehlt = typeof wert === "string" ? /^(\d{4})-(0[1-9]|1[0-2])$/.exec(wert.trim()) : null;
  let [jahr, nummer] = gewaehlt
    ? [Number(gewaehlt[1]), Number(gewaehlt[2])]
    : [hJahr, hMonat - (quartalsweise ? 3 : 1)];
  if (nummer < 1) [jahr, nummer] = [jahr - 1, nummer + 12];
  if (quartalsweise) nummer -= (nummer - 1) % 3;

  const ersterMonat = monat(jahr, nummer);
  return {
    ersterMonat,
    bezeichnung: quartalsweise ? `${(nummer + 2) / 3}. Quartal ${jahr}` : monatAlsText(ersterMonat),
    ab: new Date(berlinerMitternacht(`${ersterMonat}-01`)).toISOString(),
    bisVor: new Date(
      berlinerMitternacht(`${monat(jahr, nummer, quartalsweise ? 3 : 1)}-01`),
    ).toISOString(),
  };
}
