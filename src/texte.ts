// Alle Texte der Oberfläche an einer Stelle, damit später weitere
// Sprachen ohne Umbau nachgerüstet werden können.
import type { Rolle } from "@/lib/angemeldeter-mitarbeiter";

export const texte = {
  appName: "Götterbaum",
  anmelden: {
    titel: "Anmelden",
    email: "E-Mail",
    passwort: "Passwort",
    knopf: "Anmelden",
    knopfLaeuft: "Anmeldung läuft …",
    fehlerFalsch: "E-Mail oder Passwort ist falsch.",
    fehlerDeaktiviert:
      "Dieser Zugang ist deaktiviert. Bitte wende dich an das Büro.",
    fehlerUnbekannt:
      "Die Anmeldung hat nicht geklappt. Bitte versuche es noch einmal.",
  },
  start: {
    laedt: "Lädt …",
    angemeldetAls: "Angemeldet als",
    rolle: "Rolle",
    abmelden: "Abmelden",
  },
  rollen: {
    mitarbeiter: "Mitarbeiter",
    vorarbeiter: "Vorarbeiter",
    buero: "Büro",
  } satisfies Record<Rolle, string>,
};
