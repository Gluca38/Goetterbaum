import Link from "next/link";
import { Suspense } from "react";
import { NurFuerBuero } from "@/app/nur-fuer-buero";
import { ladeFirma } from "@/lib/firma/verwaltung";
import { createClient } from "@/lib/supabase/server";
import { texte } from "@/texte";
import styles from "../../page.module.css";
import { kundeAnlegen } from "../actions";
import { KundenFormular } from "../kunden-formular";

export default function NeuerKunde() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{texte.kunden.neu}</h1>
        <Suspense fallback={<p>{texte.kunden.laedt}</p>}>
          <NurFuerBuero keineBerechtigung={texte.stammdaten.keineBerechtigung}>
            {(ich) => <Anlegen firmaId={ich.firma_id} />}
          </NurFuerBuero>
        </Suspense>
      </main>
    </div>
  );
}

async function Anlegen({ firmaId }: { firmaId: string }) {
  const firma = await ladeFirma(await createClient(), firmaId);
  return (
    <>
      <KundenFormular
        aktion={kundeAnlegen}
        knopf={texte.stammdaten.anlegen}
        knopfLaeuft={texte.stammdaten.anlegenLaeuft}
        standardDerFirma={firma.rundungsregel}
      />
      <p>
        <Link href="/kunden">{texte.kunden.zurUebersicht}</Link>
      </p>
    </>
  );
}
