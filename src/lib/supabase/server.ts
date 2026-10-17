import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseUmgebung } from "./umgebung";

// Supabase-Zugang für Server Components und Server Actions. Er handelt
// immer im Namen des angemeldeten Nutzers, die Zugriffsregeln der
// Datenbank gelten also vollständig.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, schluessel } = supabaseUmgebung();

  return createServerClient(url, schluessel, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // In Server Components dürfen keine Cookies gesetzt werden.
          // Das Erneuern der Sitzung übernimmt dort der Proxy.
        }
      },
    },
  });
}
