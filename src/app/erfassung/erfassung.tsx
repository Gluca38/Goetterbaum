import { createClient } from "@/lib/supabase/server";
import {
  laeuftSeit,
  nachTagen,
  type MeinZeiteintrag,
} from "@/lib/zeiterfassung/anzeige";
import { ladeAuswahl, ladeMeineZeiteintraege } from "@/lib/zeiterfassung/verwaltung";
import { texte } from "@/texte";
import styles from "./erfassung.module.css";
import { StartFormular } from "./start-formular";
import { StoppKnopf } from "./stopp-knopf";

// Die Live-Erfassung des angemeldeten Nutzers: entweder der laufende
// Zeiteintrag mit Stopp oder das Start-Formular, darunter die eigenen
// Einträge der letzten Tage.
export async function Erfassung() {
  const supabase = await createClient();
  const { eintraege, jetzt } = await ladeMeineZeiteintraege(supabase);
  const laufender = eintraege.find((e) => e.ende === null);
  // Die Auswahl braucht nur, wer gerade nichts laufen hat.
  const auswahl = laufender ? null : await ladeAuswahl(supabase);

  return (
    <section className={styles.erfassung}>
      {laufender && <Laufend eintrag={laufender} jetzt={jetzt} />}
      {auswahl && <StartFormular {...auswahl} />}
      <MeineEintraege eintraege={eintraege} />
    </section>
  );
}

function wasUndWo(eintrag: MeinZeiteintrag) {
  if (eintrag.art === "fahrt") return texte.erfassung.fahrt;
  return `${eintrag.objekt_bezeichnung} · ${eintrag.taetigkeit_name}`;
}

function Laufend({ eintrag, jetzt }: { eintrag: MeinZeiteintrag; jetzt: number }) {
  return (
    <div className={styles.laufend} role="status">
      <p className={styles.seit}>{texte.erfassung.laeuftSeit(laeuftSeit(eintrag.beginn, jetzt))}</p>
      <p className={styles.wo}>{wasUndWo(eintrag)}</p>
      <StoppKnopf />
    </div>
  );
}

function MeineEintraege({ eintraege }: { eintraege: MeinZeiteintrag[] }) {
  const tage = nachTagen(eintraege);
  return (
    <div className={styles.liste}>
      <h2>{texte.erfassung.meineEintraege}</h2>
      {tage.length === 0 && <p>{texte.erfassung.keineEintraege}</p>}
      {tage.map((tag) => (
        <section key={tag.datum} aria-label={tag.titel}>
          <h3>{tag.titel}</h3>
          <ul>
            {tag.eintraege.map((e) => (
              <li key={e.id}>
                <span>
                  {texte.erfassung.vonBis(e.von, e.bis)} · {e.dauer}
                </span>
                <br />
                {wasUndWo(e)}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
