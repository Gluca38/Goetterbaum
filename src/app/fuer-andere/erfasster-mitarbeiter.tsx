import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AngemeldeterMitarbeiter } from "@/lib/angemeldeter-mitarbeiter";
import { darfFuerAndereErfassen } from "@/lib/rollen";
import {
  ladeAktivenMitarbeiter,
  type MitarbeiterZumErfassen,
} from "@/lib/zeiterfassung/verwaltung";
import { texte } from "@/texte";

// Der Mitarbeiter mit der Kennung id, für den der angemeldete Nutzer
// erfasst, oder ein Hinweis, warum das nicht geht: Für andere erfassen nur
// Vorarbeiter und Büro, und nur für aktive Mitarbeiter. Das ist
// Bedienkomfort; geschützt sind die Daten durch die Zugriffsregeln der
// Datenbank und die Prüfung in jeder Aktion.
export async function erfassterMitarbeiter(
  supabase: SupabaseClient,
  ich: AngemeldeterMitarbeiter,
  id: string,
): Promise<{ mitarbeiter: MitarbeiterZumErfassen } | { hinweis: ReactNode }> {
  if (id === ich.id) return { mitarbeiter: { id: ich.id, name: ich.name } };
  if (!darfFuerAndereErfassen(ich.rolle)) return { hinweis: <KeineBerechtigung /> };

  const mitarbeiter = await ladeAktivenMitarbeiter(supabase, id);
  if (!mitarbeiter) {
    return {
      hinweis: (
        <>
          <p>{texte.fuerAndere.nichtGefunden}</p>
          <p>
            <Link href="/fuer-andere">{texte.fuerAndere.zurAuswahl}</Link>
          </p>
        </>
      ),
    };
  }
  return { mitarbeiter };
}

export function KeineBerechtigung() {
  return (
    <>
      <p>{texte.fuerAndere.keineBerechtigung}</p>
      <p>
        <Link href="/">{texte.stammdaten.zurStartseite}</Link>
      </p>
    </>
  );
}

// Wohin es nach dem Nachtragen oder Ändern zurückgeht: zur eigenen
// Erfassung auf der Startseite oder zu der des anderen Mitarbeiters.
export function erfassungVon(ich: AngemeldeterMitarbeiter, mitarbeiterId: string): string {
  return mitarbeiterId === ich.id ? "/" : `/fuer-andere/${mitarbeiterId}`;
}
