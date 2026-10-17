import { expect, test } from "vitest";
import { pruefeTaetigkeitsEingabe } from "./eingabe";

function formular(werte: Record<string, string>) {
  const formData = new FormData();
  for (const [name, wert] of Object.entries(werte)) formData.set(name, wert);
  return formData;
}

const GUELTIG = {
  name: " Unterhaltsreinigung ",
  sparte: "reinigung",
  standard_stundensatz: "32,50",
};

test("Eine Tätigkeit mit Name, Sparte und centgenauem Standard-Stundensatz wird übernommen", () => {
  expect(pruefeTaetigkeitsEingabe(formular(GUELTIG))).toEqual({
    ok: true,
    daten: {
      name: "Unterhaltsreinigung",
      sparte: "reinigung",
      standard_stundensatz_cent: 3250,
    },
  });
});

test("Ohne Namen oder mit unbekannter Sparte gibt es keine Tätigkeit", () => {
  expect(pruefeTaetigkeitsEingabe(formular({ ...GUELTIG, name: "  " }))).toEqual({
    ok: false,
    fehler: "Bitte gib einen Namen ein.",
  });
  expect(pruefeTaetigkeitsEingabe(formular({ ...GUELTIG, sparte: "winterdienst" }))).toEqual({
    ok: false,
    fehler: "Bitte wähle eine Sparte.",
  });
});

test("Ein fehlender, leerer oder zu großer Standard-Stundensatz wird abgelehnt", () => {
  for (const standard_stundensatz of ["", "0", "0,00", "zwölf", "12.50", "21.474.837,00"]) {
    expect(
      pruefeTaetigkeitsEingabe(formular({ ...GUELTIG, standard_stundensatz })),
      standard_stundensatz,
    ).toEqual({
      ok: false,
      fehler: "Der Stundensatz ist kein gültiger Betrag. Beispiel: 32,50",
    });
  }
});
