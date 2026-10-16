import { texte } from "@/texte";
import styles from "../page.module.css";
import { AnmeldeFormular } from "./anmelde-formular";

// Eine Registrierung gibt es bewusst nicht: Zugänge entstehen nur über
// eine Einladung des Büros.
export default function Anmelden() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{texte.appName}</h1>
        <h2>{texte.anmelden.titel}</h2>
        <AnmeldeFormular />
      </main>
    </div>
  );
}
