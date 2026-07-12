// ============================================================================
// engine.ts — pure Funktionen über dem GameState. Keine Seiteneffekte,
// kein DOM, kein Zufall. Spiegelt die Formeln aus v3/spec.md
// (und balance_sim.py) 1:1 wider — dadurch mit Vitest testbar.
// ============================================================================

import {
  BOOTSTRAP_MOT_BONUS,
  BUEROKRATIE_UPKEEP_MULT,
  BUYERS,
  COST_GROWTH,
  DEAL_COOLDOWN,
  DEAL_INCOME_MULT,
  FOUNDER_MOTIVATION,
  FOUNDER_OUTPUT,
  GRUENDER_BONUS_PER_TRAINING,
  HARDWARE,
  INCIDENTS,
  MOTIVATION_MAX,
  MOTIVATION_MIN,
  PERKS,
  RANKS,
  REP_BASE_PER_MIN,
  REP_EMP_RATE_CAP,
  REP_EXPECTATION,
  REP_MAX,
  REP_MULTIPLE_MAX_BONUS,
  REP_PER_EMPLOYEE_PER_MIN,
  REP_SOFTCAP,
  REPORTING_INCIDENT_MULT,
  ROUNDS,
  SPIKE_MULT,
  TRAININGS,
  UPGRADES,
  VALUATION_HW_RESIDUAL,
  VALUATION_INCOME_MULT,
  VALUATION_TEAM_MULT,
  WACHSTUMSDRUCK_MOT_MALUS,
  type PerkDef,
  type RoundDef,
} from './config';
import type { GameState, MetaState } from './state';

/** Perk-Stufe des laufenden Runs (bei Gründung eingefroren). */
export function perkLevel(s: GameState, perkId: string): number {
  return s.perks?.[perkId] ?? 0;
}

export function capacity(s: GameState): number {
  return HARDWARE.reduce((sum, h) => sum + h.capacity * (s.hw[h.id] ?? 0), 0);
}

export function upkeep(s: GameState): number {
  const base = HARDWARE.reduce((sum, h) => sum + h.upkeep * (s.hw[h.id] ?? 0), 0);
  // Bürokratie-Hürden (Series A / C): +10 % Betriebskosten pro Runde
  let mult = 1;
  for (const r of ROUNDS) {
    if ((r.hurdle === 'buerokratie' || r.hurdle === 'reorg') && s.rounds.includes(r.id)) {
      mult *= BUEROKRATIE_UPKEEP_MULT;
    }
  }
  return base * mult;
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
  // Bootstrap-Bonus: sobald das erste Term Sheet auf dem Tisch liegt, aber
  // kein Investor an Bord ist ("Wir gehören uns selbst"). Vorher neutral,
  // damit das validierte Early-Game-Balancing unberührt bleibt.
  if (s.rounds.length === 0 && s.valuationHighWater >= ROUNDS[0].threshold) {
    bonus += BOOTSTRAP_MOT_BONUS;
  }
  // Series-B-Hürde: unter der Reputations-Erwartung wird das Team nervös
  if (s.rounds.includes('series-b') && s.rep < REP_EXPECTATION) bonus -= WACHSTUMSDRUCK_MOT_MALUS;
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
  // Netzwerk-Perk: ×1,25 pro Stufe (multiplikativ)
  for (const p of PERKS) {
    if (p.effect.type === 'incomeMult') m *= Math.pow(p.effect.multPerLevel, perkLevel(s, p.id));
  }
  return m;
}

export function incidentProbMult(s: GameState): number {
  let m = 1;
  for (const u of UPGRADES) {
    if (s.upgrades.includes(u.id) && u.effect.type === 'incidentMult') m *= u.effect.mult;
  }
  // Seed-Hürde: Investoren-Reporting erhöht das Incident-Risiko
  if (s.rounds.includes('seed')) m *= REPORTING_INCIDENT_MULT;
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

/**
 * Reputationsaufbau pro Minute (incident-frei). Logistisch: je höher die
 * Reputation, desto zäher der weitere Aufbau — früh (Rep 8/25) kaum spürbar,
 * spät echte Arbeit. Der Angestellten-Beitrag ist gedeckelt, damit große
 * Teams die Kurve nicht trivialisieren.
 */
export function repPerMinute(s: GameState): number {
  const rate =
    REP_BASE_PER_MIN + Math.min(REP_EMP_RATE_CAP, REP_PER_EMPLOYEE_PER_MIN * employeeCount(s));
  return rate * Math.max(0, 1 - s.rep / REP_SOFTCAP);
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
// Gründer-Schulungen verbessern NUR diese Mechanik (Spec: "Gründer-Schulungen").

/** Auftrags-Multiplikator inkl. Schulungs-Boni (Basis 15×). */
export function dealMult(s: GameState): number {
  return TRAININGS.reduce(
    (m, t) => m + (s.trainings.includes(t.id) ? t.dealMultBonus : 0),
    DEAL_INCOME_MULT,
  );
}

/** Cooldown von "Auftrag gewinnen" inkl. Schulungs-Boni (Basis 30 s). */
export function dealCooldown(s: GameState): number {
  const cd = TRAININGS.reduce(
    (c, t) => c + (s.trainings.includes(t.id) ? t.cooldownBonus : 0),
    DEAL_COOLDOWN,
  );
  return Math.max(1, cd);
}

/** Wirkung eines Incident-Behebungs-Klicks (Basis 1, Schulung verdoppelt). */
export function fixPowerPerClick(s: GameState): number {
  return TRAININGS.reduce(
    (p, t) => p + (s.trainings.includes(t.id) ? t.fixClickBonus : 0),
    1,
  );
}

/** Wert eines gewonnenen Auftrags — skaliert mit dem Einkommen. */
export function dealValue(s: GameState): number {
  return baseIncome(s) * dealMult(s);
}

/** Auftrag gewinnen (Phase-2-Klick). false, wenn noch im Cooldown. */
export function dealClick(s: GameState): number | false {
  if (!s.milestoneReached || s.clickCooldown > 0) return false;
  const gain = dealValue(s);
  s.money += gain;
  s.stats.totalEarned += gain;
  s.clickCooldown = dealCooldown(s);
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

/**
 * Effektiver Zuwachs einer Schulung in €/s **bei aktivem Spielen** (jeder
 * Cooldown genutzt): Klick-Einkommensrate = dealMult/Cooldown × Gewinn/s.
 * Die UI zeigt diese Zahl statt der Rohwerte (UI-Regel aus der Spec).
 * 0 bei reinen Incident-Schulungen — dort erklärt die Beschreibung den Effekt.
 */
export function trainingActiveRateDelta(s: GameState, trainingId: string): number {
  const before = (dealMult(s) / dealCooldown(s)) * baseIncome(s);
  s.trainings.push(trainingId);
  const after = (dealMult(s) / dealCooldown(s)) * baseIncome(s);
  s.trainings.pop();
  return after - before;
}

// ----------------------------- Preise -----------------------------

/** Rabatt aus "Alte Kollegen" auf Einstellungen und Freischaltungen. */
export function hireDiscount(s: GameState): number {
  let m = 1;
  for (const p of PERKS) {
    if (p.effect.type === 'hireDiscount') m *= Math.pow(p.effect.multPerLevel, perkLevel(s, p.id));
  }
  return m;
}

export function hardwarePrice(s: GameState, hwId: string): number {
  const def = HARDWARE.find((h) => h.id === hwId)!;
  return def.basePrice * Math.pow(def.costGrowth ?? COST_GROWTH, s.hw[hwId] ?? 0);
}

export function hirePrice(s: GameState, rankId: string): number {
  const def = RANKS.find((r) => r.id === rankId)!;
  return def.basePrice * Math.pow(def.costGrowth ?? COST_GROWTH, s.emp[rankId] ?? 0) * hireDiscount(s);
}

export function unlockPrice(s: GameState, rankId: string): number {
  const def = RANKS.find((r) => r.id === rankId)!;
  return def.unlockCost * hireDiscount(s);
}

// ----------------------------- Ära-Gates (Finanzierungsrunden) -----------------------------

/** Ist die Ära dieser Runde offen (Runde angenommen oder selbst freigekauft)? */
export function roundUnlocked(s: GameState, roundId: string | undefined): boolean {
  if (!roundId) return true;
  return s.rounds.includes(roundId) || s.selfUnlocked.includes(roundId);
}

// ----------------------------- Aktionen (mutieren den State) -----------------------------

export function buyHardware(s: GameState, hwId: string): boolean {
  const def = HARDWARE.find((h) => h.id === hwId);
  if (!def || def.basePrice === 0) return false;
  if (!roundUnlocked(s, def.requiresRound)) return false;
  const price = hardwarePrice(s, hwId);
  if (s.money < price) return false;
  s.money -= price;
  s.hw[hwId] = (s.hw[hwId] ?? 0) + 1;
  return true;
}

export function unlockRank(s: GameState, rankId: string): boolean {
  const def = RANKS.find((r) => r.id === rankId);
  if (!def || s.unlockedRanks[rankId]) return false;
  if (!roundUnlocked(s, def.requiresRound)) return false;
  const price = unlockPrice(s, rankId);
  if (s.rep < def.repThreshold || s.money < price) return false;
  s.money -= price;
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

export function buyTraining(s: GameState, trainingId: string): boolean {
  const def = TRAININGS.find((t) => t.id === trainingId);
  if (!def || s.trainings.includes(trainingId)) return false;
  if (!s.milestoneReached) return false; // Schulungen gehören zu Phase 2
  if (s.money < def.price) return false;
  s.money -= def.price;
  s.trainings.push(trainingId);
  return true;
}

// ============================================================================
// Bewertung (Term Sheet) — Spec-Abschnitt "Bewertung & Meilensteine".
// Bewertung = Ertragskraft × Multiple + Team-Wert + Hardware-Restwert + Cash.
// Das Multiple wirkt NUR auf die Ertragskraft (Assets sind Assets — sonst
// entsteht ein Feedback-Loop: Funding-Cash würde sich selbst multiplizieren).
// ============================================================================

/** Ertragskraft: nachhaltiger Gewinn/s (Hochwasserstand des 10-min-Schnitts) × Multiple-Basis. */
export function ertragskraft(s: GameState): number {
  return s.sustainedIncome * VALUATION_INCOME_MULT;
}

/** Team-Wert: Acquihire-Prämie pro Kopf (0,5 × Rang-Basispreis). */
export function teamValue(s: GameState): number {
  return RANKS.reduce((sum, r) => sum + VALUATION_TEAM_MULT * r.basePrice * (s.emp[r.id] ?? 0), 0);
}

/** Hardware-Restwert: 50 % der tatsächlich gezahlten Kaufpreise (geometrische Summe). */
export function hardwareValue(s: GameState): number {
  let total = 0;
  for (const h of HARDWARE) {
    const n = s.hw[h.id] ?? 0;
    const bought = n - h.startCount; // Startgeräte waren gratis
    if (bought <= 0 || h.basePrice === 0) continue;
    const g = h.costGrowth ?? COST_GROWTH;
    total += h.basePrice * ((Math.pow(g, bought) - 1) / (g - 1));
  }
  return total * VALUATION_HW_RESIDUAL;
}

export function repMultiple(s: GameState): number {
  return 1 + REP_MULTIPLE_MAX_BONUS * (Math.min(s.rep, REP_MAX) / REP_MAX);
}

/** Der Käufer bezahlt die Schulungen des Gründers mit (Acquihire). */
export function gruenderBonus(s: GameState): number {
  return 1 + GRUENDER_BONUS_PER_TRAINING * s.trainings.length;
}

export function trackRecordBonus(s: GameState): number {
  for (const p of PERKS) {
    if (p.effect.type === 'valuationMult') return 1 + p.effect.bonusPerLevel * perkLevel(s, p.id);
  }
  return 1;
}

export function valuationMultiple(s: GameState): number {
  return repMultiple(s) * gruenderBonus(s) * trackRecordBonus(s);
}

export function valuation(s: GameState): number {
  return ertragskraft(s) * valuationMultiple(s) + teamValue(s) + hardwareValue(s) + s.money;
}

// ----------------------------- Finanzierungsrunden -----------------------------

export type RoundStatus = 'accepted' | 'offered' | 'trackGate' | 'locked';

/**
 * Status einer Runde: angenommen / Angebot liegt vor / Bewertung erreicht,
 * aber Track Record fehlt / noch nicht erreicht. Angebote triggern auf den
 * HOCHWASSERSTAND der Bewertung und bleiben liegen (ein Rep-Einbruch zieht
 * ein Term Sheet nicht zurück).
 */
export function roundStatus(s: GameState, def: RoundDef): RoundStatus {
  if (s.rounds.includes(def.id)) return 'accepted';
  if (s.valuationHighWater < def.threshold) return 'locked';
  return s.exitsBefore >= def.minExits ? 'offered' : 'trackGate';
}

/** Kapitalspritze der Runde inkl. Investoren-Standing-Perk. */
export function roundCash(s: GameState, def: RoundDef): number {
  for (const p of PERKS) {
    if (p.effect.type === 'fundingTerms') {
      return def.cash * (1 + p.effect.cashMultPerLevel * perkLevel(s, p.id));
    }
  }
  return def.cash;
}

/** Anteils-Abgabe der Runde inkl. Investoren-Standing-Perk (min. 5 Punkte). */
export function roundDilution(s: GameState, def: RoundDef): number {
  for (const p of PERKS) {
    if (p.effect.type === 'fundingTerms') {
      return Math.max(0.05, def.dilution - p.effect.dilutionReliefPerLevel * perkLevel(s, p.id));
    }
  }
  return def.dilution;
}

export function acceptRound(s: GameState, roundId: string): boolean {
  const def = ROUNDS.find((r) => r.id === roundId);
  if (!def || roundStatus(s, def) !== 'offered') return false;
  s.money += roundCash(s, def);
  s.founderShare = Math.max(0, s.founderShare - roundDilution(s, def));
  s.rounds.push(roundId);
  return true;
}

/**
 * Ära-Unlock "aus eigener Tasche": schaltet die Hardware/Ränge der Runde frei,
 * ohne Investor — kein Cash, keine Dilution, keine Hürde. Teuer, aber der
 * Bootstrap-Weg bleibt immer offen. Möglich, sobald das Angebot sichtbar wäre
 * (Schwelle erreicht) — auch wenn der Track Record für Investoren fehlt.
 */
export function selfUnlockRound(s: GameState, roundId: string): boolean {
  const def = ROUNDS.find((r) => r.id === roundId);
  if (!def || s.rounds.includes(roundId) || s.selfUnlocked.includes(roundId)) return false;
  if (s.valuationHighWater < def.threshold) return false;
  if (s.money < def.selfUnlockPrice) return false;
  s.money -= def.selfUnlockPrice;
  s.selfUnlocked.push(roundId);
  return true;
}

// ----------------------------- Der Exit -----------------------------

/** Verkaufserlös: aktuelle Bewertung × Gründer-Anteil. */
export function exitProceeds(s: GameState): number {
  return valuation(s) * s.founderShare;
}

export function buyerFor(v: number): string {
  let name = BUYERS[0].name;
  for (const b of BUYERS) if (v >= b.minValuation) name = b.name;
  return name;
}

// ----------------------------- Gründer-Perks (Meta) -----------------------------

export function perkPrice(meta: MetaState, perkId: string): number {
  const def = PERKS.find((p) => p.id === perkId)!;
  return def.basePrice * Math.pow(def.priceGrowth, meta.perks[perkId] ?? 0);
}

export function perkMaxed(meta: MetaState, def: PerkDef): boolean {
  return (meta.perks[def.id] ?? 0) >= def.maxLevel;
}

export function buyPerk(meta: MetaState, perkId: string): boolean {
  const def = PERKS.find((p) => p.id === perkId);
  if (!def || perkMaxed(meta, def)) return false;
  const price = perkPrice(meta, perkId);
  if (meta.bank < price) return false;
  meta.bank -= price;
  meta.perks[perkId] = (meta.perks[perkId] ?? 0) + 1;
  return true;
}
