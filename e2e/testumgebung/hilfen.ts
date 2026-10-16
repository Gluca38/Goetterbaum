import { expect, test, type Page } from "@playwright/test";
import { ladeTestdaten, oeffentlicherZugang, type TestZugang } from "./testdaten";

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
