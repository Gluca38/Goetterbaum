// Alle Texte der Oberfläche an einer Stelle, damit später weitere
// Sprachen ohne Umbau nachgerüstet werden können.
import type { Rolle } from "@/lib/rollen";

export const texte = {
  appName: "Götterbaum",
  anmelden: {
    titel: "Anmelden",
    email: "E-Mail",
    passwort: "Passwort",
    knopf: "Anmelden",
    knopfLaeuft: "Anmeldung läuft …",
    passwortVergessen: "Passwort vergessen?",
    fehlerFalsch: "E-Mail oder Passwort ist falsch.",
    fehlerDeaktiviert:
      "Dieser Zugang ist deaktiviert. Bitte wende dich an das Büro.",
    fehlerUnbekannt:
      "Die Anmeldung hat nicht geklappt. Bitte versuche es noch einmal.",
    fehlerLink:
      "Dieser Link ist ungültig oder abgelaufen. Bitte fordere über „Passwort vergessen?“ einen neuen an oder wende dich an das Büro.",
  },
  start: {
    laedt: "Lädt …",
    angemeldetAls: "Angemeldet als",
    rolle: "Rolle",
    abmelden: "Abmelden",
    mitarbeiterVerwalten: "Mitarbeiter verwalten",
  },
  passwortVergessen: {
    titel: "Passwort vergessen",
    hinweis:
      "Gib die E-Mail-Adresse deines Zugangs ein. Wir schicken dir einen Link, mit dem du ein neues Passwort festlegen kannst.",
    email: "E-Mail",
    knopf: "Link anfordern",
    knopfLaeuft: "Wird angefordert …",
    verschickt:
      "Falls es zu dieser E-Mail-Adresse einen Zugang gibt, haben wir dir einen Link geschickt. Bitte sieh in dein Postfach.",
    zurueck: "Zurück zur Anmeldung",
  },
  passwortFestlegen: {
    titel: "Passwort festlegen",
    hinweis: "Lege ein Passwort mit mindestens 8 Zeichen fest.",
    passwort: "Neues Passwort",
    wiederholung: "Passwort wiederholen",
    knopf: "Passwort speichern",
    knopfLaeuft: "Wird gespeichert …",
    fehlerZuKurz: "Das Passwort muss mindestens 8 Zeichen lang sein.",
    fehlerUngleich: "Die beiden Passwörter stimmen nicht überein.",
    fehlerGleich:
      "Das ist dein bisheriges Passwort. Bitte wähle ein neues.",
    fehlerUnbekannt:
      "Das Passwort konnte nicht gespeichert werden. Bitte versuche es noch einmal.",
  },
  mitarbeiter: {
    titel: "Mitarbeiter",
    laedt: "Lädt …",
    keineBerechtigung: "Mitarbeiter verwalten darf nur das Büro.",
    neu: "Neuer Mitarbeiter",
    zurUebersicht: "Zurück zur Übersicht",
    zurStartseite: "Zur Startseite",
    nichtGefunden: "Diesen Mitarbeiter gibt es nicht.",
    keine: "Noch keine Mitarbeiter angelegt.",
    spalteName: "Name",
    spalteEmail: "E-Mail",
    spalteRolle: "Rolle",
    spalteZugang: "Zugang",
    name: "Name",
    email: "E-Mail (optional, nötig für einen Zugang)",
    rolle: "Rolle",
    zugang: "Zugang",
    anlegen: "Anlegen",
    anlegenLaeuft: "Wird angelegt …",
    speichern: "Speichern",
    speichernLaeuft: "Wird gespeichert …",
    gespeichert: "Gespeichert.",
    deaktivieren: "Deaktivieren",
    aktivieren: "Aktivieren",
    deaktiviertHinweis:
      "Deaktivierte Mitarbeiter können sich nicht mehr anmelden. Ihre Daten bleiben erhalten.",
    fehlerName: "Bitte gib einen Namen ein.",
    fehlerEmail: "Diese E-Mail-Adresse ist ungültig.",
    fehlerRolle: "Bitte wähle eine Rolle.",
    fehlerSelbstDeaktivieren: "Du kannst dich nicht selbst deaktivieren.",
    fehlerSelbstRolle: "Du kannst dir nicht selbst die Rolle Büro entziehen.",
    fehlerEmailEntfernen:
      "Die E-Mail kann nach der Einladung nicht entfernt werden. Um den Zugang zu sperren, deaktiviere den Mitarbeiter.",
    fehlerUnbekannt:
      "Das hat nicht geklappt. Bitte lade die Seite neu und versuche es noch einmal.",
    status: {
      deaktiviert: "Deaktiviert",
      keineEmail: "Kein Zugang (keine E-Mail)",
      nichtEingeladen: "Noch nicht eingeladen",
      eingeladen: "Eingeladen",
    },
    einladung: {
      senden: "Einladung senden",
      erneutSenden: "Einladung erneut senden",
      laeuft: "Wird verschickt …",
      verschickt: (email: string) => `Einladung an ${email} verschickt.`,
      fehlerEinladungGeoeffnet:
        "Dieser Mitarbeiter hat die Einladung bereits geöffnet. Er kann sich auf der Anmeldeseite über „Passwort vergessen“ selbst einen neuen Link schicken.",
      fehlerEmailVergeben:
        "Für diese E-Mail-Adresse gibt es bereits einen anderen Zugang.",
      fehlerZuVieleMails:
        "Es wurden gerade zu viele E-Mails verschickt. Bitte versuche es später noch einmal.",
      fehlerUnbekannt:
        "Die Einladung konnte nicht verschickt werden. Bitte versuche es noch einmal.",
    },
  },
  rollen: {
    mitarbeiter: "Mitarbeiter",
    vorarbeiter: "Vorarbeiter",
    buero: "Büro",
  } satisfies Record<Rolle, string>,
};
