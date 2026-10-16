import { expect, test, type Page } from "@playwright/test";
import {
  dienstZugang,
  ladeTestdaten,
  oeffentlicherZugang,
  type TestZugang,
} from "./testdaten";

// Die Testdaten aus dem Setup. Fehlen sie (nur lokal ohne geheimen
// Schlüssel möglich), wird der Test übersprungen.
export function testdaten() {
  const daten = ladeTestdaten();
  test.skip(!daten, "Keine Testdaten: SUPABASE_SECRET_KEY ist nicht gesetzt.");
  return daten!;
}

export async function meldeAn(page: Page, zugang: TestZugang) {
  await page.goto("/anmelden");
  await page.getByLabel("E-Mail").fill(zugang.email);
  await page.getByLabel("Passwort").fill(zugang.passwort);
  await page.getByRole("button", { name: "Anmelden" }).click();
}

export async function erwarteAnmeldeseite(page: Page) {
  await expect(page).toHaveURL(/\/anmelden$/);
  await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();
}

// Meldet sich direkt über die öffentliche Supabase-Schnittstelle an, also
// genau so, wie es jeder mit dem öffentlichen Schlüssel aus dem Browser
// könnte. So lässt sich prüfen, dass die Datenbank selbst schützt.
export async function schnittstelleAls(zugang: TestZugang) {
  const supabase = oeffentlicherZugang();
  const { error } = await supabase.auth.signInWithPassword({
    email: zugang.email,
    password: zugang.passwort,
  });
  if (error) throw error;
  return supabase;
}

// Die Fehlermeldung im Anmeldeformular. Next.js hat außerhalb davon ein
// eigenes, leeres Hinweis-Element für Screenreader.
export function anmeldeFehler(page: Page) {
  return page.locator("form").getByRole("alert");
}

// Der Link, den Supabase in die Einladungs- bzw. "Passwort vergessen"-Mail
// schreiben würde. Die Tests lesen keine Postfächer, sondern lassen sich
// über den Dienstschlüssel einen gleichwertigen, frischen Link erzeugen.
export async function linkAusMail(email: string, typ: "invite" | "recovery") {
  const { data, error } = await dienstZugang()!.auth.admin.generateLink({
    type: typ,
    email,
  });
  if (error) throw error;
  return `/auth/bestaetigen?token_hash=${data.properties.hashed_token}&type=${typ}`;
}

export async function legePasswortFest(page: Page, passwort: string) {
  await expect(
    page.getByRole("heading", { name: "Passwort festlegen" }),
  ).toBeVisible();
  await page.getByLabel("Neues Passwort").fill(passwort);
  await page.getByLabel("Passwort wiederholen").fill(passwort);
  await page.getByRole("button", { name: "Passwort speichern" }).click();
}
