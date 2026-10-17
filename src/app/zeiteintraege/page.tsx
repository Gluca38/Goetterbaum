import Link from "next/link";
import { Suspense } from "react";
import { NurFuerBuero } from "@/app/nur-fuer-buero";
import { createClient } from "@/lib/supabase/server";
import { ANGEZEIGTE_TAGE, tagUndZeit } from "@/lib/zeiterfassung/anzeige";
import { ladeZeiteintraegeDerFirma } from "@/lib/zeiterfassung/verwaltung";
import { texte } from "@/texte";
import styles from "../page.module.css";

export default function ZeiteintraegeUebersicht() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{texte.zeiteintraege.titel}</h1>
        <Suspense fallback={<p>{texte.zeiteintraege.laedt}</p>}>
          <NurFuerBuero keineBerechtigung={texte.zeiteintraege.keineBerechtigung}>
            {() => <Liste />}
          </NurFuerBuero>
        </Suspense>
      </main>
    </div>
  );
}

// Alle Zeiteinträge der Firma, der neueste zuerst. Nachträge sind
// markiert; jeder Eintrag führt zu seinem Änderungsprotokoll.
async function Liste() {
  const t = texte.zeiteintraege;
  const eintraege = await ladeZeiteintraegeDerFirma(await createClient());

  return (
    <>
      <p>{t.hinweis(ANGEZEIGTE_TAGE)}</p>
      {eintraege.length === 0 ? (
        <p>{t.keine(ANGEZEIGTE_TAGE)}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t.spalteMitarbeiter}</th>
              <th>{t.spalteZeit}</th>
              <th>{t.spalteWas}</th>
              <th>{t.spalteNachtrag}</th>
              <th>{t.protokollOeffnen}</th>
            </tr>
          </thead>
          <tbody>
            {eintraege.map((e) => (
              <tr key={e.id}>
                <td>{e.mitarbeiter_name}</td>
                <td>{tagUndZeit(e.beginn, e.ende, t.laeuft)}</td>
                <td>
                  {e.art === "fahrt"
                    ? texte.erfassung.fahrt
                    : `${e.objekt_bezeichnung} · ${e.taetigkeit_name}`}
                </td>
                <td>{e.nachtrag ? texte.nachtrag.markierung : ""}</td>
                <td>
                  <Link href={`/zeiteintraege/${e.id}`}>{t.protokollOeffnen}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p>
        <Link href="/">{texte.stammdaten.zurStartseite}</Link>
      </p>
    </>
  );
}
