// Lädt, was der Rechenbaustein für einen Kunden und Zeitraum braucht, und
// lässt ihn rechnen. Welche Daten der Nutzer sehen darf, entscheiden die
// Zugriffsregeln der Datenbank (nur das Büro der eigenen Firma).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Abrechnungsart, Rundungsregel } from "@/lib/abrechnung";
import { ladeFirma } from "@/lib/firma/verwaltung";
import { ladeKunde, type Kunde } from "@/lib/kunden/verwaltung";
import {
  rechnungsvorbereitung,
  type Rechnungsvorbereitung,
  type Zeiteintrag,
} from "@/lib/rechnungsvorbereitung";
import { ladeKundenStundensaetze } from "@/lib/stundensaetze/verwaltung";
import { gewaehlterZeitraum, type GewaehlterZeitraum } from "./zeitraum";
import type { Namen } from "./zeilen";

// So viele Zeilen liefert die Schnittstelle höchstens auf einmal
// (max_rows in supabase/config.toml).
const SEITE = 1000;

type ObjektZeile = {
  id: string;
  bezeichnung: string;
  abrechnungsart: Abrechnungsart;
  pauschale_cent: number | null;
  archiviert: boolean;
};

type ZeiteintragZeile = {
  id: string;
  mitarbeiter_id: string;
  art: Zeiteintrag["art"];
  objekt_id: string | null;
  taetigkeit_id: string | null;
  beginn: string;
  ende: string;
};

export type GeladeneRechnungsvorbereitung = {
  ergebnis: Rechnungsvorbereitung;
  namen: Namen;
  rundungsregel: Rundungsregel;
  // Noch nicht freigegebene Zeiteinträge des Kunden, die im Zeitraum
  // beginnen; sie fehlen im Ergebnis.
  nichtFreigegeben: number;
  // Einfließende Zeiteinträge, die vor dem Zeitraum beginnen. Was schon
  // abgerechnet ist, lässt sich noch nicht markieren (#16); das Büro
  // prüft sie deshalb selbst.
  ausFrueherenZeitraeumen: number;
};

// Dazu Kunde und Zeitraum, wie sie aus der Adresszeile gewählt wurden.
export type RechnungsvorbereitungAusAdresse = GeladeneRechnungsvorbereitung & {
  kunde: Kunde;
  zeitraum: GewaehlterZeitraum;
};

export async function ladeRechnungsvorbereitung(
  supabase: SupabaseClient,
  kunde: Kunde,
  standardDerFirma: Rundungsregel,
  zeitraum: GewaehlterZeitraum,
): Promise<GeladeneRechnungsvorbereitung> {
  const rundungsregel = kunde.rundungsregel ?? standardDerFirma;
  const [objekte, taetigkeiten, kundenSaetze] = await Promise.all([
    supabase
      .from("objekt")
      .select("id, bezeichnung, abrechnungsart, pauschale_cent, archiviert")
      .eq("kunde_id", kunde.id)
      .order("bezeichnung")
      .returns<ObjektZeile[]>(),
    // Auch archivierte: Ihre Zeit wird noch abgerechnet.
    supabase
      .from("taetigkeit")
      .select("id, name, standard_stundensatz_cent")
      .order("name")
      .returns<{ id: string; name: string; standard_stundensatz_cent: number }[]>(),
    ladeKundenStundensaetze(supabase, kunde.id),
  ]);
  if (objekte.error) throw objekte.error;
  if (taetigkeiten.error) throw taetigkeiten.error;

  const objektIds = objekte.data.map((o) => o.id);
  const [zeiteintraege, nichtFreigegeben] = await Promise.all([
    ladeFreigegebeneZeiteintraege(supabase, objektIds, zeitraum.bisVor),
    zaehleNichtFreigegebene(supabase, objektIds, zeitraum),
  ]);

  const ergebnis = rechnungsvorbereitung({
    kunde: { rundungsregel, abrechnungszeitraum: kunde.abrechnungszeitraum },
    ersterMonat: zeitraum.ersterMonat,
    // Ein archiviertes Pauschal-Objekt bekommt keine Pauschale mehr; die
    // Zeit in archivierten Stunden-Objekten wird noch abgerechnet.
    objekte: objekte.data
      .filter((o) => !o.archiviert || o.abrechnungsart === "stunden")
      .map((o) => ({
        id: o.id,
        abrechnungsart: o.abrechnungsart,
        pauschaleCent: o.pauschale_cent,
      })),
    taetigkeiten: taetigkeiten.data.map((t) => ({
      id: t.id,
      standardStundensatzCent: t.standard_stundensatz_cent,
      kundenStundensatzCent:
        kundenSaetze.find((s) => s.taetigkeit_id === t.id)?.stundensatz_cent ?? null,
    })),
    // Zusatzaufträge und Abrechnungen gibt es noch nicht (#16, #17).
    zusatzauftraege: [],
    zeiteintraege: zeiteintraege.map((z) => ({
      id: z.id,
      mitarbeiterId: z.mitarbeiter_id,
      art: z.art,
      objektId: z.objekt_id,
      taetigkeitId: z.taetigkeit_id,
      zusatzauftragId: null,
      beginn: z.beginn,
      ende: z.ende,
    })),
    abgerechnetePauschalMonate: [],
  });

  const vorDemZeitraum = new Set(
    zeiteintraege.filter((z) => Date.parse(z.beginn) < Date.parse(zeitraum.ab)).map((z) => z.id),
  );
  return {
    ergebnis,
    namen: {
      objekte: new Map(objekte.data.map((o) => [o.id, o.bezeichnung])),
      taetigkeiten: new Map(taetigkeiten.data.map((t) => [t.id, t.name])),
    },
    rundungsregel,
    nichtFreigegeben,
    ausFrueherenZeitraeumen: ergebnis.zeiteintragIds.filter((id) => vorDemZeitraum.has(id)).length,
  };
}

// Alle freigegebenen Zeiteinträge in den Objekten, die vor dem Ende des
// Zeitraums beginnen. Was davon in welchen Zeitraum gehört, entscheidet
// der Rechenbaustein.
async function ladeFreigegebeneZeiteintraege(
  supabase: SupabaseClient,
  objektIds: string[],
  bisVor: string,
): Promise<ZeiteintragZeile[]> {
  if (objektIds.length === 0) return [];
  const alle: ZeiteintragZeile[] = [];
  for (let ab = 0; ; ab += SEITE) {
    const { data, error } = await supabase
      .from("zeiteintrag")
      .select("id, mitarbeiter_id, art, objekt_id, taetigkeit_id, beginn, ende")
      .in("objekt_id", objektIds)
      .not("freigegeben_am", "is", null)
      .lt("beginn", bisVor)
      .order("id")
      .range(ab, ab + SEITE - 1)
      .returns<ZeiteintragZeile[]>();
    if (error) throw error;
    alle.push(...data);
    if (data.length < SEITE) return alle;
  }
}

async function zaehleNichtFreigegebene(
  supabase: SupabaseClient,
  objektIds: string[],
  zeitraum: GewaehlterZeitraum,
): Promise<number> {
  if (objektIds.length === 0) return 0;
  const { count, error } = await supabase
    .from("zeiteintrag")
    .select("id", { count: "exact", head: true })
    .in("objekt_id", objektIds)
    .is("freigegeben_am", null)
    .gte("beginn", zeitraum.ab)
    .lt("beginn", zeitraum.bisVor);
  if (error) throw error;
  return count ?? 0;
}

type Parameter = Record<string, string | string[] | undefined>;

// Die Rechnungsvorbereitung zu Kunde und Monat aus der Adresszeile (kunde,
// monat; ohne Monat der zuletzt abgeschlossene Zeitraum), oder null, wenn
// kein Kunde gewählt ist oder es ihn nicht gibt. Seite und CSV-Export laden
// über diese Funktion, damit beide dieselben Positionen zeigen.
export async function ladeRechnungsvorbereitungAusAdresse(
  supabase: SupabaseClient,
  firmaId: string,
  parameter: Parameter,
): Promise<RechnungsvorbereitungAusAdresse | null> {
  const kundeId = typeof parameter.kunde === "string" ? parameter.kunde : "";
  const [kunde, firma] = await Promise.all([
    ladeKunde(supabase, kundeId),
    ladeFirma(supabase, firmaId),
  ]);
  if (!kunde) return null;
  const zeitraum = gewaehlterZeitraum(parameter.monat, kunde.abrechnungszeitraum, Date.now());
  const geladen = await ladeRechnungsvorbereitung(supabase, kunde, firma.rundungsregel, zeitraum);
  return { ...geladen, kunde, zeitraum };
}
