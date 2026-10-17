import { expect, test } from "vitest";
import { einladungsFehler, pruefeAenderung, zugangsStatus, type Bestand } from "./regeln";

const anna: Bestand = {
  id: "anna",
  name: "Anna Büro",
  email: "anna@example.com",
  rolle: "buero",
  aktiv: true,
  hatZugang: true,
};

test("Das Büro kann sich nicht selbst deaktivieren", () => {
  expect(pruefeAenderung(anna, { ...anna, aktiv: false }, "anna")).toBe(
    "Du kannst dich nicht selbst deaktivieren.",
  );
});

test("Das Büro kann sich nicht selbst die Büro-Rolle entziehen", () => {
  expect(pruefeAenderung(anna, { ...anna, rolle: "vorarbeiter" }, "anna")).toBe(
    "Du kannst dir nicht selbst die Rolle Büro entziehen.",
  );
});

test("Andere Mitarbeiter darf das Büro deaktivieren und herabstufen", () => {
  expect(pruefeAenderung(anna, { ...anna, rolle: "mitarbeiter", aktiv: false }, "bert")).toBeNull();
});

test("Wer schon eingeladen ist, behält seine E-Mail", () => {
  expect(pruefeAenderung(anna, { ...anna, email: null }, "bert")).toBe(
    "Die E-Mail kann nach der Einladung nicht entfernt werden. Um den Zugang zu sperren, deaktiviere den Mitarbeiter.",
  );
});

test("Ohne Einladung darf die E-Mail entfernt werden", () => {
  expect(
    pruefeAenderung({ ...anna, hatZugang: false }, { ...anna, email: null }, "bert"),
  ).toBeNull();
});

test("Der Zugangsstatus zeigt, wie weit der Mitarbeiter ist", () => {
  const ohneZugang = { ...anna, hatZugang: false };
  expect(zugangsStatus({ ...ohneZugang, email: null })).toBe("Kein Zugang (keine E-Mail)");
  expect(zugangsStatus(ohneZugang)).toBe("Noch nicht eingeladen");
  expect(zugangsStatus(anna)).toBe("Eingeladen");
  expect(zugangsStatus({ ...anna, aktiv: false })).toBe("Deaktiviert");
});

test("Wer die Einladung schon geöffnet hat, wird auf „Passwort vergessen“ verwiesen", () => {
  expect(einladungsFehler("email_exists", true)).toBe(
    "Dieser Mitarbeiter hat die Einladung bereits geöffnet. Er kann sich auf der Anmeldeseite über „Passwort vergessen“ selbst einen neuen Link schicken.",
  );
});

test("Eine E-Mail, die schon zu einem anderen Zugang gehört, wird gemeldet", () => {
  expect(einladungsFehler("email_exists", false)).toBe(
    "Für diese E-Mail-Adresse gibt es bereits einen anderen Zugang.",
  );
});

test("Zu viele Mails in kurzer Zeit werden verständlich gemeldet", () => {
  expect(einladungsFehler("over_email_send_rate_limit", true)).toBe(
    "Es wurden gerade zu viele E-Mails verschickt. Bitte versuche es später noch einmal.",
  );
});

test("Unbekannte Fehler bekommen eine allgemeine Meldung", () => {
  expect(einladungsFehler(undefined, false)).toBe(
    "Die Einladung konnte nicht verschickt werden. Bitte versuche es noch einmal.",
  );
});
