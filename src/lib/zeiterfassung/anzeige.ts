// Bereitet die eigenen Zeiteinträge für die Anzeige am Handy auf. Tage
// und Uhrzeiten gelten in Berlin, egal wo der Server läuft.
import { berlinerDatum, berlinerMitternacht } from "@/lib/berliner-zeit";
import { texte } from "@/texte";

// Die Arten eines Zeiteintrags, wie in der Datenbank (Typ zeiteintrag_art).
export type ZeiteintragArt = "taetigkeit" | "fahrt";

// Die Art in Worten.
export function artAlsText(art: ZeiteintragArt): string {
  return art === "fahrt" ? texte.erfassung.fahrt : texte.erfassung.taetigkeit;
}

// Ein eigener Zeiteintrag, wie ihn die Datenbank-Funktion
// meine_zeiteintraege liefert.
export type MeinZeiteintrag = {
  id: string;
  art: ZeiteintragArt;
  // Zeitpunkte als ISO-Text mit Zeitzone; ende ist leer, solange er läuft.
  beginn: string;
  ende: string | null;
  // Nachträglich eingetragen oder geändert (setzt die Datenbank).
  nachtrag: boolean;
  objekt_bezeichnung: string | null;
  taetigkeit_name: string | null;
};

export type AngezeigterEintrag = MeinZeiteintrag & {
  von: string;
  bis: string;
  dauer: string;
};

export type Tag = { datum: string; titel: string; eintraege: AngezeigterEintrag[] };

const uhrzeit = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
});

const tagesTitel = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

// Eine Dauer in ms als "Stunden:Minuten h", auf ganze Minuten gerundet.
function dauerAlsText(ms: number): string {
  const minuten = Math.round(ms / 60_000);
  return `${Math.floor(minuten / 60)}:${String(minuten % 60).padStart(2, "0")} h`;
}

// Die beendeten Einträge je Kalendertag (nach Beginn), der neueste Tag
// zuerst, innerhalb eines Tages in zeitlicher Reihenfolge.
export function nachTagen(eintraege: MeinZeiteintrag[]): Tag[] {
  const tage = new Map<string, Tag>();
  const sortiert = eintraege
    .filter((e): e is MeinZeiteintrag & { ende: string } => e.ende !== null)
    .sort((a, b) => Date.parse(a.beginn) - Date.parse(b.beginn));

  for (const e of sortiert) {
    const beginn = Date.parse(e.beginn);
    const ende = Date.parse(e.ende);
    const datum = berlinerDatum(beginn);
    const tag = tage.get(datum) ?? { datum, titel: tagesTitel.format(beginn), eintraege: [] };
    tag.eintraege.push({
      ...e,
      von: uhrzeit.format(beginn),
      bis: uhrzeit.format(ende),
      dauer: dauerAlsText(ende - beginn),
    });
    tage.set(datum, tag);
  }

  return [...tage.values()].sort((a, b) => b.datum.localeCompare(a.datum));
}

// Seit wann ein Eintrag läuft: heute nur die Uhrzeit, an einem früheren
// Tag mit Tag davor, damit ein vergessener Stopp auffällt.
export function laeuftSeit(beginn: string, jetzt: number): string {
  const zeitpunkt = Date.parse(beginn);
  const um = uhrzeit.format(zeitpunkt);
  if (berlinerDatum(zeitpunkt) === berlinerDatum(jetzt)) return um;
  return `${tagesTitel.format(zeitpunkt)}, ${um}`;
}

// Wie viele Kalendertage die Liste der eigenen Einträge zeigt (heute
// eingeschlossen).
export const ANGEZEIGTE_TAGE = 7;

// Ab wann die eigenen Einträge angezeigt werden: Mitternacht in Berlin am
// ersten der angezeigten Tage, als ISO-Text.
export function angezeigtAb(jetzt: number): string {
  const [jahr, monat, tag] = berlinerDatum(jetzt).split("-").map(Number);
  const ersterTag = new Date(Date.UTC(jahr, monat - 1, tag - (ANGEZEIGTE_TAGE - 1)));
  return new Date(berlinerMitternacht(ersterTag.toISOString().slice(0, 10))).toISOString();
}

// Tag und von–bis eines Eintrags in einer Zeile, z. B. für die Übersicht
// im Büro. Ein laufender Eintrag hat statt des Endes laeuft.
export function tagUndZeit(beginn: string, ende: string | null, laeuft: string): string {
  const von = Date.parse(beginn);
  const bis = ende === null ? laeuft : uhrzeit.format(Date.parse(ende));
  return `${tagesTitel.format(von)}, ${uhrzeit.format(von)}–${bis}`;
}

// Was und wo in einer Zeile: die Fahrt oder Objekt und Tätigkeit.
export function wasUndWo(
  eintrag: Pick<MeinZeiteintrag, "art" | "objekt_bezeichnung" | "taetigkeit_name">,
): string {
  if (eintrag.art === "fahrt") return texte.erfassung.fahrt;
  return `${eintrag.objekt_bezeichnung} · ${eintrag.taetigkeit_name}`;
}
