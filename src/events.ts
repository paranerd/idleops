// ============================================================================
// events.ts — Incidents und viraler Spike. Enthält den Zufall
// (bewusst außerhalb der puren engine.ts).
// ============================================================================

import {
  INCIDENTS,
  INCIDENT_LIGHT_WEIGHT,
  INCIDENT_PROB_CAP_PER_MIN,
  INCIDENT_PROB_PER_RISKPOINT_PER_MIN,
  SPIKE_DURATION,
  SPIKE_HUG_REP_LOSS,
  SPIKE_MIN_INCOME,
  SPIKE_PROB_PER_SEC,
  SPIKE_RESERVE_RATIO,
} from './config';
import { baseIncome, capacity, fixPowerPerClick, hasAutoFixLight, incidentProbMult, output, riskPoints } from './engine';
import type { GameState } from './state';

export type GameEvent =
  | { kind: 'incidentStart'; title: string; severity: 'light' | 'heavy' }
  | { kind: 'incidentAutoFixed'; title: string }
  | { kind: 'incidentSelfHealed'; title: string }
  | { kind: 'incidentFixed'; title: string }
  | { kind: 'spikeStart' }
  | { kind: 'spikeEnd' }
  | { kind: 'hugOfDeath' };

/** Incident-Wahrscheinlichkeit pro Sekunde. */
export function incidentProbPerSec(s: GameState): number {
  const perMin = Math.min(
    INCIDENT_PROB_CAP_PER_MIN,
    INCIDENT_PROB_PER_RISKPOINT_PER_MIN * riskPoints(s),
  ) * incidentProbMult(s);
  return perMin / 60;
}

/** Würfelt Incident-Spawn; gibt Events zur Anzeige zurück. */
export function rollIncident(s: GameState, dt: number, rng: () => number): GameEvent[] {
  if (s.incident) return [];
  if (rng() >= incidentProbPerSec(s) * dt) return [];
  // leicht : schwer = 5 : 1
  const heavy = rng() < 1 / (INCIDENT_LIGHT_WEIGHT + 1);
  const defIndex = heavy ? 1 : 0;
  const def = INCIDENTS[defIndex];
  const title = def.titles[Math.floor(rng() * def.titles.length)];
  const auto = def.severity === 'light' && hasAutoFixLight(s);
  s.incident = {
    defIndex,
    title,
    remaining: auto ? def.autoFixDuration : def.duration,
    clicksLeft: def.clicksToFix,
  };
  s.rep = Math.max(0, s.rep - def.repLoss);
  s.stats.incidents += 1;
  return [{ kind: 'incidentStart', title, severity: def.severity }];
}

/** Incident-Timer fortschreiben (Selbstheilung / Auto-Fix). */
export function tickIncident(s: GameState, dt: number): GameEvent[] {
  if (!s.incident) return [];
  s.incident.remaining -= dt;
  if (s.incident.remaining > 0) return [];
  const title = s.incident.title;
  const wasAuto =
    INCIDENTS[s.incident.defIndex].severity === 'light' && hasAutoFixLight(s);
  s.incident = null;
  return [{ kind: wasAuto ? 'incidentAutoFixed' : 'incidentSelfHealed', title }];
}

/** Spieler klickt auf "Beheben". Incident-Response-Training verstärkt den Klick. */
export function clickFixIncident(s: GameState): GameEvent[] {
  if (!s.incident) return [];
  s.incident.clicksLeft -= fixPowerPerClick(s);
  if (s.incident.clicksLeft > 0) return [];
  const title = s.incident.title;
  s.incident = null;
  return [{ kind: 'incidentFixed', title }];
}

/** Würfelt den viralen Spike (nicht während eines Incidents). */
export function rollSpike(s: GameState, dt: number, rng: () => number): GameEvent[] {
  if (s.spikeRemaining > 0 || s.incident) return [];
  if (baseIncome(s) < SPIKE_MIN_INCOME) return [];
  if (rng() >= SPIKE_PROB_PER_SEC * dt) return [];
  // Genug Hardware-Reserve? Sonst Hug of Death.
  if (capacity(s) < SPIKE_RESERVE_RATIO * output(s)) {
    s.rep = Math.max(0, s.rep - SPIKE_HUG_REP_LOSS);
    return [{ kind: 'hugOfDeath' }];
  }
  s.spikeRemaining = SPIKE_DURATION;
  s.stats.spikes += 1;
  return [{ kind: 'spikeStart' }];
}

export function tickSpike(s: GameState, dt: number): GameEvent[] {
  if (s.spikeRemaining <= 0) return [];
  s.spikeRemaining = Math.max(0, s.spikeRemaining - dt);
  return s.spikeRemaining === 0 ? [{ kind: 'spikeEnd' }] : [];
}
