"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { alsBuero } from "@/lib/als-buero";
import { ladeKunde } from "@/lib/kunden/verwaltung";
import { pruefeObjektEingabe } from "@/lib/objekte/eingabe";
import { pruefeObjektAktiv } from "@/lib/objekte/regeln";
import { ladeObjekt } from "@/lib/objekte/verwaltung";
import { FEHLER, OK, type Rueckmeldung } from "@/lib/rueckmeldung";
import { texte } from "@/texte";

// Prüft, dass der gewählte Kunde zur eigenen Firma gehört und ein Objekt
// mit diesem Archiv-Status haben darf. Liefert die Fehlermeldung oder null.
async function pruefeKundeFuerObjekt(
  supabase: SupabaseClient,
  kundeId: string,
  archiviert: boolean,
): Promise<string | null> {
  const kunde = await ladeKunde(supabase, kundeId);
  if (!kunde) return texte.objekte.fehlerKunde;
  return pruefeObjektAktiv({ archiviert }, kunde);
}

export async function objektAnlegen(
  _vorher: Rueckmeldung,
  formData: FormData,
): Promise<Rueckmeldung> {
  const { supabase, ich } = await alsBuero();
  const eingabe = pruefeObjektEingabe(formData);
  if (!eingabe.ok) return FEHLER(eingabe.fehler);

  const regelverstoss = await pruefeKundeFuerObjekt(supabase, eingabe.daten.kunde_id, false);
  if (regelverstoss) return FEHLER(regelverstoss);

  const { data, error } = await supabase
    .from("objekt")
    .insert({ firma_id: ich.firma_id, ...eingabe.daten })
    .select("id")
    .single<{ id: string }>();
  if (error) {
    console.error("Objekt anlegen fehlgeschlagen", error);
    return FEHLER(texte.stammdaten.fehlerUnbekannt);
  }

  redirect(`/objekte/${data.id}`);
}

export async function objektSpeichern(
  id: string,
  _vorher: Rueckmeldung,
  formData: FormData,
): Promise<Rueckmeldung> {
  const { supabase } = await alsBuero();
  const bestand = await ladeObjekt(supabase, id);
  if (!bestand) return FEHLER(texte.objekte.nichtGefunden);

  const eingabe = pruefeObjektEingabe(formData);
  if (!eingabe.ok) return FEHLER(eingabe.fehler);

  const regelverstoss = await pruefeKundeFuerObjekt(
    supabase,
    eingabe.daten.kunde_id,
    bestand.archiviert,
  );
  if (regelverstoss) return FEHLER(regelverstoss);

  const { error } = await supabase
    .from("objekt")
    .update(eingabe.daten)
    .eq("id", id);
  if (error) {
    console.error("Objekt speichern fehlgeschlagen", error);
    return FEHLER(texte.stammdaten.fehlerUnbekannt);
  }

  refresh();
  return OK(texte.stammdaten.gespeichert);
}

export async function objektArchivieren(
  id: string,
  archiviert: boolean,
): Promise<Rueckmeldung> {
  const { supabase } = await alsBuero();
  const bestand = await ladeObjekt(supabase, id);
  if (!bestand) return FEHLER(texte.objekte.nichtGefunden);

  const regelverstoss = pruefeObjektAktiv({ archiviert }, bestand.kunde);
  if (regelverstoss) return FEHLER(regelverstoss);

  const { error } = await supabase
    .from("objekt")
    .update({ archiviert })
    .eq("id", id);
  if (error) {
    console.error("Objekt archivieren fehlgeschlagen", error);
    return FEHLER(texte.stammdaten.fehlerUnbekannt);
  }

  refresh();
  return OK();
}
