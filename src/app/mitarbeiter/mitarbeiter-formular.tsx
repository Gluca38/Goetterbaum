"use client";

import { useActionState } from "react";
import type { MitarbeiterDaten } from "@/lib/mitarbeiter/eingabe";
import { ROLLEN } from "@/lib/rollen";
import { START, type Rueckmeldung } from "@/lib/rueckmeldung";
import { texte } from "@/texte";

// Formular für Name, E-Mail und Rolle, zum Anlegen wie zum Bearbeiten.
export function MitarbeiterFormular({
  aktion,
  vorgabe,
  knopf,
  knopfLaeuft,
}: {
  aktion: (vorher: Rueckmeldung, formData: FormData) => Promise<Rueckmeldung>;
  vorgabe?: MitarbeiterDaten;
  knopf: string;
  knopfLaeuft: string;
}) {
  const [zustand, ausfuehren, laeuft] = useActionState(aktion, START);

  return (
    <form action={ausfuehren}>
      <p>
        <label>
          {texte.mitarbeiter.name}
          <br />
          <input name="name" defaultValue={vorgabe?.name} required />
        </label>
      </p>
      <p>
        <label>
          {texte.mitarbeiter.email}
          <br />
          <input
            name="email"
            type="email"
            defaultValue={vorgabe?.email ?? ""}
          />
        </label>
      </p>
      <p>
        <label>
          {texte.mitarbeiter.rolle}
          <br />
          <select name="rolle" defaultValue={vorgabe?.rolle ?? "mitarbeiter"}>
            {ROLLEN.map((rolle) => (
              <option key={rolle} value={rolle}>
                {texte.rollen[rolle]}
              </option>
            ))}
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
