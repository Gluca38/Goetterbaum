"use client";

import { useActionState } from "react";
import type { Rueckmeldung } from "./actions";

const START: Rueckmeldung = { fehler: null, meldung: null };

// Ein einzelner Knopf, der eine Aktion auslöst und deren Rückmeldung
// direkt darunter zeigt.
export function AktionsKnopf({
  aktion,
  knopf,
  knopfLaeuft,
}: {
  aktion: (vorher: Rueckmeldung) => Promise<Rueckmeldung>;
  knopf: string;
  knopfLaeuft: string;
}) {
  const [zustand, ausfuehren, laeuft] = useActionState(aktion, START);

  return (
    <form action={ausfuehren}>
      <button type="submit" disabled={laeuft}>
        {laeuft ? knopfLaeuft : knopf}
      </button>
      {zustand.fehler && <p role="alert">{zustand.fehler}</p>}
      {zustand.meldung && <p role="status">{zustand.meldung}</p>}
    </form>
  );
}
