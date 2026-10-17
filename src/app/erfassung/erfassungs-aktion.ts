"use client";

import { useActionState } from "react";
import { FEHLER, START, type Rueckmeldung } from "@/lib/rueckmeldung";

// Wie useActionState, aber ohne Absturz, wenn die Verbindung fehlt: Kommt
// die Aktion gar nicht beim Server an, zeigt das Formular stattdessen den
// Hinweis ohneNetz, dass ein Nachtrag nötig ist (ADR-0002).
export function useErfassungsAktion(
  aktion: (vorher: Rueckmeldung, formData: FormData) => Promise<Rueckmeldung>,
  ohneNetz: string,
) {
  return useActionState(async (vorher: Rueckmeldung, formData: FormData) => {
    try {
      return await aktion(vorher, formData);
    } catch {
      return FEHLER(ohneNetz);
    }
  }, START);
}
