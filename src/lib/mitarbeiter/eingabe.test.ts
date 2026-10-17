import { expect, test } from "vitest";
import { pruefeMitarbeiterEingabe } from "./eingabe";

function formular(werte: Record<string, string>) {
  const formData = new FormData();
  for (const [name, wert] of Object.entries(werte)) formData.set(name, wert);
  return formData;
}

test("Gültige Angaben werden bereinigt übernommen", () => {
  expect(
    pruefeMitarbeiterEingabe(
      formular({
        name: "  Maria Muster ",
        email: " Maria.Muster@Example.com ",
        rolle: "vorarbeiter",
      }),
    ),
  ).toEqual({
    ok: true,
    daten: {
      name: "Maria Muster",
      email: "maria.muster@example.com",
      rolle: "vorarbeiter",
    },
  });
});

test("Ohne Namen kann kein Mitarbeiter angelegt werden", () => {
  expect(
    pruefeMitarbeiterEingabe(formular({ name: "   ", email: "", rolle: "mitarbeiter" })),
  ).toEqual({ ok: false, fehler: "Bitte gib einen Namen ein." });
});

test("Eine E-Mail ohne @ wird abgelehnt", () => {
  expect(
    pruefeMitarbeiterEingabe(
      formular({ name: "Maria", email: "maria.example.com", rolle: "mitarbeiter" }),
    ),
  ).toEqual({ ok: false, fehler: "Diese E-Mail-Adresse ist ungültig." });
});

test("Ohne E-Mail wird der Mitarbeiter ohne Zugang angelegt", () => {
  expect(
    pruefeMitarbeiterEingabe(formular({ name: "Maria", email: " ", rolle: "mitarbeiter" })),
  ).toEqual({
    ok: true,
    daten: { name: "Maria", email: null, rolle: "mitarbeiter" },
  });
});

test("Eine unbekannte Rolle wird abgelehnt", () => {
  expect(pruefeMitarbeiterEingabe(formular({ name: "Maria", email: "", rolle: "chef" }))).toEqual({
    ok: false,
    fehler: "Bitte wähle eine Rolle.",
  });
});
