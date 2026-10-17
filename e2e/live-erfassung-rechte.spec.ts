import { expect, test } from "@playwright/test";
import { schnittstelleAls, testdaten } from "./testumgebung/hilfen";
import {
  dienstZugang,
  legeEigenenZugangAn,
  legeKundeMitObjektAn,
  legeTaetigkeitAn,
  legeZeiteintragAn,
  oeffentlicherZugang,
} from "./testumgebung/testdaten";

// Diese Tests gehen an der App vorbei direkt auf die öffentliche
// Supabase-Schnittstelle. Sie prüfen, dass die Datenbank selbst schützt.

// Spielraum für Uhren, die zwischen Testrechner und Datenbank abweichen.
const UHR_SPIELRAUM_MS = 2 * 60 * 1000;

// Ein aktives Objekt und eine aktive Tätigkeit einer Firma.
async function auswahl(firmaId: string) {
  const dienst = dienstZugang()!;
  const { objektId } = await legeKundeMitObjektAn(dienst, firmaId);
  const { taetigkeitId } = await legeTaetigkeitAn(dienst, firmaId);
  return { objektId, taetigkeitId };
}

async function archiviere(tabelle: "objekt" | "taetigkeit", id: string) {
  const { error } = await dienstZugang()!.from(tabelle).update({ archiviert: true }).eq("id", id);
  if (error) throw error;
}

// Der gespeicherte Stand, am eigenen Zugang vorbei gelesen.
async function gespeicherterEintrag(id: string) {
  const { data } = await dienstZugang()!
    .from("zeiteintrag")
    .select("beginn, ende, angelegt_von, nachtrag")
    .eq("id", id)
    .single<{ beginn: string; ende: string | null; angelegt_von: string; nachtrag: boolean }>();
  return data!;
}

function erwarteJetzt(zeitpunkt: string | null) {
  expect(zeitpunkt).not.toBeNull();
  expect(Math.abs(Date.parse(zeitpunkt!) - Date.now())).toBeLessThan(UHR_SPIELRAUM_MS);
}

test("Ein Mitarbeiter startet und stoppt nur eigene Zeiteinträge, und die Datenbank setzt die Zeiten", async () => {
  const { firmaA } = testdaten();
  const ich = await legeEigenenZugangAn(firmaA.id);
  const kollege = await legeEigenenZugangAn(firmaA.id);
  const { objektId, taetigkeitId } = await auswahl(firmaA.id);
  const supabase = await schnittstelleAls(ich);
  const start = {
    firma_id: firmaA.id,
    art: "taetigkeit",
    objekt_id: objektId,
    taetigkeit_id: taetigkeitId,
  };

  // angelegt_von und die Nachtrag-Markierung lassen sich nicht selbst setzen.
  const mitAnleger = await supabase
    .from("zeiteintrag")
    .insert({ ...start, mitarbeiter_id: ich.id, angelegt_von: kollege.id });
  expect(mitAnleger.error?.code).toBe("42501");
  const mitMarkierung = await supabase
    .from("zeiteintrag")
    .insert({ ...start, mitarbeiter_id: ich.id, nachtrag: false });
  expect(mitMarkierung.error?.code).toBe("42501");

  // Nicht für jemand anderen.
  const fuerKollegen = await supabase
    .from("zeiteintrag")
    .insert({ ...start, mitarbeiter_id: kollege.id });
  expect(fuerKollegen.error?.code).toBe("42501");

  // Ein Start ohne Ende: Wer einen anderen Beginn schickt, bekommt
  // trotzdem die Uhr der Datenbank.
  const { data, error } = await supabase
    .from("zeiteintrag")
    .insert({ ...start, mitarbeiter_id: ich.id, beginn: "2020-01-01T08:00:00Z" })
    .select("id")
    .single<{ id: string }>();
  expect(error).toBeNull();
  const gestartet = await gespeicherterEintrag(data!.id);
  erwarteJetzt(gestartet.beginn);
  expect(gestartet.ende).toBeNull();
  expect(gestartet.angelegt_von).toBe(ich.id);
  expect(gestartet.nachtrag).toBe(false);

  // Ein zweiter Start, auch als Fahrt, ist nicht möglich.
  const zweiter = await supabase
    .from("zeiteintrag")
    .insert({ firma_id: firmaA.id, mitarbeiter_id: ich.id, art: "fahrt" });
  expect(zweiter.error?.code).toBe("23505");

  // Wer ein anderes Ende schickt, bekommt trotzdem die Uhr der Datenbank.
  const stopp = await supabase
    .from("zeiteintrag")
    .update({ ende: "2099-01-01T00:00:00Z" })
    .eq("id", data!.id)
    .select("id");
  expect(stopp.data).toHaveLength(1);
  const gestoppt = await gespeicherterEintrag(data!.id);
  erwarteJetzt(gestoppt.ende);
  // Der Stopp ist kein Nachtrag.
  expect(gestoppt.nachtrag).toBe(false);

  // Ein beendeter Eintrag endet nie in der Zukunft und läuft nie wieder.
  for (const ende of ["2099-01-01T00:00:00Z", null]) {
    const nochmal = await supabase.from("zeiteintrag").update({ ende }).eq("id", data!.id);
    expect(nochmal.error?.code, String(ende)).toBe("23514");
  }
  expect(await gespeicherterEintrag(data!.id)).toEqual(gestoppt);

  // Mitarbeiter, Firma und Anleger sind nicht änderbar, löschen darf
  // niemand.
  for (const aenderung of [
    { mitarbeiter_id: kollege.id },
    { firma_id: firmaA.id },
    { angelegt_von: kollege.id },
    { nachtrag: true },
  ]) {
    const { error: fehler } = await supabase
      .from("zeiteintrag")
      .update(aenderung)
      .eq("id", data!.id);
    expect(fehler?.code, Object.keys(aenderung)[0]).toBe("42501");
  }
  const loeschen = await supabase.from("zeiteintrag").delete().eq("id", data!.id);
  expect(loeschen.error?.code).toBe("42501");
  expect(await gespeicherterEintrag(data!.id)).not.toBeNull();
});

test("Jeder sieht und stoppt nur seine eigenen Zeiteinträge, auch über die Firmengrenze hinweg", async () => {
  const { firmaA, firmaB } = testdaten();
  const ich = await legeEigenenZugangAn(firmaA.id);
  const kollege = await legeEigenenZugangAn(firmaA.id);
  const { objektId, taetigkeitId } = await auswahl(firmaA.id);
  const dienst = dienstZugang()!;
  const zeiten = { beginn: new Date(Date.now() - 3600_000).toISOString(), ende: null };
  const meiner = await legeZeiteintragAn(dienst, {
    firmaId: firmaA.id,
    mitarbeiterId: ich.id,
    objektId,
    taetigkeitId,
    ...zeiten,
  });
  const fremder = await legeZeiteintragAn(dienst, {
    firmaId: firmaA.id,
    mitarbeiterId: kollege.id,
    ...zeiten,
  });

  const supabase = await schnittstelleAls(ich);
  expect((await supabase.from("zeiteintrag").select("id")).data).toEqual([{ id: meiner }]);
  const { data: liste } = await supabase.rpc("meine_zeiteintraege", {
    ab: "2000-01-01T00:00:00Z",
  });
  expect(liste.map((e: { id: string }) => e.id)).toEqual([meiner]);

  const fremdStoppen = await supabase
    .from("zeiteintrag")
    .update({ ende: new Date().toISOString() })
    .eq("id", fremder)
    .select("id");
  expect(fremdStoppen.data).toEqual([]);
  expect((await gespeicherterEintrag(fremder)).ende).toBeNull();

  // Vorarbeiter sehen vorerst nur eigene Einträge, das Büro alle der
  // eigenen Firma, das Büro einer anderen Firma keine.
  for (const [zugang, sichtbar] of [
    [firmaA.vorarbeiter, []],
    [firmaA.buero, [meiner, fremder].sort()],
    [firmaB.buero, []],
  ] as const) {
    const andere = await schnittstelleAls(zugang);
    const { data } = await andere
      .from("zeiteintrag")
      .select("id")
      .in("id", [meiner, fremder])
      .order("id");
    expect(data?.map((e) => e.id), zugang.name).toEqual(sichtbar);
  }
});

test("Gestartet wird nur mit aktivem Objekt und aktiver Tätigkeit der eigenen Firma", async () => {
  const { firmaA, firmaB } = testdaten();
  const ich = await legeEigenenZugangAn(firmaA.id);
  const aktiv = await auswahl(firmaA.id);
  const archiviert = await auswahl(firmaA.id);
  await archiviere("objekt", archiviert.objektId);
  await archiviere("taetigkeit", archiviert.taetigkeitId);
  const fremd = await auswahl(firmaB.id);
  const supabase = await schnittstelleAls(ich);

  const versuche: [string, Record<string, unknown>, string][] = [
    [
      "archiviertes Objekt",
      { objekt_id: archiviert.objektId, taetigkeit_id: aktiv.taetigkeitId },
      "23514",
    ],
    [
      "archivierte Tätigkeit",
      { objekt_id: aktiv.objektId, taetigkeit_id: archiviert.taetigkeitId },
      "23514",
    ],
    ["fremdes Objekt", { objekt_id: fremd.objektId, taetigkeit_id: aktiv.taetigkeitId }, "23503"],
    ["fremde Tätigkeit", { objekt_id: aktiv.objektId, taetigkeit_id: fremd.taetigkeitId }, "23503"],
    ["ohne Tätigkeit", { objekt_id: aktiv.objektId }, "23514"],
  ];
  for (const [was, auswahl, code] of versuche) {
    const { error } = await supabase
      .from("zeiteintrag")
      .insert({ firma_id: firmaA.id, mitarbeiter_id: ich.id, art: "taetigkeit", ...auswahl });
    expect(error?.code, was).toBe(code);
  }

  const fahrtMitObjekt = await supabase.from("zeiteintrag").insert({
    firma_id: firmaA.id,
    mitarbeiter_id: ich.id,
    art: "fahrt",
    objekt_id: aktiv.objektId,
  });
  expect(fahrtMitObjekt.error?.code).toBe("23514");

  // Ein Eintrag in die fremde Firma ist auch mit deren Daten nicht möglich.
  const inFremdeFirma = await supabase.from("zeiteintrag").insert({
    firma_id: firmaB.id,
    mitarbeiter_id: ich.id,
    art: "fahrt",
  });
  expect(inFremdeFirma.error?.code).toBe("42501");
});

test("Ein deaktivierter Mitarbeiter kann nichts erfassen", async () => {
  const { firmaA } = testdaten();
  const supabase = await schnittstelleAls(firmaA.deaktiviert);
  const { error } = await supabase.from("zeiteintrag").insert({
    firma_id: firmaA.id,
    mitarbeiter_id: firmaA.deaktiviert.id,
    art: "fahrt",
  });
  expect(error?.code).toBe("42501");
});

test("Zur Auswahl gibt es nur aktive Objekte und Tätigkeiten der eigenen Firma, ohne Preise", async () => {
  const { firmaA, firmaB } = testdaten();
  const aktiv = await auswahl(firmaA.id);
  const archiviert = await auswahl(firmaA.id);
  await archiviere("objekt", archiviert.objektId);
  await archiviere("taetigkeit", archiviert.taetigkeitId);
  const fremd = await auswahl(firmaB.id);
  const supabase = await schnittstelleAls(firmaA.mitarbeiter);

  const { data: objekte, error } = await supabase.rpc("objekte_zur_auswahl");
  expect(error).toBeNull();
  const objektIds = objekte.map((o: { id: string }) => o.id);
  expect(objektIds).toContain(aktiv.objektId);
  expect(objektIds).not.toContain(archiviert.objektId);
  expect(objektIds).not.toContain(fremd.objektId);
  expect(Object.keys(objekte[0]).sort()).toEqual([
    "adresszusatz",
    "bezeichnung",
    "id",
    "ort",
    "plz",
    "strasse",
  ]);

  const { data: taetigkeiten } = await supabase.rpc("taetigkeiten_zur_auswahl");
  const taetigkeitIds = taetigkeiten.map((t: { id: string }) => t.id);
  expect(taetigkeitIds).toContain(aktiv.taetigkeitId);
  expect(taetigkeitIds).not.toContain(archiviert.taetigkeitId);
  expect(taetigkeitIds).not.toContain(fremd.taetigkeitId);
  expect(Object.keys(taetigkeiten[0]).sort()).toEqual(["id", "name", "sparte"]);

  // Die Tabellen selbst mit Preisen und Pauschalen bleiben verschlossen.
  expect((await supabase.from("objekt").select("id")).data).toEqual([]);
  expect((await supabase.from("taetigkeit").select("id")).data).toEqual([]);

  // Ohne Anmeldung gibt es gar nichts.
  const ohneAnmeldung = oeffentlicherZugang();
  for (const funktion of ["objekte_zur_auswahl", "taetigkeiten_zur_auswahl"] as const) {
    const { error: fehler } = await ohneAnmeldung.rpc(funktion);
    expect(fehler, funktion).not.toBeNull();
  }
  const { error: listenFehler } = await ohneAnmeldung.rpc("meine_zeiteintraege", {
    ab: "2000-01-01T00:00:00Z",
  });
  expect(listenFehler).not.toBeNull();
});
