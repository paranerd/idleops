// ============================================================================
// config.ts — ALLE Balancing-Werte aus v3/spec.md, Abschnitt
// "Balancing-Startwerte (MVP)". Nur Daten, kein Code.
// Änderungen hier mit balance_sim.py gegenrechnen.
// ============================================================================

// Klick Phase 1 (vor dem Meilenstein): "Ticket bearbeiten" — Button-Mashing
export const CLICK_VALUE = 0.5; // € pro Klick
// Klick Phase 2 (nach dem Meilenstein): "Auftrag gewinnen" — dicker Abschluss mit Cooldown.
// Wert skaliert mit dem Einkommen, damit der Klick nie bedeutungslos wird.
export const DEAL_INCOME_MULT = 15; // × Gewinn/s pro Abschluss
export const DEAL_COOLDOWN = 30; // s

export const FOUNDER_OUTPUT = 0.3; // €/s, der Gründer arbeitet immer
export const FOUNDER_MOTIVATION = 1.0;
export const COST_GROWTH = 1.15; // Preisfaktor pro Kauf innerhalb einer Stufe

// Meilenstein "passiv > Klick-Einkommen": nominelle Klickrate 2/s
export const MILESTONE_PASSIVE_INCOME = CLICK_VALUE * 2;

// Motivation: Kopfzahl-gewichteter Schnitt + Perk-Boni, geklemmt
export const MOTIVATION_MIN = 0.5;
export const MOTIVATION_MAX = 1.5;

// Reputation
export const REP_MAX = 100;
export const REP_BASE_PER_MIN = 0.5;
export const REP_PER_EMPLOYEE_PER_MIN = 0.05;
export const REP_OFFLINE_CAP_SECONDS = 2 * 3600; // Offline-Aufbau gedeckelt

// Incidents
export const INCIDENT_PROB_PER_RISKPOINT_PER_MIN = 0.0015; // 0,15 %/min
export const INCIDENT_PROB_CAP_PER_MIN = 0.08; // 8 %/min
export const INCIDENT_LIGHT_WEIGHT = 5; // leicht : schwer = 5 : 1

// Viraler Spike
export const SPIKE_PROB_PER_SEC = 1 / 600; // ~ alle 10 min eine Chance
export const SPIKE_MULT = 20;
export const SPIKE_DURATION = 60; // s
export const SPIKE_RESERVE_RATIO = 1.2; // Kapazität < 1,2×Output => Hug of Death
export const SPIKE_HUG_REP_LOSS = 5;
export const SPIKE_MIN_INCOME = 1; // Spike erst, wenn das Spiel läuft

export interface HardwareDef {
  id: string;
  name: string;
  icon: string; // Emoji für die UI
  capacity: number; // €/s
  basePrice: number; // €, Laptop: 0 = Startgerät, nicht kaufbar
  upkeep: number; // €/s Betriebskosten
  startCount: number;
  revealAtTotalEarned: number; // progressive disclosure
  // erst sichtbar, wenn dieser Rang freigeschaltet ist — große Kapazität
  // gehört in die Ära, deren Team sie auch füllen kann
  revealAfterRankUnlock?: string;
}

export const HARDWARE: HardwareDef[] = [
  { id: 'laptop', name: 'Laptop', icon: '💻', capacity: 1.0, basePrice: 0, upkeep: 0, startCount: 1, revealAtTotalEarned: 0 },
  { id: 'pi', name: 'Raspberry Pi', icon: '🍓', capacity: 1.0, basePrice: 15, upkeep: 0.02, startCount: 0, revealAtTotalEarned: 0 },
  { id: 'tower', name: 'Tower PC', icon: '🖥️', capacity: 8.0, basePrice: 250, upkeep: 0.2, startCount: 0, revealAtTotalEarned: 0, revealAfterRankUnlock: 'junior' },
];

export interface RankDef {
  id: string;
  name: string;
  icon: string; // Emoji für die UI
  output: number; // €/s
  basePrice: number; // €
  motivation: number; // Basis-Motivation
  riskPoints: number; // Incident-Risikopunkte pro Kopf
  repThreshold: number; // Reputations-Gate
  unlockCost: number; // einmalige Freischaltung ("Employer Branding")
}

export const RANKS: RankDef[] = [
  { id: 'intern', name: 'Intern', icon: '🐣', output: 0.2, basePrice: 20, motivation: 0.9, riskPoints: 3, repThreshold: 0, unlockCost: 0 },
  { id: 'junior', name: 'Junior Developer', icon: '🧑‍💻', output: 1.5, basePrice: 300, motivation: 1.0, riskPoints: 1, repThreshold: 8, unlockCost: 150 },
  { id: 'senior', name: 'Senior Developer', icon: '🧙', output: 8.0, basePrice: 3000, motivation: 1.1, riskPoints: 0.3, repThreshold: 25, unlockCost: 1500 },
];

export type UpgradeEffect =
  | { type: 'motivation'; bonus: number }
  | { type: 'incomeMult'; mult: number }
  | { type: 'incidentMult'; mult: number }
  | { type: 'autoFixLight' };

export interface UpgradeDef {
  id: string;
  name: string;
  icon: string; // Emoji für die UI
  price: number;
  impact: string; // der Effekt in Kurzform — sichtbar in der Zeile
  desc: string; // Flavor-Text — nur im (i)-Popover
  effect: UpgradeEffect;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'obst', name: 'Obstschale', icon: '🍎', price: 300, impact: '+0,05 Motivation', desc: 'Vitamine!', effect: { type: 'motivation', bonus: 0.05 } },
  { id: 'cicd', name: 'CI/CD', icon: '🔁', price: 800, impact: '−25 % Incident-Wahrscheinlichkeit', desc: 'Jeder Push geht automatisch live — kein Deployen von Hand mehr.', effect: { type: 'incidentMult', mult: 0.75 } },
  { id: 'snacks', name: 'Snacks', icon: '🍫', price: 2000, impact: '+0,05 Motivation', desc: 'Der Automat ist jetzt gratis.', effect: { type: 'motivation', bonus: 0.05 } },
  { id: 'caching', name: 'Caching', icon: '⚡', price: 5000, impact: '+25 % Gewinn', desc: 'Es gibt nur zwei schwere Probleme in der Informatik…', effect: { type: 'incomeMult', mult: 1.25 } },
  { id: 'runbooks', name: 'Runbooks', icon: '📖', price: 8000, impact: 'Leichte Incidents beheben sich automatisch', desc: 'Wenn es brennt, steht der Plan schon im Wiki.', effect: { type: 'autoFixLight' } },
  { id: 'tests', name: 'Unit-Tests', icon: '✅', price: 12000, impact: '−25 % Incident-Wahrscheinlichkeit', desc: 'Rot, grün, refactor.', effect: { type: 'incidentMult', mult: 0.75 } },
];

// Gründer-Schulungen: In-Run-Progression des Gründers (Spec-Abschnitt
// "Gründer-Schulungen"). Verbessern NUR die Klick-Mechanik — der Effekt
// passt immer zum Thema der Schulung. Leitplanke: voll ausgebaut
// dealMult/cooldown ≤ 1,0 (≈ max. +100 % Einkommensäquivalent), MVP: 21×/22 s.
export interface TrainingDef {
  id: string;
  name: string;
  icon: string; // Emoji für die UI
  price: number;
  desc: string; // Flavor-Text — nur im (i)-Popover
  dealMultBonus: number; // + auf den Auftrags-Multiplikator (Phase 2)
  cooldownBonus: number; // Sekunden auf den Cooldown (negativ = schneller)
  fixClickBonus: number; // + zusätzliche Wirkung pro Incident-Behebungs-Klick
}

export const TRAININGS: TrainingDef[] = [
  { id: 'networking', name: 'Networking-Seminar', icon: '🤝', price: 500, desc: 'Man kennt sich — der nächste Auftrag kommt schneller.', dealMultBonus: 0, cooldownBonus: -4, fixClickBonus: 0 },
  { id: 'aws-cert', name: 'AWS-Zertifikat', icon: '📜', price: 1200, desc: 'Qualifiziert für dicke Enterprise-Aufträge.', dealMultBonus: 2, cooldownBonus: 0, fixClickBonus: 0 },
  { id: 'incident-training', name: 'Incident-Response-Training', icon: '🧯', price: 2500, desc: 'Der Gründer als geübte Feuerwehr.', dealMultBonus: 0, cooldownBonus: 0, fixClickBonus: 1 },
  { id: 'scrum-cert', name: 'Scrum-Master-Zertifikat', icon: '📋', price: 4000, desc: '2-Tages-Kurs. Schneller geliefert, schneller der nächste Auftrag.', dealMultBonus: 0, cooldownBonus: -3, fixClickBonus: 0 },
  { id: 'negotiation', name: 'Verhandlungstraining', icon: '💼', price: 8000, desc: 'Höhere Abschlüsse rausverhandeln.', dealMultBonus: 3, cooldownBonus: 0, fixClickBonus: 0 },
  { id: 'mba', name: 'MBA', icon: '🎓', price: 50000, desc: 'Teuer, Effekt fragwürdig.', dealMultBonus: 1, cooldownBonus: -1, fixClickBonus: 0 },
];

export interface IncidentDef {
  severity: 'light' | 'heavy';
  incomeMult: number; // Wirkung auf den Gewinn während des Incidents
  duration: number; // s bis zur Selbstheilung
  clicksToFix: number;
  repLoss: number;
  autoFixDuration: number; // s mit Runbooks (nur light)
  titles: string[];
}

export const INCIDENTS: IncidentDef[] = [
  {
    severity: 'light',
    incomeMult: 0.5,
    duration: 30,
    clicksToFix: 3,
    repLoss: 2,
    autoFixDuration: 3,
    titles: [
      'Zertifikat abgelaufen',
      'Config-Fehler',
      'SD-Karte des Raspberry Pi korrupt',
      'Ein Engineer hat freitags deployed',
    ],
  },
  {
    severity: 'heavy',
    incomeMult: 0,
    duration: 60,
    clicksToFix: 10,
    repLoss: 10,
    autoFixDuration: 60,
    titles: ['DNS.', 'Data Breach'],
  },
];

// Save
export const SAVE_KEY = 'it-idle-clicker-v3';
export const AUTOSAVE_INTERVAL = 10; // s
