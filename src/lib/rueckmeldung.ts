// Was eine Aktion dem Formular zurückmeldet: eine Fehlermeldung oder eine
// Erfolgsmeldung (oder keins von beiden).
export type Rueckmeldung = { fehler: string | null; meldung: string | null };

export const START: Rueckmeldung = { fehler: null, meldung: null };

export const OK = (meldung: string | null = null): Rueckmeldung => ({
  fehler: null,
  meldung,
});

export const FEHLER = (fehler: string): Rueckmeldung => ({
  fehler,
  meldung: null,
});
