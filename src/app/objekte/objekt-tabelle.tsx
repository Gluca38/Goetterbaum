import Link from "next/link";
import { euroAlsText } from "@/lib/geld";
import type { Objekt } from "@/lib/objekte/verwaltung";
import { texte } from "@/texte";

// Wie ein Objekt abgerechnet wird, in Worten fürs Büro.
export function abrechnungAlsText(objekt: Objekt): string {
  return objekt.pauschale_cent
    ? texte.objekte.pauschaleProMonat(euroAlsText(objekt.pauschale_cent))
    : texte.abrechnungsarten[objekt.abrechnungsart];
}

// Tabelle mit Objekten. Archivierte sind als solche gekennzeichnet.
export function ObjektTabelle({ objekte, mitKunde }: { objekte: Objekt[]; mitKunde: boolean }) {
  return (
    <table>
      <thead>
        <tr>
          <th>{texte.objekte.spalteBezeichnung}</th>
          {mitKunde && <th>{texte.objekte.spalteKunde}</th>}
          <th>{texte.objekte.spalteOrt}</th>
          <th>{texte.objekte.spalteAbrechnung}</th>
        </tr>
      </thead>
      <tbody>
        {objekte.map((o) => (
          <tr key={o.id}>
            <td>
              <Link href={`/objekte/${o.id}`}>{o.bezeichnung}</Link>
              {o.archiviert && ` (${texte.stammdaten.archiviert})`}
            </td>
            {mitKunde && <td>{o.kunde.name}</td>}
            <td>{o.ort}</td>
            <td>{abrechnungAlsText(o)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
