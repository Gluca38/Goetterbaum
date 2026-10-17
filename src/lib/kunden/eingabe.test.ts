import { expect, test } from "vitest";
import { pruefeKundenEingabe } from "./eingabe";

function formular(werte: Record<string, string>) {
  const formData = new FormData();
  for (const [name, wert] of Object.entries(werte)) formData.set(name, wert);
  return formData;
}

const GUELTIG = {
  name: " Hausverwaltung Sonnig GmbH ",
  strasse: "Ringstraße 1",
  adresszusatz: "",
  plz: "50667",
  ort: "Köln",
  abrechnungszeitraum: "quartalsweise",
};

test("Ein Kunde mit Name, Rechnungsadresse und Abrechnungszeitraum wird übernommen", () => {
  expect(pruefeKundenEingabe(formular(GUELTIG))).toEqual({
    ok: true,
    daten: {
      name: "Hausverwaltung Sonnig GmbH",
      strasse: "Ringstraße 1",
      adresszusatz: null,
      plz: "50667",
      ort: "Köln",
      abrechnungszeitraum: "quartalsweise",
      // Ohne Auswahl gilt der Standard der Firma.
      rundungsregel: null,
    },
  });
});

test("Ohne Namen kann kein Kunde angelegt werden", () => {
  expect(pruefeKundenEingabe(formular({ ...GUELTIG, name: "  " }))).toEqual({
    ok: false,
    fehler: "Bitte gib einen Namen ein.",
  });
});

test("Eine unvollständige Rechnungsadresse wird abgelehnt", () => {
  expect(pruefeKundenEingabe(formular({ ...GUELTIG, plz: "123" }))).toEqual({
    ok: false,
    fehler: "Die PLZ muss aus fünf Ziffern bestehen.",
  });
});

test("Nur monatlich oder quartalsweise ist als Abrechnungszeitraum erlaubt", () => {
  expect(pruefeKundenEingabe(formular({ ...GUELTIG, abrechnungszeitraum: "jährlich" }))).toEqual({
    ok: false,
    fehler: "Bitte wähle einen Abrechnungszeitraum.",
  });
});

test("Eine abweichende Rundungsregel wird übernommen, eine unbekannte abgelehnt", () => {
  expect(
    pruefeKundenEingabe(formular({ ...GUELTIG, rundungsregel: "minutengenau" })),
  ).toMatchObject({
    ok: true,
    daten: { rundungsregel: "minutengenau" },
  });
  expect(pruefeKundenEingabe(formular({ ...GUELTIG, rundungsregel: "" }))).toMatchObject({
    ok: true,
    daten: { rundungsregel: null },
  });
  expect(pruefeKundenEingabe(formular({ ...GUELTIG, rundungsregel: "30-minuten" }))).toEqual({
    ok: false,
    fehler: "Bitte wähle eine Rundungsregel.",
  });
});
