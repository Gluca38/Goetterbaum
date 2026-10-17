"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { alsBuero } from "@/lib/als-buero";
import { pruefeTaetigkeitsEingabe } from "@/lib/taetigkeiten/eingabe";
import { ladeTaetigkeit } from "@/lib/taetigkeiten/verwaltung";
import { FEHLER, OK, type Rueckmeldung } from "@/lib/rueckmeldung";
import { texte } from "@/texte";

// Den Namen gibt es in der Firma schon (eindeutig ohne Rücksicht auf Groß-
// und Kleinschreibung, siehe Migration).
const NAME_VERGEBEN = "23505";

function fehlerBeimSpeichern(was: string, error: PostgrestError): Rueckmeldung {
  if (error.code === NAME_VERGEBEN) return FEHLER(texte.taetigkeiten.fehlerNameVergeben);
  console.error(`Tätigkeit ${was} fehlgeschlagen`, error);
  return FEHLER(texte.stammdaten.fehlerUnbekannt);
}

export async function taetigkeitAnlegen(
  _vorher: Rueckmeldung,
  formData: FormData,
): Promise<Rueckmeldung> {
  const { supabase, ich } = await alsBuero();
  const eingabe = pruefeTaetigkeitsEingabe(formData);
  if (!eingabe.ok) return FEHLER(eingabe.fehler);

  const { data, error } = await supabase
    .from("taetigkeit")
    .insert({ firma_id: ich.firma_id, ...eingabe.daten })
    .select("id")
    .single<{ id: string }>();
  if (error) return fehlerBeimSpeichern("anlegen", error);

  redirect(`/taetigkeiten/${data.id}`);
}

export async function taetigkeitSpeichern(
  id: string,
  _vorher: Rueckmeldung,
  formData: FormData,
): Promise<Rueckmeldung> {
  const { supabase } = await alsBuero();
  // Über den eigenen Zugang geladen: Tätigkeiten fremder Firmen findet die
  // Datenbank gar nicht erst.
  const bestand = await ladeTaetigkeit(supabase, id);
  if (!bestand) return FEHLER(texte.taetigkeiten.nichtGefunden);

  const eingabe = pruefeTaetigkeitsEingabe(formData);
  if (!eingabe.ok) return FEHLER(eingabe.fehler);

  const { error } = await supabase.from("taetigkeit").update(eingabe.daten).eq("id", id);
  if (error) return fehlerBeimSpeichern("speichern", error);

  refresh();
  return OK(texte.stammdaten.gespeichert);
}

export async function taetigkeitArchivieren(
  id: string,
  archiviert: boolean,
): Promise<Rueckmeldung> {
  const { supabase } = await alsBuero();
  const bestand = await ladeTaetigkeit(supabase, id);
  if (!bestand) return FEHLER(texte.taetigkeiten.nichtGefunden);

  const { error } = await supabase.from("taetigkeit").update({ archiviert }).eq("id", id);
  if (error) return fehlerBeimSpeichern("archivieren", error);

  refresh();
  return OK();
}
