import { expect, test } from "vitest";
import { geltenderStundensatz } from "./regeln";

const GLASREINIGUNG = { standard_stundensatz_cent: 3800 };

test("Ohne Absprache gilt für den Kunden der Standard-Stundensatz der Tätigkeit", () => {
  expect(geltenderStundensatz(GLASREINIGUNG, null)).toEqual({
    stundensatzCent: 3800,
    abweichend: false,
  });
});

test("Ein abweichender Stundensatz des Kunden hat Vorrang vor dem Standard", () => {
  expect(geltenderStundensatz(GLASREINIGUNG, { stundensatz_cent: 3400 })).toEqual({
    stundensatzCent: 3400,
    abweichend: true,
  });
});
