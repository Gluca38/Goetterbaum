"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { angemeldeterMitarbeiter } from "@/lib/angemeldeter-mitarbeiter";
import { istId } from "@/lib/id";
import { FEHLER, OK, type Rueckmeldung } from "@/lib/rueckmeldung";
import { createClient } from "@/lib/supabase/server";
import { pruefeStartEingabe } from "@/lib/zeiterfassung/eingabe";
import { pruefeNachtragEingabe } from "@/lib/zeiterfassung/nachtrag";
import { texte } from "@/texte";

// Fehlercodes der Datenbank (siehe Migration zum Zeiteintrag): Es läuft
// schon einer (eindeutig je Mitarbeiter), bzw. Objekt oder Tätigkeit sind
// archiviert (Prüfregel) oder gehören nicht zur Firma (Fremdschlüssel).
const LAEUFT_SCHON = "23505";
const PRUEFREGEL_VERLETZT = "23514";
const FREMDSCHLUESSEL_VERLETZT = "23503";
// Der Eintrag überschneidet sich mit einem anderen desselben Mitarbeiters
// (Ausschlussregel, siehe Migration zu Nachträgen).
const UEBERSCHNEIDUNG = "23P01";

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
  // Ein Start überschneidet sich nur mit einem laufenden Eintrag, denn
  // Nachträge enden nie in der Zukunft.
  if (error.code === LAEUFT_SCHON || error.code === UEBERSCHNEIDUNG) {
    return FEHLER(texte.erfassung.fehlerLaeuftSchon);
  }
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

function fehlerBeimNachtrag(error: PostgrestError): Rueckmeldung {
  if (error.code === UEBERSCHNEIDUNG) return FEHLER(texte.nachtrag.fehlerUeberschneidung);
  if (error.code === PRUEFREGEL_VERLETZT || error.code === FREMDSCHLUESSEL_VERLETZT) {
    return FEHLER(texte.erfassung.fehlerNichtZurAuswahl);
  }
  console.error("Nachtrag speichern fehlgeschlagen", error);
  return FEHLER(texte.nachtrag.fehlerNichtGespeichert);
}

// Trägt einen beendeten Zeiteintrag nachträglich ein. Als Nachtrag
// markiert ihn die Datenbank.
export async function zeiteintragNachtragen(
  _vorher: Rueckmeldung,
  formData: FormData,
): Promise<Rueckmeldung> {
  const { supabase, ich } = await alsErfasser();
  if (!ich) return FEHLER(texte.erfassung.fehlerAbgemeldet);

  const eingabe = pruefeNachtragEingabe(formData, Date.now());
  if (!eingabe.ok) return FEHLER(eingabe.fehler);

  const { error } = await supabase
    .from("zeiteintrag")
    .insert({ firma_id: ich.firma_id, mitarbeiter_id: ich.id, ...eingabe.daten });
  if (error) return fehlerBeimNachtrag(error);

  refresh();
  return OK(texte.nachtrag.gespeichert);
}

// Ändert einen eigenen, beendeten Zeiteintrag. Ändern sich Beginn oder
// Ende, wird er in der Datenbank zum Nachtrag.
export async function zeiteintragAendern(
  id: string,
  _vorher: Rueckmeldung,
  formData: FormData,
): Promise<Rueckmeldung> {
  const { supabase, ich } = await alsErfasser();
  if (!ich) return FEHLER(texte.erfassung.fehlerAbgemeldet);
  if (!istId(id)) return FEHLER(texte.nachtrag.nichtGefunden);

  const eingabe = pruefeNachtragEingabe(formData, Date.now());
  if (!eingabe.ok) return FEHLER(eingabe.fehler);

  const { data, error } = await supabase
    .from("zeiteintrag")
    .update(eingabe.daten)
    .eq("id", id)
    .eq("mitarbeiter_id", ich.id)
    .not("ende", "is", null)
    .select("id");
  if (error) return fehlerBeimNachtrag(error);

  refresh();
  if (data.length === 0) return FEHLER(texte.nachtrag.nichtGefunden);
  return OK(texte.nachtrag.gespeichert);
}
