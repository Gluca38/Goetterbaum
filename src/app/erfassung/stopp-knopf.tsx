"use client";

import { texte } from "@/texte";
import { zeiteintragStoppen } from "./actions";
import styles from "./erfassung.module.css";
import { useErfassungsAktion } from "./erfassungs-aktion";

export function StoppKnopf() {
  const [zustand, ausfuehren, laeuft] = useErfassungsAktion(
    zeiteintragStoppen,
    texte.erfassung.ohneNetzStopp,
  );

  return (
    <form action={ausfuehren}>
      <button type="submit" className={`${styles.gross} ${styles.stopp}`} disabled={laeuft}>
        {laeuft ? texte.erfassung.stoppLaeuft : texte.erfassung.stopp}
      </button>
      {zustand.fehler && (
        <p role="alert" className={styles.fehler}>
          {zustand.fehler}
        </p>
      )}
    </form>
  );
}
