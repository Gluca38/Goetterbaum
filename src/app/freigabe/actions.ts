"use server";

import { refresh } from "next/cache";
import { alsBuero } from "@/lib/als-buero";
import { istId } from "@/lib/id";
import { FEHLER, OK, type Rueckmeldung } from "@/lib/rueckmeldung";
import { freigabeAuswahl } from "@/lib/zeiterfassung/freigabe";
import { texte } from "@/texte";

const PAKET = 100;

// Gibt die angehakten Zeiteinträge frei, oder den einen, dessen Knopf in
// der Zeile gedrückt wurde. Wann und von wem setzt die Datenbank selbst;
// der mitgeschickte Zeitpunkt sagt nur "freigeben". Übersprungen werden
// schon freigegebene und laufende (auch unvollständige) Einträge: Die
// Datenbank würde laufende ohnehin ablehnen.
export async function zeiteintraegeFreigeben(
  _vorher: Rueckmeldung,
  formData: FormData,
): Promise<Rueckmeldung> {
  const { supabase } = await alsBuero();
  const auswahl = freigabeAuswahl(formData);
  if (!auswahl.ok) return FEHLER(auswahl.fehler);

  // Die Kennungen stehen in der Adresse der Anfrage; in Paketen bleibt sie
  // auch bei Hunderten von Einträgen kurz genug.
  let freigegeben = 0;
  for (let i = 0; i < auswahl.ids.length; i += PAKET) {
    const { data, error } = await supabase
      .from("zeiteintrag")
      .update({ freigegeben_am: new Date().toISOString() })
      .in("id", auswahl.ids.slice(i, i + PAKET))
      .is("freigegeben_am", null)
      .not("ende", "is", null)
      .select("id");
    if (error) {
      console.error("Zeiteinträge freigeben fehlgeschlagen", error);
      refresh();
      return FEHLER(texte.freigabe.fehlerUnbekannt);
    }
    freigegeben += data.length;
  }

  refresh();
  if (freigegeben < auswahl.ids.length) {
    return OK(texte.freigabe.teilweise(freigegeben, auswahl.ids.length));
  }
  return OK(texte.freigabe.freigegeben(freigegeben));
}

// Nimmt die Freigabe eines Zeiteintrags zurück. Danach können Mitarbeiter
// und Vorarbeiter ihn wieder ändern. Die Rücknahme steht im
// Änderungsprotokoll.
export async function freigabeZuruecknehmen(id: string): Promise<Rueckmeldung> {
  const { supabase } = await alsBuero();
  if (!istId(id)) return FEHLER(texte.zeiteintraege.nichtGefunden);

  const { data, error } = await supabase
    .from("zeiteintrag")
    .update({ freigegeben_am: null })
    .eq("id", id)
    .not("freigegeben_am", "is", null)
    .select("id");
  if (error) {
    console.error("Freigabe zurücknehmen fehlgeschlagen", error);
    return FEHLER(texte.stammdaten.fehlerUnbekannt);
  }

  refresh();
  if (data.length === 0) return FEHLER(texte.freigabe.nichtFreigegeben);
  return OK();
}
