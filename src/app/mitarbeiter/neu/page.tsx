import Link from "next/link";
import { Suspense } from "react";
import { texte } from "@/texte";
import styles from "../../page.module.css";
import { anlegen } from "../actions";
import { MitarbeiterFormular } from "../mitarbeiter-formular";
import { NurFuerBuero } from "../nur-fuer-buero";

export default function NeuerMitarbeiter() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{texte.mitarbeiter.neu}</h1>
        <Suspense fallback={<p>{texte.mitarbeiter.laedt}</p>}>
          <NurFuerBuero>
            {() => (
              <>
                <MitarbeiterFormular
                  aktion={anlegen}
                  knopf={texte.mitarbeiter.anlegen}
                  knopfLaeuft={texte.mitarbeiter.anlegenLaeuft}
                />
                <p>
                  <Link href="/mitarbeiter">
                    {texte.mitarbeiter.zurUebersicht}
                  </Link>
                </p>
              </>
            )}
          </NurFuerBuero>
        </Suspense>
      </main>
    </div>
  );
}
