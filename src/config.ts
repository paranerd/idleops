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
// Angestellten-Beitrag zum Reputationsaufbau ist jetzt PRO RANG gestaffelt
// (rank.repGain) — ein Senior/Principal hebt die Marke stärker als ein Intern.
// Die Summe aller Köpfe ist gedeckelt, damit große Teams die Kurve nicht
// trivialisieren; der Aufbau ist zusätzlich logistisch zäh (siehe REP_SOFTCAP).
export const REP_EMP_RATE_CAP = 2.5; // max. Angestellten-Beitrag /min
export const REP_OFFLINE_CAP_SECONDS = 2 * 3600; // Offline-Aufbau gedeckelt

// Rating-Skala: Reputation wird als Kredit-Rating C…AAA angezeigt (die
// internen 0–100-Werte bleiben; nur die Darstellung ändert sich). Neun Stufen,
// bewusst so gelegt, dass die Rang-Schwellen sauber auf Ratings fallen:
// Junior 8 → CC, Senior 25 → CCC, Staff 40 → B, Principal 60 → BBB, 10x 80 → A.
// Unlock-Hinweise können so „ab Rating CC/CCC/…" anzeigen.
export const REP_RATINGS: { min: number; label: string }[] = [
  { min: 93, label: 'AAA' },
  { min: 82, label: 'AA' },
  { min: 70, label: 'A' },
  { min: 56, label: 'BBB' },
  { min: 42, label: 'BB' },
  { min: 30, label: 'B' },
  { min: 20, label: 'CCC' },
  { min: 8, label: 'CC' },
  { min: 0, label: 'C' },
];

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
  // Ära-Gate: kaufbar erst, wenn diese Finanzierungsrunde angenommen (oder
  // "aus eigener Tasche" freigekauft) wurde — siehe ROUNDS
  requiresRound?: string;
  // Preiswachstum pro Kauf; Default COST_GROWTH. Endgame-Stufen sind steiler,
  // damit eine Ära einen Run trägt statt durchzurauschen (per endgame_sim.py
  // kalibriert — mit 1,15 überall wäre das Unicorn in Run 1 erreichbar)
  costGrowth?: number;
}

export const HARDWARE: HardwareDef[] = [
  { id: 'laptop', name: 'Laptop', icon: '💻', capacity: 1.0, basePrice: 0, upkeep: 0, startCount: 1, revealAtTotalEarned: 0 },
  { id: 'pi', name: 'Raspberry Pi', icon: '🍓', capacity: 1.0, basePrice: 15, upkeep: 0.02, startCount: 0, revealAtTotalEarned: 0 },
  { id: 'tower', name: 'Tower PC', icon: '🖥️', capacity: 8.0, basePrice: 250, upkeep: 0.2, startCount: 0, revealAtTotalEarned: 0, revealAfterRankUnlock: 'junior' },
  { id: 'vps', name: 'VPS', icon: '☁️', capacity: 40, basePrice: 5_000, upkeep: 1.0, startCount: 0, revealAtTotalEarned: 0, requiresRound: 'seed', costGrowth: 1.2 },
  { id: 'cluster', name: 'Cluster', icon: '🗄️', capacity: 250, basePrice: 160_000, upkeep: 6, startCount: 0, revealAtTotalEarned: 0, requiresRound: 'series-a', costGrowth: 1.22 },
  { id: 'datacenter', name: 'Datacenter', icon: '🏭', capacity: 1_200, basePrice: 1_400_000, upkeep: 30, startCount: 0, revealAtTotalEarned: 0, requiresRound: 'series-a', costGrowth: 1.25 },
  { id: 'cloud', name: 'Eigene Cloud', icon: '🌩️', capacity: 8_000, basePrice: 30_000_000, upkeep: 600, startCount: 0, revealAtTotalEarned: 0, requiresRound: 'series-b', costGrowth: 1.33 },
  { id: 'orbital', name: 'Orbital Cloud', icon: '🛰️', capacity: 50_000, basePrice: 200_000_000, upkeep: 4_000, startCount: 0, revealAtTotalEarned: 0, requiresRound: 'series-c', costGrowth: 1.35 },
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
  repGain: number; // Reputationsaufbau pro Kopf und Minute (höhere Ränge heben die Marke stärker)
  requiresRound?: string; // Ära-Gate wie bei Hardware (siehe ROUNDS)
  costGrowth?: number; // steiler für Endgame-Ränge (siehe HardwareDef)
}

export const RANKS: RankDef[] = [
  { id: 'intern', name: 'Intern', icon: '🐣', output: 0.2, basePrice: 20, motivation: 0.9, riskPoints: 3, repThreshold: 0, unlockCost: 0, repGain: 0.04 },
  { id: 'junior', name: 'Junior Developer', icon: '🧑‍💻', output: 1.5, basePrice: 300, motivation: 1.0, riskPoints: 1, repThreshold: 8, unlockCost: 150, repGain: 0.08 },
  { id: 'senior', name: 'Senior Developer', icon: '🧙', output: 8.0, basePrice: 3000, motivation: 1.1, riskPoints: 0.3, repThreshold: 25, unlockCost: 1500, repGain: 0.16 },
  { id: 'staff', name: 'Staff Developer', icon: '🦉', output: 40, basePrice: 80_000, motivation: 1.15, riskPoints: 0.1, repThreshold: 40, unlockCost: 30_000, repGain: 0.3, requiresRound: 'seed', costGrowth: 1.2 },
  { id: 'principal', name: 'Principal Developer', icon: '🧛', output: 250, basePrice: 1_400_000, motivation: 1.2, riskPoints: 0.05, repThreshold: 60, unlockCost: 500_000, repGain: 0.6, requiresRound: 'series-a', costGrowth: 1.25 },
  { id: 'tenx', name: '10x Engineer', icon: '🦄', output: 1_500, basePrice: 15_000_000, motivation: 1.25, riskPoints: 0.02, repThreshold: 80, unlockCost: 6_000_000, repGain: 1.2, requiresRound: 'series-b', costGrowth: 1.33 },
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

// ============================================================================
// Bewertung & Meilensteine — der Weg zum Unicorn (Spec-Abschnitt gleichen
// Namens). Alle Werte per tools/endgame_sim.py kalibriert: Run 1 exitet um
// Series A (~65 M), Unicorn fällt im 4.–6. Run nach ~20 h Bot-Zeit.
// ============================================================================

export const UNICORN_VALUATION = 1e9;

// Ertragskraft = nachhaltiger Gewinn/s × dieses Multiple.
// "Nachhaltig" = Hochwasserstand des gleitenden 10-Minuten-Schnitts von
// baseIncome (spike- und incident-frei) — Peak wäre durch den Spike exploitbar.
export const VALUATION_INCOME_MULT = 2000;
export const VALUATION_EMA_SECONDS = 600; // 10-min-Schnitt
export const VALUATION_TEAM_MULT = 0.5; // × Rang-Basispreis pro Kopf (Acquihire-Prämie; mehr wäre Kauf-Arbitrage)
export const VALUATION_HW_RESIDUAL = 0.5; // × gezahlte Kaufpreise (Restwert)
export const REP_MULTIPLE_MAX_BONUS = 2; // Rep-Multiple = 1 + 2 × Rep/100 → ×1,0 … ×3,0
export const GRUENDER_BONUS_PER_TRAINING = 0.05; // Käufer bezahlt die Schulungen (Acquihire)

// Reputation wird nach oben zäh (logistisch): Rate × (1 − Rep/REP_SOFTCAP).
// Früh kaum spürbar (Rating C/CC), spät echte Arbeit — und der
// "Bekannter Name"-Sockel bekommt langfristig Wert. (REP_EMP_RATE_CAP steht
// oben im Reputations-Abschnitt.)
export const REP_SOFTCAP = 105;

export interface RoundDef {
  id: string;
  name: string;
  icon: string;
  threshold: number; // Bewertungs-Schwelle (Hochwasserstand)
  cash: number; // fixe Kapitalspritze (kein %-Feedback auf die Bewertung!)
  dilution: number; // Anteils-Punkte, die der Gründer abgibt
  minExits: number; // Track-Record-Gate: so viele frühere Exits braucht die Runde
  selfUnlockPrice: number; // Ära-Unlock "aus eigener Tasche" (ohne Investor)
  hurdle: 'reporting' | 'buerokratie' | 'wachstumsdruck' | 'reorg';
  hurdleText: string; // sichtbar im Angebot
}

// Hürden (wirken NUR auf Betriebskosten/Incidents/Motivation, nie auf den min()-Kern):
// - reporting: +15 % Incident-Wahrscheinlichkeit, neuer leichter Incident "Board Meeting"
// - buerokratie: +10 % Betriebskosten
// - wachstumsdruck: unter Reputation REP_EXPECTATION sinkt die Motivation
// - reorg: +10 % Betriebskosten UND neuer schwerer Incident "Reorg"
export const ROUNDS: RoundDef[] = [
  {
    id: 'seed', name: 'Seed', icon: '🌱', threshold: 1e6, cash: 150_000, dilution: 0.10,
    minExits: 0, selfUnlockPrice: 400_000, hurdle: 'reporting',
    hurdleText: 'Investoren-Reporting: +15 % Incident-Risiko, neuer Incident „Board Meeting“',
  },
  {
    id: 'series-a', name: 'Series A', icon: '📈', threshold: 1e7, cash: 1_500_000, dilution: 0.15,
    minExits: 0, selfUnlockPrice: 4_000_000, hurdle: 'buerokratie',
    hurdleText: 'Bürokratie: +10 % Betriebskosten',
  },
  {
    id: 'series-b', name: 'Series B', icon: '🏦', threshold: 75e6, cash: 10_000_000, dilution: 0.15,
    minExits: 1, selfUnlockPrice: 30_000_000, hurdle: 'wachstumsdruck',
    hurdleText: 'Wachstumsdruck: unter Reputation 50 sinkt die Motivation stark',
  },
  {
    id: 'series-c', name: 'Series C', icon: '🏰', threshold: 300e6, cash: 40_000_000, dilution: 0.15,
    minExits: 2, selfUnlockPrice: 120_000_000, hurdle: 'reorg',
    hurdleText: 'Effizienz-Programme: +10 % Betriebskosten, neuer Incident „Reorg“',
  },
];

export const REPORTING_INCIDENT_MULT = 1.15; // Seed-Hürde
export const BUEROKRATIE_UPKEEP_MULT = 1.1; // Series A / C
export const REP_EXPECTATION = 50; // Series-B-Hürde: Erwartung der Investoren
export const WACHSTUMSDRUCK_MOT_MALUS = 0.15;
export const BOOTSTRAP_MOT_BONUS = 0.05; // solange kein Investor an Bord ("Wir gehören uns selbst")
export const INVESTOR_INCIDENT_TITLES: Record<string, { light: string[]; heavy: string[] }> = {
  seed: { light: ['Board Meeting'], heavy: [] },
  'series-c': { light: [], heavy: ['Reorg'] },
};

// Der Meilenstein "Produkt-Markt-Fit" feuert bei der Senior-Freischaltung und
// schaltet den viralen Spike + die Bewertungs-Anzeige frei.
export const PMF_RANK = 'senior';

// ============================================================================
// Der Exit — Prestige. Erlös = Bewertung × Gründer-Anteil, fließt in Perks.
// ============================================================================

export type PerkEffect =
  | { type: 'incomeMult'; multPerLevel: number } // multiplikativ: mult^Stufe
  | { type: 'valuationMult'; bonusPerLevel: number } // Multiple +x pro Stufe
  | { type: 'fundingTerms'; cashMultPerLevel: number; dilutionReliefPerLevel: number }
  | { type: 'startMoney'; base: number; factorPerLevel: number } // base × factor^(Stufe−1)
  | { type: 'startRep'; perLevel: number; max: number }
  | { type: 'hireDiscount'; multPerLevel: number }; // mult^Stufe auf Hires + Freischaltungen

export interface PerkDef {
  id: string;
  name: string;
  icon: string;
  basePrice: number;
  priceGrowth: number; // Preisfaktor pro Stufe
  maxLevel: number;
  kind: 'decke' | 'tempo'; // Decken-Heber vs. Beschleuniger (UI-Gruppierung)
  desc: string;
  effect: PerkEffect;
}

export const PERKS: PerkDef[] = [
  {
    id: 'netzwerk', name: 'Netzwerk', icon: '🕸️', basePrice: 15e6, priceGrowth: 3, maxLevel: 8, kind: 'decke',
    desc: 'Man kennt dich. Deals kommen leichter rein — dauerhaft mehr Gewinn.',
    effect: { type: 'incomeMult', multPerLevel: 1.25 },
  },
  {
    id: 'track-record', name: 'Track Record', icon: '🏆', basePrice: 10e6, priceGrowth: 3, maxLevel: 8, kind: 'decke',
    desc: 'Investoren zahlen für deine Historie — höheres Bewertungs-Multiple.',
    effect: { type: 'valuationMult', bonusPerLevel: 0.2 },
  },
  {
    id: 'investoren-standing', name: 'Investoren-Standing', icon: '🤵', basePrice: 8e6, priceGrowth: 3, maxLevel: 5, kind: 'decke',
    desc: 'Bessere Term Sheets: mehr Cash pro Runde, weniger Anteilsabgabe.',
    effect: { type: 'fundingTerms', cashMultPerLevel: 0.5, dilutionReliefPerLevel: 0.02 },
  },
  {
    id: 'angel', name: 'Angel-Kapital', icon: '👼', basePrice: 2e6, priceGrowth: 3, maxLevel: 5, kind: 'tempo',
    desc: 'Ein Angel glaubt an dich — Startgeld für die nächste Gründung.',
    effect: { type: 'startMoney', base: 2_000, factorPerLevel: 8 },
  },
  {
    id: 'name', name: 'Bekannter Name', icon: '📰', basePrice: 3e6, priceGrowth: 3, maxLevel: 5, kind: 'tempo',
    desc: 'Die Presse kennt dich — das neue StartUp startet mit Reputations-Sockel.',
    effect: { type: 'startRep', perLevel: 12, max: 60 },
  },
  {
    id: 'kollegen', name: 'Alte Kollegen', icon: '🫂', basePrice: 4e6, priceGrowth: 3, maxLevel: 5, kind: 'tempo',
    desc: 'Dein altes Team folgt dir — Einstellungen und Freischaltungen günstiger.',
    effect: { type: 'hireDiscount', multPerLevel: 0.9 },
  },
];

// Käufer-Flavor im Exit-Screen, nach Bewertung aufsteigend
export const BUYERS: { minValuation: number; name: string }[] = [
  { minValuation: 0, name: 'Eine lokale Werbeagentur' },
  { minValuation: 5e6, name: 'Ein süddeutscher Mittelständler' },
  { minValuation: 50e6, name: 'Ein Private-Equity-Fonds' },
  { minValuation: 250e6, name: 'Big-Tech-Acquihire (wird sechs Monate später eingestampft)' },
  { minValuation: 1e9, name: 'IPO — Wall Street klingelt' },
];

// Save
export const SAVE_KEY = 'it-idle-clicker-v3';
export const META_SAVE_KEY = 'it-idle-clicker-v3-meta'; // Exit-Perks & Statistik (überlebt Runs)
export const AUTOSAVE_INTERVAL = 10; // s
