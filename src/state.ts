import { HARDWARE, PERKS, RANKS } from './config';

export interface ActiveIncident {
  defIndex: number; // Index in INCIDENTS
  title: string;
  remaining: number; // s bis Selbstheilung
  clicksLeft: number;
}

// Meta-Progression: überlebt den Exit (eigener localStorage-Key).
export interface MetaState {
  perks: Record<string, number>; // perkId -> Stufe
  bank: number; // unverbrauchter Exit-Erlös
  exits: number; // Anzahl Exits (Track-Record-Gate der späten Runden)
  bestValuation: number;
  unicornReached: boolean;
}

export function initialMeta(): MetaState {
  const perks: Record<string, number> = {};
  for (const p of PERKS) perks[p.id] = 0;
  return { perks, bank: 0, exits: 0, bestValuation: 0, unicornReached: false };
}

export interface GameState {
  money: number;
  rep: number; // 0..100
  hw: Record<string, number>; // hardwareId -> Anzahl
  emp: Record<string, number>; // rankId -> Anzahl
  unlockedRanks: Record<string, boolean>;
  upgrades: string[]; // gekaufte Upgrade-IDs
  trainings: string[]; // absolvierte Gründer-Schulungen (IDs)
  incident: ActiveIncident | null;
  spikeRemaining: number; // s, 0 = kein Spike
  clickCooldown: number; // s, Cooldown von "Auftrag gewinnen" (Phase 2)
  milestoneReached: boolean; // "passiv > Klick"
  pmfReached: boolean; // Produkt-Markt-Fit: schaltet Spike + Bewertungs-Anzeige frei
  // Bewertung: gleitender 10-min-Schnitt von baseIncome + dessen Hochwasserstand
  emaIncome: number;
  sustainedIncome: number; // Hochwasserstand des Schnitts → Ertragskraft
  valuationHighWater: number; // Meilenstein-/Runden-Trigger (Angebote bleiben liegen)
  rounds: string[]; // angenommene Finanzierungsrunden (IDs)
  selfUnlocked: string[]; // Ära-Unlocks "aus eigener Tasche" (Runden-IDs)
  founderShare: number; // 1,0 → sinkt mit jeder angenommenen Runde
  // Perk-Stufen, mit denen dieser Run gegründet wurde (Kopie aus MetaState —
  // so bleibt die Engine eine pure Funktion über dem GameState)
  perks: Record<string, number>;
  exitsBefore: number; // Exits vor diesem Run (Track-Record-Gate von Series B/C)
  revealed: string[]; // progressive disclosure (einmal gesehen bleibt sichtbar)
  stats: {
    clicks: number;
    totalEarned: number;
    incidents: number;
    spikes: number;
    unicornSeen?: boolean; // Feier nur einmal pro Run
  };
  lastSave: number; // Date.now() ms
}

export function initialState(meta?: MetaState): GameState {
  const hw: Record<string, number> = {};
  for (const h of HARDWARE) hw[h.id] = h.startCount;
  const emp: Record<string, number> = {};
  const unlockedRanks: Record<string, boolean> = {};
  for (const r of RANKS) {
    emp[r.id] = 0;
    unlockedRanks[r.id] = r.unlockCost === 0;
  }
  // Beschleuniger-Perks wirken auf den Startzustand
  let money = 0;
  let rep = 0;
  const perks: Record<string, number> = {};
  if (meta) {
    for (const p of PERKS) {
      const level = meta.perks[p.id] ?? 0;
      perks[p.id] = level;
      if (!level) continue;
      if (p.effect.type === 'startMoney') money = p.effect.base * Math.pow(p.effect.factorPerLevel, level - 1);
      if (p.effect.type === 'startRep') rep = Math.min(p.effect.max, p.effect.perLevel * level);
    }
  }
  return {
    money,
    rep,
    hw,
    emp,
    unlockedRanks,
    upgrades: [],
    trainings: [],
    incident: null,
    spikeRemaining: 0,
    clickCooldown: 0,
    milestoneReached: false,
    pmfReached: false,
    emaIncome: 0,
    sustainedIncome: 0,
    valuationHighWater: 0,
    rounds: [],
    selfUnlocked: [],
    founderShare: 1,
    perks,
    exitsBefore: meta?.exits ?? 0,
    revealed: [],
    stats: { clicks: 0, totalEarned: 0, incidents: 0, spikes: 0 },
    lastSave: Date.now(),
  };
}
