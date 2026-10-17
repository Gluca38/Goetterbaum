"use client";

import { useActionState } from "react";
import { START, type Rueckmeldung } from "@/lib/rueckmeldung";
import { texte } from "@/texte";

export type TaetigkeitenAuswahl = { id: string; name: string }[];

// Legt beim Kunden einen abweichenden Stundensatz für eine Tätigkeit fest.
// Gibt es schon einen, wird er ersetzt.
export function StundensatzFormular({
  aktion,
  taetigkeiten,
}: {
  aktion: (vorher: Rueckmeldung, formData: FormData) => Promise<Rueckmeldung>;
  // Nur aktive Tätigkeiten.
  taetigkeiten: TaetigkeitenAuswahl;
}) {
  const [zustand, ausfuehren, laeuft] = useActionState(aktion, START);

  return (
    <form action={ausfuehren}>
      <h3>{texte.stundensaetze.festlegenTitel}</h3>
      <p>
        <label>
          {texte.stundensaetze.taetigkeit}
          <br />
          <select name="taetigkeit_id" defaultValue="" required>
            <option value="" disabled>
              {texte.stundensaetze.taetigkeitWaehlen}
            </option>
            {taetigkeiten.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </p>
      <p>
        <label>
          {texte.stundensaetze.stundensatz}
          <br />
          <input name="stundensatz" inputMode="decimal" required />
        </label>
      </p>
      {zustand.fehler && <p role="alert">{zustand.fehler}</p>}
      {zustand.meldung && <p role="status">{zustand.meldung}</p>}
      <button type="submit" disabled={laeuft}>
        {laeuft ? texte.stundensaetze.festlegenLaeuft : texte.stundensaetze.festlegen}
      </button>
    </form>
  );
}
