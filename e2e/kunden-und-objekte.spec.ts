import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { erwarteAngemeldet, feld, meldeAn, testdaten } from "./testumgebung/hilfen";
import { dienstZugang } from "./testumgebung/testdaten";

// Die Beschriftung eines Auswahlfelds enthält auch den gewählten Wert,
// deshalb nur der Anfang.
function auswahl(page: Page, beschriftung: string) {
  return page.getByRole("combobox", { name: new RegExp(`^${beschriftung}`) });
}

async function fuelleAdresse(page: Page, strasse: string, plz: string, ort: string) {
  await feld(page, "Straße und Hausnummer").fill(strasse);
  await feld(page, "PLZ").fill(plz);
  await feld(page, "Ort").fill(ort);
}

async function legeKundenAn(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("link", { name: "Kunden verwalten" }).click();
  await page.getByRole("link", { name: "Neuer Kunde" }).click();
  await expect(page.getByRole("heading", { name: "Neuer Kunde" })).toBeVisible();
  await feld(page, "Name").fill(name);
  await fuelleAdresse(page, "Ringstraße 1", "50667", "Köln");
  await auswahl(page, "Abrechnungszeitraum").selectOption({ label: "Quartalsweise" });
  await page.getByRole("button", { name: "Anlegen" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function objektAusDatenbank(bezeichnung: string) {
  const { data } = await dienstZugang()!
    .from("objekt")
    .select("abrechnungsart, pauschale_cent, archiviert")
    .eq("bezeichnung", bezeichnung)
    .single();
  return data;
}

test("Büro legt Kunden und Objekte an und bearbeitet sie, die Pauschale wird centgenau gespeichert", async ({
  page,
}) => {
  const { firmaA } = testdaten();
  const kunde = `Hausverwaltung ${randomUUID().slice(0, 8)}`;
  const objekt = `Wohnanlage ${randomUUID().slice(0, 8)}`;

  await meldeAn(page, firmaA.buero);
  await erwarteAngemeldet(page, firmaA.buero.name);
  await legeKundenAn(page, kunde);

  // Kunde bearbeiten
  await feld(page, "Ort").fill("Bonn");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("status")).toHaveText("Gespeichert.");

  // Objekt direkt beim Kunden anlegen: Der Kunde ist vorausgewählt.
  await page.getByRole("link", { name: "Neues Objekt" }).click();
  await expect(page.getByRole("heading", { name: "Neues Objekt" })).toBeVisible();
  await expect(auswahl(page, "Kunde")).toHaveValue(/.+/);
  await feld(page, "Bezeichnung").fill(objekt);
  await fuelleAdresse(page, "Gartenweg 3", "53111", "Bonn");
  await auswahl(page, "Abrechnungsart").selectOption({ label: "Pauschale" });
  await feld(page, "Pauschale pro Monat in Euro").fill("1.250,5");
  await page.getByRole("button", { name: "Anlegen" }).click();

  await expect(page.getByRole("heading", { name: objekt })).toBeVisible();
  await expect(page.getByText("Pauschale 1.250,50 € pro Monat")).toBeVisible();
  expect(await objektAusDatenbank(objekt)).toEqual({
    abrechnungsart: "pauschale",
    pauschale_cent: 125050,
    archiviert: false,
  });

  // Bei Stundenabrechnung gibt es kein Pauschale-Feld mehr.
  await auswahl(page, "Abrechnungsart").selectOption({ label: "Stundenabrechnung" });
  await expect(feld(page, "Pauschale pro Monat in Euro")).toHaveCount(0);
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("status")).toHaveText("Gespeichert.");
  expect(await objektAusDatenbank(objekt)).toEqual({
    abrechnungsart: "stunden",
    pauschale_cent: null,
    archiviert: false,
  });

  // Das Objekt steht mit seinem Kunden in der Übersicht.
  await page.goto("/objekte");
  const zeile = page.getByRole("row").filter({ hasText: objekt });
  await expect(zeile).toContainText(kunde);
  await expect(zeile).toContainText("Stundenabrechnung");
});

test("Archivierte Kunden und Objekte verschwinden aus der Auswahl und lassen sich wieder aktivieren", async ({
  page,
}) => {
  const { firmaA } = testdaten();
  const kunde = `Eigentümer ${randomUUID().slice(0, 8)}`;
  const objekt = `Garten ${randomUUID().slice(0, 8)}`;

  await meldeAn(page, firmaA.buero);
  await erwarteAngemeldet(page, firmaA.buero.name);
  await legeKundenAn(page, kunde);
  const kundenSeite = page.url();

  await page.getByRole("link", { name: "Neues Objekt" }).click();
  await feld(page, "Bezeichnung").fill(objekt);
  await fuelleAdresse(page, "Am Park 9", "50667", "Köln");
  await auswahl(page, "Abrechnungsart").selectOption({ label: "Stundenabrechnung" });
  await page.getByRole("button", { name: "Anlegen" }).click();
  await expect(page.getByRole("heading", { name: objekt })).toBeVisible();
  const objektSeite = page.url();

  // Kunde archivieren: Seine Objekte werden mit archiviert.
  await page.goto(kundenSeite);
  await page.getByRole("button", { name: "Archivieren" }).click();
  await expect(page.getByText("Dieser Kunde ist archiviert.", { exact: false })).toBeVisible();
  expect((await objektAusDatenbank(objekt))?.archiviert).toBe(true);

  // Er steht nicht mehr zur Auswahl für neue Objekte.
  await page.goto("/objekte/neu");
  await expect(auswahl(page, "Kunde").getByRole("option", { name: kunde })).toHaveCount(0);

  // Das Objekt lässt sich erst wieder aktivieren, wenn der Kunde aktiv ist.
  await page.goto(objektSeite);
  await expect(page.getByText("Dieses Objekt ist archiviert.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Wieder aktivieren" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Kunde" })).toHaveText(
    "Der Kunde dieses Objekts ist archiviert. Aktiviere zuerst den Kunden.",
  );

  await page.goto(kundenSeite);
  await page.getByRole("button", { name: "Wieder aktivieren" }).click();
  await expect(page.getByRole("button", { name: "Archivieren" })).toBeVisible();
  // Die Objekte kommen nicht automatisch zurück.
  expect((await objektAusDatenbank(objekt))?.archiviert).toBe(true);

  await page.goto(objektSeite);
  await page.getByRole("button", { name: "Wieder aktivieren" }).click();
  await expect(page.getByRole("button", { name: "Archivieren" })).toBeVisible();
  expect((await objektAusDatenbank(objekt))?.archiviert).toBe(false);

  // Nirgends gibt es einen Knopf zum Löschen.
  await expect(page.getByRole("button", { name: /Löschen/i })).toHaveCount(0);
});

for (const rolle of ["mitarbeiter", "vorarbeiter"] as const) {
  test(`Ein ${rolle === "mitarbeiter" ? "Mitarbeiter" : "Vorarbeiter"} kann Kunden und Objekte nicht verwalten`, async ({
    page,
  }) => {
    const daten = testdaten();

    await meldeAn(page, daten.firmaA[rolle]);
    await erwarteAngemeldet(page, daten.firmaA[rolle].name);
    await expect(page.getByRole("link", { name: "Kunden verwalten" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Objekte verwalten" })).toHaveCount(0);

    for (const pfad of ["/kunden", "/kunden/neu", "/objekte", "/objekte/neu"]) {
      await page.goto(pfad);
      await expect(
        page.getByText("Kunden und Objekte verwalten darf nur das Büro."),
      ).toBeVisible();
    }
  });
}
