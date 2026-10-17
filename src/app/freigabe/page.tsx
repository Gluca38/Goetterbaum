import Link from "next/link";
import { Suspense } from "react";
import { NurFuerBuero } from "@/app/nur-fuer-buero";
import { createClient } from "@/lib/supabase/server";
import { istUnvollstaendig, tagUndZeit, wasUndWo } from "@/lib/zeiterfassung/anzeige";
import type { FreigabeFilter } from "@/lib/zeiterfassung/freigabe";
import {
  ladeEintraegeZurFreigabe,
  ladeFreigabeFilterAuswahl,
} from "@/lib/zeiterfassung/verwaltung";
import { texte } from "@/texte";
import styles from "../page.module.css";
import { FreigabeFormular, type FreigabeZeile } from "./freigabe-formular";

// Zeitraum und Filter stehen in der Adresszeile (von, bis, mitarbeiter,
// kunde, objekt), damit sich eine Auswahl als Link merken lässt.
export default function Freigabe({ searchParams }: PageProps<"/freigabe">) {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>{texte.freigabe.titel}</h1>
        <Suspense fallback={<p>{texte.freigabe.laedt}</p>}>
          <NurFuerBuero keineBerechtigung={texte.freigabe.keineBerechtigung}>
            {() => <Liste parameter={searchParams} />}
          </NurFuerBuero>
        </Suspense>
      </main>
    </div>
  );
}

// Die noch nicht freigegebenen Zeiteinträge im Zeitraum, nach Mitarbeiter
// und Beginn. Nachträge sind markiert. Jeder führt zu seinem
// Änderungsprotokoll, wo sich eine Freigabe auch zurücknehmen lässt.
async function Liste({ parameter }: { parameter: PageProps<"/freigabe">["searchParams"] }) {
  const t = texte.freigabe;
  const supabase = await createClient();
  const [{ filter, eintraege, jetzt }, auswahl] = await Promise.all([
    ladeEintraegeZurFreigabe(supabase, await parameter),
    ladeFreigabeFilterAuswahl(supabase),
  ]);

  const zeilen: FreigabeZeile[] = eintraege.map((e) => {
    const unvollstaendig = istUnvollstaendig(e, jetzt);
    return {
      id: e.id,
      mitarbeiter: e.mitarbeiter_name,
      zeit: tagUndZeit(
        e.beginn,
        e.ende,
        unvollstaendig ? texte.zeiteintraege.unvollstaendig : texte.zeiteintraege.laeuft,
      ),
      was: wasUndWo(e),
      kunde: e.kunde_name ?? "",
      nachtrag: e.nachtrag,
      angelegtVon: e.angelegt_von_name ?? texte.protokoll.unbekannt,
      freigebbar: e.ende !== null,
    };
  });

  return (
    <>
      <p>{t.hinweis}</p>
      <FilterFormular filter={filter} auswahl={auswahl} />
      {zeilen.length === 0 ? <p>{t.keine}</p> : <FreigabeFormular zeilen={zeilen} />}
      <p>
        <Link href="/zeiteintraege">{texte.zeiteintraege.zurUebersicht}</Link>
      </p>
      <p>
        <Link href="/">{texte.stammdaten.zurStartseite}</Link>
      </p>
    </>
  );
}

// Ein einfaches Formular, das die Seite mit neuen Angaben in der
// Adresszeile aufruft.
function FilterFormular({
  filter,
  auswahl,
}: {
  filter: FreigabeFilter;
  auswahl: Awaited<ReturnType<typeof ladeFreigabeFilterAuswahl>>;
}) {
  const t = texte.freigabe;
  return (
    <form action="/freigabe">
      <label>
        {t.von} <input type="date" name="von" defaultValue={filter.von} required />
      </label>{" "}
      <label>
        {t.bis} <input type="date" name="bis" defaultValue={filter.bis} required />
      </label>{" "}
      <label>
        {t.mitarbeiter}{" "}
        <select name="mitarbeiter" defaultValue={filter.mitarbeiter ?? ""}>
          <option value="">{t.alle}</option>
          {auswahl.mitarbeiter.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>{" "}
      <label>
        {t.kunde}{" "}
        <select name="kunde" defaultValue={filter.kunde ?? ""}>
          <option value="">{t.alle}</option>
          {auswahl.kunden.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </label>{" "}
      <label>
        {t.objekt}{" "}
        <select name="objekt" defaultValue={filter.objekt ?? ""}>
          <option value="">{t.alle}</option>
          {auswahl.objekte.map((o) => (
            <option key={o.id} value={o.id}>
              {o.bezeichnung}
            </option>
          ))}
        </select>
      </label>{" "}
      <button type="submit">{t.anzeigen}</button>
    </form>
  );
}
