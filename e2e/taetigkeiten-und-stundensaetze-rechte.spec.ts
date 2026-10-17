import { expect, test } from "@playwright/test";
import { schnittstelleAls, testdaten } from "./testumgebung/hilfen";
import {
  dienstZugang,
  legeKundeMitObjektAn,
  legeTaetigkeitAn,
} from "./testumgebung/testdaten";

// Diese Tests gehen an der App vorbei direkt auf die öffentliche
// Supabase-Schnittstelle. Sie prüfen, dass die Datenbank selbst schützt.

// Eine Tätigkeit mit abweichendem Stundensatz bei einem Kunden der Firma.
async function legeAbweichendenSatzAn(firmaId: string) {
  const dienst = dienstZugang()!;
  const { kundeId } = await legeKundeMitObjektAn(dienst, firmaId);
  const { taetigkeitId } = await legeTaetigkeitAn(dienst, firmaId);
  const { error } = await dienst.from("kunden_stundensatz").insert({
    firma_id: firmaId,
    kunde_id: kundeId,
    taetigkeit_id: taetigkeitId,
    stundensatz_cent: 2500,
  });
  if (error) throw error;
  return { kundeId, taetigkeitId };
}

// Der gespeicherte Stand, am eigenen Zugang vorbei gelesen.
async function gespeicherteTaetigkeit(id: string) {
  const { data } = await dienstZugang()!
    .from("taetigkeit")
    .select("standard_stundensatz_cent, archiviert")
    .eq("id", id)
    .single();
  return data;
}

async function gespeicherteSaetze(kundeId: string) {
  const { data } = await dienstZugang()!
    .from("kunden_stundensatz")
    .select("stundensatz_cent")
    .eq("kunde_id", kundeId);
  return data;
}

for (const rolle of ["mitarbeiter", "vorarbeiter"] as const) {
  test(`Ein ${rolle === "mitarbeiter" ? "Mitarbeiter" : "Vorarbeiter"} kann Tätigkeiten und Stundensätze über die Schnittstelle weder sehen noch ändern`, async () => {
    const { firmaA } = testdaten();
    const { kundeId, taetigkeitId } = await legeAbweichendenSatzAn(firmaA.id);
    const supabase = await schnittstelleAls(firmaA[rolle]);

    expect((await supabase.from("taetigkeit").select("id")).data).toEqual([]);
    expect((await supabase.from("kunden_stundensatz").select("kunde_id")).data).toEqual([]);

    const { error: anlegeFehler } = await supabase.from("taetigkeit").insert({
      firma_id: firmaA.id,
      name: "Eingeschleust",
      sparte: "garten",
      standard_stundensatz_cent: 1,
    });
    expect(anlegeFehler?.code).toBe("42501");

    const { error: satzFehler } = await supabase.from("kunden_stundensatz").insert({
      firma_id: firmaA.id,
      kunde_id: kundeId,
      taetigkeit_id: taetigkeitId,
      stundensatz_cent: 1,
    });
    expect(satzFehler?.code).toBe("42501");

    // Die Datenbank findet die Zeilen für ihn gar nicht, ändert also nichts.
    const taetigkeit = await supabase
      .from("taetigkeit")
      .update({ standard_stundensatz_cent: 1 })
      .eq("id", taetigkeitId)
      .select("id");
    expect(taetigkeit.error).toBeNull();
    expect(taetigkeit.data).toEqual([]);

    const satz = await supabase
      .from("kunden_stundensatz")
      .update({ stundensatz_cent: 1 })
      .eq("kunde_id", kundeId)
      .select("kunde_id");
    expect(satz.error).toBeNull();
    expect(satz.data).toEqual([]);

    await supabase.from("kunden_stundensatz").delete().eq("kunde_id", kundeId);

    expect(await gespeicherteTaetigkeit(taetigkeitId)).toEqual({
      standard_stundensatz_cent: 3000,
      archiviert: false,
    });
    expect(await gespeicherteSaetze(kundeId)).toEqual([{ stundensatz_cent: 2500 }]);
  });
}

test("Das Büro kann Tätigkeiten und Stundensätze einer anderen Firma weder sehen noch ändern oder entfernen", async () => {
  const { firmaA, firmaB } = testdaten();
  const { kundeId, taetigkeitId } = await legeAbweichendenSatzAn(firmaA.id);
  const supabase = await schnittstelleAls(firmaB.buero);

  expect((await supabase.from("taetigkeit").select("id").eq("id", taetigkeitId)).data).toEqual(
    [],
  );
  expect(
    (await supabase.from("kunden_stundensatz").select("kunde_id").eq("kunde_id", kundeId)).data,
  ).toEqual([]);

  const { error: anlegeFehler } = await supabase.from("taetigkeit").insert({
    firma_id: firmaA.id,
    name: "Eingeschleust",
    sparte: "garten",
    standard_stundensatz_cent: 1,
  });
  expect(anlegeFehler?.code).toBe("42501");

  const geaendert = await supabase
    .from("taetigkeit")
    .update({ standard_stundensatz_cent: 1 })
    .eq("id", taetigkeitId)
    .select("id");
  expect(geaendert.data).toEqual([]);

  await supabase.from("kunden_stundensatz").delete().eq("kunde_id", kundeId);

  expect(await gespeicherteTaetigkeit(taetigkeitId)).toEqual({
    standard_stundensatz_cent: 3000,
    archiviert: false,
  });
  expect(await gespeicherteSaetze(kundeId)).toEqual([{ stundensatz_cent: 2500 }]);
});

test("Ein abweichender Stundensatz verbindet nur Kunde und Tätigkeit derselben Firma", async () => {
  const { firmaA, firmaB } = testdaten();
  const dienst = dienstZugang()!;
  const { kundeId: fremderKunde } = await legeKundeMitObjektAn(dienst, firmaA.id);
  const { taetigkeitId: fremdeTaetigkeit } = await legeTaetigkeitAn(dienst, firmaA.id);
  const { kundeId: eigenerKunde } = await legeKundeMitObjektAn(dienst, firmaB.id);
  const { taetigkeitId: eigeneTaetigkeit } = await legeTaetigkeitAn(dienst, firmaB.id);
  const supabase = await schnittstelleAls(firmaB.buero);

  for (const [kunde_id, taetigkeit_id] of [
    [eigenerKunde, fremdeTaetigkeit],
    [fremderKunde, eigeneTaetigkeit],
  ]) {
    const { error } = await supabase.from("kunden_stundensatz").insert({
      firma_id: firmaB.id,
      kunde_id,
      taetigkeit_id,
      stundensatz_cent: 2000,
    });
    expect(error).not.toBeNull();
  }
});

test("Tätigkeiten lassen sich nicht löschen und nicht in eine andere Firma verschieben", async () => {
  const { firmaA, firmaB } = testdaten();
  const { taetigkeitId } = await legeTaetigkeitAn(dienstZugang()!, firmaA.id);
  const supabase = await schnittstelleAls(firmaA.buero);

  const { error: loeschFehler } = await supabase
    .from("taetigkeit")
    .delete()
    .eq("id", taetigkeitId);
  expect(loeschFehler?.code).toBe("42501");
  expect(await gespeicherteTaetigkeit(taetigkeitId)).not.toBeNull();

  const { error: firmaFehler } = await supabase
    .from("taetigkeit")
    .update({ firma_id: firmaB.id })
    .eq("id", taetigkeitId);
  expect(firmaFehler?.code).toBe("42501");
});

test("Die Datenbank erlaubt je Kunde und Tätigkeit höchstens einen abweichenden Satz über 0 €, und das Büro kann ihn entfernen", async () => {
  const { firmaA } = testdaten();
  const { kundeId, taetigkeitId } = await legeAbweichendenSatzAn(firmaA.id);
  const supabase = await schnittstelleAls(firmaA.buero);
  const satz = { firma_id: firmaA.id, kunde_id: kundeId, taetigkeit_id: taetigkeitId };

  const doppelt = await supabase
    .from("kunden_stundensatz")
    .insert({ ...satz, stundensatz_cent: 2000 });
  expect(doppelt.error?.code).toBe("23505");

  const nullEuro = await supabase
    .from("kunden_stundensatz")
    .update({ stundensatz_cent: 0 })
    .eq("kunde_id", kundeId);
  expect(nullEuro.error?.code).toBe("23514");

  const { error: taetigkeitNullEuro } = await supabase
    .from("taetigkeit")
    .update({ standard_stundensatz_cent: 0 })
    .eq("id", taetigkeitId);
  expect(taetigkeitNullEuro?.code).toBe("23514");

  const { error } = await supabase.from("kunden_stundensatz").delete().eq("kunde_id", kundeId);
  expect(error).toBeNull();
  expect(await gespeicherteSaetze(kundeId)).toEqual([]);
});
