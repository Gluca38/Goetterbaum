"use client";

import { texte } from "@/texte";
import { zeiteintragStoppen } from "./actions";
import styles from "./erfassung.module.css";
import { Fehlermeldung, useErfassungsAktion } from "./erfassungs-aktion";

export function StoppKnopf() {
  const [zustand, ausfuehren, laeuft] = useErfassungsAktion(zeiteintragStoppen, {
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
