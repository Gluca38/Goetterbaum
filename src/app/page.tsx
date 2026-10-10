import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Götterbaum</h1>
        <p>Management-Software für Gebäudereinigung und Gartenpflege.</p>
      </main>
    </div>
  );
}
