import { expect, test } from "vitest";
import { pruefeAdresse } from "./adresse";

function formular(werte: Record<string, string>) {
  const formData = new FormData();
  for (const [name, wert] of Object.entries(werte)) formData.set(name, wert);
  return formData;
}

const GUELTIG = {
  strasse: " Hauptstraße 5 ",
  adresszusatz: " Hinterhaus ",
  plz: " 50667 ",
  ort: " Köln ",
};

test("Eine vollständige Adresse wird bereinigt übernommen", () => {
  expect(pruefeAdresse(formular(GUELTIG))).toEqual({
    ok: true,
    adresse: {
      strasse: "Hauptstraße 5",
      adresszusatz: "Hinterhaus",
      plz: "50667",
      ort: "Köln",
    },
  });
});

test("Der Adresszusatz ist freiwillig", () => {
  const ergebnis = pruefeAdresse(formular({ ...GUELTIG, adresszusatz: " " }));
  expect(ergebnis.ok && ergebnis.adresse.adresszusatz).toBeNull();
});

test("Straße, PLZ und Ort sind Pflicht", () => {
  expect(pruefeAdresse(formular({ ...GUELTIG, strasse: "" }))).toEqual({
    ok: false,
    fehler: "Bitte gib Straße und Hausnummer ein.",
  });
  expect(pruefeAdresse(formular({ ...GUELTIG, ort: "" }))).toEqual({
    ok: false,
    fehler: "Bitte gib den Ort ein.",
  });
});

test("Die PLZ muss aus fünf Ziffern bestehen", () => {
  for (const plz of ["", "5066", "506677", "5066A"]) {
    expect(pruefeAdresse(formular({ ...GUELTIG, plz })), plz).toEqual({
      ok: false,
      fehler: "Die PLZ muss aus fünf Ziffern bestehen.",
    });
  }
});
