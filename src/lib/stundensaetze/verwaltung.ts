import type { SupabaseClient } from "@supabase/supabase-js";
import type { KundenStundensatzDaten } from "./eingabe";

// Die abweichenden Stundensätze eines Kunden. Welche der Nutzer sehen
// darf, entscheiden die Zugriffsregeln der Datenbank (nur das Büro der
// eigenen Firma).
export async function ladeKundenStundensaetze(
  supabase: SupabaseClient,
  kundeId: string,
): Promise<KundenStundensatzDaten[]> {
  const { data, error } = await supabase
    .from("kunden_stundensatz")
    .select("taetigkeit_id, stundensatz_cent")
    .eq("kunde_id", kundeId)
    .returns<KundenStundensatzDaten[]>();
  if (error) throw error;
  return data;
}
