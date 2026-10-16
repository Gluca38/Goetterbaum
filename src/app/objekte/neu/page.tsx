import Link from "next/link";
import { Suspense } from "react";
import { NurFuerBuero } from "@/app/nur-fuer-buero";
import { ladeKundenliste } from "@/lib/kunden/verwaltung";
import { createClient } from "@/lib/supabase/server";
import { texte } from "@/texte";
import styles from "../../page.module.css";
import { objektAnlegen } from "../actions";
import { ObjektFormular } from "../objekt-formular";

export default function NeuesObjekt({ searchParams }: PageProps<"/objekte/neu">) {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{texte.objekte.neu}</h1>
        <Suspense fallback={<p>{texte.objekte.laedt}</p>}>
          <NurFuerBuero keineBerechtigung={texte.kunden.keineBerechtigung}>
            {() => (
              <Anlegen
                kundeId={searchParams.then((s) =>
                  typeof s.kunde === "string" ? s.kunde : undefined,
                )}
              />
            )}
          </NurFuerBuero>
        </Suspense>
      </main>
    </div>
  );
}

// kundeId wählt einen Kunden vor, wenn man von dessen Seite kommt.
async function Anlegen({ kundeId }: { kundeId: Promise<string | undefined> }) {
  const id = await kundeId;
  // Archivierte Kunden stehen nicht zur Auswahl.
  const kunden = (await ladeKundenliste(await createClient())).filter(
    (k) => !k.archiviert,
  );
  const vorauswahl = kunden.find((k) => k.id === id);
  const zurueck = vorauswahl
    ? { href: `/kunden/${vorauswahl.id}`, text: texte.kunden.zumKunden }
    : { href: "/objekte", text: texte.objekte.zurUebersicht };

  return (
    <>
      {kunden.length === 0 ? (
        <p>
          {texte.objekte.keineAktivenKunden}{" "}
          <Link href="/kunden/neu">{texte.kunden.neu}</Link>
        </p>
      ) : (
        <ObjektFormular
          aktion={objektAnlegen}
          kunden={kunden}
          vorgabe={{ kunde_id: vorauswahl?.id }}
          knopf={texte.stammdaten.anlegen}
          knopfLaeuft={texte.stammdaten.anlegenLaeuft}
        />
      )}
      <p>
        <Link href={zurueck.href}>{zurueck.text}</Link>
      </p>
    </>
  );
}
