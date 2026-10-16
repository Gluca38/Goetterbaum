// Adresse und öffentlicher Schlüssel des Supabase-Projekts. Sie kommen nur
// aus Umgebungsvariablen (lokal aus .env.local, sonst aus Vercel).
export function supabaseUmgebung() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const schluessel = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !schluessel) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY müssen gesetzt sein.",
    );
  }
  return { url, schluessel };
}
