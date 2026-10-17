"use client";

import { useActionState } from "react";
import { euroAlsEingabe } from "@/lib/geld";
import { SPARTEN } from "@/lib/sparte";
import type { TaetigkeitsDaten } from "@/lib/taetigkeiten/eingabe";
import { START, type Rueckmeldung } from "@/lib/rueckmeldung";
import { texte } from "@/texte";

// Formular für Name, Sparte und Standard-Stundensatz, zum Anlegen wie zum
// Bearbeiten.
export function TaetigkeitsFormular({
  aktion,
  vorgabe,
  knopf,
  knopfLaeuft,
}: {
  aktion: (vorher: Rueckmeldung, formData: FormData) => Promise<Rueckmeldung>;
  vorgabe?: TaetigkeitsDaten;
  knopf: string;
  knopfLaeuft: string;
}) {
  const [zustand, ausfuehren, laeuft] = useActionState(aktion, START);

  return (
    <form action={ausfuehren}>
      <p>
        <label>
          {texte.taetigkeiten.name}
          <br />
          <input name="name" defaultValue={vorgabe?.name} required />
        </label>
      </p>
      <p>
        <label>
          {texte.taetigkeiten.sparte}
          <br />
          <select name="sparte" defaultValue={vorgabe?.sparte ?? "reinigung"}>
            {SPARTEN.map((sparte) => (
              <option key={sparte} value={sparte}>
                {texte.sparten[sparte]}
              </option>
            ))}
          </select>
        </label>
      </p>
      <p>
        <label>
          {texte.taetigkeiten.standardStundensatz}
          <br />
          <input
            name="standard_stundensatz"
            inputMode="decimal"
            defaultValue={
              vorgabe ? euroAlsEingabe(vorgabe.standard_stundensatz_cent) : ""
            }
            required
          />
        </label>
      </p>
      {zustand.fehler && <p role="alert">{zustand.fehler}</p>}
      {zustand.meldung && <p role="status">{zustand.meldung}</p>}
      <button type="submit" disabled={laeuft}>
        {laeuft ? knopfLaeuft : knopf}
      </button>
    </form>
  );
}
