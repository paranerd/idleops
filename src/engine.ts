// ============================================================================
// engine.ts — pure Funktionen über dem GameState. Keine Seiteneffekte,
// kein DOM, kein Zufall. Spiegelt die Formeln aus v3/spec.md
// (und balance_sim.py) 1:1 wider — dadurch mit Vitest testbar.
// ============================================================================

import {
  COST_GROWTH,
  DEAL_COOLDOWN,
  DEAL_INCOME_MULT,
  FOUNDER_MOTIVATION,
  FOUNDER_OUTPUT,
  HARDWARE,
  INCIDENTS,
  MOTIVATION_MAX,
  MOTIVATION_MIN,
  RANKS,
  REP_BASE_PER_MIN,
  REP_MAX,
  REP_PER_EMPLOYEE_PER_MIN,
  SPIKE_MULT,
  UPGRADES,
} from './config';
import type { GameState } from './state';

export function capacity(s: GameState): number {
  return HARDWARE.reduce((sum, h) => sum + h.capacity * (s.hw[h.id] ?? 0), 0);
}

export function upkeep(s: GameState): number {
  return HARDWARE.reduce((sum, h) => sum + h.upkeep * (s.hw[h.id] ?? 0), 0);
}

export function output(s: GameState): number {
  return FOUNDER_OUTPUT + RANKS.reduce((sum, r) => sum + r.output * (s.emp[r.id] ?? 0), 0);
}

export function employeeCount(s: GameState): number {
  return RANKS.reduce((sum, r) => sum + (s.emp[r.id] ?? 0), 0);
}

export function motivation(s: GameState): number {
  const heads = 1 + employeeCount(s); // inkl. Gründer
  const total =
    FOUNDER_MOTIVATION + RANKS.reduce((sum, r) => sum + r.motivation * (s.emp[r.id] ?? 0), 0);
  let bonus = 0;
  for (const u of UPGRADES) {
    if (s.upgrades.includes(u.id) && u.effect.type === 'motivation') bonus += u.effect.bonus;
  }
  return Math.min(MOTIVATION_MAX, Math.max(MOTIVATION_MIN, total / heads + bonus));
}

export function repFactor(s: GameState): number {
  return 0.8 + 0.4 * (Math.min(s.rep, REP_MAX) / REP_MAX);
}

export function incomeMult(s: GameState): number {
  let m = 1;
  for (const u of UPGRADES) {
    if (s.upgrades.includes(u.id) && u.effect.type === 'incomeMult') m *= u.effect.mult;
  }
  return m;
}

export function incidentProbMult(s: GameState): number {
  let m = 1;
  for (const u of UPGRADES) {
    if (s.upgrades.includes(u.id) && u.effect.type === 'incidentMult') m *= u.effect.mult;
  }
  return m;
}

export function hasAutoFixLight(s: GameState): boolean {
  return UPGRADES.some(
    (u) => s.upgrades.includes(u.id) && u.effect.type === 'autoFixLight',
  );
}

/** Risikopunkte des Teams (für Incident-Wahrscheinlichkeit). */
export function riskPoints(s: GameState): number {
  return RANKS.reduce((sum, r) => sum + r.riskPoints * (s.emp[r.id] ?? 0), 0);
}

/** Reputationsaufbau pro Minute (incident-frei). */
export function repPerMinute(s: GameState): number {
  return REP_BASE_PER_MIN + REP_PER_EMPLOYEE_PER_MIN * employeeCount(s);
}

/**
 * Kern-Formel aus der Spec:
 * Gewinn/s = min(Kapazität, Output) × Motivation × Reputations-Faktor
 *            × Upgrade-Multiplikatoren − Betriebskosten, geklemmt auf ≥ 0.
 * Spike hebt das Output-Potenzial (×20), die Kapazität deckelt.
 * Incidents drosseln den Bruttogewinn (leicht ×0,5 / schwer ×0).
 */
export function income(s: GameState): number {
  const out = s.spikeRemaining > 0 ? output(s) * SPIKE_MULT : output(s);
  let gross = Math.min(capacity(s), out) * motivation(s) * repFactor(s) * incomeMult(s);
  if (s.incident) gross *= INCIDENTS[s.incident.defIndex].incomeMult;
  return Math.max(0, gross - upkeep(s));
}

/** Einkommen ohne Incident/Spike — für Offline-Progress und Meilenstein. */
export function baseIncome(s: GameState): number {
  const gross = Math.min(capacity(s), output(s)) * motivation(s) * repFactor(s) * incomeMult(s);
  return Math.max(0, gross - upkeep(s));
}

// ----------------------------- Klick Phase 2: Auftrag gewinnen -----------------------------

/** Wert eines gewonnenen Auftrags — skaliert mit dem Einkommen. */
export function dealValue(s: GameState): number {
  return baseIncome(s) * DEAL_INCOME_MULT;
}

/** Auftrag gewinnen (Phase-2-Klick). false, wenn noch im Cooldown. */
export function dealClick(s: GameState): number | false {
  if (!s.milestoneReached || s.clickCooldown > 0) return false;
  const gain = dealValue(s);
  s.money += gain;
  s.stats.totalEarned += gain;
  s.clickCooldown = DEAL_COOLDOWN;
  return gain;
}

// ----------------------------- Kauf-Vorschau -----------------------------
// Effektiver Gewinn-Zuwachs eines hypothetischen Kaufs — inklusive aller
// Multiplikatoren (Motivation, Reputation, Upgrades) und min(). Das ist die
// Zahl, die die Kauf-UI anzeigen muss: Roh-Output ("0,2 €/s") und effektiver
// Gewinn unterscheiden sich sonst sichtbar (UI-Regel in der Spec).

export function hireIncomeDelta(s: GameState, rankId: string): number {
  const before = baseIncome(s);
  s.emp[rankId] = (s.emp[rankId] ?? 0) + 1;
  const after = baseIncome(s);
  s.emp[rankId] -= 1;
  return after - before;
}

export function hardwareIncomeDelta(s: GameState, hwId: string): number {
  const before = baseIncome(s);
  s.hw[hwId] = (s.hw[hwId] ?? 0) + 1;
  const after = baseIncome(s);
  s.hw[hwId] -= 1;
  return after - before;
}

// ----------------------------- Preise -----------------------------

export function hardwarePrice(s: GameState, hwId: string): number {
  const def = HARDWARE.find((h) => h.id === hwId)!;
  return def.basePrice * Math.pow(COST_GROWTH, s.hw[hwId] ?? 0);
}

export function hirePrice(s: GameState, rankId: string): number {
  const def = RANKS.find((r) => r.id === rankId)!;
  return def.basePrice * Math.pow(COST_GROWTH, s.emp[rankId] ?? 0);
}

// ----------------------------- Aktionen (mutieren den State) -----------------------------

export function buyHardware(s: GameState, hwId: string): boolean {
  const def = HARDWARE.find((h) => h.id === hwId);
  if (!def || def.basePrice === 0) return false;
  const price = hardwarePrice(s, hwId);
  if (s.money < price) return false;
  s.money -= price;
  s.hw[hwId] = (s.hw[hwId] ?? 0) + 1;
  return true;
}

export function unlockRank(s: GameState, rankId: string): boolean {
  const def = RANKS.find((r) => r.id === rankId);
  if (!def || s.unlockedRanks[rankId]) return false;
  if (s.rep < def.repThreshold || s.money < def.unlockCost) return false;
  s.money -= def.unlockCost;
  s.unlockedRanks[rankId] = true;
  return true;
}

export function hire(s: GameState, rankId: string): boolean {
  const def = RANKS.find((r) => r.id === rankId);
  if (!def || !s.unlockedRanks[rankId]) return false;
  // Sanftes Design: bestehende Angestellte bleiben, aber unter der
  // Rep-Schwelle sind keine Neueinstellungen dieses Rangs möglich.
  if (s.rep < def.repThreshold) return false;
  const price = hirePrice(s, rankId);
  if (s.money < price) return false;
  s.money -= price;
  s.emp[rankId] = (s.emp[rankId] ?? 0) + 1;
  return true;
}

export function buyUpgrade(s: GameState, upgradeId: string): boolean {
  const def = UPGRADES.find((u) => u.id === upgradeId);
  if (!def || s.upgrades.includes(upgradeId)) return false;
  if (s.money < def.price) return false;
  s.money -= def.price;
  s.upgrades.push(upgradeId);
  return true;
}
