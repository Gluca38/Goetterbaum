import Link from "next/link";
import { texte } from "@/texte";
import styles from "../page.module.css";
import { VergessenFormular } from "./vergessen-formular";

export default function PasswortVergessen() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{texte.appName}</h1>
        <h2>{texte.passwortVergessen.titel}</h2>
        <p>{texte.passwortVergessen.hinweis}</p>
        <VergessenFormular />
        <p>
          <Link href="/anmelden">{texte.passwortVergessen.zurueck}</Link>
        </p>
      </main>
    </div>
  );
}
