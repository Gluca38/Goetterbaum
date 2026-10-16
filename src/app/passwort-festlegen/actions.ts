"use server";

import { redirect } from "next/navigation";
import { angemeldeterMitarbeiter } from "@/lib/angemeldeter-mitarbeiter";
import { pruefeNeuesPasswort } from "@/lib/passwort";
import { createClient } from "@/lib/supabase/server";
import { texte } from "@/texte";

export type PasswortZustand = { fehler: string | null };

export async function passwortFestlegen(
  _vorher: PasswortZustand,
  formData: FormData,
): Promise<PasswortZustand> {
  const eingabe = pruefeNeuesPasswort(formData);
  if (!eingabe.ok) return { fehler: eingabe.fehler };

  const supabase = await createClient();

  // Wie bei der Anmeldung: Ohne aktiven Mitarbeiter (z. B. nach einer
  // Deaktivierung) gibt es keinen Zugang, auch nicht über einen alten Link.
  const mitarbeiter = await angemeldeterMitarbeiter(supabase);
  if (!mitarbeiter) {
    await supabase.auth.signOut();
    return { fehler: texte.anmelden.fehlerDeaktiviert };
  }

  const { error } = await supabase.auth.updateUser({
    password: eingabe.passwort,
  });
  if (error) {
    if (error.code === "same_password") {
      return { fehler: texte.passwortFestlegen.fehlerGleich };
    }
    console.error("Passwort festlegen fehlgeschlagen", error);
    return { fehler: texte.passwortFestlegen.fehlerUnbekannt };
  }

  redirect("/");
}
