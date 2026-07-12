// ============================================================================
// tick.ts — der Herzschlag des Spiels: rAF-Loop mit Delta-Time.
// advance() ist von der Loop getrennt, damit Tests und Offline-Progress
// dieselbe Logik nutzen können.
// ============================================================================

import {
  MILESTONE_PASSIVE_INCOME,
  PMF_RANK,
  REP_MAX,
  ROUNDS,
  UNICORN_VALUATION,
  VALUATION_EMA_SECONDS,
} from './config';
import { baseIncome, income, repPerMinute, roundStatus, valuation } from './engine';
import { rollIncident, rollSpike, tickIncident, tickSpike, type GameEvent } from './events';
import type { GameState } from './state';

export type ProgressEvent =
  | { kind: 'milestone' }
  | { kind: 'pmf' } // Produkt-Markt-Fit: Spike + Bewertungs-Anzeige freigeschaltet
  | { kind: 'roundOffer'; roundId: string } // Term Sheet liegt auf dem Tisch
  | { kind: 'unicorn' };

/** Bewertungs-Tracking: 10-min-Schnitt, Hochwasserstände. Auch offline genutzt. */
export function advanceValuation(s: GameState, dt: number): void {
  const inc = baseIncome(s); // spike- und incident-frei — die nachhaltige Rate
  s.emaIncome += (inc - s.emaIncome) * Math.min(1, dt / VALUATION_EMA_SECONDS);
  s.sustainedIncome = Math.max(s.sustainedIncome, s.emaIncome);
  s.valuationHighWater = Math.max(s.valuationHighWater, valuation(s));
}

/** Einen Zeitschritt simulieren. Gibt UI-relevante Events zurück. */
export function advance(s: GameState, dt: number, rng: () => number = Math.random): (GameEvent | ProgressEvent)[] {
  const events: (GameEvent | ProgressEvent)[] = [];

  const inc = income(s);
  s.money += inc * dt;
  s.stats.totalEarned += inc * dt;

  // Reputation baut sich nur incident-frei auf
  if (!s.incident) {
    s.rep = Math.min(REP_MAX, s.rep + (repPerMinute(s) / 60) * dt);
  }

  // Cooldown von "Auftrag gewinnen"
  s.clickCooldown = Math.max(0, s.clickCooldown - dt);

  events.push(...tickIncident(s, dt));
  events.push(...tickSpike(s, dt));
  events.push(...rollIncident(s, dt, rng));
  events.push(...rollSpike(s, dt, rng));

  // Meilenstein: passives Einkommen übersteigt nominelles Klick-Einkommen
  if (!s.milestoneReached && baseIncome(s) > MILESTONE_PASSIVE_INCOME) {
    s.milestoneReached = true;
    events.push({ kind: 'milestone' });
  }

  // Produkt-Markt-Fit: bei der Senior-Freischaltung — schaltet den viralen
  // Spike und die Bewertungs-Anzeige frei ("Investoren werden aufmerksam")
  if (!s.pmfReached && s.unlockedRanks[PMF_RANK]) {
    s.pmfReached = true;
    events.push({ kind: 'pmf' });
  }

  // Bewertung fortschreiben; neue Term Sheets ankündigen (Hochwasserstand!)
  const offeredBefore = ROUNDS.filter((r) => roundStatus(s, r) === 'offered').map((r) => r.id);
  advanceValuation(s, dt);
  for (const r of ROUNDS) {
    if (roundStatus(s, r) === 'offered' && !offeredBefore.includes(r.id)) {
      events.push({ kind: 'roundOffer', roundId: r.id });
    }
  }

  // 🦄
  if (!s.stats.unicornSeen && s.valuationHighWater >= UNICORN_VALUATION) {
    s.stats.unicornSeen = true;
    events.push({ kind: 'unicorn' });
  }

  return events;
}

/** Startet die rAF-Loop. onTick wird nach jedem Schritt aufgerufen. */
export function startLoop(
  s: GameState,
  onTick: (events: (GameEvent | ProgressEvent)[], dt: number) => void,
): void {
  let last = performance.now();
  const frame = (now: number) => {
    // Delta-Time, gedeckelt (Tab war im Hintergrund => max 1 s pro Frame;
    // längere Abwesenheit übernimmt der Offline-Progress beim Laden)
    const dt = Math.min(1, (now - last) / 1000);
    last = now;
    const events = advance(s, dt);
    onTick(events, dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
