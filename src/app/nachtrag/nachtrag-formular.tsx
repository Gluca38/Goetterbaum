"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Fehlermeldung, useErfassungsAktion } from "@/app/erfassung/erfassungs-aktion";
import styles from "@/app/erfassung/erfassung.module.css";
import { ObjektAuswahl, TaetigkeitAuswahl } from "@/app/erfassung/objekt-auswahl";
import type { Rueckmeldung } from "@/lib/rueckmeldung";
import type { ObjektZurAuswahl, TaetigkeitZurAuswahl } from "@/lib/zeiterfassung/verwaltung";
import { texte } from "@/texte";

// Was im Formular schon steht: beim Ändern der bisherige Eintrag, beim
// Nachtragen nur das heutige Datum. Datum und Uhrzeiten in Berlin.
export type NachtragVorgabe = {
  art: "taetigkeit" | "fahrt";
  objekt_id: string;
  taetigkeit_id: string;
  datum: string;
  von: string;
  bis: string;
};

const MELDUNGEN = {
  ohneNetz: texte.nachtrag.ohneNetz,
  nichtGespeichert: texte.nachtrag.fehlerNichtGespeichert,
};

// Nachtragen oder Ändern eines beendeten Zeiteintrags: Tätigkeit in einem
// Objekt oder Fahrt, Datum, von–bis. Nach dem Speichern geht es zurück zur
// Erfassung.
export function NachtragFormular({
  aktion,
  objekte,
  taetigkeiten,
  vorgabe,
}: {
  aktion: (vorher: Rueckmeldung, formData: FormData) => Promise<Rueckmeldung>;
  // Nur aktive Objekte und Tätigkeiten.
  objekte: ObjektZurAuswahl[];
  taetigkeiten: TaetigkeitZurAuswahl[];
  vorgabe: NachtragVorgabe;
}) {
  const t = texte.nachtrag;
  const router = useRouter();
  const [art, setArt] = useState(vorgabe.art);
  const [objektId, setObjektId] = useState(vorgabe.objekt_id);
  const [taetigkeitId, setTaetigkeitId] = useState(vorgabe.taetigkeit_id);
  // Auch Datum und Uhrzeiten hält das Formular selbst, damit sie nach einer
  // Fehlermeldung stehen bleiben.
  const [zeit, setZeit] = useState({
    datum: vorgabe.datum,
    von: vorgabe.von,
    bis: vorgabe.bis,
  });
  const [zustand, speichern, laeuft] = useErfassungsAktion(aktion, MELDUNGEN);

  useEffect(() => {
    if (zustand.meldung) router.push("/");
  }, [zustand, router]);

  return (
    <form action={speichern} className={styles.formular}>
      <fieldset className={styles.auswahl}>
        <legend>{t.art}</legend>
        {(["taetigkeit", "fahrt"] as const).map((wert) => (
          <label key={wert} className={styles.objekt}>
            <input
              type="radio"
              name="art"
              value={wert}
              checked={art === wert}
              onChange={() => setArt(wert)}
            />
            {wert === "fahrt" ? texte.erfassung.fahrt : texte.erfassung.taetigkeit}
          </label>
        ))}
      </fieldset>
      {art === "taetigkeit" && (
        <>
          <ObjektAuswahl objekte={objekte} objektId={objektId} waehle={setObjektId} />
          <TaetigkeitAuswahl
            taetigkeiten={taetigkeiten}
            taetigkeitId={taetigkeitId}
            waehle={setTaetigkeitId}
          />
        </>
      )}
      <label>
        {t.datum}
        <input
          type="date"
          name="datum"
          value={zeit.datum}
          onChange={(e) => setZeit({ ...zeit, datum: e.target.value })}
          required
          className={styles.eingabe}
        />
      </label>
      <label>
        {t.von}
        <input
          type="time"
          name="von"
          value={zeit.von}
          onChange={(e) => setZeit({ ...zeit, von: e.target.value })}
          required
          className={styles.eingabe}
        />
      </label>
      <label>
        {t.bis}
        <input
          type="time"
          name="bis"
          value={zeit.bis}
          onChange={(e) => setZeit({ ...zeit, bis: e.target.value })}
          required
          className={styles.eingabe}
        />
      </label>
      <button type="submit" className={`${styles.gross} ${styles.start}`} disabled={laeuft}>
        {laeuft ? t.speichernLaeuft : t.speichern}
      </button>
      <Fehlermeldung zustand={zustand} />
      {zustand.meldung && <p role="status">{zustand.meldung}</p>}
      <p>
        <Link href="/">{t.zurueck}</Link>
      </p>
    </form>
  );
}
