import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  anmeldeFehler,
  erwarteAnmeldeseite,
  meldeAn,
  schnittstelleAls,
  testdaten,
} from "./testumgebung/hilfen";
import { dienstZugang, oeffentlicherZugang } from "./testumgebung/testdaten";

test("Ohne Anmeldung führt jede Seite zur Anmeldung", async ({ page }) => {
  for (const pfad of ["/", "/irgendeine-seite"]) {
    await page.goto(pfad);
    await erwarteAnmeldeseite(page);
  }
});

test("Es gibt keine Möglichkeit, sich selbst zu registrieren", async ({
  page,
}) => {
  await page.goto("/anmelden");
  await expect(page.getByText(/registrier/i)).toHaveCount(0);

  await page.goto("/registrieren");
  await erwarteAnmeldeseite(page);

  // Auch direkt über die öffentliche Schnittstelle ist keine
  // Registrierung möglich.
  const email = `e2e-registrierung-${Date.now()}@example.com`;
  const { data, error } = await oeffentlicherZugang().auth.signUp({
    email,
    password: randomUUID(),
  });
  if (data.user) {
    // Falls die Registrierung in Supabase versehentlich an ist: Spuren
    // beseitigen, der Test schlägt trotzdem fehl.
    await dienstZugang()?.auth.admin.deleteUser(data.user.id);
  }
  expect(error?.code).toBe("signup_disabled");
});

test("Büro-Nutzer meldet sich an, sieht Name und Rolle und meldet sich ab", async ({
  page,
}) => {
  const { firmaA } = testdaten();

  await meldeAn(page, firmaA.buero);

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(`Angemeldet als ${firmaA.buero.name}`)).toBeVisible();
  await expect(page.getByText("Rolle: Büro")).toBeVisible();

  // Die Anmeldung bleibt beim erneuten Aufruf erhalten.
  await page.reload();
  await expect(page.getByText(`Angemeldet als ${firmaA.buero.name}`)).toBeVisible();

  await page.getByRole("button", { name: "Abmelden" }).click();
  await erwarteAnmeldeseite(page);

  await page.goto("/");
  await erwarteAnmeldeseite(page);
});

test("Mit falschem Passwort ist keine Anmeldung möglich", async ({ page }) => {
  const { firmaA } = testdaten();

  await meldeAn(page, { ...firmaA.buero, passwort: "falsches-passwort" });

  await expect(anmeldeFehler(page)).toHaveText(
    "E-Mail oder Passwort ist falsch.",
  );
  await page.goto("/");
  await erwarteAnmeldeseite(page);
});

test("Ein deaktivierter Mitarbeiter kann sich nicht anmelden", async ({
  page,
}) => {
  const { firmaA } = testdaten();

  await meldeAn(page, firmaA.deaktiviert);

  await expect(anmeldeFehler(page)).toHaveText(
    "Dieser Zugang ist deaktiviert. Bitte wende dich an das Büro.",
  );
  await page.goto("/");
  await erwarteAnmeldeseite(page);

  // Auch an der App vorbei bekommt er keine Daten zu sehen.
  const supabase = await schnittstelleAls(firmaA.deaktiviert);
  const { data: mitarbeiter } = await supabase.from("mitarbeiter").select("id");
  const { data: firmen } = await supabase.from("firma").select("id");
  expect(mitarbeiter).toEqual([]);
  expect(firmen).toEqual([]);
});
