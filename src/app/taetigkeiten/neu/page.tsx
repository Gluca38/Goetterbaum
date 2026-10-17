import Link from "next/link";
import { Suspense } from "react";
import { NurFuerBuero } from "@/app/nur-fuer-buero";
import { texte } from "@/texte";
import styles from "../../page.module.css";
import { taetigkeitAnlegen } from "../actions";
import { TaetigkeitsFormular } from "../taetigkeits-formular";

export default function NeueTaetigkeit() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{texte.taetigkeiten.neu}</h1>
        <Suspense fallback={<p>{texte.taetigkeiten.laedt}</p>}>
          <NurFuerBuero keineBerechtigung={texte.taetigkeiten.keineBerechtigung}>
            {() => (
              <>
                <TaetigkeitsFormular
                  aktion={taetigkeitAnlegen}
                  knopf={texte.stammdaten.anlegen}
                  knopfLaeuft={texte.stammdaten.anlegenLaeuft}
                />
                <p>
                  <Link href="/taetigkeiten">{texte.taetigkeiten.zurUebersicht}</Link>
                </p>
              </>
            )}
          </NurFuerBuero>
        </Suspense>
      </main>
    </div>
  );
}
