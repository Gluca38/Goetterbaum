"use server";

import { createClient } from "@/lib/supabase/server";

export type VergessenZustand = { verschickt: boolean };

// Fordert bei Supabase die Mail mit dem Link zum Zurücksetzen an. Die
// Antwort ist immer gleich, damit niemand ausprobieren kann, welche
// E-Mail-Adressen einen Zugang haben.
export async function linkAnfordern(
  _vorher: VergessenZustand,
  formData: FormData,
): Promise<VergessenZustand> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { verschickt: false };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) console.error("Link zum Zurücksetzen fehlgeschlagen", error);

  return { verschickt: true };
}
