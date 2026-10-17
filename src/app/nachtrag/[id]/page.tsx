import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { zeiteintragAendern } from "@/app/erfassung/actions";
import { erfassterMitarbeiter, erfassungVon } from "@/app/fuer-andere/erfasster-mitarbeiter";
import { angemeldeterMitarbeiter } from "@/lib/angemeldeter-mitarbeiter";
import { berlinerDatum, berlinerUhrzeit } from "@/lib/berliner-zeit";
import { createClient } from "@/lib/supabase/server";
import { ladeAuswahl, ladeZeiteintragZumAendern } from "@/lib/zeiterfassung/verwaltung";
import { texte } from "@/texte";
import styles from "../../page.module.css";
import { NachtragFormular } from "../nachtrag-formular";

export default function ZeiteintragAendern({ params }: PageProps<"/nachtrag/[id]">) {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{texte.nachtrag.aendernTitel}</h1>
        <Suspense fallback={<p>{texte.nachtrag.laedt}</p>}>
          <Aendern id={params.then((p) => p.id)} />
        </Suspense>
      </main>
    </div>
  );
}

async function Aendern({ id: idVersprechen }: { id: Promise<string> }) {
  const id = await idVersprechen;
  const supabase = await createClient();
  const ich = await angemeldeterMitarbeiter(supabase);
  if (!ich) redirect("/anmelden");

  // Normale Mitarbeiter bekommen von der Datenbank nur eigene Einträge.
  const eintrag = await ladeZeiteintragZumAendern(supabase, id);
  if (!eintrag || eintrag.ende === null) {
    return (
      <>
        <p>{eintrag ? texte.nachtrag.laeuftNoch : texte.nachtrag.nichtGefunden}</p>
        <p>
          <Link href={eintrag ? erfassungVon(ich, eintrag.mitarbeiter_id) : "/"}>
            {texte.nachtrag.zurueck}
          </Link>
        </p>
      </>
    );
  }
  const erfasst = await erfassterMitarbeiter(supabase, ich, eintrag.mitarbeiter_id);
  if ("hinweis" in erfasst) return erfasst.hinweis;
  const { mitarbeiter } = erfasst;

  const beginn = Date.parse(eintrag.beginn);
  return (
    <>
      {mitarbeiter.id !== ich.id && <p>{texte.fuerAndere.fuer(mitarbeiter.name)}</p>}
      <NachtragFormular
        // Neu aufbauen, wenn sich der Eintrag geändert hat: Next.js hält die
        // Seite samt Formularzustand vorrätig.
        key={JSON.stringify(eintrag)}
        aktion={zeiteintragAendern.bind(null, eintrag.id)}
        zurueck={erfassungVon(ich, mitarbeiter.id)}
        {...await ladeAuswahl(supabase)}
        vorgabe={{
          art: eintrag.art,
          objekt_id: eintrag.objekt_id ?? "",
          taetigkeit_id: eintrag.taetigkeit_id ?? "",
          datum: berlinerDatum(beginn),
          von: berlinerUhrzeit(beginn),
          bis: berlinerUhrzeit(Date.parse(eintrag.ende)),
        }}
      />
    </>
  );
}
