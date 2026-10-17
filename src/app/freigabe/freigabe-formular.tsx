"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { START } from "@/lib/rueckmeldung";
import { texte } from "@/texte";
import { zeiteintraegeFreigeben } from "./actions";

// Eine Zeile der Freigabe-Liste, fertig zum Anzeigen. freigebbar: Der
// Eintrag ist beendet (laufende und unvollständige nicht).
export type FreigabeZeile = {
  id: string;
  mitarbeiter: string;
  zeit: string;
  was: string;
  kunde: string;
  nachtrag: boolean;
  angelegtVon: string;
  freigebbar: boolean;
};

// Sammelfreigabe über Haken und "Ausgewählte freigeben", Einzelfreigabe
// über den Knopf in der Zeile. Nach dem Freigeben lädt die Seite neu; die
// freigegebenen Einträge verschwinden aus der Liste.
export function FreigabeFormular({ zeilen }: { zeilen: FreigabeZeile[] }) {
  const t = texte.freigabe;
  const [zustand, freigeben, laeuft] = useActionState(zeiteintraegeFreigeben, START);
  const freigebbare = zeilen.filter((z) => z.freigebbar).map((z) => z.id);
  const [haken, setHaken] = useState<Set<string>>(new Set());
  // Nach dem Freigeben sind manche angehakten Einträge nicht mehr in der
  // Liste; sie zählen nicht mehr.
  const ausgewaehlt = new Set(freigebbare.filter((id) => haken.has(id)));
  const alle = freigebbare.length > 0 && freigebbare.every((id) => ausgewaehlt.has(id));

  function umschalten(id: string, an: boolean) {
    const neu = new Set(ausgewaehlt);
    if (an) neu.add(id);
    else neu.delete(id);
    setHaken(neu);
  }

  return (
    <form action={freigeben}>
      <table>
        <thead>
          <tr>
            <th>
              <label>
                <input
                  type="checkbox"
                  checked={alle}
                  disabled={freigebbare.length === 0}
                  onChange={(e) => setHaken(new Set(e.target.checked ? freigebbare : []))}
                />{" "}
                {t.alleAuswaehlen}
              </label>
            </th>
            <th>{texte.zeiteintraege.spalteMitarbeiter}</th>
            <th>{texte.zeiteintraege.spalteZeit}</th>
            <th>{texte.zeiteintraege.spalteWas}</th>
            <th>{t.kunde}</th>
            <th>{texte.zeiteintraege.spalteNachtrag}</th>
            <th>{texte.zeiteintraege.spalteAngelegtVon}</th>
            <th>{t.freigeben}</th>
            <th>{texte.zeiteintraege.protokollOeffnen}</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z) => (
            <tr key={z.id}>
              <td>
                {z.freigebbar && (
                  <input
                    type="checkbox"
                    name="id"
                    value={z.id}
                    aria-label={t.auswaehlen(`${z.mitarbeiter}, ${z.zeit}`)}
                    checked={ausgewaehlt.has(z.id)}
                    onChange={(e) => umschalten(z.id, e.target.checked)}
                  />
                )}
              </td>
              <td>{z.mitarbeiter}</td>
              <td>{z.zeit}</td>
              <td>{z.was}</td>
              <td>{z.kunde}</td>
              <td>{z.nachtrag ? texte.nachtrag.markierung : ""}</td>
              <td>{z.angelegtVon}</td>
              <td>
                {z.freigebbar ? (
                  <button type="submit" name="einzeln" value={z.id} disabled={laeuft}>
                    {t.freigeben}
                  </button>
                ) : (
                  t.erstNachDemBeenden
                )}
              </td>
              <td>
                <Link href={`/zeiteintraege/${z.id}`}>{texte.zeiteintraege.protokollOeffnen}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <button type="submit" disabled={laeuft || ausgewaehlt.size === 0}>
          {laeuft ? t.freigebenLaeuft : t.auswahlFreigeben}
        </button>
      </p>
      {zustand.fehler && <p role="alert">{zustand.fehler}</p>}
      {zustand.meldung && <p role="status">{zustand.meldung}</p>}
    </form>
  );
}
