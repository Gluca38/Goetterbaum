import type { SupabaseClient } from "@supabase/supabase-js";
import { istId } from "@/lib/id";
import type { TaetigkeitsDaten } from "./eingabe";

export type Taetigkeit = TaetigkeitsDaten & { id: string; archiviert: boolean };

const SPALTEN = "id, name, sparte, standard_stundensatz_cent, archiviert";

// Alle Tätigkeiten, die der angemeldete Nutzer sehen darf, auch
// archivierte. Welche das sind, entscheiden die Zugriffsregeln der
// Datenbank (nur das Büro der eigenen Firma).
export async function ladeTaetigkeitenliste(supabase: SupabaseClient): Promise<Taetigkeit[]> {
  const { data, error } = await supabase
    .from("taetigkeit")
    .select(SPALTEN)
    .order("sparte")
    .order("name")
    .returns<Taetigkeit[]>();
  if (error) throw error;
  return data;
}

export async function ladeTaetigkeit(
  supabase: SupabaseClient,
  id: string,
): Promise<Taetigkeit | null> {
  if (!istId(id)) return null;
  const { data, error } = await supabase
    .from("taetigkeit")
    .select(SPALTEN)
    .eq("id", id)
    .maybeSingle<Taetigkeit>();
  if (error) throw error;
  return data;
}
