import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { schnittstelleAls, testdaten } from "./testumgebung/hilfen";
import { dienstZugang } from "./testumgebung/testdaten";

// Diese Tests gehen an der App vorbei direkt auf die öffentliche
// Supabase-Schnittstelle. Sie prüfen, dass die Datenbank selbst schützt.

const ADRESSE = { strasse: "Ringstraße 1", plz: "50667", ort: "Köln" };

// Legt über den Dienstschlüssel einen Kunden mit einem Objekt an.
async function legeKundeMitObjektAn(firmaId: string) {
  const dienst = dienstZugang()!;
  const { data: kunde, error } = await dienst
    .from("kunde")
    .insert({
      firma_id: firmaId,
      name: `Kunde ${randomUUID().slice(0, 8)}`,
      ...ADRESSE,
      abrechnungszeitraum: "monatlich",
    })
    .select("id")
    .single<{ id: string }>();
  if (error) throw error;
  const { data: objekt, error: fehler } = await dienst
    .from("objekt")
    .insert({
      firma_id: firmaId,
      kunde_id: kunde.id,
      bezeichnung: `Objekt ${randomUUID().slice(0, 8)}`,
      ...ADRESSE,
      abrechnungsart: "pauschale",
      pauschale_cent: 50000,
    })
    .select("id")
    .single<{ id: string }>();
  if (fehler) throw fehler;
  return { kundeId: kunde.id, objektId: objekt.id };
}

async function gibtEsNoch(tabelle: "kunde" | "objekt", id: string) {
  const { data } = await dienstZugang()!.from(tabelle).select("id").eq("id", id);
  return (data ?? []).length === 1;
}

for (const rolle of ["mitarbeiter", "vorarbeiter"] as const) {
  test(`Ein ${rolle === "mitarbeiter" ? "Mitarbeiter" : "Vorarbeiter"} kann Kunden und Objekte über die Schnittstelle weder sehen noch ändern`, async () => {
    const { firmaA } = testdaten();
    const { kundeId, objektId } = await legeKundeMitObjektAn(firmaA.id);
    const supabase = await schnittstelleAls(firmaA[rolle]);

    expect((await supabase.from("kunde").select("id")).data).toEqual([]);
    expect((await supabase.from("objekt").select("id")).data).toEqual([]);

    const { error: anlegeFehler } = await supabase.from("kunde").insert({
      firma_id: firmaA.id,
      name: "Eingeschleust",
      ...ADRESSE,
      abrechnungszeitraum: "monatlich",
    });
    expect(anlegeFehler?.code).toBe("42501");

    const { data: kunde } = await supabase
      .from("kunde")
      .update({ archiviert: true })
      .eq("id", kundeId)
      .select("id");
    expect(kunde ?? []).toEqual([]);

    const { data: objekt } = await supabase
      .from("objekt")
      .update({ pauschale_cent: 1 })
      .eq("id", objektId)
      .select("id");
    expect(objekt ?? []).toEqual([]);
  });
}

test("Das Büro kann Kunden und Objekte einer anderen Firma weder sehen noch anlegen oder ändern", async () => {
  const { firmaA, firmaB } = testdaten();
  const { kundeId, objektId } = await legeKundeMitObjektAn(firmaA.id);
  const supabase = await schnittstelleAls(firmaB.buero);

  expect((await supabase.from("kunde").select("id").eq("id", kundeId)).data).toEqual([]);
  expect((await supabase.from("objekt").select("id").eq("id", objektId)).data).toEqual([]);

  const { error: anlegeFehler } = await supabase.from("kunde").insert({
    firma_id: firmaA.id,
    name: "Eingeschleust",
    ...ADRESSE,
    abrechnungszeitraum: "monatlich",
  });
  expect(anlegeFehler?.code).toBe("42501");

  // Auch ein Objekt der eigenen Firma darf nicht an einem fremden Kunden
  // hängen.
  const { error: objektFehler } = await supabase.from("objekt").insert({
    firma_id: firmaB.id,
    kunde_id: kundeId,
    bezeichnung: "Eingeschleust",
    ...ADRESSE,
    abrechnungsart: "stunden",
  });
  expect(objektFehler).not.toBeNull();

  const { data: geaendert } = await supabase
    .from("kunde")
    .update({ name: "Gekapert" })
    .eq("id", kundeId)
    .select("id");
  expect(geaendert ?? []).toEqual([]);
});

test("Kunden und Objekte lassen sich nicht löschen und nicht in eine andere Firma verschieben", async () => {
  const { firmaA, firmaB } = testdaten();
  const { kundeId, objektId } = await legeKundeMitObjektAn(firmaA.id);
  const supabase = await schnittstelleAls(firmaA.buero);

  const { error: objektLoeschen } = await supabase.from("objekt").delete().eq("id", objektId);
  expect(objektLoeschen?.code).toBe("42501");
  const { error: kundeLoeschen } = await supabase.from("kunde").delete().eq("id", kundeId);
  expect(kundeLoeschen?.code).toBe("42501");
  expect(await gibtEsNoch("objekt", objektId)).toBe(true);
  expect(await gibtEsNoch("kunde", kundeId)).toBe(true);

  const { error: firmaFehler } = await supabase
    .from("kunde")
    .update({ firma_id: firmaB.id })
    .eq("id", kundeId);
  expect(firmaFehler?.code).toBe("42501");
});

test("Die Datenbank verlangt die Pauschale genau bei Abrechnungsart Pauschale", async () => {
  const { firmaA } = testdaten();
  const { kundeId } = await legeKundeMitObjektAn(firmaA.id);
  const supabase = await schnittstelleAls(firmaA.buero);
  const objekt = {
    firma_id: firmaA.id,
    kunde_id: kundeId,
    bezeichnung: "Regeltest",
    ...ADRESSE,
  };

  const ohnePauschale = await supabase
    .from("objekt")
    .insert({ ...objekt, abrechnungsart: "pauschale" });
  expect(ohnePauschale.error?.code).toBe("23514");

  const stundenMitPauschale = await supabase
    .from("objekt")
    .insert({ ...objekt, abrechnungsart: "stunden", pauschale_cent: 100 });
  expect(stundenMitPauschale.error?.code).toBe("23514");
});

test("Archiviert das Büro einen Kunden, sind seine Objekte mit archiviert und bleiben es, bis der Kunde wieder aktiv ist", async () => {
  const { firmaA } = testdaten();
  const { kundeId, objektId } = await legeKundeMitObjektAn(firmaA.id);
  const supabase = await schnittstelleAls(firmaA.buero);

  const { error } = await supabase.from("kunde").update({ archiviert: true }).eq("id", kundeId);
  expect(error).toBeNull();
  const { data: objekt } = await supabase
    .from("objekt")
    .select("archiviert")
    .eq("id", objektId)
    .single();
  expect(objekt).toEqual({ archiviert: true });

  const { error: aktivFehler } = await supabase
    .from("objekt")
    .update({ archiviert: false })
    .eq("id", objektId);
  expect(aktivFehler?.code).toBe("23514");

  const { error: neuFehler } = await supabase.from("objekt").insert({
    firma_id: firmaA.id,
    kunde_id: kundeId,
    bezeichnung: "Neu bei archiviertem Kunden",
    ...ADRESSE,
    abrechnungsart: "stunden",
  });
  expect(neuFehler?.code).toBe("23514");
});
