import { expect, test } from "@playwright/test";
import { schnittstelleAls, testdaten } from "./testumgebung/hilfen";
import {
  dienstZugang,
  legeEigenenZugangAn,
  legeKundeMitObjektAn,
  legeTaetigkeitAn,
  legeZeiteintragAn,
} from "./testumgebung/testdaten";

// Diese Tests gehen an der App vorbei direkt auf die öffentliche
// Supabase-Schnittstelle. Sie prüfen, dass die Datenbank Nachträge
// erkennt, Überschneidungen ablehnt und jede Änderung protokolliert.

const STUNDE = 60 * 60 * 1000;
const vor = (stunden: number) => new Date(Date.now() - stunden * STUNDE).toISOString();

async function auswahl(firmaId: string) {
  const dienst = dienstZugang()!;
  const { objektId } = await legeKundeMitObjektAn(dienst, firmaId);
  const { taetigkeitId } = await legeTaetigkeitAn(dienst, firmaId);
  return { objektId, taetigkeitId };
}

async function gespeicherterEintrag(id: string) {
  const { data } = await dienstZugang()!
    .from("zeiteintrag")
    .select("beginn, ende, nachtrag, objekt_id, angelegt_von")
    .eq("id", id)
    .single();
  return data!;
}

type Protokoll = {
  aktion: string;
  geaendert_von: string | null;
  vorher: Record<string, unknown> | null;
  nachher: Record<string, unknown>;
};

async function protokollVon(id: string): Promise<Protokoll[]> {
  const { data, error } = await dienstZugang()!
    .from("zeiteintrag_protokoll")
    .select("aktion, geaendert_von, vorher, nachher")
    .eq("zeiteintrag_id", id)
    .order("id");
  if (error) throw error;
  return data;
}

test("Ein Mitarbeiter trägt eigene Einträge nach und ändert sie; die Datenbank markiert Nachträge", async () => {
  const { firmaA } = testdaten();
  const ich = await legeEigenenZugangAn(firmaA.id);
  const kollege = await legeEigenenZugangAn(firmaA.id);
  const { objektId, taetigkeitId } = await auswahl(firmaA.id);
  const anderes = await auswahl(firmaA.id);
  const supabase = await schnittstelleAls(ich);
  const taetigkeit = { firma_id: firmaA.id, art: "taetigkeit", objekt_id: objektId, taetigkeit_id: taetigkeitId };

  // Nachtragen geht nur für sich selbst und nicht in die Zukunft.
  const fuerKollegen = await supabase
    .from("zeiteintrag")
    .insert({ ...taetigkeit, mitarbeiter_id: kollege.id, beginn: vor(30), ende: vor(29) });
  expect(fuerKollegen.error?.code).toBe("42501");
  const inZukunft = await supabase
    .from("zeiteintrag")
    .insert({ ...taetigkeit, mitarbeiter_id: ich.id, beginn: vor(1), ende: vor(-1) });
  expect(inZukunft.error?.code).toBe("23514");

  const beginn = vor(30);
  const ende = vor(28);
  const { data, error } = await supabase
    .from("zeiteintrag")
    .insert({ ...taetigkeit, mitarbeiter_id: ich.id, beginn, ende })
    .select("id")
    .single<{ id: string }>();
  expect(error).toBeNull();
  // Anders als beim Start bleiben die mitgeschickten Zeiten erhalten.
  const nachgetragen = await gespeicherterEintrag(data!.id);
  expect(nachgetragen).toMatchObject({ nachtrag: true, angelegt_von: ich.id });
  expect(Date.parse(nachgetragen.beginn)).toBe(Date.parse(beginn));
  expect(Date.parse(nachgetragen.ende!)).toBe(Date.parse(ende));

  // Ein live erfasster, beendeter Eintrag: Nur Objekt oder Tätigkeit zu
  // ändern macht ihn nicht zum Nachtrag, Beginn oder Ende zu ändern schon.
  const live = await legeZeiteintragAn(dienstZugang()!, {
    firmaId: firmaA.id,
    mitarbeiterId: ich.id,
    objektId,
    taetigkeitId,
    beginn: vor(6),
    ende: vor(5),
  });
  const nurObjekt = await supabase
    .from("zeiteintrag")
    .update({ objekt_id: anderes.objektId })
    .eq("id", live)
    .select("id");
  expect(nurObjekt.data).toHaveLength(1);
  expect(await gespeicherterEintrag(live)).toMatchObject({
    nachtrag: false,
    objekt_id: anderes.objektId,
  });
  const neuesEnde = await supabase
    .from("zeiteintrag")
    .update({ ende: vor(4.5) })
    .eq("id", live)
    .select("id");
  expect(neuesEnde.data).toHaveLength(1);
  expect((await gespeicherterEintrag(live)).nachtrag).toBe(true);

  // Fremde Einträge bleiben unverändert.
  const fremd = await legeZeiteintragAn(dienstZugang()!, {
    firmaId: firmaA.id,
    mitarbeiterId: kollege.id,
    beginn: vor(6),
    ende: vor(5),
  });
  const fremdAendern = await supabase
    .from("zeiteintrag")
    .update({ beginn: vor(7) })
    .eq("id", fremd)
    .select("id");
  expect(fremdAendern.data).toEqual([]);
  expect((await gespeicherterEintrag(fremd)).nachtrag).toBe(false);
});

test("Einträge desselben Mitarbeiters überschneiden sich nie, auch nicht mit einem laufenden", async () => {
  const { firmaA } = testdaten();
  const ich = await legeEigenenZugangAn(firmaA.id);
  const kollege = await legeEigenenZugangAn(firmaA.id);
  const supabase = await schnittstelleAls(ich);
  const fahrt = { firma_id: firmaA.id, mitarbeiter_id: ich.id, art: "fahrt" };
  // Volle Stunden in der Vergangenheit, damit die Grenzen genau passen.
  const stunde = Math.floor(Date.now() / STUNDE) * STUNDE;
  const um = (stunden: number) => new Date(stunde - stunden * STUNDE).toISOString();

  const erster = await supabase.from("zeiteintrag").insert({ ...fahrt, beginn: um(10), ende: um(8) });
  expect(erster.error).toBeNull();

  for (const [beginn, ende] of [
    [um(9), um(7)],
    [um(11), um(9)],
    [um(11), um(7)],
  ]) {
    const { error } = await supabase.from("zeiteintrag").insert({ ...fahrt, beginn, ende });
    expect(error?.code, `${beginn}–${ende}`).toBe("23P01");
  }

  // Direkt davor und danach ist erlaubt, ebenso dieselbe Zeit für einen
  // Kollegen.
  for (const [beginn, ende] of [
    [um(11), um(10)],
    [um(8), um(7)],
  ]) {
    const { error } = await supabase.from("zeiteintrag").insert({ ...fahrt, beginn, ende });
    expect(error, `${beginn}–${ende}`).toBeNull();
  }
  await legeZeiteintragAn(dienstZugang()!, {
    firmaId: firmaA.id,
    mitarbeiterId: kollege.id,
    beginn: um(10),
    ende: um(8),
  });

  // Auch Ändern darf keine Überschneidung erzeugen.
  const { data: spaeter } = await supabase
    .from("zeiteintrag")
    .insert({ ...fahrt, beginn: um(5), ende: um(4) })
    .select("id")
    .single<{ id: string }>();
  const ueberlappend = await supabase
    .from("zeiteintrag")
    .update({ beginn: um(7.5) })
    .eq("id", spaeter!.id);
  expect(ueberlappend.error?.code).toBe("23P01");

  // Ein laufender Eintrag reicht bis jetzt und darüber hinaus.
  await legeZeiteintragAn(dienstZugang()!, {
    firmaId: firmaA.id,
    mitarbeiterId: ich.id,
    beginn: um(3),
    ende: null,
  });
  const waehrendDesLaufenden = await supabase
    .from("zeiteintrag")
    .insert({ ...fahrt, beginn: um(2), ende: um(1) });
  expect(waehrendDesLaufenden.error?.code).toBe("23P01");
});

test("Jede Änderung steht im Protokoll, das nur das Büro der Firma lesen und niemand ändern kann", async () => {
  const { firmaA, firmaB } = testdaten();
  const ich = await legeEigenenZugangAn(firmaA.id);
  const { objektId, taetigkeitId } = await auswahl(firmaA.id);
  const supabase = await schnittstelleAls(ich);

  // Live gestartet, gestoppt, dann der Beginn geändert.
  const { data } = await supabase
    .from("zeiteintrag")
    .insert({
      firma_id: firmaA.id,
      mitarbeiter_id: ich.id,
      art: "taetigkeit",
      objekt_id: objektId,
      taetigkeit_id: taetigkeitId,
    })
    .select("id, beginn")
    .single<{ id: string; beginn: string }>();
  const id = data!.id;
  await supabase.from("zeiteintrag").update({ ende: new Date().toISOString() }).eq("id", id);
  const frueher = new Date(Date.parse(data!.beginn) - STUNDE).toISOString();
  await supabase.from("zeiteintrag").update({ beginn: frueher }).eq("id", id);

  const protokoll = await protokollVon(id);
  expect(protokoll.map((p) => [p.aktion, p.geaendert_von])).toEqual([
    ["angelegt", ich.id],
    ["geaendert", ich.id],
    ["geaendert", ich.id],
  ]);
  const [angelegt, gestoppt, verschoben] = protokoll;
  expect(angelegt.vorher).toBeNull();
  expect(angelegt.nachher).toMatchObject({ id, ende: null, nachtrag: false });
  expect(gestoppt.vorher).toEqual(angelegt.nachher);
  expect(gestoppt.nachher.ende).not.toBeNull();
  expect(verschoben.vorher).toEqual(gestoppt.nachher);
  expect(verschoben.nachher).toMatchObject({ nachtrag: true });
  expect(Date.parse(verschoben.nachher.beginn as string)).toBe(Date.parse(frueher));

  // Lesen: nur das Büro der eigenen Firma, auch über die Funktion fürs Büro.
  for (const [zugang, anzahl] of [
    [ich, 0],
    [firmaA.mitarbeiter, 0],
    [firmaA.vorarbeiter, 0],
    [firmaA.buero, 3],
    [firmaB.buero, 0],
  ] as const) {
    const andere = await schnittstelleAls(zugang);
    const tabelle = await andere.from("zeiteintrag_protokoll").select("id").eq("zeiteintrag_id", id);
    expect(tabelle.data, zugang.name).toHaveLength(anzahl);
    const funktion = await andere.rpc("protokoll_zum_zeiteintrag", { eintrag: id });
    expect(funktion.data, zugang.name).toHaveLength(anzahl);
  }
  const buero = await schnittstelleAls(firmaA.buero);
  const { data: mitNamen } = await buero.rpc("protokoll_zum_zeiteintrag", { eintrag: id });
  expect(mitNamen.map((p: { geaendert_von_name: string }) => p.geaendert_von_name)).toEqual([
    ich.name,
    ich.name,
    ich.name,
  ]);

  // Schreiben, ändern und löschen kann niemand, auch nicht das Büro oder
  // der Dienstschlüssel.
  for (const zugang of [supabase, buero, dienstZugang()!]) {
    const schreiben = await zugang.from("zeiteintrag_protokoll").insert({
      firma_id: firmaA.id,
      zeiteintrag_id: id,
      aktion: "geaendert",
      nachher: {},
    });
    expect(schreiben.error?.code).toBe("42501");
    const aendern = await zugang
      .from("zeiteintrag_protokoll")
      .update({ nachher: {} })
      .eq("zeiteintrag_id", id);
    expect(aendern.error?.code).toBe("42501");
    const loeschen = await zugang.from("zeiteintrag_protokoll").delete().eq("zeiteintrag_id", id);
    expect(loeschen.error?.code).toBe("42501");
  }
  expect(await protokollVon(id)).toEqual(protokoll);
});

test("Das Büro sieht alle Einträge der Firma mit Nachtrag-Markierung, andere Rollen nicht", async () => {
  const { firmaA, firmaB } = testdaten();
  const ich = await legeEigenenZugangAn(firmaA.id);
  const supabase = await schnittstelleAls(ich);
  const { data } = await supabase
    .from("zeiteintrag")
    .insert({ firma_id: firmaA.id, mitarbeiter_id: ich.id, art: "fahrt", beginn: vor(3), ende: vor(2) })
    .select("id")
    .single<{ id: string }>();

  const buero = await schnittstelleAls(firmaA.buero);
  const { data: liste, error } = await buero.rpc("zeiteintraege_der_firma", { ab: vor(24) });
  expect(error).toBeNull();
  expect(liste.find((e: { id: string }) => e.id === data!.id)).toMatchObject({
    mitarbeiter_name: ich.name,
    art: "fahrt",
    nachtrag: true,
  });

  for (const zugang of [ich, firmaA.vorarbeiter, firmaB.buero]) {
    const andere = await schnittstelleAls(zugang);
    const { data: nichts } = await andere.rpc("zeiteintraege_der_firma", { ab: vor(24) });
    expect(nichts, zugang.name).toEqual([]);
  }

  // Die eigene Liste zeigt die Markierung ebenfalls.
  const { data: meine } = await supabase.rpc("meine_zeiteintraege", { ab: vor(24) });
  expect(meine).toEqual([expect.objectContaining({ id: data!.id, nachtrag: true })]);
});
