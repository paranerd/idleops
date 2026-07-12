// ============================================================================
// engine.test.ts — verifiziert die Kern-Formeln gegen die Werte aus
// v3/spec.md ("Balancing-Startwerte") und balance_sim.py.
// ============================================================================

import { describe, expect, it } from 'vitest';
import {
  baseIncome,
  buyHardware,
  buyTraining,
  buyUpgrade,
  capacity,
  dealClick,
  dealCooldown,
  dealMult,
  fixPowerPerClick,
  trainingActiveRateDelta,
  hardwareIncomeDelta,
  hardwarePrice,
  hire,
  hireIncomeDelta,
  hirePrice,
  income,
  motivation,
  output,
  repFactor,
  riskPoints,
  repPerMinute,
  unlockRank,
} from './engine';
import { advance } from './tick';
import { clickFixIncident } from './events';
import { initialState } from './state';
import { TRAININGS } from './config';

describe('Startzustand', () => {
  it('Gründer + Laptop: min(1.0, 0.3) × 1.0 × 0.8 = 0.24 €/s', () => {
    const s = initialState();
    expect(capacity(s)).toBe(1.0);
    expect(output(s)).toBeCloseTo(0.3);
    expect(motivation(s)).toBe(1.0);
    expect(repFactor(s)).toBeCloseTo(0.8);
    expect(income(s)).toBeCloseTo(0.24);
  });
});

describe('Kern-Formel min()', () => {
  it('Kapazitätskauf allein erhöht das Einkommen nicht (UI-Regel!)', () => {
    const s = initialState();
    s.money = 1000;
    const before = baseIncome(s);
    buyHardware(s, 'pi');
    // Betriebskosten: Einkommen sinkt sogar leicht
    expect(baseIncome(s)).toBeLessThanOrEqual(before);
  });

  it('Hire über der Kapazität verpufft', () => {
    const s = initialState();
    s.money = 100000;
    for (let i = 0; i < 20; i += 1) hire(s, 'intern'); // Output 0.3 + 4.0
    const withoutHw = baseIncome(s); // Kapazität 1.0 limitiert
    expect(withoutHw).toBeLessThan(1.0 * 1.5); // trotz 4.3 Output
    buyHardware(s, 'pi');
    buyHardware(s, 'pi');
    buyHardware(s, 'pi');
    expect(baseIncome(s)).toBeGreaterThan(withoutHw); // Kapazität löst den Knoten
  });

  it('Einkommen ist auf ≥ 0 geklemmt (sanftes Design, keine Schulden)', () => {
    const s = initialState();
    s.money = 1e9;
    for (let i = 0; i < 50; i += 1) buyHardware(s, 'tower'); // massive Betriebskosten
    expect(income(s)).toBe(0);
  });
});

describe('Preise', () => {
  it('wachsen mit ×1,15 pro Kauf', () => {
    const s = initialState();
    expect(hardwarePrice(s, 'pi')).toBeCloseTo(15);
    s.hw['pi'] = 3;
    expect(hardwarePrice(s, 'pi')).toBeCloseTo(15 * 1.15 ** 3);
    expect(hirePrice(s, 'intern')).toBeCloseTo(20);
    s.emp['intern'] = 5;
    expect(hirePrice(s, 'intern')).toBeCloseTo(20 * 1.15 ** 5);
  });
});

describe('Reputation', () => {
  it('gated Ränge: Junior erst ab Rep 8 + Freischaltung', () => {
    const s = initialState();
    s.money = 10000;
    expect(unlockRank(s, 'junior')).toBe(false); // Rep 0 < 8
    expect(hire(s, 'junior')).toBe(false);
    s.rep = 8;
    expect(unlockRank(s, 'junior')).toBe(true);
    expect(s.money).toBeCloseTo(10000 - 150);
    expect(hire(s, 'junior')).toBe(true);
  });

  it('unter der Schwelle: keine Neueinstellungen, Bestehende bleiben', () => {
    const s = initialState();
    s.money = 100000;
    s.rep = 10;
    unlockRank(s, 'junior');
    hire(s, 'junior');
    s.rep = 3; // Incident-Verluste
    expect(hire(s, 'junior')).toBe(false);
    expect(s.emp['junior']).toBe(1); // niemand streikt
  });

  it('Aufbaurate wächst mit der Firma (pro Rang gestaffelt)', () => {
    const s = initialState();
    expect(repPerMinute(s)).toBeCloseTo(0.5); // nur Basis, Rep 0 → Logistik ×1
    s.emp['intern'] = 10; // 10 × 0,04 = 0,4
    expect(repPerMinute(s)).toBeCloseTo(0.9);
  });

  it('höhere Ränge heben die Reputation stärker als Interns', () => {
    const intern = initialState();
    intern.emp['intern'] = 1;
    const senior = initialState();
    senior.emp['senior'] = 1;
    expect(repPerMinute(senior)).toBeGreaterThan(repPerMinute(intern));
  });

  it('Faktor: 0,8 bei Rep 0, 1,2 bei Rep 100', () => {
    const s = initialState();
    expect(repFactor(s)).toBeCloseTo(0.8);
    s.rep = 100;
    expect(repFactor(s)).toBeCloseTo(1.2);
  });
});

describe('Motivation', () => {
  it('Kopfzahl-gewichteter Schnitt inkl. Gründer', () => {
    const s = initialState();
    s.emp['intern'] = 3; // (1.0 + 3×0.9) / 4 = 0.925
    expect(motivation(s)).toBeCloseTo(0.925);
  });

  it('Perks addieren Boni, Deckel bei 1,5', () => {
    const s = initialState();
    s.upgrades.push('obst', 'snacks');
    expect(motivation(s)).toBeCloseTo(1.1);
  });
});

describe('Incidents', () => {
  it('Risikopunkte: Intern 3 / Junior 1 / Senior 0,3', () => {
    const s = initialState();
    s.emp['intern'] = 2;
    s.emp['junior'] = 3;
    s.emp['senior'] = 1;
    expect(riskPoints(s)).toBeCloseTo(2 * 3 + 3 * 1 + 0.3);
  });

  it('leichter Incident halbiert den Gewinn', () => {
    const s = initialState();
    const normal = income(s);
    s.incident = { defIndex: 0, title: 'Test', remaining: 30, clicksLeft: 3 };
    expect(income(s)).toBeCloseTo(normal / 2);
  });

  it('schwerer Incident stoppt den Gewinn', () => {
    const s = initialState();
    s.incident = { defIndex: 1, title: 'DNS.', remaining: 60, clicksLeft: 10 };
    expect(income(s)).toBe(0);
  });
});

describe('Upgrades', () => {
  it('Caching: +25 % Gewinn', () => {
    const s = initialState();
    const before = income(s);
    s.money = 5000;
    buyUpgrade(s, 'caching');
    expect(income(s)).toBeCloseTo(before * 1.25);
  });

  it('kein Doppelkauf', () => {
    const s = initialState();
    s.money = 10000;
    expect(buyUpgrade(s, 'obst')).toBe(true);
    expect(buyUpgrade(s, 'obst')).toBe(false);
  });
});

describe('Kauf-Vorschau (Deltas für die UI)', () => {
  it('Intern-Delta < Roh-Output: Motivation & Reputation skalieren (der 0,15-statt-0,20-Fall)', () => {
    const s = initialState();
    s.money = 1000;
    buyHardware(s, 'pi'); // genug Kapazität, damit min() nicht deckelt
    const delta = hireIncomeDelta(s, 'intern');
    // Roh-Output 0,2; effektiv ×~0,95 Motivation ×0,8 Rep-Faktor ≈ 0,14–0,16
    expect(delta).toBeGreaterThan(0.1);
    expect(delta).toBeLessThan(0.2);
    // exakt: Vorschau == echter Kauf
    const before = baseIncome(s);
    hire(s, 'intern');
    expect(baseIncome(s) - before).toBeCloseTo(delta);
  });

  it('Vorschau verändert den State nicht', () => {
    const s = initialState();
    hireIncomeDelta(s, 'intern');
    hardwareIncomeDelta(s, 'pi');
    expect(s.emp['intern']).toBe(0);
    expect(s.hw['pi']).toBe(0);
  });

  it('Hire-Delta ist 0, wenn die Kapazität voll ist', () => {
    const s = initialState();
    s.money = 10000;
    for (let i = 0; i < 10; i += 1) hire(s, 'intern'); // Output 2,3 > Kapazität 1,0
    expect(hireIncomeDelta(s, 'intern')).toBeCloseTo(0);
  });
});

describe('Klick Phase 2: Auftrag gewinnen', () => {
  it('vor dem Meilenstein gesperrt', () => {
    const s = initialState();
    expect(dealClick(s)).toBe(false);
  });

  it('bringt 15 × Gewinn/s und setzt 30 s Cooldown; blockiert bis dahin', () => {
    const s = initialState();
    s.milestoneReached = true;
    const expected = baseIncome(s) * 15;
    const gain = dealClick(s);
    expect(gain).toBeCloseTo(expected);
    expect(s.money).toBeCloseTo(expected);
    expect(s.clickCooldown).toBe(30);
    expect(dealClick(s)).toBe(false); // Cooldown aktiv
    advance(s, 30, () => 1); // Cooldown ablaufen lassen
    expect(s.clickCooldown).toBe(0);
    expect(dealClick(s)).not.toBe(false);
  });
});

describe('Gründer-Schulungen', () => {
  it('erst ab Phase 2 buchbar, kein Doppelkauf', () => {
    const s = initialState();
    s.money = 10000;
    expect(buyTraining(s, 'networking')).toBe(false); // noch Phase 1
    s.milestoneReached = true;
    expect(buyTraining(s, 'networking')).toBe(true);
    expect(s.money).toBeCloseTo(10000 - 500);
    expect(buyTraining(s, 'networking')).toBe(false);
  });

  it('AWS-Zertifikat + Networking: 17× und 26 s (Spec-Tabelle)', () => {
    const s = initialState();
    s.milestoneReached = true;
    s.money = 10000;
    buyTraining(s, 'networking');
    buyTraining(s, 'aws-cert');
    expect(dealMult(s)).toBe(17);
    expect(dealCooldown(s)).toBe(26);
    const expected = baseIncome(s) * 17;
    expect(dealClick(s)).toBeCloseTo(expected);
    expect(s.clickCooldown).toBe(26);
  });

  it('voll ausgebaut: 21×/22 s — unter dem +100%-Cap (Spec-Leitplanke)', () => {
    const s = initialState();
    s.milestoneReached = true;
    s.money = 1e6;
    for (const t of TRAININGS) buyTraining(s, t.id);
    expect(dealMult(s)).toBe(21);
    expect(dealCooldown(s)).toBe(22);
    // Leitplanke: Klick-Einkommensäquivalent ≤ 1,0 × Gewinn/s
    expect(dealMult(s) / dealCooldown(s)).toBeLessThanOrEqual(1.0);
  });

  it('Incident-Response-Training: Behebungs-Klicks zählen doppelt', () => {
    const s = initialState();
    s.milestoneReached = true;
    s.money = 10000;
    expect(fixPowerPerClick(s)).toBe(1);
    buyTraining(s, 'incident-training');
    expect(fixPowerPerClick(s)).toBe(2);
    s.incident = { defIndex: 0, title: 'Test', remaining: 30, clicksLeft: 3 };
    clickFixIncident(s); // 3 → 1
    expect(s.incident).not.toBeNull();
    const events = clickFixIncident(s); // 1 → behoben
    expect(s.incident).toBeNull();
    expect(events.some((e) => e.kind === 'incidentFixed')).toBe(true);
  });

  it('Vorschau: effektiver Zuwachs bei aktivem Spielen, State unverändert', () => {
    const s = initialState();
    s.milestoneReached = true;
    expect(trainingActiveRateDelta(s, 'aws-cert')).toBeGreaterThan(0);
    expect(trainingActiveRateDelta(s, 'networking')).toBeGreaterThan(0);
    expect(trainingActiveRateDelta(s, 'incident-training')).toBe(0);
    expect(s.trainings).toEqual([]);
  });
});

describe('advance() / Spike', () => {
  it('verdient Geld über Zeit (deterministisch, rng=1 ⇒ keine Events)', () => {
    const s = initialState();
    advance(s, 10, () => 1); // 10 s
    expect(s.money).toBeCloseTo(0.24 * 10, 1);
  });

  it('Meilenstein feuert genau einmal', () => {
    const s = initialState();
    s.money = 1e6;
    s.rep = 100;
    for (let i = 0; i < 10; i += 1) buyHardware(s, 'tower');
    unlockRank(s, 'senior');
    for (let i = 0; i < 3; i += 1) hire(s, 'senior');
    const events1 = advance(s, 0.1, () => 1);
    expect(events1.some((e) => e.kind === 'milestone')).toBe(true);
    const events2 = advance(s, 0.1, () => 1);
    expect(events2.some((e) => e.kind === 'milestone')).toBe(false);
  });

  it('Spike: mit Reserve ×20 (durch Kapazität gedeckelt)', () => {
    const s = initialState();
    s.rep = 50;
    s.money = 1e6;
    // Output ~0.3 + 2×1.5 = 3.3; Kapazität 1 + 10×8 = 81 (>1.2× Reserve)
    unlockRank(s, 'junior');
    hire(s, 'junior');
    hire(s, 'junior');
    for (let i = 0; i < 10; i += 1) buyHardware(s, 'tower');
    const normal = income(s);
    s.spikeRemaining = 60;
    const spiked = income(s);
    expect(spiked).toBeGreaterThan(normal * 5); // deutlich mehr, von Kapazität gedeckelt
  });
});
