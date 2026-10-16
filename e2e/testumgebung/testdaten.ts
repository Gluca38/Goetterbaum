import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Alles, was ein Testlauf auf Supabase-Staging anlegt. Jeder Lauf bekommt
// eigene Firmen und Zugänge, damit sich parallele Läufe nicht stören.

export type Rolle = "mitarbeiter" | "vorarbeiter" | "buero";

export type TestZugang = {
  // Kennung des Mitarbeiters (nicht des Logins)
  id: string;
  name: string;
  email: string;
  passwort: string;
};

export type TestFirma = {
  id: string;
  name: string;
  buero: TestZugang;
};

export type Testdaten = {
  firmaA: TestFirma & {
    deaktiviert: TestZugang;
    mitarbeiter: TestZugang;
    vorarbeiter: TestZugang;
  };
  firmaB: TestFirma;
};

// Erkennungszeichen aller Test-Firmen. Damit räumt das Aufräumen auch
// Reste abgebrochener Läufe auf.
export const TEST_FIRMA_PRAEFIX = "E2E-Test";

const UMGEBUNGSVARIABLE = "E2E_TESTDATEN";

// Testadressen von Resend: Mails dorthin nimmt Resend an, stellt sie aber
// nirgends zu. So verschicken die Tests nie echte Mails, auch wenn die App
// Einladungen oder "Passwort vergessen"-Links versendet.
export function testEmail() {
  const lauf = process.env.GITHUB_RUN_ID ?? "lokal";
  return `delivered+e2e-${lauf}-${randomUUID().slice(0, 8)}@resend.dev`;
}

function zugangMit(schluessel: string): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, schluessel, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Zugang mit dem geheimen Dienstschlüssel. Nur Test-Setup und Tests nutzen
// ihn hier, um Testdaten anzulegen und zu prüfen.
export function dienstZugang(): SupabaseClient | null {
  const geheim = process.env.SUPABASE_SECRET_KEY;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !geheim) return null;
  return zugangMit(geheim);
}

// Zugang mit dem öffentlichen Schlüssel, so wie ihn jeder Browser hat.
export function oeffentlicherZugang(): SupabaseClient {
  const oeffentlich = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !oeffentlich) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY fehlen.",
    );
  }
  return zugangMit(oeffentlich);
}

// Legt einen Mitarbeiter mit fertigem Login (Passwort gesetzt) an, ohne
// dass eine Mail verschickt wird.
export async function legeZugangAn(
  supabase: SupabaseClient,
  firmaId: string,
  {
    name,
    rolle = "buero",
    aktiv = true,
  }: { name: string; rolle?: Rolle; aktiv?: boolean },
): Promise<TestZugang> {
  const email = testEmail();
  const passwort = randomBytes(18).toString("base64url");

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: passwort,
    email_confirm: true,
  });
  if (error) throw error;

  const { data: mitarbeiter, error: fehler } = await supabase
    .from("mitarbeiter")
    .insert({
      firma_id: firmaId,
      name,
      email,
      rolle,
      aktiv,
      auth_user_id: data.user.id,
    })
    .select("id")
    .single<{ id: string }>();
  if (fehler) {
    // Sonst bliebe ein Login ohne Mitarbeiter zurück, den das Aufräumen
    // nicht mehr findet.
    await supabase.auth.admin.deleteUser(data.user.id);
    throw fehler;
  }

  return { id: mitarbeiter.id, name, email, passwort };
}

export function speichereTestdaten(daten: Testdaten) {
  process.env[UMGEBUNGSVARIABLE] = JSON.stringify(daten);
}

export function ladeTestdaten(): Testdaten | null {
  const roh = process.env[UMGEBUNGSVARIABLE];
  return roh ? (JSON.parse(roh) as Testdaten) : null;
}
