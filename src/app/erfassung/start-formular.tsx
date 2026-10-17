"use client";

import { useState } from "react";
import type { ObjektZurAuswahl, TaetigkeitZurAuswahl } from "@/lib/zeiterfassung/verwaltung";
import { texte } from "@/texte";
import { fahrtStarten, zeiteintragStarten } from "./actions";
import styles from "./erfassung.module.css";
import { useErfassungsAktion } from "./erfassungs-aktion";

// So viele Treffer zeigt die Objektsuche höchstens, damit die Liste am
// Handy überschaubar bleibt.
const HOECHSTENS_TREFFER = 10;

function passt(objekt: ObjektZurAuswahl, suche: string) {
  const text = [objekt.bezeichnung, objekt.strasse, objekt.plz, objekt.ort].join(" ");
  return text.toLocaleLowerCase("de").includes(suche.trim().toLocaleLowerCase("de"));
}

// Start eines Zeiteintrags: Objekt suchen, Tätigkeit wählen, Start. Oder
// eine Fahrt ohne Objekt starten.
export function StartFormular({
  objekte,
  taetigkeiten,
}: {
  // Nur aktive Objekte und Tätigkeiten.
  objekte: ObjektZurAuswahl[];
  taetigkeiten: TaetigkeitZurAuswahl[];
}) {
  const [suche, setSuche] = useState("");
  const [start, starten, startLaeuft] = useErfassungsAktion(
    zeiteintragStarten,
    texte.erfassung.ohneNetzStart,
  );
  const [fahrt, fahrtLos, fahrtLaeuft] = useErfassungsAktion(
    fahrtStarten,
    texte.erfassung.ohneNetzStart,
  );
  const laeuft = startLaeuft || fahrtLaeuft;

  const treffer = objekte.filter((o) => passt(o, suche));
  const gezeigt = treffer.slice(0, HOECHSTENS_TREFFER);

  return (
    <>
      <form action={starten} className={styles.formular}>
        {objekte.length === 0 ? (
          <p>{texte.erfassung.keineObjekte}</p>
        ) : (
          <fieldset className={styles.auswahl}>
            <label>
              {texte.erfassung.objektSuchen}
              <input
                type="search"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                className={styles.eingabe}
                autoComplete="off"
              />
            </label>
            {gezeigt.map((o) => (
              <label key={o.id} className={styles.objekt}>
                <input type="radio" name="objekt" value={o.id} />
                <span>
                  <strong>{o.bezeichnung}</strong>
                  <br />
                  {o.strasse}, {o.plz} {o.ort}
                </span>
              </label>
            ))}
            {treffer.length === 0 && <p>{texte.erfassung.keineTreffer}</p>}
            {treffer.length > gezeigt.length && <p>{texte.erfassung.weitereTreffer}</p>}
          </fieldset>
        )}
        {taetigkeiten.length === 0 ? (
          <p>{texte.erfassung.keineTaetigkeiten}</p>
        ) : (
          <label>
            {texte.erfassung.taetigkeit}
            <select name="taetigkeit" defaultValue="" className={styles.eingabe}>
              <option value="" disabled>
                {texte.erfassung.taetigkeitWaehlen}
              </option>
              {taetigkeiten.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" className={`${styles.gross} ${styles.start}`} disabled={laeuft}>
          {startLaeuft ? texte.erfassung.startLaeuft : texte.erfassung.start}
        </button>
        {start.fehler && (
          <p role="alert" className={styles.fehler}>
            {start.fehler}
          </p>
        )}
      </form>
      <form action={fahrtLos} className={styles.formular}>
        <button type="submit" className={`${styles.gross} ${styles.fahrt}`} disabled={laeuft}>
          {fahrtLaeuft ? texte.erfassung.startLaeuft : texte.erfassung.fahrtStarten}
        </button>
        {fahrt.fehler && (
          <p role="alert" className={styles.fehler}>
            {fahrt.fehler}
          </p>
        )}
      </form>
    </>
  );
}
