import type { SupabaseClient } from "@supabase/supabase-js";
import { istId } from "@/lib/id";
import type { Sparte } from "@/lib/sparte";
import {
  angezeigtAb,
  istUnvollstaendig,
  type MeinZeiteintrag,
  type ZeiteintragArt,
} from "./anzeige";
import { protokollAnzeigen, type AngezeigteProtokollZeile, type ProtokollZeile } from "./protokoll";

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

// Die Zeiteinträge eines Mitarbeiters in den angezeigten Tagen und immer
// der laufende, dazu der Zeitpunkt, zu dem geladen wurde. Fremde
// Mitarbeiter liefert die Datenbank nur Vorarbeitern und dem Büro.
export async function ladeZeiteintraegeVon(
  supabase: SupabaseClient,
  mitarbeiterId: string,
): Promise<{ eintraege: MeinZeiteintrag[]; jetzt: number }> {
  const jetzt = Date.now();
  const { data, error } = await supabase.rpc("zeiteintraege_von", {
    wer: mitarbeiterId,
    ab: angezeigtAb(jetzt),
  });
  if (error) throw error;
  return { eintraege: data, jetzt };
}

// Ein aktiver Mitarbeiter, für den erfasst wird.
export type MitarbeiterZumErfassen = { id: string; name: string };

// Alle aktiven Mitarbeiter der Firma außer dem angemeldeten, nach Name.
export async function ladeAndereMitarbeiter(
  supabase: SupabaseClient,
  ichId: string,
): Promise<MitarbeiterZumErfassen[]> {
  const { data, error } = await supabase
    .from("mitarbeiter")
    .select("id, name")
    .eq("aktiv", true)
    .neq("id", ichId)
    .order("name")
    .returns<MitarbeiterZumErfassen[]>();
  if (error) throw error;
  return data;
}

// Ein Mitarbeiter, oder null, wenn es ihn nicht gibt, der angemeldete
// Nutzer ihn nicht sehen darf oder er deaktiviert ist (außer mit
// auchDeaktivierte).
export async function ladeMitarbeiterZumErfassen(
  supabase: SupabaseClient,
  id: string,
  auchDeaktivierte: boolean,
): Promise<(MitarbeiterZumErfassen & { aktiv: boolean }) | null> {
  if (!istId(id)) return null;
  let abfrage = supabase.from("mitarbeiter").select("id, name, aktiv").eq("id", id);
  if (!auchDeaktivierte) abfrage = abfrage.eq("aktiv", true);
  const { data, error } = await abfrage.maybeSingle<MitarbeiterZumErfassen & { aktiv: boolean }>();
  if (error) throw error;
  return data;
}

// Ein Zeiteintrag mit allem, was zum Ändern nötig ist, oder null, wenn es
// ihn nicht gibt oder der angemeldete Nutzer ihn nicht sehen darf (normale
// Mitarbeiter sehen nur ihre eigenen). unvollstaendig: Er läuft seit mehr
// als 12 Stunden, zum Zeitpunkt des Ladens.
export type ZeiteintragZumAendern = {
  id: string;
  mitarbeiter_id: string;
  art: ZeiteintragArt;
  objekt_id: string | null;
  taetigkeit_id: string | null;
  beginn: string;
  ende: string | null;
  unvollstaendig: boolean;
};

export async function ladeZeiteintragZumAendern(
  supabase: SupabaseClient,
  id: string,
): Promise<ZeiteintragZumAendern | null> {
  if (!istId(id)) return null;
  const { data, error } = await supabase
    .from("zeiteintrag")
    .select("id, mitarbeiter_id, art, objekt_id, taetigkeit_id, beginn, ende")
    .eq("id", id)
    .maybeSingle<Omit<ZeiteintragZumAendern, "unvollstaendig">>();
  if (error) throw error;
  return data && { ...data, unvollstaendig: istUnvollstaendig(data, Date.now()) };
}

// Ein Zeiteintrag, wie ihn das Büro in der Übersicht sieht.
export type ZeiteintragDerFirma = Omit<MeinZeiteintrag, "angelegt_von"> & {
  mitarbeiter_name: string;
};

// Fürs Büro: alle Zeiteinträge der Firma in den angezeigten Tagen und alle
// laufenden, der neueste zuerst, dazu der Zeitpunkt, zu dem geladen wurde.
export async function ladeZeiteintraegeDerFirma(
  supabase: SupabaseClient,
): Promise<{ eintraege: ZeiteintragDerFirma[]; jetzt: number }> {
  const jetzt = Date.now();
  const { data, error } = await supabase.rpc("zeiteintraege_der_firma", {
    ab: angezeigtAb(jetzt),
  });
  if (error) throw error;
  return { eintraege: data, jetzt };
}

// Fürs Büro: die Prüfliste aller unvollständigen Zeiteinträge der Firma,
// der älteste zuerst. Mit "ab" = unendlich liefert die Datenbank nur die
// laufenden.
export async function ladeUnvollstaendigeEintraege(
  supabase: SupabaseClient,
): Promise<{ eintraege: ZeiteintragDerFirma[]; jetzt: number }> {
  const jetzt = Date.now();
  const { data, error } = await supabase
    .rpc("zeiteintraege_der_firma", { ab: "infinity" })
    .order("beginn");
  if (error) throw error;
  const laufende: ZeiteintragDerFirma[] = data;
  return { eintraege: laufende.filter((e) => istUnvollstaendig(e, jetzt)), jetzt };
}

// Fürs Büro: ein Zeiteintrag der Firma mit seinem aufbereiteten
// Änderungsprotokoll und dem Zeitpunkt, zu dem geladen wurde, oder null,
// wenn es ihn nicht gibt.
export async function ladeZeiteintragMitProtokoll(
  supabase: SupabaseClient,
  id: string,
): Promise<{
  eintrag: ZeiteintragDerFirma;
  protokoll: AngezeigteProtokollZeile[];
  jetzt: number;
} | null> {
  if (!istId(id)) return null;
  const jetzt = Date.now();
  const [eintrag, protokoll] = await Promise.all([
    supabase
      .rpc("zeiteintraege_der_firma", { ab: "-infinity" })
      .eq("id", id)
      .maybeSingle<ZeiteintragDerFirma>(),
    supabase.rpc("protokoll_zum_zeiteintrag", { eintrag: id }),
  ]);
  if (eintrag.error) throw eintrag.error;
  if (protokoll.error) throw protokoll.error;
  if (!eintrag.data) return null;

  const zeilen: ProtokollZeile[] = protokoll.data;
  const ids = (spalte: "objekt_id" | "taetigkeit_id") => [
    ...new Set(
      zeilen
        .flatMap((z) => [z.vorher?.[spalte], z.nachher[spalte]])
        .filter((wert): wert is string => typeof wert === "string"),
    ),
  ];
  // Auch archivierte, damit alte Stände lesbar bleiben.
  const [objekte, taetigkeiten] = await Promise.all([
    supabase.from("objekt").select("id, bezeichnung").in("id", ids("objekt_id")),
    supabase.from("taetigkeit").select("id, name").in("id", ids("taetigkeit_id")),
  ]);
  if (objekte.error) throw objekte.error;
  if (taetigkeiten.error) throw taetigkeiten.error;

  return {
    eintrag: eintrag.data,
    jetzt,
    protokoll: protokollAnzeigen(zeilen, {
      objekte: new Map(objekte.data.map((o) => [o.id, o.bezeichnung])),
      taetigkeiten: new Map(taetigkeiten.data.map((t) => [t.id, t.name])),
    }),
  };
}
