"use client";

import { texte } from "@/texte";
import { zeiteintragStoppen } from "./actions";
import styles from "./erfassung.module.css";
import { Fehlermeldung, useErfassungsAktion } from "./erfassungs-aktion";

// fuer ist der Mitarbeiter, dessen laufender Zeiteintrag gestoppt wird.
export function StoppKnopf({ fuer }: { fuer: string }) {
  const [zustand, ausfuehren, laeuft] = useErfassungsAktion(zeiteintragStoppen.bind(null, fuer), {
    ohneNetz: texte.erfassung.ohneNetzStopp,
    nichtGespeichert: texte.erfassung.fehlerStopp,
  });

  return (
    <form action={ausfuehren}>
      <button type="submit" className={`${styles.gross} ${styles.stopp}`} disabled={laeuft}>
        {laeuft ? texte.erfassung.stoppLaeuft : texte.erfassung.stopp}
      </button>
      <Fehlermeldung zustand={zustand} />
    </form>
  );
}
