import { expect, test } from "vitest";
import { euroAlsEingabe, euroAlsText, euroInCent } from "./geld";

test("Ein Betrag mit Komma wird centgenau übernommen", () => {
  expect(euroInCent("1234,56")).toBe(123456);
});

test("Tausenderpunkte, ganze Euro und Leerzeichen sind erlaubt", () => {
  expect(euroInCent(" 1.234,5 ")).toBe(123450);
  expect(euroInCent("80")).toBe(8000);
  expect(euroInCent("12.000")).toBe(1200000);
  expect(euroInCent("80 €")).toBe(8000);
});

test("Unklare oder ungültige Beträge werden abgelehnt", () => {
  // „12.50“ könnte 12,50 € oder 1.250 € gemeint sein.
  for (const eingabe of ["", "abc", "12.50", "12,345", "-5", "1,2,3", "1.23,00"]) {
    expect(euroInCent(eingabe), eingabe).toBeNull();
  }
});

test("Cent werden in Euro angezeigt", () => {
  expect(euroAlsText(123456)).toBe("1.234,56 €");
  expect(euroAlsText(8000)).toBe("80,00 €");
  expect(euroAlsText(5)).toBe("0,05 €");
});

test("Ein gespeicherter Betrag erscheint im Formular so, wie man ihn eintippt", () => {
  expect(euroAlsEingabe(123456)).toBe("1234,56");
  expect(euroAlsEingabe(8000)).toBe("80,00");
  expect(euroInCent(euroAlsEingabe(1999))).toBe(1999);
});
