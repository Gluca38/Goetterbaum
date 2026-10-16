import type { SupabaseClient } from "@supabase/supabase-js";
import type { Rolle } from "@/lib/rollen";
import { createClient } from "@/lib/supabase/server";

export type AngemeldeterMitarbeiter = {
  id: string;
  firma_id: string;
  name: string;
  rolle: Rolle;
};

// Der Mitarbeiter, der gerade angemeldet ist, oder null, wenn niemand
// angemeldet ist oder der Mitarbeiter deaktiviert wurde. Die Datenbank
// liefert einem deaktivierten Mitarbeiter keinen Datensatz mehr.
// Wer sich gerade erst angemeldet hat, übergibt den dabei benutzten
// Zugang, damit die neue Sitzung sicher verwendet wird.
export async function angemeldeterMitarbeiter(
  zugang?: SupabaseClient,
): Promise<AngemeldeterMitarbeiter | null> {
  const supabase = zugang ?? (await createClient());

  const { data: auth } = await supabase.auth.getClaims();
  const authUserId = auth?.claims.sub;
  if (!authUserId) return null;

  const { data, error } = await supabase
    .from("mitarbeiter")
    .select("id, firma_id, name, rolle")
    .eq("auth_user_id", authUserId)
    .maybeSingle<AngemeldeterMitarbeiter>();

  if (error) throw error;
  return data;
}
