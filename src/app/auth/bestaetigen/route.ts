import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Ziel der Links aus der Einladungs- und der "Passwort vergessen"-Mail.
// Supabase bestätigt den Einmal-Code und meldet den Nutzer an; danach legt
// er sein (neues) Passwort fest. Die Links stehen in den Mail-Vorlagen
// (supabase/templates).
const ERLAUBTE_TYPEN = ["invite", "recovery"] as const;

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const typ = ERLAUBTE_TYPEN.find((t) => t === request.nextUrl.searchParams.get("type"));

  if (tokenHash && typ) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: typ,
      token_hash: tokenHash,
    });
    if (!error) redirect("/passwort-festlegen");
  }

  redirect("/anmelden?fehler=link");
}
