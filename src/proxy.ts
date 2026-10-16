import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseUmgebung } from "@/lib/supabase/umgebung";

// Seiten, die ohne Anmeldung erreichbar sind. /auth/bestaetigen ist das
// Ziel der Links aus Einladungs- und "Passwort vergessen"-Mails.
const OEFFENTLICHE_PFADE = [
  "/anmelden",
  "/passwort-vergessen",
  "/auth/bestaetigen",
];

// Läuft vor jeder Seite: erneuert die Sitzung und schickt Besucher ohne
// Anmeldung zur Anmeldeseite. Die eigentliche Sicherheit liegt in den
// Zugriffsregeln der Datenbank; das hier verhindert nur, dass geschützte
// Seiten überhaupt angezeigt werden.
export async function proxy(request: NextRequest) {
  const { url, schluessel } = supabaseUmgebung();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, schluessel, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });

  // Muss direkt nach dem Anlegen kommen, damit eine erneuerte Sitzung
  // noch in die Antwort geschrieben werden kann.
  const { data } = await supabase.auth.getClaims();
  const angemeldet = Boolean(data?.claims);

  if (!angemeldet && !OEFFENTLICHE_PFADE.includes(request.nextUrl.pathname)) {
    const ziel = request.nextUrl.clone();
    ziel.pathname = "/anmelden";
    ziel.search = "";
    const umleitung = NextResponse.redirect(ziel);
    response.cookies
      .getAll()
      .forEach((cookie) => umleitung.cookies.set(cookie));
    return umleitung;
  }

  return response;
}

export const config = {
  // Alles außer Next.js-Dateien und Bildern/Symbolen.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
