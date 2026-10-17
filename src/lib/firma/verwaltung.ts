import type { SupabaseClient } from "@supabase/supabase-js";
import type { Rundungsregel } from "@/lib/abrechnung";

export type Firma = { id: string; name: string; rundungsregel: Rundungsregel };

// Die Firma des angemeldeten Nutzers. Fremde Firmen liefert die Datenbank
// nicht.
export async function ladeFirma(supabase: SupabaseClient, id: string): Promise<Firma> {
  const { data, error } = await supabase
    .from("firma")
    .select("id, name, rundungsregel")
    .eq("id", id)
    .single<Firma>();
  if (error) throw error;
  return data;
}
