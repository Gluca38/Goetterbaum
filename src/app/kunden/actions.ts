"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { alsBuero } from "@/lib/als-buero";
import { pruefeKundenEingabe } from "@/lib/kunden/eingabe";
import { ladeKunde } from "@/lib/kunden/verwaltung";
import { FEHLER, OK, type Rueckmeldung } from "@/lib/rueckmeldung";
import { texte } from "@/texte";

export async function kundeAnlegen(
  _vorher: Rueckmeldung,
  formData: FormData,
): Promise<Rueckmeldung> {
  const { supabase, ich } = await alsBuero();
  const eingabe = pruefeKundenEingabe(formData);
  if (!eingabe.ok) return FEHLER(eingabe.fehler);

  const { data, error } = await supabase
    .from("kunde")
    .insert({ firma_id: ich.firma_id, ...eingabe.daten })
    .select("id")
    .single<{ id: string }>();
  if (error) {
    console.error("Kunde anlegen fehlgeschlagen", error);
    return FEHLER(texte.stammdaten.fehlerUnbekannt);
  }

  redirect(`/kunden/${data.id}`);
}

export async function kundeSpeichern(
  id: string,
  _vorher: Rueckmeldung,
  formData: FormData,
): Promise<Rueckmeldung> {
  const { supabase } = await alsBuero();
  const eingabe = pruefeKundenEingabe(formData);
  if (!eingabe.ok) return FEHLER(eingabe.fehler);

  // Kunden fremder Firmen findet die Datenbank gar nicht erst, dann wird
  // nichts geändert.
  const { data, error } = await supabase
    .from("kunde")
    .update(eingabe.daten)
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("Kunde speichern fehlgeschlagen", error);
    return FEHLER(texte.stammdaten.fehlerUnbekannt);
  }
  if (data.length === 0) return FEHLER(texte.kunden.nichtGefunden);

  refresh();
  return OK(texte.stammdaten.gespeichert);
}

// Archiviert einen Kunden samt seinen Objekten (das übernimmt die
// Datenbank) oder aktiviert ihn wieder, ohne seine Objekte.
export async function kundeArchivieren(
  id: string,
  archiviert: boolean,
): Promise<Rueckmeldung> {
  const { supabase } = await alsBuero();
  const bestand = await ladeKunde(supabase, id);
  if (!bestand) return FEHLER(texte.kunden.nichtGefunden);

  const { error } = await supabase
    .from("kunde")
    .update({ archiviert })
    .eq("id", id);
  if (error) {
    console.error("Kunde archivieren fehlgeschlagen", error);
    return FEHLER(texte.stammdaten.fehlerUnbekannt);
  }

  refresh();
  return OK();
}
