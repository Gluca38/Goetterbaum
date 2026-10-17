import Link from "next/link";
import { Suspense } from "react";
import { AktionsKnopf } from "@/app/aktions-knopf";
import { NurFuerBuero } from "@/app/nur-fuer-buero";
import { createClient } from "@/lib/supabase/server";
import { ladeTaetigkeit } from "@/lib/taetigkeiten/verwaltung";
import { texte } from "@/texte";
import styles from "../../page.module.css";
import { taetigkeitArchivieren, taetigkeitSpeichern } from "../actions";
import { TaetigkeitsFormular } from "../taetigkeits-formular";

export default function TaetigkeitBearbeiten({ params }: PageProps<"/taetigkeiten/[id]">) {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{texte.taetigkeiten.titel}</h1>
        <Suspense fallback={<p>{texte.taetigkeiten.laedt}</p>}>
          <NurFuerBuero keineBerechtigung={texte.taetigkeiten.keineBerechtigung}>
            {() => <Bearbeiten id={params.then((p) => p.id)} />}
          </NurFuerBuero>
        </Suspense>
      </main>
    </div>
  );
}

async function Bearbeiten({ id: idVersprechen }: { id: Promise<string> }) {
  const id = await idVersprechen;
  const taetigkeit = await ladeTaetigkeit(await createClient(), id);

  if (!taetigkeit) {
    return (
      <>
        <p>{texte.taetigkeiten.nichtGefunden}</p>
        <ZurUebersicht />
      </>
    );
  }

  return (
    <>
      <h2>{taetigkeit.name}</h2>
      {taetigkeit.archiviert && <p>{texte.taetigkeiten.archiviertHinweis}</p>}

      <TaetigkeitsFormular
        aktion={taetigkeitSpeichern.bind(null, taetigkeit.id)}
        vorgabe={taetigkeit}
        knopf={texte.stammdaten.speichern}
        knopfLaeuft={texte.stammdaten.speichernLaeuft}
      />

      {!taetigkeit.archiviert && <p>{texte.taetigkeiten.archivierenHinweis}</p>}
      {/* Neuer Knopf nach jedem Wechsel, damit keine alte Meldung stehen
          bleibt. */}
      <AktionsKnopf
        key={String(taetigkeit.archiviert)}
        aktion={taetigkeitArchivieren.bind(null, taetigkeit.id, !taetigkeit.archiviert)}
        knopf={taetigkeit.archiviert ? texte.stammdaten.aktivieren : texte.stammdaten.archivieren}
        knopfLaeuft={texte.stammdaten.speichernLaeuft}
      />

      <ZurUebersicht />
    </>
  );
}

function ZurUebersicht() {
  return (
    <p>
      <Link href="/taetigkeiten">{texte.taetigkeiten.zurUebersicht}</Link>
    </p>
  );
}
