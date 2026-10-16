import type { SupabaseClient } from "@supabase/supabase-js";
import type { KundenDaten } from "./eingabe";

export type Kunde = KundenDaten & { id: string; archiviert: boolean };

const SPALTEN =
  "id, name, strasse, adresszusatz, plz, ort, abrechnungszeitraum, archiviert";

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

export async function ladeKunde(
  supabase: SupabaseClient,
  id: string,
): Promise<Kunde | null> {
  // Eine ungültige Kennung in der Adresse ist einfach "nicht gefunden".
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase
    .from("kunde")
    .select(SPALTEN)
    .eq("id", id)
    .maybeSingle<Kunde>();
  if (error) throw error;
  return data;
}
