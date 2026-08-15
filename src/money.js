/**
 * Utilità monetarie. Tutti gli importi sono trattati in euro e arrotondati
 * ai centesimi, evitando gli errori dei float.
 */

/** Arrotonda a 2 decimali in modo stabile (mezzo centesimo verso l'alto). */
export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Formatta un importo in euro secondo la convenzione italiana (es. "1.234,50 €"). */
export function formatEUR(n) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}
