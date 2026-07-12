// ============================================================================
// valuation.test.ts — Bewertung, Finanzierungsrunden, Exit & Perks
// (Spec-Abschnitt "Bewertung & Meilensteine: der Weg zum Unicorn";
// Kalibrierung per tools/endgame_sim.py).
// ============================================================================

import { describe, expect, it } from 'vitest';
import {
  acceptRound,
  baseIncome,
  buyHardware,
  buyPerk,
  ertragskraft,
  exitProceeds,
  buyerFor,
  gruenderBonus,
  hardwareValue,
  hire,
  hirePrice,
  incomeMult,
  motivation,
  perkPrice,
  repMultiple,
  repPerMinute,
  roundStatus,
  selfUnlockRound,
  teamValue,
  trackRecordBonus,
  unlockRank,
  upkeep,
  valuation,
  valuationMultiple,
} from './engine';
import { incidentTitles, rollSpike } from './events';
import { advance, advanceValuation } from './tick';
import { initialMeta, initialState } from './state';
import { PERKS, ROUNDS, UNICORN_VALUATION } from './config';

const seed = ROUNDS[0];
const seriesA = ROUNDS[1];
const seriesB = ROUNDS[2];

describe('Bewertung (Term Sheet)', () => {
  it('Start: alles 0, Multiple ×1,0 (Rep 0, keine Schulungen)', () => {
    const s = initialState();
    expect(valuation(s)).toBe(0);
    expect(valuationMultiple(s)).toBeCloseTo(1.0);
  });

  it('Formel: Ertragskraft × Multiple + Team + Hardware + Cash', () => {
    const s = initialState();
    s.sustainedIncome = 100; // €/s nachhaltig
    s.rep = 50; // Multiple 1 + 2×0,5 = 2,0
    s.money = 5000;
    s.emp['senior'] = 2; // Team: 2 × 0,5 × 3000 = 3000
    s.hw['pi'] = 2; // Hardware: 0,5 × 15 × (1 + 1,15) = 16,125
    const expected = 100 * 2000 * 2.0 + 3000 + 0.5 * 15 * (1 + 1.15) + 5000;
    expect(valuation(s)).toBeCloseTo(expected);
    expect(ertragskraft(s)).toBeCloseTo(200_000);
    expect(repMultiple(s)).toBeCloseTo(2.0);
    expect(teamValue(s)).toBeCloseTo(3000);
    expect(hardwareValue(s)).toBeCloseTo(16.125);
  });

  it('Multiple wirkt NUR auf die Ertragskraft — Cash multipliziert sich nicht', () => {
    const s = initialState();
    s.rep = 100; // Multiple ×3
    s.money = 1_000_000;
    expect(valuation(s)).toBeCloseTo(1_000_000); // Cash bleibt Cash
  });

  it('Schulungen zahlen sich beim Exit aus (Gründer-Bonus, Acquihire)', () => {
    const s = initialState();
    s.trainings.push('networking', 'aws-cert');
    expect(gruenderBonus(s)).toBeCloseTo(1.1);
  });

  it('10-min-Schnitt: Hochwasserstand steigt, fällt aber nicht', () => {
    const s = initialState();
    s.money = 1e6;
    s.rep = 100;
    for (let i = 0; i < 10; i += 1) buyHardware(s, 'tower');
    unlockRank(s, 'senior');
    for (let i = 0; i < 4; i += 1) hire(s, 'senior');
    const target = baseIncome(s);
    advanceValuation(s, 600); // eine EMA-Zeitkonstante
    expect(s.emaIncome).toBeGreaterThan(target * 0.6);
    const sustained = s.sustainedIncome;
    // Rep-Einbruch senkt das laufende Einkommen — der Hochwasserstand bleibt
    s.rep = 0;
    advanceValuation(s, 60);
    expect(s.sustainedIncome).toBeCloseTo(sustained);
  });

  it('Spike zählt nicht in die Ertragskraft (baseIncome, nicht income)', () => {
    const s = initialState();
    s.money = 1e6;
    s.rep = 100;
    for (let i = 0; i < 10; i += 1) buyHardware(s, 'tower');
    unlockRank(s, 'senior');
    hire(s, 'senior');
    const before = baseIncome(s);
    s.spikeRemaining = 60;
    advanceValuation(s, 600);
    expect(s.sustainedIncome).toBeLessThanOrEqual(before + 0.001);
  });
});

describe('Finanzierungsrunden', () => {
  function richState() {
    const s = initialState();
    s.valuationHighWater = seed.threshold; // Seed-Angebot liegt vor
    return s;
  }

  it('Angebot erst ab Bewertungs-Hochwasserstand', () => {
    const s = initialState();
    expect(roundStatus(s, seed)).toBe('locked');
    s.valuationHighWater = seed.threshold;
    expect(roundStatus(s, seed)).toBe('offered');
  });

  it('Series B braucht Track Record (1 Exit), Series C zwei', () => {
    const s = initialState();
    s.valuationHighWater = 1e12;
    expect(roundStatus(s, seriesB)).toBe('trackGate');
    s.exitsBefore = 1;
    expect(roundStatus(s, seriesB)).toBe('offered');
    expect(roundStatus(s, ROUNDS[3])).toBe('trackGate');
  });

  it('Annehmen: Cash rein, Anteil runter, Ära offen', () => {
    const s = richState();
    expect(acceptRound(s, 'seed')).toBe(true);
    expect(s.money).toBeCloseTo(seed.cash);
    expect(s.founderShare).toBeCloseTo(0.9);
    expect(acceptRound(s, 'seed')).toBe(false); // nur einmal
    // Ära offen: VPS kaufbar, Staff freischaltbar
    s.money = 1e6;
    s.rep = 40;
    expect(buyHardware(s, 'vps')).toBe(true);
    expect(unlockRank(s, 'staff')).toBe(true);
  });

  it('Ära-Gate: ohne Runde kein VPS, kein Staff — auch mit Geld und Rep', () => {
    const s = initialState();
    s.money = 1e9;
    s.rep = 100;
    expect(buyHardware(s, 'vps')).toBe(false);
    expect(unlockRank(s, 'staff')).toBe(false);
  });

  it('„Aus eigener Tasche“: teuer, öffnet die Ära, kostet keinen Anteil', () => {
    const s = richState();
    s.money = seed.selfUnlockPrice;
    expect(selfUnlockRound(s, 'seed')).toBe(true);
    expect(s.money).toBeCloseTo(0);
    expect(s.founderShare).toBe(1);
    s.money = 1e6;
    expect(buyHardware(s, 'vps')).toBe(true);
    // Hürden gelten nicht (kein Investor): kein Reporting-Incident-Malus
    expect(incidentTitles(s, 'light')).not.toContain('Board Meeting');
  });

  it('Hürden: Seed = Board-Meeting-Incidents, Series A = +10 % Betriebskosten', () => {
    const s = richState();
    acceptRound(s, 'seed');
    expect(incidentTitles(s, 'light')).toContain('Board Meeting');
    s.hw['tower'] = 10; // 2,0 €/s Basis-Upkeep
    const before = upkeep(s);
    s.valuationHighWater = seriesA.threshold;
    acceptRound(s, 'series-a');
    expect(upkeep(s)).toBeCloseTo(before * 1.1);
  });

  it('Series-B-Hürde: unter Rep 50 sinkt die Motivation', () => {
    const s = richState();
    s.exitsBefore = 1;
    s.valuationHighWater = seriesB.threshold;
    s.rep = 60;
    acceptRound(s, 'series-b');
    const happy = motivation(s);
    s.rep = 30;
    expect(motivation(s)).toBeCloseTo(happy - 0.15);
  });

  it('Bootstrap-Bonus: Angebot liegt vor, keiner angenommen → +0,05 Motivation', () => {
    const s = initialState();
    const before = motivation(s);
    s.valuationHighWater = seed.threshold;
    expect(motivation(s)).toBeCloseTo(before + 0.05);
    acceptRound(s, 'seed');
    expect(motivation(s)).toBeCloseTo(before);
  });
});

describe('Reputation (logistisch)', () => {
  it('früh fast unverändert, spät zäh', () => {
    const s = initialState();
    expect(repPerMinute(s)).toBeCloseTo(0.5 * (1 - 0 / 105));
    s.rep = 8;
    expect(repPerMinute(s)).toBeGreaterThan(0.4); // Junior-Gate kaum betroffen
    s.rep = 90;
    s.emp['intern'] = 100; // Angestellten-Beitrag gedeckelt (+1,5)
    expect(repPerMinute(s)).toBeCloseTo((0.5 + 1.5) * (1 - 90 / 105));
  });
});

describe('Der Exit & Gründer-Perks', () => {
  it('Erlös = Bewertung × Gründer-Anteil', () => {
    const s = initialState();
    s.money = 1_000_000;
    s.founderShare = 0.75;
    expect(exitProceeds(s)).toBeCloseTo(750_000);
  });

  it('Käufer skaliert mit der Bewertung', () => {
    expect(buyerFor(1000)).toMatch(/Werbeagentur/);
    expect(buyerFor(UNICORN_VALUATION)).toMatch(/IPO/);
  });

  it('Perk-Kauf: Preis wächst ×3 pro Stufe, Bank zahlt', () => {
    const meta = initialMeta();
    const netzwerk = PERKS.find((p) => p.id === 'netzwerk')!;
    meta.bank = netzwerk.basePrice * 5;
    expect(perkPrice(meta, 'netzwerk')).toBe(netzwerk.basePrice);
    expect(buyPerk(meta, 'netzwerk')).toBe(true);
    expect(perkPrice(meta, 'netzwerk')).toBe(netzwerk.basePrice * 3);
    expect(buyPerk(meta, 'netzwerk')).toBe(true);
    expect(buyPerk(meta, 'netzwerk')).toBe(false); // Bank leer
    expect(meta.perks['netzwerk']).toBe(2);
  });

  it('Netzwerk: ×1,25 Gewinn pro Stufe (multiplikativ)', () => {
    const meta = initialMeta();
    meta.perks['netzwerk'] = 2;
    const s = initialState(meta);
    expect(incomeMult(s)).toBeCloseTo(1.25 * 1.25);
  });

  it('Track Record: +0,2 aufs Multiple pro Stufe', () => {
    const meta = initialMeta();
    meta.perks['track-record'] = 3;
    const s = initialState(meta);
    expect(trackRecordBonus(s)).toBeCloseTo(1.6);
  });

  it('Beschleuniger: Angel-Startgeld, Namens-Sockel, Kollegen-Rabatt', () => {
    const meta = initialMeta();
    meta.perks['angel'] = 2; // 2000 × 8
    meta.perks['name'] = 2; // Rep 24
    meta.perks['kollegen'] = 1; // ×0,9
    const s = initialState(meta);
    expect(s.money).toBeCloseTo(16_000);
    expect(s.rep).toBeCloseTo(24);
    expect(hirePrice(s, 'intern')).toBeCloseTo(20 * 0.9);
  });

  it('exitsBefore übernimmt das Track-Record-Gate in den neuen Run', () => {
    const meta = initialMeta();
    meta.exits = 1;
    const s = initialState(meta);
    expect(s.exitsBefore).toBe(1);
  });
});

describe('Meilensteine im Tick', () => {
  it('Produkt-Markt-Fit feuert bei Senior-Freischaltung und öffnet den Spike', () => {
    const s = initialState();
    s.money = 1e6;
    s.rep = 25;
    // Vor PMF: kein Spike, selbst bei Einkommen > Schwelle
    for (let i = 0; i < 10; i += 1) buyHardware(s, 'tower');
    unlockRank(s, 'junior');
    for (let i = 0; i < 10; i += 1) hire(s, 'junior');
    expect(rollSpike(s, 1, () => 0)).toEqual([]);
    unlockRank(s, 'senior');
    const events = advance(s, 0.1, () => 1);
    expect(events.some((e) => e.kind === 'pmf')).toBe(true);
    expect(s.pmfReached).toBe(true);
    expect(rollSpike(s, 1, () => 0).length).toBeGreaterThan(0);
    // feuert nur einmal
    expect(advance(s, 0.1, () => 1).some((e) => e.kind === 'pmf')).toBe(false);
  });

  it('Runden-Angebot wird als Event angekündigt (einmal)', () => {
    const s = initialState();
    s.pmfReached = true;
    s.money = seed.threshold; // Cash allein hebt die Bewertung über die Schwelle
    const events = advance(s, 0.1, () => 1);
    expect(events.some((e) => e.kind === 'roundOffer' && e.roundId === 'seed')).toBe(true);
    expect(advance(s, 0.1, () => 1).some((e) => e.kind === 'roundOffer')).toBe(false);
  });

  it('Unicorn-Event bei 1 Mrd Hochwasserstand, genau einmal', () => {
    const s = initialState();
    s.money = UNICORN_VALUATION;
    const events = advance(s, 0.1, () => 1);
    expect(events.some((e) => e.kind === 'unicorn')).toBe(true);
    expect(advance(s, 0.1, () => 1).some((e) => e.kind === 'unicorn')).toBe(false);
  });
});
