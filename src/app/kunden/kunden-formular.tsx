"use client";

import { useActionState } from "react";
import { AdressFelder } from "@/app/adress-felder";
import { RundungsregelOptionen } from "@/app/rundungsregel-optionen";
import { ABRECHNUNGSZEITRAEUME, type Rundungsregel } from "@/lib/abrechnung";
import type { KundenDaten } from "@/lib/kunden/eingabe";
import { START, type Rueckmeldung } from "@/lib/rueckmeldung";
import { texte } from "@/texte";

// Formular für Name, Rechnungsadresse, Abrechnungszeitraum und
// Rundungsregel, zum Anlegen wie zum Bearbeiten. standardDerFirma zeigt,
// was ohne eigene Rundungsregel gilt.
export function KundenFormular({
  aktion,
  vorgabe,
  knopf,
  knopfLaeuft,
  standardDerFirma,
}: {
  aktion: (vorher: Rueckmeldung, formData: FormData) => Promise<Rueckmeldung>;
  vorgabe?: KundenDaten;
  knopf: string;
  knopfLaeuft: string;
  standardDerFirma: Rundungsregel;
}) {
  const [zustand, ausfuehren, laeuft] = useActionState(aktion, START);

  return (
    <form action={ausfuehren}>
      <p>
        <label>
          {texte.kunden.name}
          <br />
          <input name="name" defaultValue={vorgabe?.name} required />
        </label>
      </p>
      <AdressFelder titel={texte.kunden.rechnungsadresse} vorgabe={vorgabe} />
      <p>
        <label>
          {texte.kunden.abrechnungszeitraum}
          <br />
          <select
            name="abrechnungszeitraum"
            defaultValue={vorgabe?.abrechnungszeitraum ?? "monatlich"}
          >
            {ABRECHNUNGSZEITRAEUME.map((zeitraum) => (
              <option key={zeitraum} value={zeitraum}>
                {texte.abrechnungszeitraeume[zeitraum]}
              </option>
            ))}
          </select>
        </label>
      </p>
      <p>
        <label>
          {texte.kunden.rundungsregel}
          <br />
          <select name="rundungsregel" defaultValue={vorgabe?.rundungsregel ?? ""}>
            <option value="">
              {texte.rundungsregelDerFirma(texte.rundungsregeln[standardDerFirma])}
            </option>
            <RundungsregelOptionen />
          </select>
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
