import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  erwarteAnmeldeseite,
  legePasswortFest,
  linkAusMail,
  meldeAn,
  testdaten,
} from "./testumgebung/hilfen";
import { dienstZugang, legeZugangAn } from "./testumgebung/testdaten";

test("Wer sein Passwort vergessen hat, legt über den Link aus der Mail ein neues fest", async ({
  page,
}) => {
  const { firmaA } = testdaten();
  const paula = await legeZugangAn(dienstZugang()!, firmaA.id, {
    name: "Paula Vergesslich",
    rolle: "mitarbeiter",
  });
  const neuesPasswort = randomBytes(12).toString("base64url");

  await page.goto("/anmelden");
  await page.getByRole("link", { name: "Passwort vergessen?" }).click();
  await page.getByLabel("E-Mail").fill(paula.email);
  await page.getByRole("button", { name: "Link anfordern" }).click();
  await expect(page.getByRole("status")).toContainText(
    "haben wir dir einen Link geschickt",
  );

  await page.goto(await linkAusMail(paula.email, "recovery"));
  await legePasswortFest(page, neuesPasswort);
  await expect(page.getByText(`Angemeldet als ${paula.name}`)).toBeVisible();

  // Das alte Passwort gilt nicht mehr, das neue schon.
  await page.getByRole("button", { name: "Abmelden" }).click();
  await meldeAn(page, paula);
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "E-Mail oder Passwort ist falsch.",
  );
  await meldeAn(page, { ...paula, passwort: neuesPasswort });
  await expect(page.getByText(`Angemeldet als ${paula.name}`)).toBeVisible();
});

test("Für unbekannte Adressen sieht die Antwort genauso aus", async ({ page }) => {
  await page.goto("/passwort-vergessen");
  // Diese Adresse hat keinen Zugang, Supabase verschickt also nichts.
  await page.getByLabel("E-Mail").fill("delivered+e2e-unbekannt@resend.dev");
  await page.getByRole("button", { name: "Link anfordern" }).click();
  await expect(page.getByRole("status")).toContainText(
    "haben wir dir einen Link geschickt",
  );
});

test("Ein ungültiger Link führt mit Hinweis zur Anmeldung", async ({ page }) => {
  await page.goto("/auth/bestaetigen?token_hash=ungueltig&type=recovery");
  await erwarteAnmeldeseite(page);
  await expect(page.getByText("Dieser Link ist ungültig oder abgelaufen.", { exact: false })).toBeVisible();
});

test("Ohne Anmeldung lässt sich kein Passwort festlegen", async ({ page }) => {
  await page.goto("/passwort-festlegen");
  await erwarteAnmeldeseite(page);
});
