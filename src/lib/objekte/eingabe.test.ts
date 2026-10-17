import { expect, test } from "vitest";
import { pruefeObjektEingabe } from "./eingabe";

function formular(werte: Record<string, string>) {
  const formData = new FormData();
  for (const [name, wert] of Object.entries(werte)) formData.set(name, wert);
  return formData;
}

const KUNDE_ID = "3f2b8c1e-0000-4000-8000-000000000001";

const PAUSCHAL_OBJEKT = {
  kunde_id: KUNDE_ID,
  bezeichnung: " Wohnanlage Ringstraße ",
  strasse: "Ringstraße 1–7",
  adresszusatz: "",
  plz: "50667",
  ort: "Köln",
  abrechnungsart: "pauschale",
  pauschale: "1.250,50",
};

test("Ein Pauschal-Objekt wird mit centgenauer Pauschale übernommen", () => {
  expect(pruefeObjektEingabe(formular(PAUSCHAL_OBJEKT))).toEqual({
    ok: true,
    daten: {
      kunde_id: KUNDE_ID,
      bezeichnung: "Wohnanlage Ringstraße",
      strasse: "Ringstraße 1–7",
      adresszusatz: null,
      plz: "50667",
      ort: "Köln",
      abrechnungsart: "pauschale",
      pauschale_cent: 125050,
    },
  });
});

test("Bei Abrechnungsart Pauschale ist die Pauschale Pflicht", () => {
  expect(pruefeObjektEingabe(formular({ ...PAUSCHAL_OBJEKT, pauschale: " " }))).toEqual({
    ok: false,
    fehler: "Bitte gib die Pauschale pro Monat ein.",
  });
});

test("Eine Pauschale von 0 € oder ein ungültiger Betrag wird abgelehnt", () => {
  for (const pauschale of ["0", "0,00", "zwölf", "12.50"]) {
    expect(pruefeObjektEingabe(formular({ ...PAUSCHAL_OBJEKT, pauschale })), pauschale).toEqual({
      ok: false,
      fehler: "Die Pauschale ist kein gültiger Betrag. Beispiel: 1.250,00",
    });
  }
});

test("Ein Stunden-Objekt hat keine Pauschale", () => {
  const ergebnis = pruefeObjektEingabe(
    formular({ ...PAUSCHAL_OBJEKT, abrechnungsart: "stunden", pauschale: "" }),
  );
  expect(ergebnis.ok && ergebnis.daten).toMatchObject({
    abrechnungsart: "stunden",
    pauschale_cent: null,
  });
});

test("Eine Pauschale bei Stundenabrechnung wird abgelehnt statt still verworfen", () => {
  expect(pruefeObjektEingabe(formular({ ...PAUSCHAL_OBJEKT, abrechnungsart: "stunden" }))).toEqual({
    ok: false,
    fehler: "Bei Stundenabrechnung gibt es keine Pauschale. Bitte lass das Feld leer.",
  });
});

test("Ohne Bezeichnung, Kunde oder Abrechnungsart kein Objekt", () => {
  expect(pruefeObjektEingabe(formular({ ...PAUSCHAL_OBJEKT, bezeichnung: "" }))).toEqual({
    ok: false,
    fehler: "Bitte gib eine Bezeichnung ein.",
  });
  expect(pruefeObjektEingabe(formular({ ...PAUSCHAL_OBJEKT, kunde_id: "" }))).toEqual({
    ok: false,
    fehler: "Bitte wähle einen Kunden.",
  });
  expect(
    pruefeObjektEingabe(formular({ ...PAUSCHAL_OBJEKT, abrechnungsart: "festpreis" })),
  ).toEqual({ ok: false, fehler: "Bitte wähle eine Abrechnungsart." });
});

test("Eine Pauschale über der Höchstgrenze wird verständlich abgelehnt", () => {
  expect(pruefeObjektEingabe(formular({ ...PAUSCHAL_OBJEKT, pauschale: "21.474.837,00" }))).toEqual(
    {
      ok: false,
      fehler: "Die Pauschale ist kein gültiger Betrag. Beispiel: 1.250,00",
    },
  );
  const hoechstbetrag = pruefeObjektEingabe(
    formular({ ...PAUSCHAL_OBJEKT, pauschale: "21.474.836,47" }),
  );
  expect(hoechstbetrag.ok && hoechstbetrag.daten.pauschale_cent).toBe(2147483647);
});
