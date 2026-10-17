import { redirect } from "next/navigation";
import { Suspense } from "react";
import { zeiteintragNachtragen } from "@/app/erfassung/actions";
import { angemeldeterMitarbeiter } from "@/lib/angemeldeter-mitarbeiter";
import { heuteInBerlin } from "@/lib/berliner-zeit";
import { createClient } from "@/lib/supabase/server";
import { ladeAuswahl } from "@/lib/zeiterfassung/verwaltung";
import { texte } from "@/texte";
import styles from "../page.module.css";
import { NachtragFormular } from "./nachtrag-formular";

export default function Nachtragen() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{texte.nachtrag.titel}</h1>
        <Suspense fallback={<p>{texte.nachtrag.laedt}</p>}>
          <Formular />
        </Suspense>
      </main>
    </div>
  );
}

async function Formular() {
  const supabase = await createClient();
  if (!(await angemeldeterMitarbeiter(supabase))) redirect("/anmelden");
  const auswahl = await ladeAuswahl(supabase);

  return (
    <NachtragFormular
      aktion={zeiteintragNachtragen}
      {...auswahl}
      vorgabe={{
        art: "taetigkeit",
        objekt_id: "",
        taetigkeit_id: "",
        datum: heuteInBerlin(),
        von: "",
        bis: "",
      }}
    />
  );
}
