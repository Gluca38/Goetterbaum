import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Erfassung } from "@/app/erfassung/erfassung";
import { angemeldeterMitarbeiter } from "@/lib/angemeldeter-mitarbeiter";
import { createClient } from "@/lib/supabase/server";
import { texte } from "@/texte";
import styles from "../../page.module.css";
import { erfassterMitarbeiter } from "../erfasster-mitarbeiter";

export default function ErfassungFuerAndere({ params }: PageProps<"/fuer-andere/[id]">) {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{texte.fuerAndere.titel}</h1>
        <Suspense fallback={<p>{texte.fuerAndere.laedt}</p>}>
          <ErfassungFuer id={params.then((p) => p.id)} />
        </Suspense>
      </main>
    </div>
  );
}

// Dieselbe Erfassung wie auf der Startseite, aber für einen anderen
// Mitarbeiter.
async function ErfassungFuer({ id: idVersprechen }: { id: Promise<string> }) {
  const id = await idVersprechen;
  const supabase = await createClient();
  const ich = await angemeldeterMitarbeiter(supabase);
  if (!ich) redirect("/anmelden");

  const erfasst = await erfassterMitarbeiter(supabase, ich, id);
  if ("hinweis" in erfasst) return erfasst.hinweis;

  const { mitarbeiter } = erfasst;
  return (
    <>
      <h2>{texte.fuerAndere.erfassungFuer(mitarbeiter.name)}</h2>
      <Erfassung mitarbeiterId={mitarbeiter.id} eigene={mitarbeiter.id === ich.id} />
      <p>
        <Link href="/fuer-andere">{texte.fuerAndere.zurAuswahl}</Link>
      </p>
    </>
  );
}
