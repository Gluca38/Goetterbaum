import { redirect } from "next/navigation";
import { angemeldeterMitarbeiter } from "@/lib/angemeldeter-mitarbeiter";
import { createClient } from "@/lib/supabase/server";

// Jede Server-Aktion ist auch ohne die Oberfläche per Direktaufruf
// erreichbar. Deshalb prüft jede Büro-Aktion damit zuerst, dass ein aktiver
// Büro-Nutzer angemeldet ist. Alle Änderungen laufen danach im Namen dieses
// Nutzers, sodass die Zugriffsregeln der Datenbank zusätzlich greifen.
export async function alsBuero() {
  const supabase = await createClient();
  const ich = await angemeldeterMitarbeiter(supabase);
  if (!ich || ich.rolle !== "buero") redirect("/");
  return { supabase, ich };
}
