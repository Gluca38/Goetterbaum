import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Alles, was ein Testlauf auf Supabase-Staging anlegt. Jeder Lauf bekommt
// eigene Firmen und Zugänge, damit sich parallele Läufe nicht stören.

export type TestZugang = {
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
  firmaA: TestFirma & { deaktiviert: TestZugang };
  firmaB: TestFirma;
};

// Erkennungszeichen aller Test-Firmen. Damit räumt das Aufräumen auch
// Reste abgebrochener Läufe auf.
export const TEST_FIRMA_PRAEFIX = "E2E-Test";

const UMGEBUNGSVARIABLE = "E2E_TESTDATEN";

function zugangMit(schluessel: string): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, schluessel, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Zugang mit dem geheimen Dienstschlüssel. Nur das Test-Setup nutzt ihn,
// nie die App selbst.
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

export function speichereTestdaten(daten: Testdaten) {
  process.env[UMGEBUNGSVARIABLE] = JSON.stringify(daten);
}

export function ladeTestdaten(): Testdaten | null {
  const roh = process.env[UMGEBUNGSVARIABLE];
  return roh ? (JSON.parse(roh) as Testdaten) : null;
}
