import { texte } from "@/texte";

// Ein aktives Objekt braucht einen aktiven Kunden. Das gilt beim Anlegen,
// beim Wechsel des Kunden und beim Wiederaktivieren. Liefert die
// Fehlermeldung oder null. Die Datenbank erzwingt dieselbe Regel; hier geht
// es um eine verständliche Meldung fürs Büro.
export function pruefeObjektAktiv(
  objekt: { archiviert: boolean },
  kunde: { archiviert: boolean },
): string | null {
  if (!objekt.archiviert && kunde.archiviert) {
    return texte.objekte.fehlerKundeArchiviert;
  }
  return null;
}
