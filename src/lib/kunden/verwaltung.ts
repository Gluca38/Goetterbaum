import type { SupabaseClient } from "@supabase/supabase-js";
import { istId } from "@/lib/id";
import type { KundenDaten } from "./eingabe";

export type Kunde = KundenDaten & { id: string; archiviert: boolean };

const SPALTEN = "id, name, strasse, adresszusatz, plz, ort, abrechnungszeitraum, archiviert";

// Alle Kunden, die der angemeldete Nutzer sehen darf, auch archivierte.
// Welche das sind, entscheiden die Zugriffsregeln der Datenbank (nur das
// Büro der eigenen Firma).
export async function ladeKundenliste(supabase: SupabaseClient): Promise<Kunde[]> {
  const { data, error } = await supabase
    .from("kunde")
    .select(SPALTEN)
    .order("name")
    .returns<Kunde[]>();
  if (error) throw error;
  return data;
}

export async function ladeKunde(supabase: SupabaseClient, id: string): Promise<Kunde | null> {
  if (!istId(id)) return null;
  const { data, error } = await supabase
    .from("kunde")
    .select(SPALTEN)
    .eq("id", id)
    .maybeSingle<Kunde>();
  if (error) throw error;
  return data;
}
