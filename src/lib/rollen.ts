// Die Rollen, wie sie auch in der Datenbank stehen (Typ public.rolle).
export const ROLLEN = ["mitarbeiter", "vorarbeiter", "buero"] as const;

export type Rolle = (typeof ROLLEN)[number];

// Vorarbeiter und Büro erfassen auch für andere Mitarbeiter. Durchgesetzt
// wird das in der Datenbank; Oberfläche und Aktionen fragen nur vorab.
export function darfFuerAndereErfassen(rolle: Rolle): boolean {
  return rolle === "vorarbeiter" || rolle === "buero";
}

export function istRolle(wert: string): wert is Rolle {
  return (ROLLEN as readonly string[]).includes(wert);
}
