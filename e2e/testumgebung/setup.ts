import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dienstZugang,
  legeZugangAn,
  speichereTestdaten,
  TEST_FIRMA_PRAEFIX,
} from "./testdaten";

// Legt vor allen Browsertests zwei eigene Test-Firmen mit Zugängen auf
// Supabase-Staging an. Einladungs-Mails werden dabei nicht verschickt.
export default async function setup() {
  const supabase = dienstZugang();
  if (!supabase) {
    if (process.env.CI) {
      throw new Error(
        "Für die Browsertests fehlen NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SECRET_KEY.",
      );
    }
    console.warn(
      "Kein SUPABASE_SECRET_KEY gesetzt: Tests mit Anmeldung werden übersprungen.",
    );
    return;
  }

  const lauf = process.env.GITHUB_RUN_ID ?? "lokal";
  const kennung = `${lauf}-${randomUUID().slice(0, 8)}`;

  const firmaA = await legeFirmaAn(supabase, `${TEST_FIRMA_PRAEFIX} ${kennung} A`);
  const firmaB = await legeFirmaAn(supabase, `${TEST_FIRMA_PRAEFIX} ${kennung} B`);

  speichereTestdaten({
    firmaA: {
      ...firmaA,
      buero: await legeZugangAn(supabase, firmaA.id, { name: "Anna Büro" }),
      deaktiviert: await legeZugangAn(supabase, firmaA.id, {
        name: "Dieter Deaktiviert",
        aktiv: false,
      }),
      mitarbeiter: await legeZugangAn(supabase, firmaA.id, {
        name: "Mia Mitarbeiter",
        rolle: "mitarbeiter",
      }),
      vorarbeiter: await legeZugangAn(supabase, firmaA.id, {
        name: "Volker Vorarbeiter",
        rolle: "vorarbeiter",
      }),
    },
    firmaB: {
      ...firmaB,
      buero: await legeZugangAn(supabase, firmaB.id, { name: "Bert Büro" }),
    },
  });
}

async function legeFirmaAn(supabase: SupabaseClient, name: string) {
  const { data, error } = await supabase
    .from("firma")
    .insert({ name })
    .select("id, name")
    .single<{ id: string; name: string }>();
  if (error) throw error;
  return data;
}
