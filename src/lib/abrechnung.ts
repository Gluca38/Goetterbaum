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

// Rundungsregel der Firma (Standard) und eines Kunden (abweichend), wie in
// der Datenbank (Typ public.rundungsregel).
export const RUNDUNGSREGELN = ["minutengenau", "15-minuten"] as const;
export type Rundungsregel = (typeof RUNDUNGSREGELN)[number];

export function istRundungsregel(wert: string): wert is Rundungsregel {
  return (RUNDUNGSREGELN as readonly string[]).includes(wert);
}
