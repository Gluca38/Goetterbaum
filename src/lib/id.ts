// Ob ein Text wie eine Kennung (UUID) aus der Datenbank aussieht. Eine
// ungültige Kennung, z. B. aus der Adresszeile, ist einfach "nicht
// gefunden" und wird gar nicht erst abgefragt.
export function istId(wert: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(wert);
}
