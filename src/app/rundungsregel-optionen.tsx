import { RUNDUNGSREGELN } from "@/lib/abrechnung";
import { texte } from "@/texte";

// Die Rundungsregeln als Auswahl, für die Firma wie für einen Kunden.
export function RundungsregelOptionen() {
  return RUNDUNGSREGELN.map((regel) => (
    <option key={regel} value={regel}>
      {texte.rundungsregeln[regel]}
    </option>
  ));
}
