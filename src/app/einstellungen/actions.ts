"use server";

import { refresh } from "next/cache";
import { istRundungsregel } from "@/lib/abrechnung";
import { alsBuero } from "@/lib/als-buero";
import { FEHLER, OK, type Rueckmeldung } from "@/lib/rueckmeldung";
import { texte } from "@/texte";

// Legt die Standard-Rundungsregel der eigenen Firma fest. Sie gilt für alle
// Kunden ohne eigene Regel.
export async function rundungsregelSpeichern(
  _vorher: Rueckmeldung,
  formData: FormData,
): Promise<Rueckmeldung> {
  const { supabase, ich } = await alsBuero();
  const rundungsregel = String(formData.get("rundungsregel") ?? "");
  if (!istRundungsregel(rundungsregel)) return FEHLER(texte.einstellungen.fehlerRundungsregel);

  const { data, error } = await supabase
    .from("firma")
    .update({ rundungsregel })
    .eq("id", ich.firma_id)
    .select("id");
  if (error || data.length === 0) {
    console.error("Rundungsregel speichern fehlgeschlagen", error);
    return FEHLER(texte.stammdaten.fehlerUnbekannt);
  }

  refresh();
  return OK(texte.stammdaten.gespeichert);
}
