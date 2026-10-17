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
// Supabase-Schnittstelle. Sie prüfen, dass nur das Büro freigibt, dass die
// Datenbank Zeitpunkt und Freigebenden selbst setzt, dass freigegebene
// Einträge für Mitarbeiter und Vorarbeiter gesperrt sind und dass laufende
// Einträge nicht freigegeben werden können.

// Spielraum für Uhren, die zwischen Testrechner und Datenbank abweichen.
const UHR_SPIELRAUM_MS = 2 * 60 * 1000;
const STUNDE = 60 * 60 * 1000;
// Live-Zeiten haben Sekunden.
const vor = (stunden: number) =>
  new Date(Math.floor((Date.now() - stunden * STUNDE) / 1000) * 1000 - 41_000).toISOString();

async function eintrag(
  firmaId: string,
  mitarbeiterId: string,
  beginn: string,
  ende: string | null,
) {
  const dienst = dienstZugang()!;
  const { objektId } = await legeKundeMitObjektAn(dienst, firmaId);
  const { taetigkeitId } = await legeTaetigkeitAn(dienst, firmaId);
  return legeZeiteintragAn(dienst, {
    firmaId,
    mitarbeiterId,
    objektId,
    taetigkeitId,
    beginn,
    ende,
  });
}

async function gespeicherterEintrag(id: string) {
  const { data } = await dienstZugang()!
    .from("zeiteintrag")
    .select("ende, freigegeben_am, freigegeben_von")
    .eq("id", id)
    .single<{
      ende: string | null;
      freigegeben_am: string | null;
      freigegeben_von: string | null;
    }>();
  return data!;
}

type Protokoll = {
  geaendert_von: string | null;
  vorher: Record<string, unknown> | null;
  nachher: Record<string, unknown>;
};

async function protokollVon(id: string): Promise<Protokoll[]> {
  const { data, error } = await dienstZugang()!
    .from("zeiteintrag_protokoll")
    .select("geaendert_von, vorher, nachher")
    .eq("zeiteintrag_id", id)
    .order("id");
  if (error) throw error;
  return data;
}

test("Das Büro gibt frei; wann und von wem setzt die Datenbank, und es wird protokolliert", async () => {
  const { firmaA } = testdaten();
  const buero = await legeEigenenZugangAn(firmaA.id, "buero");
  const kollege = await legeEigenenZugangAn(firmaA.id, "buero");
  const ich = await legeEigenenZugangAn(firmaA.id);
  const id = await eintrag(firmaA.id, ich.id, vor(30), vor(28));
  const supabase = await schnittstelleAls(buero);

  // Einen anderen Freigebenden kann niemand angeben.
  const fremderName = await supabase
    .from("zeiteintrag")
    .update({ freigegeben_am: vor(1), freigegeben_von: kollege.id })
    .eq("id", id);
  expect(fremderName.error?.code).toBe("42501");

  // Der mitgeschickte Zeitpunkt zählt nicht, nur die Uhr der Datenbank.
  const { data, error } = await supabase
    .from("zeiteintrag")
    .update({ freigegeben_am: "2020-01-01T00:00:00Z" })
    .eq("id", id)
    .select("id");
  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  const freigegeben = await gespeicherterEintrag(id);
  expect(freigegeben.freigegeben_von).toBe(buero.id);
  expect(Math.abs(Date.parse(freigegeben.freigegeben_am!) - Date.now())).toBeLessThan(
    UHR_SPIELRAUM_MS,
  );

  // Noch einmal freigeben, auch durch jemand anderen, ändert nichts.
  const nochmal = await (
    await schnittstelleAls(kollege)
  )
    .from("zeiteintrag")
    .update({ freigegeben_am: vor(-5) })
    .eq("id", id)
    .select("id");
  expect(nochmal.error).toBeNull();
  expect(await gespeicherterEintrag(id)).toEqual(freigegeben);

  const protokoll = await protokollVon(id);
  expect(protokoll).toHaveLength(2);
  expect(protokoll[1].geaendert_von).toBe(buero.id);
  expect(protokoll[1].vorher?.freigegeben_am).toBeNull();
  expect(Date.parse(protokoll[1].nachher.freigegeben_am as string)).toBe(
    Date.parse(freigegeben.freigegeben_am!),
  );
});

test("Mitarbeiter, Vorarbeiter und das Büro einer anderen Firma geben nichts frei", async () => {
  const { firmaA, firmaB } = testdaten();
  const ich = await legeEigenenZugangAn(firmaA.id);
  const vorarbeiter = await legeEigenenZugangAn(firmaA.id, "vorarbeiter");
  const meiner = await eintrag(firmaA.id, ich.id, vor(30), vor(28));
  const seiner = await eintrag(firmaA.id, vorarbeiter.id, vor(30), vor(28));

  // Eigene und, beim Vorarbeiter, fremde Einträge: Die Regeln lassen das
  // Ändern zu, aber nicht mit Freigabe.
  for (const [zugang, id] of [
    [ich, meiner],
    [vorarbeiter, seiner],
    [vorarbeiter, meiner],
  ] as const) {
    const { error } = await (
      await schnittstelleAls(zugang)
    )
      .from("zeiteintrag")
      .update({ freigegeben_am: vor(1) })
      .eq("id", id);
    expect(error?.code, zugang.name).toBe("42501");
  }

  const fremdesBuero = await (
    await schnittstelleAls(firmaB.buero)
  )
    .from("zeiteintrag")
    .update({ freigegeben_am: vor(1) })
    .eq("id", meiner)
    .select("id");
  expect(fremdesBuero.data).toEqual([]);

  for (const id of [meiner, seiner]) {
    expect((await gespeicherterEintrag(id)).freigegeben_am).toBeNull();
  }
});

test("Freigegebene Einträge sind für Mitarbeiter und Vorarbeiter gesperrt, nicht für das Büro", async () => {
  const { firmaA } = testdaten();
  const buero = await legeEigenenZugangAn(firmaA.id, "buero");
  const ich = await legeEigenenZugangAn(firmaA.id);
  const vorarbeiter = await legeEigenenZugangAn(firmaA.id, "vorarbeiter");
  const ende = vor(28);
  const id = await eintrag(firmaA.id, ich.id, vor(30), ende);
  const alsBuero = await schnittstelleAls(buero);
  await alsBuero
    .from("zeiteintrag")
    .update({ freigegeben_am: vor(0) })
    .eq("id", id);

  const alsIch = await schnittstelleAls(ich);
  for (const supabase of [alsIch, await schnittstelleAls(vorarbeiter)]) {
    for (const aenderung of [{ ende: vor(29) }, { freigegeben_am: null }]) {
      const { data } = await supabase
        .from("zeiteintrag")
        .update(aenderung)
        .eq("id", id)
        .select("id");
      expect(data).toEqual([]);
    }
  }
  const gesperrt = await gespeicherterEintrag(id);
  expect(Date.parse(gesperrt.ende!)).toBe(Date.parse(ende));
  expect(gesperrt.freigegeben_von).toBe(buero.id);

  // Der Mitarbeiter sieht, dass sein Eintrag freigegeben ist.
  const { data: meine } = await alsIch.rpc("meine_zeiteintraege", { ab: vor(48) });
  expect(meine).toEqual([expect.objectContaining({ id, freigegeben: true })]);

  // Das Büro behebt weiterhin Fehler; die Freigabe bleibt.
  const behoben = await alsBuero
    .from("zeiteintrag")
    .update({ ende: vor(29) })
    .eq("id", id)
    .select("id");
  expect(behoben.data).toHaveLength(1);
  expect((await gespeicherterEintrag(id)).freigegeben_von).toBe(buero.id);
});

test("Laufende und unvollständige Einträge lassen sich nicht freigeben", async () => {
  const { firmaA } = testdaten();
  const buero = await legeEigenenZugangAn(firmaA.id, "buero");
  const supabase = await schnittstelleAls(buero);

  for (const stunden of [2, 13]) {
    const ich = await legeEigenenZugangAn(firmaA.id);
    const id = await eintrag(firmaA.id, ich.id, vor(stunden), null);
    const { error } = await supabase
      .from("zeiteintrag")
      .update({ freigegeben_am: vor(0) })
      .eq("id", id);
    expect(error?.code, `läuft seit ${stunden} Stunden`).toBe("23514");
    expect(await gespeicherterEintrag(id)).toMatchObject({ ende: null, freigegeben_am: null });
  }
});

test("Das Büro nimmt eine Freigabe zurück; das wird protokolliert, und der Eintrag ist wieder änderbar", async () => {
  const { firmaA } = testdaten();
  const buero = await legeEigenenZugangAn(firmaA.id, "buero");
  const ich = await legeEigenenZugangAn(firmaA.id);
  const id = await eintrag(firmaA.id, ich.id, vor(30), vor(28));
  const alsBuero = await schnittstelleAls(buero);
  await alsBuero
    .from("zeiteintrag")
    .update({ freigegeben_am: vor(0) })
    .eq("id", id);

  const { data, error } = await alsBuero
    .from("zeiteintrag")
    .update({ freigegeben_am: null })
    .eq("id", id)
    .select("id");
  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  expect(await gespeicherterEintrag(id)).toMatchObject({
    freigegeben_am: null,
    freigegeben_von: null,
  });

  const ruecknahme = (await protokollVon(id)).at(-1)!;
  expect(ruecknahme.geaendert_von).toBe(buero.id);
  expect(ruecknahme.vorher?.freigegeben_von).toBe(buero.id);
  expect(ruecknahme.nachher).toMatchObject({ freigegeben_am: null, freigegeben_von: null });

  const wiederAenderbar = await (
    await schnittstelleAls(ich)
  )
    .from("zeiteintrag")
    .update({ ende: vor(29) })
    .eq("id", id)
    .select("id");
  expect(wiederAenderbar.data).toHaveLength(1);
});
