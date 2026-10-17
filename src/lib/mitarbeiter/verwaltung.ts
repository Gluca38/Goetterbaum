import type { SupabaseClient } from "@supabase/supabase-js";
import type { Rolle } from "@/lib/rollen";
import type { Bestand } from "./regeln";

type Zeile = {
  id: string;
  name: string;
  email: string | null;
  rolle: Rolle;
  aktiv: boolean;
  auth_user_id: string | null;
};

export type Mitarbeiter = Bestand & { authUserId: string | null };

const SPALTEN = "id, name, email, rolle, aktiv, auth_user_id";

function ausZeile(zeile: Zeile): Mitarbeiter {
  return {
    id: zeile.id,
    name: zeile.name,
    email: zeile.email,
    rolle: zeile.rolle,
    aktiv: zeile.aktiv,
    hatZugang: zeile.auth_user_id !== null,
    authUserId: zeile.auth_user_id,
  };
}

// Alle Mitarbeiter, die der angemeldete Nutzer sehen darf. Welche das sind,
// entscheiden die Zugriffsregeln der Datenbank (nur die eigene Firma).
export async function ladeMitarbeiterliste(supabase: SupabaseClient): Promise<Mitarbeiter[]> {
  const { data, error } = await supabase
    .from("mitarbeiter")
    .select(SPALTEN)
    .order("name")
    .returns<Zeile[]>();
  if (error) throw error;
  return data.map(ausZeile);
}

export async function ladeMitarbeiter(
  supabase: SupabaseClient,
  id: string,
): Promise<Mitarbeiter | null> {
  // Eine ungültige Kennung in der Adresse ist einfach "nicht gefunden".
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase
    .from("mitarbeiter")
    .select(SPALTEN)
    .eq("id", id)
    .maybeSingle<Zeile>();
  if (error) throw error;
  return data && ausZeile(data);
}
