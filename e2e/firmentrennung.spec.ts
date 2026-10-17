import { expect, test } from "@playwright/test";
import { meldeAn, schnittstelleAls, testdaten } from "./testumgebung/hilfen";

test("Ein Nutzer einer zweiten Firma sieht keine Daten der ersten Firma", async ({ page }) => {
  const { firmaA, firmaB } = testdaten();

  // In der App sieht er nur sich selbst.
  await meldeAn(page, firmaB.buero);
  await expect(page.getByText(`Angemeldet als ${firmaB.buero.name}`)).toBeVisible();
  await expect(page.getByText(firmaA.buero.name)).toHaveCount(0);

  // Auch direkt über die Schnittstelle liefert die Datenbank nur Daten
  // der eigenen Firma, obwohl er als Büro alle Mitarbeiter sehen darf.
  const supabase = await schnittstelleAls(firmaB.buero);

  const { data: firmen, error: firmenFehler } = await supabase.from("firma").select("id");
  expect(firmenFehler).toBeNull();
  expect(firmen).toEqual([{ id: firmaB.id }]);

  const { data: mitarbeiter, error: mitarbeiterFehler } = await supabase
    .from("mitarbeiter")
    .select("firma_id, name");
  expect(mitarbeiterFehler).toBeNull();
  expect(mitarbeiter).toEqual([{ firma_id: firmaB.id, name: firmaB.buero.name }]);

  // Gezielte Abfrage nach der ersten Firma bleibt leer.
  const { data: fremde } = await supabase
    .from("mitarbeiter")
    .select("id")
    .eq("firma_id", firmaA.id);
  expect(fremde).toEqual([]);
});
