import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  angemeldeterMitarbeiter,
  type AngemeldeterMitarbeiter,
} from "@/lib/angemeldeter-mitarbeiter";
import { texte } from "@/texte";

// Zeigt den Inhalt nur Büro-Nutzern. Das ist Bedienkomfort; geschützt
// sind die Daten durch die Zugriffsregeln der Datenbank und die Prüfung
// in jeder Aktion.
export async function NurFuerBuero({
  children,
}: {
  children: (ich: AngemeldeterMitarbeiter) => ReactNode;
}) {
  const ich = await angemeldeterMitarbeiter();
  if (!ich) redirect("/anmelden");

  if (ich.rolle !== "buero") {
    return (
      <>
        <p>{texte.mitarbeiter.keineBerechtigung}</p>
        <p>
          <Link href="/">{texte.mitarbeiter.zurStartseite}</Link>
        </p>
      </>
    );
  }

  return children(ich);
}
