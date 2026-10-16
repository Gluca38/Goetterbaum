"use client";

import { useActionState } from "react";
import { MINDESTLAENGE_PASSWORT } from "@/lib/passwort";
import { texte } from "@/texte";
import { passwortFestlegen, type PasswortZustand } from "./actions";

const START: PasswortZustand = { fehler: null };

export function PasswortFormular() {
  const [zustand, aktion, laeuft] = useActionState(passwortFestlegen, START);

  return (
    <form action={aktion}>
      <p>
        <label>
          {texte.passwortFestlegen.passwort}
          <br />
          <input
            name="passwort"
            type="password"
            autoComplete="new-password"
            minLength={MINDESTLAENGE_PASSWORT}
            required
          />
        </label>
      </p>
      <p>
        <label>
          {texte.passwortFestlegen.wiederholung}
          <br />
          <input
            name="wiederholung"
            type="password"
            autoComplete="new-password"
            minLength={MINDESTLAENGE_PASSWORT}
            required
          />
        </label>
      </p>
      {zustand.fehler && <p role="alert">{zustand.fehler}</p>}
      <button type="submit" disabled={laeuft}>
        {laeuft ? texte.passwortFestlegen.knopfLaeuft : texte.passwortFestlegen.knopf}
      </button>
    </form>
  );
}
