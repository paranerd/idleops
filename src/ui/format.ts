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

// Neutrale Spielwährung: Münze statt realer Währung ("🪙 100" statt "100 €").
// In Text-Kontexten (Tooltips, aria-Labels) bleibt das Emoji; sichtbare
// Anzeigen ersetzen es per withCoinSvg() durch die goldene SVG-Münze.
const COIN = '🪙';

// Goldene Münze, em-skaliert (wächst mit der Schriftgröße des Kontexts).
// Gleiche Gradient-ID bei Mehrfachverwendung ist ok — die Definitionen sind identisch.
const COIN_SVG =
  '<svg class="coin" viewBox="0 0 16 16" aria-hidden="true">' +
  '<defs><linearGradient id="coin-gold" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#ffd95e"/><stop offset="1" stop-color="#dfa219"/>' +
  '</linearGradient></defs>' +
  '<circle cx="8" cy="8" r="7.2" fill="url(#coin-gold)" stroke="#a87908" stroke-width="1.2"/>' +
  '<circle cx="8" cy="8" r="4.4" fill="none" stroke="#c9920e" stroke-width="1.1"/>' +
  '</svg>';

/**
 * Ersetzt das Münz-Emoji durch die goldene SVG-Münze — für innerHTML-Kontexte.
 * Nur für selbst erzeugte Strings verwenden (kein Escaping von Nutzereingaben).
 */
export function withCoinSvg(text: string): string {
  return text.replaceAll(COIN, COIN_SVG);
}

export function fmtMoney(n: number): string {
  return `${COIN} ${fmt(n)}`;
}

export function fmtRate(n: number): string {
  return `${COIN} ${fmt(n)}/s`;
}

/** Ganzzahl ohne Dezimalstellen (Klicks, Incidents, Stückzahlen). */
export function fmtInt(n: number): string {
  return Math.floor(n).toLocaleString('de-DE', { maximumFractionDigits: 0 });
}
