import { expect, test } from "vitest";
import { pruefeObjektAktiv } from "./regeln";

test("Ein Objekt eines archivierten Kunden kann nicht wieder aktiviert werden", () => {
  expect(pruefeObjektAktiv({ archiviert: false }, { archiviert: true })).toBe(
    "Der Kunde dieses Objekts ist archiviert. Aktiviere zuerst den Kunden.",
  );
});

test("Ein Objekt eines aktiven Kunden darf aktiv sein", () => {
  expect(pruefeObjektAktiv({ archiviert: false }, { archiviert: false })).toBeNull();
});

test("Archiviert bleiben darf ein Objekt immer", () => {
  expect(pruefeObjektAktiv({ archiviert: true }, { archiviert: true })).toBeNull();
});
