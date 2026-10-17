import type { SupabaseClient } from "@supabase/supabase-js";
import type { Sparte } from "@/lib/sparte";
import { angezeigtAb, type MeinZeiteintrag } from "./anzeige";

// Was ein Mitarbeiter beim Start sieht. Preise und Kunden liefern die
// Datenbank-Funktionen bewusst nicht mit.
export type ObjektZurAuswahl = {
  id: string;
  bezeichnung: string;
  strasse: string;
  adresszusatz: string | null;
  plz: string;
  ort: string;
};

export type TaetigkeitZurAuswahl = { id: string; name: string; sparte: Sparte };

// Die aktiven Objekte und Tätigkeiten der eigenen Firma.
export async function ladeAuswahl(supabase: SupabaseClient): Promise<{
  objekte: ObjektZurAuswahl[];
  taetigkeiten: TaetigkeitZurAuswahl[];
}> {
  const [objekte, taetigkeiten] = await Promise.all([
    supabase.rpc("objekte_zur_auswahl"),
    supabase.rpc("taetigkeiten_zur_auswahl"),
  ]);
  if (objekte.error) throw objekte.error;
  if (taetigkeiten.error) throw taetigkeiten.error;
  return { objekte: objekte.data, taetigkeiten: taetigkeiten.data };
}

// Die eigenen Zeiteinträge der angezeigten Tage und immer der laufende,
// dazu der Zeitpunkt, zu dem geladen wurde.
export async function ladeMeineZeiteintraege(
  supabase: SupabaseClient,
): Promise<{ eintraege: MeinZeiteintrag[]; jetzt: number }> {
  const jetzt = Date.now();
  const { data, error } = await supabase.rpc("meine_zeiteintraege", { ab: angezeigtAb(jetzt) });
  if (error) throw error;
  return { eintraege: data, jetzt };
}
