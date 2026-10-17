"use client";

import { useActionState } from "react";
import { FEHLER, START, type Rueckmeldung } from "@/lib/rueckmeldung";
import styles from "./erfassung.module.css";

// Wie useActionState, aber ohne Absturz, wenn die Aktion gar nicht beim
// Server ankommt oder dort abbricht. Dann zeigt das Formular, dass nichts
// gespeichert wurde und ein Nachtrag nötig ist (ADR-0002): ohneNetz, wenn
// das Handy kein Internet hat, sonst nichtGespeichert.
export function useErfassungsAktion(
  aktion: (vorher: Rueckmeldung, formData: FormData) => Promise<Rueckmeldung>,
  meldungen: { ohneNetz: string; nichtGespeichert: string },
) {
  return useActionState(async (vorher: Rueckmeldung, formData: FormData) => {
    try {
      return await aktion(vorher, formData);
    } catch {
      return FEHLER(navigator.onLine ? meldungen.nichtGespeichert : meldungen.ohneNetz);
    }
  }, START);
}

export function Fehlermeldung({ zustand }: { zustand: Rueckmeldung }) {
  if (!zustand.fehler) return null;
  return (
    <p role="alert" className={styles.fehler}>
      {zustand.fehler}
    </p>
  );
}
