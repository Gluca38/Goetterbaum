import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  anmeldeFehler,
  erwarteAngemeldet,
  feld,
  legePasswortFest,
  linkAusMail,
  meldeAb,
  meldeAn,
  schnittstelleAls,
  testdaten,
} from "./testumgebung/hilfen";
import { dienstZugang, legeZugangAn, testEmail } from "./testumgebung/testdaten";

const EMAIL_FELD = "E-Mail (optional, nötig für einen Zugang)";

// Die Beschriftung eines Auswahlfelds enthält auch den gewählten Wert
// („Rolle Mitarbeiter“), deshalb nur der Anfang. getByRole übergeht die
// unsichtbar vorrätig gehaltenen Seiten von selbst.
function rollenAuswahl(page: Page) {
  return page.getByRole("combobox", { name: /^Rolle/ });
}

async function oeffneVerwaltung(page: Page) {
  await page.getByRole("link", { name: "Mitarbeiter verwalten" }).click();
  await expect(page.getByRole("heading", { name: "Mitarbeiter", exact: true })).toBeVisible();
}

async function legeMitarbeiterAn(
  page: Page,
  { name, email, rolle }: { name: string; email: string; rolle: string },
) {
  await page.getByRole("link", { name: "Neuer Mitarbeiter" }).click();
  await expect(page.getByRole("heading", { name: "Neuer Mitarbeiter" })).toBeVisible();
  await feld(page, "Name").fill(name);
  await feld(page, EMAIL_FELD).fill(email);
  await rollenAuswahl(page).selectOption({ label: rolle });
  await page.getByRole("button", { name: "Anlegen" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

test("Büro lädt einen neuen Mitarbeiter ein, der sein Passwort festlegt und sich anmeldet", async ({
  page,
}) => {
  const { firmaA } = testdaten();
  const name = "Nina Neu";
  const email = testEmail();
  const passwort = randomBytes(12).toString("base64url");

  await meldeAn(page, firmaA.buero);
  await erwarteAngemeldet(page, firmaA.buero.name);
  await oeffneVerwaltung(page);
  await legeMitarbeiterAn(page, { name, email, rolle: "Mitarbeiter" });
  await expect(page.getByText("Zugang: Noch nicht eingeladen")).toBeVisible();

  await page.getByRole("button", { name: "Einladung senden" }).click();
  await expect(page.getByRole("status")).toHaveText(
    `Einladung an ${email} verschickt.`,
  );
  await expect(page.getByText("Zugang: Eingeladen")).toBeVisible();

  // Die Einladung lässt sich erneut senden.
  await page.getByRole("button", { name: "Einladung erneut senden" }).click();
  await expect(page.getByRole("button", { name: "Einladung erneut senden" })).toBeEnabled();
  await expect(page.getByRole("status")).toHaveText(
    `Einladung an ${email} verschickt.`,
  );

  // Der neue Mitarbeiter öffnet den Link aus der Mail.
  await page.goto("/");
  await meldeAb(page);
  await page.goto(await linkAusMail(email, "invite"));
  await legePasswortFest(page, passwort);

  await erwarteAngemeldet(page, name);
  await expect(page.getByText("Rolle: Mitarbeiter")).toBeVisible();

  // Danach meldet er sich ganz normal mit seinem Passwort an.
  await meldeAb(page);
  await meldeAn(page, { id: "", name, email, passwort });
  await erwarteAngemeldet(page, name);
});

test("Ein Mitarbeiter ohne E-Mail wird ohne Zugang angelegt", async ({ page }) => {
  const { firmaA } = testdaten();

  await meldeAn(page, firmaA.buero);
  await erwarteAngemeldet(page, firmaA.buero.name);
  await oeffneVerwaltung(page);
  await legeMitarbeiterAn(page, { name: "Otto Ohnemail", email: "", rolle: "Mitarbeiter" });

  await expect(page.getByText("Zugang: Kein Zugang (keine E-Mail)")).toBeVisible();
  await expect(page.getByRole("button", { name: /Einladung/ })).toHaveCount(0);
});

test("Rollenänderung und Deaktivierung wirken sofort, die Daten bleiben erhalten", async ({
  page,
}) => {
  const { firmaA } = testdaten();
  const dienst = dienstZugang()!;
  const rolf = await legeZugangAn(dienst, firmaA.id, {
    name: "Rolf Rollenwechsel",
    rolle: "mitarbeiter",
  });

  // Rolf ist schon angemeldet und sieht als Mitarbeiter nur sich selbst.
  const rolfsSitzung = await schnittstelleAls(rolf);
  const sichtbar = async () =>
    (await rolfsSitzung.from("mitarbeiter").select("id")).data ?? [];
  expect(await sichtbar()).toHaveLength(1);

  await meldeAn(page, firmaA.buero);
  await erwarteAngemeldet(page, firmaA.buero.name);
  await page.goto(`/mitarbeiter/${rolf.id}`);
  await rollenAuswahl(page).selectOption({ label: "Vorarbeiter" });
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("status")).toHaveText("Gespeichert.");

  // Ohne neue Anmeldung sieht er jetzt als Vorarbeiter alle der Firma.
  expect((await sichtbar()).length).toBeGreaterThan(1);

  await page.getByRole("button", { name: "Deaktivieren" }).click();
  await expect(page.getByText("Zugang: Deaktiviert")).toBeVisible();

  // Die laufende Sitzung sieht sofort nichts mehr …
  expect(await sichtbar()).toEqual([]);

  // … eine neue Anmeldung scheitert …
  await page.goto("/");
  await meldeAb(page);
  await meldeAn(page, rolf);
  await expect(anmeldeFehler(page)).toHaveText(
    "Dieser Zugang ist deaktiviert. Bitte wende dich an das Büro.",
  );

  // … und seine Daten sind trotzdem noch da.
  const { data: gespeichert } = await dienst
    .from("mitarbeiter")
    .select("name, rolle, aktiv")
    .eq("id", rolf.id)
    .single();
  expect(gespeichert).toEqual({
    name: "Rolf Rollenwechsel",
    rolle: "vorarbeiter",
    aktiv: false,
  });

  // Wieder aktiviert, kann er sich anmelden.
  await meldeAn(page, firmaA.buero);
  await erwarteAngemeldet(page, firmaA.buero.name);
  await page.goto(`/mitarbeiter/${rolf.id}`);
  await page.getByRole("button", { name: "Aktivieren" }).click();
  await expect(page.getByText("Zugang: Eingeladen")).toBeVisible();
  await page.goto("/");
  await meldeAb(page);
  await meldeAn(page, rolf);
  await erwarteAngemeldet(page, rolf.name);
});

test("Das Büro kann sich nicht selbst deaktivieren", async ({ page }) => {
  const { firmaA } = testdaten();

  await meldeAn(page, firmaA.buero);
  await erwarteAngemeldet(page, firmaA.buero.name);
  await page.goto(`/mitarbeiter/${firmaA.buero.id}`);
  await page.getByRole("button", { name: "Deaktivieren" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "selbst" })).toHaveText(
    "Du kannst dich nicht selbst deaktivieren.",
  );
});

for (const rolle of ["mitarbeiter", "vorarbeiter"] as const) {
  test(`Ein ${rolle === "mitarbeiter" ? "Mitarbeiter" : "Vorarbeiter"} kann keine Mitarbeiter verwalten`, async ({
    page,
  }) => {
    const daten = testdaten();

    await meldeAn(page, daten.firmaA[rolle]);
    await erwarteAngemeldet(page, daten.firmaA[rolle].name);
    await expect(page.getByRole("link", { name: "Mitarbeiter verwalten" })).toHaveCount(0);

    for (const pfad of ["/mitarbeiter", "/mitarbeiter/neu", `/mitarbeiter/${daten.firmaA.buero.id}`]) {
      await page.goto(pfad);
      await expect(page.getByText("Mitarbeiter verwalten darf nur das Büro.")).toBeVisible();
    }
  });
}
