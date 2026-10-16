import { expect, test } from "vitest";
import { pruefeNeuesPasswort } from "./passwort";

function formular(passwort: string, wiederholung: string) {
  const formData = new FormData();
  formData.set("passwort", passwort);
  formData.set("wiederholung", wiederholung);
  return formData;
}

test("Ein ausreichend langes, gleich wiederholtes Passwort wird angenommen", () => {
  expect(pruefeNeuesPasswort(formular("gartenzaun", "gartenzaun"))).toEqual({
    ok: true,
    passwort: "gartenzaun",
  });
});

test("Ein Passwort unter 8 Zeichen ist zu kurz", () => {
  expect(pruefeNeuesPasswort(formular("garten", "garten"))).toEqual({
    ok: false,
    fehler: "Das Passwort muss mindestens 8 Zeichen lang sein.",
  });
});

test("Unterschiedliche Eingaben werden abgelehnt", () => {
  expect(pruefeNeuesPasswort(formular("gartenzaun", "gartenzau"))).toEqual({
    ok: false,
    fehler: "Die beiden Passwörter stimmen nicht überein.",
  });
});
