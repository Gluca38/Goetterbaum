// Geldbeträge werden immer als ganze Cent gespeichert und gerechnet, nie
// als Kommazahl. So entstehen keine Rundungsfehler.

// Liest einen Euro-Betrag, wie ihn das Büro eintippt, z. B. „1.234,56“,
// „1234,5“ oder „80“. Liefert den Betrag in Cent oder null, wenn die
// Eingabe kein gültiger Betrag ist.
export function euroInCent(eingabe: string): number | null {
  const text = eingabe.replace(/€/g, "").trim();
  // Euro ohne oder mit Tausenderpunkten, danach optional Komma und Cent.
  const treffer = /^(\d+|\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/.exec(text);
  if (!treffer) return null;
  const euro = Number(treffer[1].replace(/\./g, ""));
  const cent = Number((treffer[2] ?? "").padEnd(2, "0"));
  return euro * 100 + cent;
}

const EURO = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

// Zeigt einen Betrag in Cent als Euro an, z. B. „1.234,56 €“.
export function euroAlsText(cent: number): string {
  return EURO.format(cent / 100);
}

// Ein Betrag in Cent so, wie ihn das Büro wieder ins Formular eintippen
// würde, z. B. „1234,56“.
export function euroAlsEingabe(cent: number): string {
  return (cent / 100).toFixed(2).replace(".", ",");
}
