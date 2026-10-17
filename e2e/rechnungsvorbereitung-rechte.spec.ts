import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { schnittstelleAls, testdaten } from "./testumgebung/hilfen";
import {
  dienstZugang,
  entferneFirma,
  legeEigeneFirmaAn,
  legeEigenenZugangAn,
  legeKundeMitObjektAn,
} from "./testumgebung/testdaten";

// Diese Tests gehen an der App vorbei direkt auf die öffentliche
// Supabase-Schnittstelle. Sie prüfen, dass nur das Büro der eigenen Firma
// die Standard-Rundungsregel ändert und dass das Büro die Rundungsregel
// eines Kunden setzen und wieder leeren kann.

async function rundungsregelDerFirma(firmaId: string) {
  const { data } = await dienstZugang()!
    .from("firma")
    .select("name, rundungsregel")
    .eq("id", firmaId)
    .single<{ name: string; rundungsregel: string }>();
  return data!;
}

test("Nur das Büro der eigenen Firma ändert die Standard-Rundungsregel, und nur sie", async () => {
  const { firmaA } = testdaten();
  // Eine eigene Firma, weil andere Tests mit dem Standard von Firma A rechnen.
  const firma = await legeEigeneFirmaAn();
  try {
    const mitarbeiter = await legeEigenenZugangAn(firma.id);
    const vorarbeiter = await legeEigenenZugangAn(firma.id, "vorarbeiter");
    expect(await rundungsregelDerFirma(firma.id)).toEqual({
      name: firma.name,
      rundungsregel: "15-minuten",
    });

    for (const zugang of [mitarbeiter, vorarbeiter, firmaA.buero]) {
      const { data, error } = await (
        await schnittstelleAls(zugang)
      )
        .from("firma")
        .update({ rundungsregel: "minutengenau" })
        .eq("id", firma.id)
        .select("id");
      expect(error, zugang.name).toBeNull();
      expect(data, zugang.name).toEqual([]);
    }
    expect((await rundungsregelDerFirma(firma.id)).rundungsregel).toBe("15-minuten");

    const alsBuero = await schnittstelleAls(firma.buero);
    const geaendert = await alsBuero
      .from("firma")
      .update({ rundungsregel: "minutengenau" })
      .eq("id", firma.id)
      .select("id");
    expect(geaendert.error).toBeNull();
    expect(geaendert.data).toHaveLength(1);

    // Den Namen der Firma und unbekannte Regeln nimmt die Datenbank nicht an.
    const name = await alsBuero.from("firma").update({ name: "Umbenannt" }).eq("id", firma.id);
    expect(name.error?.code).toBe("42501");
    const unbekannt = await alsBuero
      .from("firma")
      .update({ rundungsregel: "30-minuten" })
      .eq("id", firma.id);
    expect(unbekannt.error?.code).toBe("22P02");

    expect(await rundungsregelDerFirma(firma.id)).toEqual({
      name: firma.name,
      rundungsregel: "minutengenau",
    });
  } finally {
    await entferneFirma(firma.id);
  }
});

test("Das Büro setzt die Rundungsregel eines Kunden und leert sie wieder", async () => {
  const { firmaA, firmaB } = testdaten();
  const { kundeId } = await legeKundeMitObjektAn(dienstZugang()!, firmaA.id);
  const alsBuero = await schnittstelleAls(firmaA.buero);
  const regel = async () =>
    (
      await dienstZugang()!
        .from("kunde")
        .select("rundungsregel")
        .eq("id", kundeId)
        .single<{ rundungsregel: string | null }>()
    ).data!.rundungsregel;

  // Ohne eigene Regel gilt der Standard der Firma.
  expect(await regel()).toBeNull();

  for (const wert of ["minutengenau", null]) {
    const { data, error } = await alsBuero
      .from("kunde")
      .update({ rundungsregel: wert })
      .eq("id", kundeId)
      .select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(await regel()).toBe(wert);
  }

  // Beim Anlegen lässt sie sich gleich mitgeben.
  const neu = await alsBuero
    .from("kunde")
    .insert({
      firma_id: firmaA.id,
      name: `Hausverwaltung ${randomUUID().slice(0, 8)}`,
      strasse: "Ringstraße 1",
      plz: "50667",
      ort: "Köln",
      abrechnungszeitraum: "quartalsweise",
      rundungsregel: "minutengenau",
    })
    .select("rundungsregel")
    .single<{ rundungsregel: string }>();
  expect(neu.error).toBeNull();
  expect(neu.data?.rundungsregel).toBe("minutengenau");

  // Mitarbeiter und das Büro einer anderen Firma ändern sie nicht.
  const mitarbeiter = await legeEigenenZugangAn(firmaA.id);
  for (const zugang of [mitarbeiter, firmaB.buero]) {
    const { data } = await (
      await schnittstelleAls(zugang)
    )
      .from("kunde")
      .update({ rundungsregel: "15-minuten" })
      .eq("id", kundeId)
      .select("id");
    expect(data, zugang.name).toEqual([]);
  }
  expect(await regel()).toBeNull();
});
