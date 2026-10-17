"use client";

import { useActionState, useState } from "react";
import { START, type Rueckmeldung } from "@/lib/rueckmeldung";

// Ein Knopf für Aktionen, die man nicht aus Versehen auslösen soll: Der
// erste Klick fragt nach, erst "Ja" führt die Aktion aus.
export function KnopfMitRueckfrage({
  aktion,
  knopf,
  rueckfrage,
  bestaetigen,
  abbrechen,
  knopfLaeuft,
}: {
  aktion: (vorher: Rueckmeldung) => Promise<Rueckmeldung>;
  knopf: string;
  rueckfrage: string;
  bestaetigen: string;
  abbrechen: string;
  knopfLaeuft: string;
}) {
  const [fragen, setFragen] = useState(false);
  const [zustand, ausfuehren, laeuft] = useActionState(aktion, START);

  return (
    <form action={ausfuehren}>
      {fragen ? (
        <>
          <p>{rueckfrage}</p>
          <button type="submit" disabled={laeuft}>
            {laeuft ? knopfLaeuft : bestaetigen}
          </button>{" "}
          <button type="button" disabled={laeuft} onClick={() => setFragen(false)}>
            {abbrechen}
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setFragen(true)}>
          {knopf}
        </button>
      )}
      {zustand.fehler && <p role="alert">{zustand.fehler}</p>}
      {zustand.meldung && <p role="status">{zustand.meldung}</p>}
    </form>
  );
}
