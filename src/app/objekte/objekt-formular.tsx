"use client";

import { useActionState, useState } from "react";
import { AdressFelder } from "@/app/adress-felder";
import { ABRECHNUNGSARTEN, type Abrechnungsart } from "@/lib/abrechnung";
import { euroAlsEingabe } from "@/lib/geld";
import type { ObjektDaten } from "@/lib/objekte/eingabe";
import { START, type Rueckmeldung } from "@/lib/rueckmeldung";
import { texte } from "@/texte";

export type KundenAuswahl = { id: string; name: string }[];

// Formular für ein Objekt, zum Anlegen wie zum Bearbeiten. Das Feld für
// die Pauschale erscheint nur bei Abrechnungsart Pauschale.
export function ObjektFormular({
  aktion,
  kunden,
  vorgabe,
  knopf,
  knopfLaeuft,
}: {
  aktion: (vorher: Rueckmeldung, formData: FormData) => Promise<Rueckmeldung>;
  // Nur aktive Kunden (beim Bearbeiten zusätzlich der bisherige).
  kunden: KundenAuswahl;
  vorgabe?: Partial<ObjektDaten>;
  knopf: string;
  knopfLaeuft: string;
}) {
  const [zustand, ausfuehren, laeuft] = useActionState(aktion, START);
  const [abrechnungsart, setAbrechnungsart] = useState<Abrechnungsart>(
    vorgabe?.abrechnungsart ?? "pauschale",
  );

  return (
    <form action={ausfuehren}>
      <p>
        <label>
          {texte.objekte.bezeichnung}
          <br />
          <input name="bezeichnung" defaultValue={vorgabe?.bezeichnung} required />
        </label>
      </p>
      <p>
        <label>
          {texte.objekte.kunde}
          <br />
          <select name="kunde_id" defaultValue={vorgabe?.kunde_id ?? ""} required>
            <option value="" disabled>
              {texte.objekte.kundeWaehlen}
            </option>
            {kunden.map((kunde) => (
              <option key={kunde.id} value={kunde.id}>
                {kunde.name}
              </option>
            ))}
          </select>
        </label>
      </p>
      <AdressFelder titel={texte.objekte.adresse} vorgabe={vorgabe} />
      <p>
        <label>
          {texte.objekte.abrechnungsart}
          <br />
          <select
            name="abrechnungsart"
            value={abrechnungsart}
            onChange={(e) => setAbrechnungsart(e.target.value as Abrechnungsart)}
          >
            {ABRECHNUNGSARTEN.map((art) => (
              <option key={art} value={art}>
                {texte.abrechnungsarten[art]}
              </option>
            ))}
          </select>
        </label>
      </p>
      {abrechnungsart === "pauschale" && (
        <p>
          <label>
            {texte.objekte.pauschale}
            <br />
            <input
              name="pauschale"
              inputMode="decimal"
              defaultValue={
                vorgabe?.pauschale_cent ? euroAlsEingabe(vorgabe.pauschale_cent) : ""
              }
              required
            />
          </label>
        </p>
      )}
      {zustand.fehler && <p role="alert">{zustand.fehler}</p>}
      {zustand.meldung && <p role="status">{zustand.meldung}</p>}
      <button type="submit" disabled={laeuft}>
        {laeuft ? knopfLaeuft : knopf}
      </button>
    </form>
  );
}
