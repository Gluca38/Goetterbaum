import type { SupabaseClient } from "@supabase/supabase-js";
import { AktionsKnopf } from "@/app/aktions-knopf";
import { euroAlsText } from "@/lib/geld";
import { geltenderStundensatz } from "@/lib/stundensaetze/regeln";
import { ladeKundenStundensaetze } from "@/lib/stundensaetze/verwaltung";
import { ladeTaetigkeitenliste } from "@/lib/taetigkeiten/verwaltung";
import { texte } from "@/texte";
import { stundensatzEntfernen, stundensatzFestlegen } from "./actions";
import { StundensatzFormular } from "./stundensatz-formular";

// Die Stundensätze eines Kunden: für jede aktive Tätigkeit Standard,
// abweichender Satz und welcher davon gilt. Archivierte Tätigkeiten
// erscheinen nur, wenn es für sie noch einen abweichenden Satz gibt.
export async function Stundensaetze({
  supabase,
  kundeId,
}: {
  supabase: SupabaseClient;
  kundeId: string;
}) {
  const [taetigkeiten, abweichende] = await Promise.all([
    ladeTaetigkeitenliste(supabase),
    ladeKundenStundensaetze(supabase, kundeId),
  ]);
  const abweichendFuer = new Map(abweichende.map((s) => [s.taetigkeit_id, s]));
  const zeilen = taetigkeiten.filter((t) => !t.archiviert || abweichendFuer.has(t.id));
  const aktive = taetigkeiten.filter((t) => !t.archiviert);

  return (
    <>
      <h2>{texte.stundensaetze.titel}</h2>
      <p>{texte.stundensaetze.hinweis}</p>
      {zeilen.length === 0 ? (
        <p>{texte.stundensaetze.keineTaetigkeiten}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{texte.stundensaetze.spalteTaetigkeit}</th>
              <th>{texte.stundensaetze.spalteStandard}</th>
              <th>{texte.stundensaetze.spalteAbweichend}</th>
              <th>{texte.stundensaetze.spalteGilt}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {zeilen.map((t) => {
              const abweichend = abweichendFuer.get(t.id) ?? null;
              const gilt = geltenderStundensatz(t, abweichend);
              return (
                <tr key={t.id}>
                  <td>
                    {t.name}
                    {t.archiviert && ` (${texte.stammdaten.archiviert})`}
                  </td>
                  <td>{euroAlsText(t.standard_stundensatz_cent)}</td>
                  <td>{abweichend ? euroAlsText(abweichend.stundensatz_cent) : "–"}</td>
                  <td>
                    {texte.stundensaetze.gilt(
                      euroAlsText(gilt.stundensatzCent),
                      gilt.abweichend,
                    )}
                  </td>
                  <td>
                    {abweichend && (
                      <AktionsKnopf
                        aktion={stundensatzEntfernen.bind(null, kundeId, t.id)}
                        knopf={texte.stundensaetze.entfernen}
                        knopfLaeuft={texte.stundensaetze.entfernenLaeuft}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {aktive.length > 0 && (
        <StundensatzFormular
          aktion={stundensatzFestlegen.bind(null, kundeId)}
          taetigkeiten={aktive.map(({ id, name }) => ({ id, name }))}
        />
      )}
    </>
  );
}
