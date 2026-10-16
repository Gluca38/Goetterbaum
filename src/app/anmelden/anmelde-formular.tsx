"use client";

import { useActionState } from "react";
import { texte } from "@/texte";
import { anmelden, type AnmeldeZustand } from "./actions";

const START: AnmeldeZustand = { fehler: null };

export function AnmeldeFormular() {
  const [zustand, aktion, laeuft] = useActionState(anmelden, START);

  return (
    <form action={aktion}>
      <p>
        <label>
          {texte.anmelden.email}
          <br />
          <input name="email" type="email" autoComplete="email" required />
        </label>
      </p>
      <p>
        <label>
          {texte.anmelden.passwort}
          <br />
          <input
            name="passwort"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
      </p>
      {zustand.fehler && <p role="alert">{zustand.fehler}</p>}
      <button type="submit" disabled={laeuft}>
        {laeuft ? texte.anmelden.knopfLaeuft : texte.anmelden.knopf}
      </button>
    </form>
  );
}
