import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { schnittstelleAls, testdaten } from "./testumgebung/hilfen";
import {
  dienstZugang,
  legeEigenenZugangAn,
  legeKundeMitObjektAn,
  legeTaetigkeitAn,
  legeZeiteintragAn,
  legeZugangAn,
  type TestZugang,
} from "./testumgebung/testdaten";

// Diese Tests gehen an der App vorbei direkt auf die öffentliche
// Supabase-Schnittstelle. Sie prüfen, dass Vorarbeiter und Büro für andere
// Mitarbeiter erfassen dürfen, normale Mitarbeiter aber nicht, und dass
// dabei festgehalten wird, wer erfasst hat.

const STUNDE = 60 * 60 * 1000;
const vor = (stunden: number) => new Date(Date.now() - stunden * STUNDE).toISOString();

async function auswahl(firmaId: string) {
  const dienst = dienstZugang()!;
  const { objektId } = await legeKundeMitObjektAn(dienst, firmaId);
  const { taetigkeitId } = await legeTaetigkeitAn(dienst, firmaId);
  return { objektId, taetigkeitId };
}

// Ein frischer, deaktivierter Mitarbeiter nur für einen Test.
async function legeDeaktiviertenAn(firmaId: string) {
  return legeZugangAn(dienstZugang()!, firmaId, {
    name: `Ehemaliger ${randomUUID().slice(0, 8)}`,
    rolle: "mitarbeiter",
    aktiv: false,
  });
}

async function gespeicherterEintrag(id: string) {
  const { data } = await dienstZugang()!
    .from("zeiteintrag")
    .select("beginn, ende, nachtrag, angelegt_von")
    .eq("id", id)
    .single<{ beginn: string; ende: string | null; nachtrag: boolean; angelegt_von: string }>();
  return data!;
}

async function protokollVon(id: string) {
  const { data, error } = await dienstZugang()!
    .from("zeiteintrag_protokoll")
    .select("aktion, geaendert_von")
    .eq("zeiteintrag_id", id)
    .order("id");
  if (error) throw error;
  return data.map((p) => [p.aktion, p.geaendert_von]);
}

// Startet, stoppt, trägt nach und ändert als erfasser für den Kollegen und
// prüft, dass alles mit dem Erfasser als Anleger und im Protokoll steht.
async function erfasseFuerKollegen(erfasser: TestZugang, firmaId: string) {
  const kollege = await legeEigenenZugangAn(firmaId);
  const { objektId, taetigkeitId } = await auswahl(firmaId);
  const supabase = await schnittstelleAls(erfasser);

  // Live-Start und Stopp: Die Zeiten setzt weiterhin die Datenbank.
  const { data: gestartet, error } = await supabase
    .from("zeiteintrag")
    .insert({
      firma_id: firmaId,
      mitarbeiter_id: kollege.id,
      art: "taetigkeit",
      objekt_id: objektId,
      taetigkeit_id: taetigkeitId,
      beginn: vor(5),
    })
    .select("id")
    .single<{ id: string }>();
  expect(error).toBeNull();
  const live = gestartet!.id;
  expect(await gespeicherterEintrag(live)).toMatchObject({
    ende: null,
    nachtrag: false,
    angelegt_von: erfasser.id,
  });
  expect(Math.abs(Date.parse((await gespeicherterEintrag(live)).beginn) - Date.now())).toBeLessThan(
    2 * 60 * 1000,
  );
  const gestoppt = await supabase
    .from("zeiteintrag")
    .update({ ende: new Date().toISOString() })
    .eq("id", live)
    .is("ende", null)
    .select("id");
  expect(gestoppt.data).toHaveLength(1);

  // Nachtrag und Änderung.
  const { data: nachgetragen } = await supabase
    .from("zeiteintrag")
    .insert({
      firma_id: firmaId,
      mitarbeiter_id: kollege.id,
      art: "fahrt",
      beginn: vor(30),
      ende: vor(29),
    })
    .select("id")
    .single<{ id: string }>();
  const nachtrag = nachgetragen!.id;
  expect(await gespeicherterEintrag(nachtrag)).toMatchObject({
    nachtrag: true,
    angelegt_von: erfasser.id,
  });
  const geaendert = await supabase
    .from("zeiteintrag")
    .update({ beginn: vor(31) })
    .eq("id", nachtrag)
    .select("id");
  expect(geaendert.data).toHaveLength(1);

  expect(await protokollVon(live)).toEqual([
    ["angelegt", erfasser.id],
    ["geaendert", erfasser.id],
  ]);
  expect(await protokollVon(nachtrag)).toEqual([
    ["angelegt", erfasser.id],
    ["geaendert", erfasser.id],
  ]);

  // Die Liste des Kollegen nennt den Erfasser als Anleger.
  const { data: liste } = await supabase.rpc("zeiteintraege_von", {
    wer: kollege.id,
    ab: vor(48),
  });
  expect(liste).toEqual([
    expect.objectContaining({
      id: live,
      angelegt_von: erfasser.id,
      angelegt_von_name: erfasser.name,
    }),
    expect.objectContaining({
      id: nachtrag,
      angelegt_von: erfasser.id,
      angelegt_von_name: erfasser.name,
    }),
  ]);

  // Der Kollege sieht in seiner eigenen Liste ebenfalls, wer erfasst hat.
  const alsKollege = await schnittstelleAls(kollege);
  const { data: meine } = await alsKollege.rpc("meine_zeiteintraege", { ab: vor(48) });
  expect(meine.map((e: { angelegt_von_name: string }) => e.angelegt_von_name)).toEqual([
    erfasser.name,
    erfasser.name,
  ]);
}

test("Ein Vorarbeiter startet, stoppt, trägt nach und ändert für andere; Anleger und Protokoll nennen ihn", async () => {
  const { firmaA } = testdaten();
  const vorarbeiter = await legeEigenenZugangAn(firmaA.id, "vorarbeiter");
  await erfasseFuerKollegen(vorarbeiter, firmaA.id);
});

test("Das Büro startet, stoppt, trägt nach und ändert für andere; Anleger und Protokoll nennen es", async () => {
  const { firmaA } = testdaten();
  const buero = await legeEigenenZugangAn(firmaA.id, "buero");
  await erfasseFuerKollegen(buero, firmaA.id);
});

test("Für deaktivierte Mitarbeiter erfasst niemand neu; ändern darf ihre Einträge nur das Büro", async () => {
  const { firmaA } = testdaten();
  const ehemaliger = await legeDeaktiviertenAn(firmaA.id);
  const eintrag = await legeZeiteintragAn(dienstZugang()!, {
    firmaId: firmaA.id,
    mitarbeiterId: ehemaliger.id,
    beginn: vor(30),
    ende: vor(29),
  });
  const fahrt = { firma_id: firmaA.id, mitarbeiter_id: ehemaliger.id, art: "fahrt" };

  for (const rolle of ["vorarbeiter", "buero"] as const) {
    const supabase = await schnittstelleAls(await legeEigenenZugangAn(firmaA.id, rolle));
    const start = await supabase.from("zeiteintrag").insert(fahrt);
    expect(start.error?.code, rolle).toBe("42501");
    const nachtrag = await supabase
      .from("zeiteintrag")
      .insert({ ...fahrt, beginn: vor(20), ende: vor(19) });
    expect(nachtrag.error?.code, rolle).toBe("42501");
  }

  const vorarbeiter = await schnittstelleAls(await legeEigenenZugangAn(firmaA.id, "vorarbeiter"));
  const alsVorarbeiter = await vorarbeiter
    .from("zeiteintrag")
    .update({ beginn: vor(31) })
    .eq("id", eintrag)
    .select("id");
  expect(alsVorarbeiter.data).toEqual([]);
  expect((await gespeicherterEintrag(eintrag)).nachtrag).toBe(false);

  const buero = await schnittstelleAls(await legeEigenenZugangAn(firmaA.id, "buero"));
  const alsBuero = await buero
    .from("zeiteintrag")
    .update({ beginn: vor(31) })
    .eq("id", eintrag)
    .select("id");
  expect(alsBuero.data).toHaveLength(1);
  expect((await gespeicherterEintrag(eintrag)).nachtrag).toBe(true);
});

test("Ein normaler Mitarbeiter und fremde Firmen erfassen und sehen nichts für andere", async () => {
  const { firmaA, firmaB } = testdaten();
  const kollege = await legeEigenenZugangAn(firmaA.id);
  const eintrag = await legeZeiteintragAn(dienstZugang()!, {
    firmaId: firmaA.id,
    mitarbeiterId: kollege.id,
    beginn: vor(30),
    ende: vor(29),
  });
  const laufender = await legeZeiteintragAn(dienstZugang()!, {
    firmaId: firmaA.id,
    mitarbeiterId: kollege.id,
    beginn: vor(1),
    ende: null,
  });

  for (const [zugang, firmaId] of [
    [await legeEigenenZugangAn(firmaA.id), firmaA.id],
    [await legeEigenenZugangAn(firmaB.id, "vorarbeiter"), firmaB.id],
    [firmaB.buero, firmaB.id],
  ] as const) {
    const supabase = await schnittstelleAls(zugang);
    for (const firma_id of new Set([firmaId, firmaA.id])) {
      const start = await supabase
        .from("zeiteintrag")
        .insert({ firma_id, mitarbeiter_id: kollege.id, art: "fahrt" });
      expect(start.error, zugang.name).not.toBeNull();
      const nachtrag = await supabase.from("zeiteintrag").insert({
        firma_id,
        mitarbeiter_id: kollege.id,
        art: "fahrt",
        beginn: vor(20),
        ende: vor(19),
      });
      expect(nachtrag.error, zugang.name).not.toBeNull();
    }

    const aendern = await supabase
      .from("zeiteintrag")
      .update({ beginn: vor(31) })
      .eq("id", eintrag)
      .select("id");
    expect(aendern.data, zugang.name).toEqual([]);
    const stoppen = await supabase
      .from("zeiteintrag")
      .update({ ende: new Date().toISOString() })
      .eq("id", laufender)
      .select("id");
    expect(stoppen.data, zugang.name).toEqual([]);

    const sichtbar = await supabase.from("zeiteintrag").select("id").in("id", [eintrag, laufender]);
    expect(sichtbar.data, zugang.name).toEqual([]);
    const { data: liste } = await supabase.rpc("zeiteintraege_von", {
      wer: kollege.id,
      ab: vor(48),
    });
    expect(liste, zugang.name).toEqual([]);
  }

  const { data } = await dienstZugang()!
    .from("zeiteintrag")
    .select("id")
    .eq("mitarbeiter_id", kollege.id)
    .order("beginn");
  expect(data).toEqual([{ id: eintrag }, { id: laufender }]);
  expect((await gespeicherterEintrag(eintrag)).nachtrag).toBe(false);
  expect((await gespeicherterEintrag(laufender)).ende).toBeNull();
});

test("Die Übersicht des Büros nennt bei jedem Eintrag, wer ihn angelegt hat", async () => {
  const { firmaA } = testdaten();
  const vorarbeiter = await legeEigenenZugangAn(firmaA.id, "vorarbeiter");
  const kollege = await legeEigenenZugangAn(firmaA.id);
  const { data } = await (
    await schnittstelleAls(vorarbeiter)
  )
    .from("zeiteintrag")
    .insert({
      firma_id: firmaA.id,
      mitarbeiter_id: kollege.id,
      art: "fahrt",
      beginn: vor(3),
      ende: vor(2),
    })
    .select("id")
    .single<{ id: string }>();

  const buero = await schnittstelleAls(firmaA.buero);
  const { data: liste } = await buero.rpc("zeiteintraege_der_firma", { ab: vor(24) });
  expect(liste.find((e: { id: string }) => e.id === data!.id)).toMatchObject({
    mitarbeiter_name: kollege.name,
    angelegt_von_name: vorarbeiter.name,
  });
});
