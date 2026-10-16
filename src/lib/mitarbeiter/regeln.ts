import { texte } from "@/texte";
import type { MitarbeiterDaten } from "./eingabe";

// Ein Mitarbeiter, wie ihn das Büro in der Verwaltung sieht.
export type Bestand = MitarbeiterDaten & {
  id: string;
  aktiv: boolean;
  // Ob es schon einen Login gibt, also eine Einladung verschickt wurde.
  hatZugang: boolean;
};

// Prüft, ob das Büro einen Mitarbeiter so ändern darf. Liefert die
// Fehlermeldung oder null. Wer welche Firma ändern darf, prüft die
// Datenbank; hier geht es um Regeln, die Fehlbedienung verhindern.
export function pruefeAenderung(
  bestand: Bestand,
  neu: MitarbeiterDaten & { aktiv: boolean },
  angemeldeteId: string,
): string | null {
  const selbst = bestand.id === angemeldeteId;
  if (selbst && !neu.aktiv) return texte.mitarbeiter.fehlerSelbstDeaktivieren;
  if (selbst && neu.rolle !== "buero") {
    return texte.mitarbeiter.fehlerSelbstRolle;
  }
  // Ohne E-Mail bliebe ein Login übrig, den niemand mehr zuordnen kann.
  if (bestand.hatZugang && !neu.email) {
    return texte.mitarbeiter.fehlerEmailEntfernen;
  }
  return null;
}

// Wie weit der Mitarbeiter mit seinem Zugang ist, in Worten fürs Büro.
export function zugangsStatus(
  mitarbeiter: Pick<Bestand, "email" | "aktiv" | "hatZugang">,
): string {
  const status = texte.mitarbeiter.status;
  if (!mitarbeiter.aktiv) return status.deaktiviert;
  if (!mitarbeiter.email) return status.keineEmail;
  return mitarbeiter.hatZugang ? status.eingeladen : status.nichtEingeladen;
}

// Übersetzt den Fehlercode von Supabase beim Einladen in eine Meldung
// fürs Büro.
export function einladungsFehler(
  code: string | undefined,
  hatZugang: boolean,
): string {
  const fehler = texte.mitarbeiter.einladung;
  if (code === "email_exists") {
    return hatZugang ? fehler.fehlerEinladungGeoeffnet : fehler.fehlerEmailVergeben;
  }
  if (code === "over_email_send_rate_limit") return fehler.fehlerZuVieleMails;
  return fehler.fehlerUnbekannt;
}
