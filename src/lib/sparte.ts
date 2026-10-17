// Die Sparten, wie sie auch in der Datenbank stehen (Typ public.sparte).
// Die Sparte ergibt sich immer aus der Tätigkeit, nicht aus dem Objekt.
export const SPARTEN = ["reinigung", "garten"] as const;

export type Sparte = (typeof SPARTEN)[number];

export function istSparte(wert: string): wert is Sparte {
  return (SPARTEN as readonly string[]).includes(wert);
}
