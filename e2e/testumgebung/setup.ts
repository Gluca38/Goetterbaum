import { randomBytes, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dienstZugang,
  speichereTestdaten,
  TEST_FIRMA_PRAEFIX,
  type TestZugang,
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
      buero: await legeZugangAn(supabase, firmaA.id, kennung, {
        name: "Anna Büro",
        aktiv: true,
      }),
      deaktiviert: await legeZugangAn(supabase, firmaA.id, kennung, {
        name: "Dieter Deaktiviert",
        aktiv: false,
      }),
    },
    firmaB: {
      ...firmaB,
      buero: await legeZugangAn(supabase, firmaB.id, kennung, {
        name: "Bert Büro",
        aktiv: true,
      }),
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

async function legeZugangAn(
  supabase: SupabaseClient,
  firmaId: string,
  kennung: string,
  { name, aktiv }: { name: string; aktiv: boolean },
): Promise<TestZugang> {
  const email = `e2e-${kennung}-${randomUUID().slice(0, 8)}@example.com`;
  const passwort = randomBytes(18).toString("base64url");

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: passwort,
    email_confirm: true,
  });
  if (error) throw error;

  const { error: fehler } = await supabase.from("mitarbeiter").insert({
    firma_id: firmaId,
    name,
    email,
    rolle: "buero",
    aktiv,
    auth_user_id: data.user.id,
  });
  if (fehler) {
    // Sonst bliebe ein Login ohne Mitarbeiter zurück, den das Aufräumen
    // nicht mehr findet.
    await supabase.auth.admin.deleteUser(data.user.id);
    throw fehler;
  }

  return { name, email, passwort };
}
