import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { zeiteintragAendern } from "@/app/erfassung/actions";
import { angemeldeterMitarbeiter } from "@/lib/angemeldeter-mitarbeiter";
import { berlinerDatum, berlinerUhrzeit } from "@/lib/berliner-zeit";
import { createClient } from "@/lib/supabase/server";
import { ladeAuswahl, ladeMeinenZeiteintrag } from "@/lib/zeiterfassung/verwaltung";
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

  const eintrag = await ladeMeinenZeiteintrag(supabase, ich.id, id);
  if (!eintrag || eintrag.ende === null) {
    return (
      <>
        <p>{eintrag ? texte.nachtrag.laeuftNoch : texte.nachtrag.nichtGefunden}</p>
        <p>
          <Link href="/">{texte.nachtrag.zurueck}</Link>
        </p>
      </>
    );
  }

  const beginn = Date.parse(eintrag.beginn);
  return (
    <NachtragFormular
      aktion={zeiteintragAendern.bind(null, eintrag.id)}
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
  );
}
