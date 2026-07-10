import { HARDWARE, RANKS } from './config';

export interface ActiveIncident {
  defIndex: number; // Index in INCIDENTS
  title: string;
  remaining: number; // s bis Selbstheilung
  clicksLeft: number;
}

export interface GameState {
  money: number;
  rep: number; // 0..100
  hw: Record<string, number>; // hardwareId -> Anzahl
  emp: Record<string, number>; // rankId -> Anzahl
  unlockedRanks: Record<string, boolean>;
  upgrades: string[]; // gekaufte Upgrade-IDs
  incident: ActiveIncident | null;
  spikeRemaining: number; // s, 0 = kein Spike
  clickCooldown: number; // s, Cooldown von "Auftrag gewinnen" (Phase 2)
  milestoneReached: boolean; // "passiv > Klick"
  revealed: string[]; // progressive disclosure (einmal gesehen bleibt sichtbar)
  stats: { clicks: number; totalEarned: number; incidents: number; spikes: number };
  lastSave: number; // Date.now() ms
}

export function initialState(): GameState {
  const hw: Record<string, number> = {};
  for (const h of HARDWARE) hw[h.id] = h.startCount;
  const emp: Record<string, number> = {};
  const unlockedRanks: Record<string, boolean> = {};
  for (const r of RANKS) {
    emp[r.id] = 0;
    unlockedRanks[r.id] = r.unlockCost === 0;
  }
  return {
    money: 0,
    rep: 0,
    hw,
    emp,
    unlockedRanks,
    upgrades: [],
    incident: null,
    spikeRemaining: 0,
    clickCooldown: 0,
    milestoneReached: false,
    revealed: [],
    stats: { clicks: 0, totalEarned: 0, incidents: 0, spikes: 0 },
    lastSave: Date.now(),
  };
}
