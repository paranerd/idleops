// ============================================================================
// tick.ts — der Herzschlag des Spiels: rAF-Loop mit Delta-Time.
// advance() ist von der Loop getrennt, damit Tests und Offline-Progress
// dieselbe Logik nutzen können.
// ============================================================================

import { MILESTONE_PASSIVE_INCOME, REP_MAX } from './config';
import { baseIncome, income, repPerMinute } from './engine';
import { rollIncident, rollSpike, tickIncident, tickSpike, type GameEvent } from './events';
import type { GameState } from './state';

export type MilestoneEvent = { kind: 'milestone' };

/** Einen Zeitschritt simulieren. Gibt UI-relevante Events zurück. */
export function advance(s: GameState, dt: number, rng: () => number = Math.random): (GameEvent | MilestoneEvent)[] {
  const events: (GameEvent | MilestoneEvent)[] = [];

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

  return events;
}

/** Startet die rAF-Loop. onTick wird nach jedem Schritt aufgerufen. */
export function startLoop(
  s: GameState,
  onTick: (events: (GameEvent | MilestoneEvent)[], dt: number) => void,
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
