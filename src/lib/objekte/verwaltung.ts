import type { SupabaseClient } from "@supabase/supabase-js";
import { istId } from "@/lib/id";
import type { ObjektDaten } from "./eingabe";

export type Objekt = ObjektDaten & {
  id: string;
  archiviert: boolean;
  kunde: { name: string; archiviert: boolean };
};

const SPALTEN =
  "id, kunde_id, bezeichnung, strasse, adresszusatz, plz, ort, abrechnungsart, pauschale_cent, archiviert, kunde(name, archiviert)";

// Alle Objekte, die der angemeldete Nutzer sehen darf, auch archivierte,
// auf Wunsch nur die eines Kunden. Welche das sind, entscheiden die
// Zugriffsregeln der Datenbank (nur das Büro der eigenen Firma).
export async function ladeObjektliste(
  supabase: SupabaseClient,
  { kundeId }: { kundeId?: string } = {},
): Promise<Objekt[]> {
  let abfrage = supabase.from("objekt").select(SPALTEN).order("bezeichnung");
  if (kundeId) abfrage = abfrage.eq("kunde_id", kundeId);
  const { data, error } = await abfrage.returns<Objekt[]>();
  if (error) throw error;
  return data;
}

export async function ladeObjekt(supabase: SupabaseClient, id: string): Promise<Objekt | null> {
  if (!istId(id)) return null;
  const { data, error } = await supabase
    .from("objekt")
    .select(SPALTEN)
    .eq("id", id)
    .maybeSingle<Objekt>();
  if (error) throw error;
  return data;
}
