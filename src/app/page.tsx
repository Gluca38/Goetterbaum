import { redirect } from "next/navigation";
import { Suspense } from "react";
import { angemeldeterMitarbeiter } from "@/lib/angemeldeter-mitarbeiter";
import { texte } from "@/texte";
import { abmelden } from "./actions";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{texte.appName}</h1>
        <Suspense fallback={<p>{texte.start.laedt}</p>}>
          <Begruessung />
        </Suspense>
      </main>
    </div>
  );
}

async function Begruessung() {
  const mitarbeiter = await angemeldeterMitarbeiter();
  if (!mitarbeiter) redirect("/anmelden");

  return (
    <>
      <p>
        {texte.start.angemeldetAls} <strong>{mitarbeiter.name}</strong>
      </p>
      <p>
        {texte.start.rolle}: <strong>{texte.rollen[mitarbeiter.rolle]}</strong>
      </p>
      <form action={abmelden}>
        <button type="submit">{texte.start.abmelden}</button>
      </form>
    </>
  );
}
