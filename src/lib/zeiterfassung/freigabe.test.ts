import { expect, test } from "vitest";
import { freigabeAuswahl, freigabeFilter } from "./freigabe";

test("Ohne Angaben gilt der Zeitraum vom Ersten des Vormonats bis heute, ganze Tage in Berlin", () => {
  // Kurz nach Mitternacht in Berlin ist schon der 17.10., in UTC noch der 16.
  const jetzt = Date.parse("2026-10-16T22:30:12Z");
  expect(freigabeFilter({}, jetzt)).toEqual({
    von: "2026-09-01",
    bis: "2026-10-17",
    mitarbeiter: null,
    kunde: null,
    objekt: null,
    // Mitternacht in Berlin (Sommerzeit, UTC + 2 Stunden) am ersten Tag
    // und am Tag nach dem letzten.
    ab: "2026-08-31T22:00:00.000Z",
    bisVor: "2026-10-17T22:00:00.000Z",
  });
});

test("Ein eingegebener Zeitraum endet um Mitternacht in Berlin, auch über die Zeitumstellung", () => {
  const jetzt = Date.parse("2026-11-03T09:14:27Z");
  // Am 25.10.2026 endet die Sommerzeit: Der Tag hat 25 Stunden.
  const filter = freigabeFilter({ von: "2026-10-25", bis: "2026-10-25" }, jetzt);
  expect(filter).toMatchObject({
    von: "2026-10-25",
    bis: "2026-10-25",
    ab: "2026-10-24T22:00:00.000Z",
    bisVor: "2026-10-25T23:00:00.000Z",
  });
});

test("Mitarbeiter, Kunde und Objekt filtern nur mit gültiger Kennung", () => {
  const jetzt = Date.parse("2026-10-17T10:00:00Z");
  const filter = freigabeFilter(
    {
      mitarbeiter: "0b7c3a52-9d1e-4f6a-8c2b-1e5d7f9a3c41",
      kunde: "",
      objekt: "kein-objekt'; drop table",
    },
    jetzt,
  );
  expect(filter).toMatchObject({
    mitarbeiter: "0b7c3a52-9d1e-4f6a-8c2b-1e5d7f9a3c41",
    kunde: null,
    objekt: null,
  });
});

test("Ungültige Tage ersetzt die Vorgabe, ein vertauschter Zeitraum wird umgedreht", () => {
  const jetzt = Date.parse("2027-01-05T10:00:00Z");
  // Über den Jahreswechsel ist der Vormonat der Dezember.
  expect(
    freigabeFilter({ von: "2026-02-30", bis: ["2027-01-02", "2027-01-03"] }, jetzt),
  ).toMatchObject({ von: "2026-12-01", bis: "2027-01-05" });
  expect(freigabeFilter({ von: "2026-10-20", bis: "2026-10-01" }, jetzt)).toMatchObject({
    von: "2026-10-01",
    bis: "2026-10-20",
    ab: "2026-09-30T22:00:00.000Z",
    bisVor: "2026-10-20T22:00:00.000Z",
  });
});

const EINTRAG_1 = "3c9e1f2a-7b4d-4e8f-a1c2-5d6e7f8a9b01";
const EINTRAG_2 = "3c9e1f2a-7b4d-4e8f-a1c2-5d6e7f8a9b02";

function formular(werte: [string, string][]): FormData {
  const formData = new FormData();
  for (const [name, wert] of werte) formData.append(name, wert);
  return formData;
}

test("Sammelfreigabe: alle angehakten Einträge, jeder einmal", () => {
  expect(
    freigabeAuswahl(
      formular([
        ["id", EINTRAG_1],
        ["id", EINTRAG_2],
        ["id", EINTRAG_1],
        ["id", "unsinn"],
      ]),
    ),
  ).toEqual({ ok: true, ids: [EINTRAG_1, EINTRAG_2] });
});

test("Einzelfreigabe per Knopf in der Zeile gilt nur für diesen Eintrag, auch wenn andere angehakt sind", () => {
  expect(
    freigabeAuswahl(
      formular([
        ["id", EINTRAG_1],
        ["einzeln", EINTRAG_2],
      ]),
    ),
  ).toEqual({ ok: true, ids: [EINTRAG_2] });
});

test("Ohne angehakten Eintrag gibt es einen Hinweis", () => {
  expect(freigabeAuswahl(formular([]))).toEqual({
    ok: false,
    fehler: "Bitte wähle mindestens einen Zeiteintrag aus.",
  });
});
