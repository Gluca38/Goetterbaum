// Abrechnungszeitraum (je Kunde) und Abrechnungsart (je Objekt), wie sie
// auch in der Datenbank stehen (Typen public.abrechnungszeitraum und
// public.abrechnungsart).
export const ABRECHNUNGSZEITRAEUME = ["monatlich", "quartalsweise"] as const;
export type Abrechnungszeitraum = (typeof ABRECHNUNGSZEITRAEUME)[number];

export function istAbrechnungszeitraum(wert: string): wert is Abrechnungszeitraum {
  return (ABRECHNUNGSZEITRAEUME as readonly string[]).includes(wert);
}

export const ABRECHNUNGSARTEN = ["pauschale", "stunden"] as const;
export type Abrechnungsart = (typeof ABRECHNUNGSARTEN)[number];

export function istAbrechnungsart(wert: string): wert is Abrechnungsart {
  return (ABRECHNUNGSARTEN as readonly string[]).includes(wert);
}
