import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { erwarteAngemeldet, feld, meldeAn, testdaten } from "./testumgebung/hilfen";
import { dienstZugang, legeKundeMitObjektAn, legeTaetigkeitAn } from "./testumgebung/testdaten";

// Die Beschriftung eines Auswahlfelds enthält auch den gewählten Wert,
// deshalb nur der Anfang.
function auswahl(page: Page, beschriftung: string) {
  return page.getByRole("combobox", { name: new RegExp(`^${beschriftung}`) });
}

async function taetigkeitAusDatenbank(name: string) {
  const { data } = await dienstZugang()!
    .from("taetigkeit")
    .select("sparte, standard_stundensatz_cent, archiviert")
    .eq("name", name)
    .single();
  return data;
}

test("Büro legt Tätigkeiten an, bearbeitet, archiviert und aktiviert sie wieder", async ({
  page,
}) => {
  const { firmaA } = testdaten();
  const name = `Glasreinigung ${randomUUID().slice(0, 8)}`;

  await meldeAn(page, firmaA.buero);
  await erwarteAngemeldet(page, firmaA.buero.name);
  await page.getByRole("link", { name: "Tätigkeiten verwalten" }).click();
  await page.getByRole("link", { name: "Neue Tätigkeit" }).click();
  await expect(page.getByRole("heading", { name: "Neue Tätigkeit" })).toBeVisible();
  await feld(page, "Name").fill(name);
  await auswahl(page, "Sparte").selectOption({ label: "Reinigung" });
  await feld(page, "Standard-Stundensatz pro Stunde in Euro").fill("38,5");
  await page.getByRole("button", { name: "Anlegen" }).click();

  await expect(page.getByRole("heading", { name })).toBeVisible();
  expect(await taetigkeitAusDatenbank(name)).toEqual({
    sparte: "reinigung",
    standard_stundensatz_cent: 3850,
    archiviert: false,
  });

  // Bearbeiten
  await auswahl(page, "Sparte").selectOption({ label: "Garten" });
  await feld(page, "Standard-Stundensatz pro Stunde in Euro").fill("40");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("status")).toHaveText("Gespeichert.");
  expect(await taetigkeitAusDatenbank(name)).toEqual({
    sparte: "garten",
    standard_stundensatz_cent: 4000,
    archiviert: false,
  });
  const taetigkeitSeite = page.url();

  // In der Übersicht mit Sparte und Satz.
  await page.goto("/taetigkeiten");
  const zeile = page.getByRole("row").filter({ hasText: name });
  await expect(zeile).toContainText("Garten");
  await expect(zeile).toContainText("40,00 €");

  // Den Namen gibt es kein zweites Mal, auch nicht anders geschrieben.
  await page.getByRole("link", { name: "Neue Tätigkeit" }).click();
  await feld(page, "Name").fill(name.toUpperCase());
  await feld(page, "Standard-Stundensatz pro Stunde in Euro").fill("10");
  await page.getByRole("button", { name: "Anlegen" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Namen" })).toHaveText(
    "Eine Tätigkeit mit diesem Namen gibt es schon.",
  );

  // Archivieren und wieder aktivieren
  await page.goto(taetigkeitSeite);
  await page.getByRole("button", { name: "Archivieren" }).click();
  await expect(page.getByText("Diese Tätigkeit ist archiviert.", { exact: false })).toBeVisible();
  expect((await taetigkeitAusDatenbank(name))?.archiviert).toBe(true);

  await page.getByRole("button", { name: "Wieder aktivieren" }).click();
  await expect(page.getByRole("button", { name: "Archivieren" })).toBeVisible();
  expect((await taetigkeitAusDatenbank(name))?.archiviert).toBe(false);

  // Nirgends gibt es einen Knopf zum Löschen.
  await expect(page.getByRole("button", { name: /Löschen/i })).toHaveCount(0);
});

test("Büro legt beim Kunden einen abweichenden Stundensatz fest, sieht, welcher gilt, und entfernt ihn wieder", async ({
  page,
}) => {
  const { firmaA } = testdaten();
  const dienst = dienstZugang()!;
  const { kundeId } = await legeKundeMitObjektAn(dienst, firmaA.id);
  const { name } = await legeTaetigkeitAn(dienst, firmaA.id, {
    standardStundensatzCent: 3200,
  });

  await meldeAn(page, firmaA.buero);
  await erwarteAngemeldet(page, firmaA.buero.name);
  await page.goto(`/kunden/${kundeId}`);

  const zeile = page.getByRole("row").filter({ hasText: name });
  await expect(zeile).toContainText("32,00 € (Standard)");

  await auswahl(page, "Tätigkeit").selectOption({ label: name });
  await feld(page, "Abweichender Stundensatz pro Stunde in Euro").fill("28,5");
  await page.getByRole("button", { name: "Festlegen" }).click();
  await expect(page.getByRole("status")).toHaveText("Stundensatz festgelegt.");
  await expect(zeile).toContainText("28,50 € (abweichend)");

  // Erneut festlegen ersetzt den bisherigen Satz. Nach dem Festlegen ist
  // das Formular wieder leer.
  await auswahl(page, "Tätigkeit").selectOption({ label: name });
  await feld(page, "Abweichender Stundensatz pro Stunde in Euro").fill("27");
  await page.getByRole("button", { name: "Festlegen" }).click();
  await expect(zeile).toContainText("27,00 € (abweichend)");
  const { data } = await dienst
    .from("kunden_stundensatz")
    .select("stundensatz_cent")
    .eq("kunde_id", kundeId);
  expect(data).toEqual([{ stundensatz_cent: 2700 }]);

  await zeile.getByRole("button", { name: "Entfernen" }).click();
  await expect(zeile).toContainText("32,00 € (Standard)");
  await expect(zeile.getByRole("button", { name: "Entfernen" })).toHaveCount(0);
});

for (const rolle of ["mitarbeiter", "vorarbeiter"] as const) {
  test(`Ein ${rolle === "mitarbeiter" ? "Mitarbeiter" : "Vorarbeiter"} kann Tätigkeiten nicht verwalten`, async ({
    page,
  }) => {
    const daten = testdaten();
    const { taetigkeitId } = await legeTaetigkeitAn(dienstZugang()!, daten.firmaA.id);

    await meldeAn(page, daten.firmaA[rolle]);
    await erwarteAngemeldet(page, daten.firmaA[rolle].name);
    await expect(page.getByRole("link", { name: "Tätigkeiten verwalten" })).toHaveCount(0);

    for (const pfad of ["/taetigkeiten", "/taetigkeiten/neu", `/taetigkeiten/${taetigkeitId}`]) {
      await page.goto(pfad);
      await expect(
        page.getByText("Tätigkeiten und Stundensätze verwalten darf nur das Büro."),
      ).toBeVisible();
    }
  });
}
