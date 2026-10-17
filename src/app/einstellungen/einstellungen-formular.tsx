"use client";

import { useActionState } from "react";
import { RUNDUNGSREGELN, type Rundungsregel } from "@/lib/abrechnung";
import { START } from "@/lib/rueckmeldung";
import { texte } from "@/texte";
import { rundungsregelSpeichern } from "./actions";

export function EinstellungenFormular({ rundungsregel }: { rundungsregel: Rundungsregel }) {
  const [zustand, ausfuehren, laeuft] = useActionState(rundungsregelSpeichern, START);

  return (
    <form action={ausfuehren}>
      <p>
        <label>
          {texte.einstellungen.rundungsregel}
          <br />
          <select name="rundungsregel" defaultValue={rundungsregel}>
            {RUNDUNGSREGELN.map((regel) => (
              <option key={regel} value={regel}>
                {texte.rundungsregeln[regel]}
              </option>
            ))}
          </select>
        </label>
      </p>
      <p>{texte.einstellungen.rundungsregelHinweis}</p>
      {zustand.fehler && <p role="alert">{zustand.fehler}</p>}
      {zustand.meldung && <p role="status">{zustand.meldung}</p>}
      <button type="submit" disabled={laeuft}>
        {laeuft ? texte.stammdaten.speichernLaeuft : texte.stammdaten.speichern}
      </button>
    </form>
  );
}
