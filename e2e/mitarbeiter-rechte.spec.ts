import { expect, test } from "@playwright/test";
import { schnittstelleAls, testdaten } from "./testumgebung/hilfen";
import { dienstZugang } from "./testumgebung/testdaten";

// Diese Tests gehen an der App vorbei direkt auf die öffentliche
// Supabase-Schnittstelle. Sie prüfen, dass die Datenbank selbst schützt.

async function rolleVon(id: string) {
  const { data } = await dienstZugang()!
    .from("mitarbeiter")
    .select("rolle")
    .eq("id", id)
    .single<{ rolle: string }>();
  return data?.rolle;
}

for (const rolle of ["mitarbeiter", "vorarbeiter"] as const) {
  test(`Ein ${rolle === "mitarbeiter" ? "Mitarbeiter" : "Vorarbeiter"} kann über die Schnittstelle nichts anlegen oder ändern`, async () => {
    const { firmaA } = testdaten();
    const ich = firmaA[rolle];
    const supabase = await schnittstelleAls(ich);

    const { error: anlegeFehler } = await supabase
      .from("mitarbeiter")
      .insert({ firma_id: firmaA.id, name: "Eingeschleust" });
    expect(anlegeFehler?.code).toBe("42501");

    // Weder sich selbst zum Büro machen …
    const { data: selbst } = await supabase
      .from("mitarbeiter")
      .update({ rolle: "buero" })
      .eq("id", ich.id)
      .select("id");
    expect(selbst ?? []).toEqual([]);
    expect(await rolleVon(ich.id)).toBe(rolle);

    // … noch andere deaktivieren.
    const { data: andere } = await supabase
      .from("mitarbeiter")
      .update({ aktiv: false })
      .eq("id", firmaA.buero.id)
      .select("id");
    expect(andere ?? []).toEqual([]);
  });
}

test("Das Büro kann Mitarbeiter einer anderen Firma weder anlegen noch ändern", async () => {
  const { firmaA, firmaB } = testdaten();
  const supabase = await schnittstelleAls(firmaB.buero);

  const { error: anlegeFehler } = await supabase
    .from("mitarbeiter")
    .insert({ firma_id: firmaA.id, name: "Eingeschleust" });
  expect(anlegeFehler?.code).toBe("42501");

  const { data: geaendert } = await supabase
    .from("mitarbeiter")
    .update({ rolle: "mitarbeiter" })
    .eq("id", firmaA.buero.id)
    .select("id");
  expect(geaendert ?? []).toEqual([]);
  expect(await rolleVon(firmaA.buero.id)).toBe("buero");
});

test("Das Büro kann keinen Login verknüpfen und keine Firma umhängen", async () => {
  const { firmaA, firmaB } = testdaten();
  const supabase = await schnittstelleAls(firmaA.buero);

  // Das darf nur der Server beim Einladen.
  const { error: loginFehler } = await supabase
    .from("mitarbeiter")
    .update({ auth_user_id: null })
    .eq("id", firmaA.mitarbeiter.id);
  expect(loginFehler?.code).toBe("42501");

  const { error: firmaFehler } = await supabase
    .from("mitarbeiter")
    .update({ firma_id: firmaB.id })
    .eq("id", firmaA.mitarbeiter.id);
  expect(firmaFehler?.code).toBe("42501");
});
