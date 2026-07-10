const SUFFIXES = ['', 'k', 'M', 'B', 'T', 'Qa'];

/** Zahl mit k/M/B-Suffix, deutsches Format. */
export function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  const neg = n < 0;
  let v = Math.abs(n);
  let i = 0;
  while (v >= 1000 && i < SUFFIXES.length - 1) {
    v /= 1000;
    i += 1;
  }
  const decimals = i === 0 ? (v < 100 ? 2 : 0) : v < 10 ? 2 : 1;
  const num = v.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (neg ? '−' : '') + num + (i > 0 ? ' ' + SUFFIXES[i] : '');
}

export function fmtMoney(n: number): string {
  return fmt(n) + ' €';
}

export function fmtRate(n: number): string {
  return fmt(n) + ' €/s';
}

/** Ganzzahl ohne Dezimalstellen (Klicks, Incidents, Stückzahlen). */
export function fmtInt(n: number): string {
  return Math.floor(n).toLocaleString('de-DE', { maximumFractionDigits: 0 });
}
