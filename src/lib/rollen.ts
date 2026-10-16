// Die Rollen, wie sie auch in der Datenbank stehen (Typ public.rolle).
export const ROLLEN = ["mitarbeiter", "vorarbeiter", "buero"] as const;

export type Rolle = (typeof ROLLEN)[number];

export function istRolle(wert: string): wert is Rolle {
  return (ROLLEN as readonly string[]).includes(wert);
}
