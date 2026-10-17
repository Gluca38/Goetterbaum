import { expect, test } from "@playwright/test";
import { erwarteAngemeldet, meldeAb, meldeAn, testdaten } from "./testumgebung/hilfen";
import {
  dienstZugang,
  legeEigenenZugangAn,
  legeKundeMitObjektAn,
  legeTaetigkeitAn,
  legeZeiteintragAn,
} from "./testumgebung/testdaten";

const STUNDE = 60 * 60 * 1000;
// Live-Zeiten haben Sekunden.
const vor = (stunden: number) =>
  new Date(Math.floor((Date.now() - stunden * STUNDE) / 1000) * 1000 - 37_000).toISOString();

// Ein Zeiteintrag in einem eigenen Objekt, damit sich seine Zeile über die
// Objekt-Bezeichnung finden lässt.
async function eintrag(
  firmaId: string,
  mitarbeiterId: string,
  beginn: string,
  ende: string | null,
) {
  const dienst = dienstZugang()!;
  const objekt = await legeKundeMitObjektAn(dienst, firmaId);
  const { taetigkeitId } = await legeTaetigkeitAn(dienst, firmaId);
  const id = await legeZeiteintragAn(dienst, {
    firmaId,
    mitarbeiterId,
    objektId: objekt.objektId,
    taetigkeitId,
    beginn,
    ende,
  });
  return { id, bezeichnung: objekt.bezeichnung };
}

async function freigegebenVon(id: string) {
  const { data } = await dienstZugang()!
    .from("zeiteintrag")
    .select("freigegeben_von")
    .eq("id", id)
    .single<{ freigegeben_von: string | null }>();
  return data!.freigegeben_von;
}

test("Das Büro gibt Einträge einzeln und gesammelt frei, der Mitarbeiter sieht das, und das Büro nimmt eine Freigabe zurück", async ({
  page,
}) => {
  const { firmaA } = testdaten();
  const buero = await legeEigenenZugangAn(firmaA.id, "buero");
  const ich = await legeEigenenZugangAn(firmaA.id);
  const kollege = await legeEigenenZugangAn(firmaA.id);
  const erster = await eintrag(firmaA.id, ich.id, vor(30), vor(28));
  const nachgetragen = await eintrag(firmaA.id, ich.id, vor(27), vor(26));
  const { error } = await dienstZugang()!
    .from("zeiteintrag")
    .update({ nachtrag: true })
    .eq("id", nachgetragen.id);
  if (error) throw error;
  const unvollstaendig = await eintrag(firmaA.id, ich.id, vor(20), null);
  const vomKollegen = await eintrag(firmaA.id, kollege.id, vor(30), vor(29));

  await meldeAn(page, buero);
  await erwarteAngemeldet(page, buero.name);
  await page.getByRole("link", { name: "Zeiteinträge freigeben" }).click();
  await expect(page.getByRole("heading", { name: "Zeiteinträge freigeben" })).toBeVisible();

  // Nur die Einträge des gewählten Mitarbeiters.
  // Der Name einer Auswahlliste endet mit dem gewählten Eintrag.
  await page.getByRole("combobox", { name: /^Mitarbeiter/ }).selectOption({ label: ich.name });
  await page.getByRole("button", { name: "Anzeigen" }).click();
  await expect(page).toHaveURL(new RegExp(`mitarbeiter=${ich.id}`));
  const zeile = (bezeichnung: string) => page.getByRole("row").filter({ hasText: bezeichnung });
  await expect(zeile(erster.bezeichnung)).toHaveCount(1);
  await expect(zeile(vomKollegen.bezeichnung)).toHaveCount(0);
  await expect(zeile(nachgetragen.bezeichnung)).toContainText("Nachtrag");
  await expect(zeile(erster.bezeichnung)).not.toContainText("Nachtrag");

  // Der unvollständige Eintrag lässt sich nicht freigeben.
  await expect(zeile(unvollstaendig.bezeichnung)).toContainText("unvollständig");
  await expect(zeile(unvollstaendig.bezeichnung)).toContainText("erst nach dem Beenden");
  await expect(zeile(unvollstaendig.bezeichnung).getByRole("checkbox")).toHaveCount(0);

  // Einzeln ...
  await zeile(erster.bezeichnung).getByRole("button", { name: "Freigeben" }).click();
  await expect(page.getByRole("status").filter({ hasText: "freigegeben" })).toHaveText(
    "1 Zeiteintrag freigegeben.",
  );
  await expect(zeile(erster.bezeichnung)).toHaveCount(0);

  // ... und gesammelt: Alle auswählen trifft nur, was sich freigeben lässt.
  await page.getByRole("checkbox", { name: "Alle auswählen" }).check();
  await page.getByRole("button", { name: "Ausgewählte freigeben" }).click();
  await expect(zeile(nachgetragen.bezeichnung)).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "freigegeben" })).toHaveText(
    "1 Zeiteintrag freigegeben.",
  );
  await expect(zeile(unvollstaendig.bezeichnung)).toHaveCount(1);
  expect(await freigegebenVon(erster.id)).toBe(buero.id);
  expect(await freigegebenVon(nachgetragen.id)).toBe(buero.id);
  expect(await freigegebenVon(unvollstaendig.id)).toBeNull();
  expect(await freigegebenVon(vomKollegen.id)).toBeNull();

  // Der Mitarbeiter sieht die Freigabe und kann diese Einträge nicht mehr
  // ändern.
  await page.goto("/");
  await meldeAb(page);
  await meldeAn(page, ich);
  await erwarteAngemeldet(page, ich.name);
  for (const { bezeichnung } of [erster, nachgetragen]) {
    const listeneintrag = page.getByRole("listitem").filter({ hasText: bezeichnung });
    await expect(listeneintrag).toContainText("Freigegeben");
    await expect(listeneintrag.getByRole("link", { name: "Ändern" })).toHaveCount(0);
  }
  await page.goto(`/nachtrag/${erster.id}`);
  await expect(
    page.getByText("Dieser Zeiteintrag ist vom Büro freigegeben", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Speichern" })).toHaveCount(0);

  // Das Büro findet den Eintrag unter den freigegebenen, nimmt die Freigabe
  // zurück, und das Protokoll zeigt es.
  await page.goto("/");
  await meldeAb(page);
  await meldeAn(page, buero);
  await erwarteAngemeldet(page, buero.name);
  await page.goto("/freigabe");
  await page.getByRole("combobox", { name: /^Mitarbeiter/ }).selectOption({ label: ich.name });
  await page.getByRole("checkbox", { name: "Freigegebene zeigen" }).check();
  await page.getByRole("button", { name: "Anzeigen" }).click();
  await expect(page).toHaveURL(/freigegebene=ja/);
  await expect(zeile(unvollstaendig.bezeichnung)).toHaveCount(0);
  await expect(zeile(erster.bezeichnung)).toContainText(`von ${buero.name}`);
  await zeile(erster.bezeichnung).getByRole("link", { name: "Protokoll" }).click();
  await expect(page.getByText(`von ${buero.name}`).filter({ visible: true })).toContainText(
    "Freigegeben am",
  );
  await page.getByRole("button", { name: "Freigabe zurücknehmen" }).click();
  await expect(page.getByRole("button", { name: "Freigabe zurücknehmen" })).toHaveCount(0);
  await expect(
    page.getByText(/^Freigegeben: \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2} → –$/).filter({ visible: true }),
  ).toBeVisible();
  expect(await freigegebenVon(erster.id)).toBeNull();
});
