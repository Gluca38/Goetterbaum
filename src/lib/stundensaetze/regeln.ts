// Welcher Stundensatz einer Tätigkeit für einen Kunden gilt: ein
// abweichender Satz des Kunden hat Vorrang vor dem Standard-Stundensatz.
// Zum Anzeigen fürs Büro; abgerechnet wird im Rechenbaustein nach
// derselben Regel.
export function geltenderStundensatz(
  taetigkeit: { standard_stundensatz_cent: number },
  abweichend: { stundensatz_cent: number } | null,
): { stundensatzCent: number; abweichend: boolean } {
  if (abweichend) {
    return { stundensatzCent: abweichend.stundensatz_cent, abweichend: true };
  }
  return { stundensatzCent: taetigkeit.standard_stundensatz_cent, abweichend: false };
}
