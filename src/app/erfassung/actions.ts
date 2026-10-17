"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { angemeldeterMitarbeiter } from "@/lib/angemeldeter-mitarbeiter";
import { FEHLER, OK, type Rueckmeldung } from "@/lib/rueckmeldung";
import { createClient } from "@/lib/supabase/server";
import { pruefeStartEingabe } from "@/lib/zeiterfassung/eingabe";
import { texte } from "@/texte";

// Fehlercodes der Datenbank (siehe Migration zum Zeiteintrag): Es läuft
// schon einer (eindeutig je Mitarbeiter), bzw. Objekt oder Tätigkeit sind
// archiviert (Prüfregel) oder gehören nicht zur Firma (Fremdschlüssel).
const LAEUFT_SCHON = "23505";
const PRUEFREGEL_VERLETZT = "23514";
const FREMDSCHLUESSEL_VERLETZT = "23503";

// Jede Aktion ist auch ohne die Oberfläche per Direktaufruf erreichbar.
// Deshalb prüft sie zuerst, wer angemeldet ist. Gespeichert wird im Namen
// dieses Nutzers, die Zugriffsregeln der Datenbank greifen also zusätzlich.
// Bewusst ohne Umleitung: Die Oberfläche fängt Fehler der Verbindung ab,
// eine Umleitung würde dabei verloren gehen.
async function alsErfasser() {
  const supabase = await createClient();
  const ich = await angemeldeterMitarbeiter(supabase);
  return { supabase, ich };
}

function fehlerBeimStart(error: PostgrestError): Rueckmeldung {
  if (error.code === LAEUFT_SCHON) return FEHLER(texte.erfassung.fehlerLaeuftSchon);
  if (error.code === PRUEFREGEL_VERLETZT || error.code === FREMDSCHLUESSEL_VERLETZT) {
    return FEHLER(texte.erfassung.fehlerNichtZurAuswahl);
  }
  console.error("Zeiteintrag starten fehlgeschlagen", error);
  return FEHLER(texte.erfassung.fehlerStart);
}

export async function zeiteintragStarten(
  _vorher: Rueckmeldung,
  formData: FormData,
): Promise<Rueckmeldung> {
  const { supabase, ich } = await alsErfasser();
  if (!ich) return FEHLER(texte.erfassung.fehlerAbgemeldet);

  const eingabe = pruefeStartEingabe(formData);
  if (!eingabe.ok) return FEHLER(eingabe.fehler);

  const { error } = await supabase
    .from("zeiteintrag")
    .insert({ firma_id: ich.firma_id, mitarbeiter_id: ich.id, ...eingabe.daten });
  if (error) return fehlerBeimStart(error);

  refresh();
  return OK();
}

export async function fahrtStarten(): Promise<Rueckmeldung> {
  const { supabase, ich } = await alsErfasser();
  if (!ich) return FEHLER(texte.erfassung.fehlerAbgemeldet);

  const { error } = await supabase
    .from("zeiteintrag")
    .insert({ firma_id: ich.firma_id, mitarbeiter_id: ich.id, art: "fahrt" });
  if (error) return fehlerBeimStart(error);

  refresh();
  return OK();
}

// Stoppt den laufenden Zeiteintrag. Das Ende setzt die Datenbank mit ihrer
// eigenen Uhr; der mitgeschickte Wert ist nur nötig, damit sich überhaupt
// etwas ändert.
export async function zeiteintragStoppen(): Promise<Rueckmeldung> {
  const { supabase, ich } = await alsErfasser();
  if (!ich) return FEHLER(texte.erfassung.fehlerAbgemeldet);

  const { data, error } = await supabase
    .from("zeiteintrag")
    .update({ ende: new Date().toISOString() })
    .eq("mitarbeiter_id", ich.id)
    .is("ende", null)
    .select("id");
  if (error) {
    console.error("Zeiteintrag stoppen fehlgeschlagen", error);
    return FEHLER(texte.erfassung.fehlerStopp);
  }

  refresh();
  // Schon woanders gestoppt (z. B. auf einem zweiten Gerät).
  if (data.length === 0) return FEHLER(texte.erfassung.fehlerLaeuftNichts);
  return OK();
}
