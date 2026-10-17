import Link from "next/link";
import { Suspense } from "react";
import { NurFuerBuero } from "@/app/nur-fuer-buero";
import { createClient } from "@/lib/supabase/server";
import { tagUndZeit, wasUndWo } from "@/lib/zeiterfassung/anzeige";
import { ladeZeiteintragMitProtokoll } from "@/lib/zeiterfassung/verwaltung";
import { texte } from "@/texte";
import styles from "../../page.module.css";

export default function ZeiteintragProtokoll({ params }: PageProps<"/zeiteintraege/[id]">) {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{texte.zeiteintraege.protokollTitel}</h1>
        <Suspense fallback={<p>{texte.zeiteintraege.laedt}</p>}>
          <NurFuerBuero keineBerechtigung={texte.zeiteintraege.keineBerechtigung}>
            {() => <Protokoll id={params.then((p) => p.id)} />}
          </NurFuerBuero>
        </Suspense>
      </main>
    </div>
  );
}

// Der Zeiteintrag und darunter jede Änderung: wann, wer, was vorher und
// was nachher.
async function Protokoll({ id: idVersprechen }: { id: Promise<string> }) {
  const t = texte.zeiteintraege;
  const geladen = await ladeZeiteintragMitProtokoll(await createClient(), await idVersprechen);

  if (!geladen) {
    return (
      <>
        <p>{t.nichtGefunden}</p>
        <ZurUebersicht />
      </>
    );
  }

  const { eintrag, protokoll } = geladen;
  return (
    <>
      <h2>
        {eintrag.mitarbeiter_name} · {tagUndZeit(eintrag.beginn, eintrag.ende, t.laeuft)}
      </h2>
      <p>
        {wasUndWo(eintrag)}
        {eintrag.nachtrag && ` · ${texte.nachtrag.markierung}`}
      </p>
      {protokoll.length === 0 ? (
        <p>{t.keinProtokoll}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t.spalteWann}</th>
              <th>{t.spalteWer}</th>
              <th>{t.spalteAktion}</th>
              <th>{t.spalteAenderung}</th>
            </tr>
          </thead>
          <tbody>
            {protokoll.map((zeile) => (
              <tr key={zeile.id}>
                <td>{zeile.wann}</td>
                <td>{zeile.wer}</td>
                <td>{zeile.aktion}</td>
                <td>
                  <ul>
                    {zeile.aenderungen.map((a) => (
                      <li key={a.feld}>{t.aenderung(a.feld, a.vorher, a.nachher)}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ZurUebersicht />
    </>
  );
}

function ZurUebersicht() {
  return (
    <p>
      <Link href="/zeiteintraege">{texte.zeiteintraege.zurUebersicht}</Link>
    </p>
  );
}
