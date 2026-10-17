"use server";

import { redirect } from "next/navigation";
import { angemeldeterMitarbeiter } from "@/lib/angemeldeter-mitarbeiter";
import { createClient } from "@/lib/supabase/server";
import { texte } from "@/texte";

export type AnmeldeZustand = { fehler: string | null };

export async function anmelden(
  _vorher: AnmeldeZustand,
  formData: FormData,
): Promise<AnmeldeZustand> {
  const email = String(formData.get("email") ?? "").trim();
  const passwort = String(formData.get("passwort") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: passwort,
  });

  if (error) {
    const falsch = error.code === "invalid_credentials";
    return {
      fehler: falsch ? texte.anmelden.fehlerFalsch : texte.anmelden.fehlerUnbekannt,
    };
  }

  // Ein Login allein reicht nicht: Ohne aktiven Mitarbeiter-Datensatz
  // (z. B. weil er deaktiviert wurde) wird die Sitzung sofort beendet.
  const mitarbeiter = await angemeldeterMitarbeiter(supabase);
  if (!mitarbeiter) {
    await supabase.auth.signOut();
    return { fehler: texte.anmelden.fehlerDeaktiviert };
  }

  redirect("/");
}
