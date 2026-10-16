"use client";

import { useActionState } from "react";
import { texte } from "@/texte";
import { linkAnfordern, type VergessenZustand } from "./actions";

const START: VergessenZustand = { verschickt: false };

export function VergessenFormular() {
  const [zustand, aktion, laeuft] = useActionState(linkAnfordern, START);

  if (zustand.verschickt) {
    return <p role="status">{texte.passwortVergessen.verschickt}</p>;
  }

  return (
    <form action={aktion}>
      <p>
        <label>
          {texte.passwortVergessen.email}
          <br />
          <input name="email" type="email" autoComplete="email" required />
        </label>
      </p>
      <button type="submit" disabled={laeuft}>
        {laeuft ? texte.passwortVergessen.knopfLaeuft : texte.passwortVergessen.knopf}
      </button>
    </form>
  );
}
