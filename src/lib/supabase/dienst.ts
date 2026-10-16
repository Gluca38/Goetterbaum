import { createClient } from "@supabase/supabase-js";
import { supabaseUmgebung } from "./umgebung";

// Supabase-Zugang mit dem geheimen Dienstschlüssel. Er umgeht alle
// Zugriffsregeln der Datenbank und darf deshalb nur auf dem Server und nur
// für das genutzt werden, was ein normaler Nutzer nicht kann: Logins
// anlegen (Einladung) und ändern. Vorher muss immer geprüft sein, dass der
// angemeldete Nutzer zum Büro gehört.
// Der Schlüssel heißt bewusst nicht NEXT_PUBLIC_…, so gelangt er nie in
// den Browser.
export function createDienstClient() {
  const { url } = supabaseUmgebung();
  const geheim = process.env.SUPABASE_SECRET_KEY;
  if (!geheim) {
    throw new Error("SUPABASE_SECRET_KEY muss gesetzt sein.");
  }
  return createClient(url, geheim, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
