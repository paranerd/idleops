// ============================================================================
// render.ts — liest den State, aktualisiert das DOM. Statische Struktur
// wird einmal gebaut (Buttons pro Definition), dynamische Werte jeden
// Frame aktualisiert.
// ============================================================================

import {
  CLICK_VALUE,
  FOUNDER_OUTPUT,
  HARDWARE,
  INCIDENTS,
  PERKS,
  RANKS,
  ROUNDS,
  SPIKE_MULT,
  SPIKE_RESERVE_RATIO,
  TRAININGS,
  UNICORN_VALUATION,
  UPGRADES,
  type RoundDef,
  type TrainingDef,
} from '../config';
import {
  acceptRound,
  buyHardware,
  buyTraining,
  buyUpgrade,
  buyerFor,
  capacity,
  dealCooldown,
  dealMult,
  dealValue,
  ertragskraft,
  exitProceeds,
  gruenderBonus,
  hardwareIncomeDelta,
  hardwarePrice,
  hardwareValue,
  hire,
  hireIncomeDelta,
  hirePrice,
  income,
  incomeMult,
  motivation,
  output,
  perkMaxed,
  perkPrice,
  repFactor,
  repMultiple,
  repPerMinute,
  roundCash,
  roundDilution,
  roundStatus,
  roundUnlocked,
  selfUnlockRound,
  teamValue,
  trackRecordBonus,
  trainingActiveRateDelta,
  unlockPrice,
  unlockRank,
  upkeep,
  valuation,
  valuationMultiple,
} from '../engine';
import { clickFixIncident } from '../events';
import type { GameState, MetaState } from '../state';
import { fmtMoney, fmtRate, withCoinSvg } from './format';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

// Inline-SVGs statt Icon-Library — bleibt self-contained.
// Vorzeichen-Konvention: "+" (grün) = Geld kommt rein; Kauf-Buttons zeigen
// den Betrag ohne Vorzeichen und ohne Plus-Icon — ein Klick darauf kostet.
const ICON_LOCK =
  '<svg class="btn__icon" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">' +
  '<rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/>' +
  '<path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>';
const ICON_CHECK =
  '<svg class="btn__icon" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">' +
  '<path d="M2.5 8.5 6 12l7.5-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

function setButton(btn: HTMLButtonElement, icon: string, label: string, action: string): void {
  // Nur neu rendern, wenn sich etwas ändert (kein Flackern pro Frame)
  const key = icon + label;
  if (btn.dataset.key !== key) {
    btn.dataset.key = key;
    btn.innerHTML = `${icon}<span>${withCoinSvg(label)}</span>`;
  }
  // Aktionswort nur für Screenreader/Tooltip — sichtbar spricht das Icon
  btn.title = action;
  btn.setAttribute('aria-label', `${action} ${label}`);
}

/** Fortschritt Richtung Leistbarkeit (0–100) für ausgegraute Kauf-Buttons. */
function setAfford(btn: HTMLButtonElement, money: number, price: number): void {
  const pct = btn.disabled ? Math.min(100, (money / price) * 100) : 0;
  btn.style.setProperty('--afford', pct.toFixed(1));
}

interface Row {
  root: HTMLElement;
  button: HTMLButtonElement;
  meta: HTMLElement;
  count: HTMLElement;
  popover: HTMLElement;
}

const hwRows = new Map<string, Row>();
const rankRows = new Map<string, Row>();
const upgradeRows = new Map<string, Row>();
const trainingRows = new Map<string, Row>();
const fundingRows = new Map<string, Row>();

// ----------------------------- Item-Popovers -----------------------------
// Alle Detail-Infos einer Zeile leben hinter dem (i)-Button — die Zeile
// selbst bleibt kompakt: Icon, Titel, Impact-Zeile, Kauf-Button.
// Es ist immer höchstens ein Item-Popover offen.

let openItemPopover: HTMLElement | null = null;

function closeItemPopover(): void {
  if (openItemPopover) {
    openItemPopover.hidden = true;
    const btn = openItemPopover.parentElement?.querySelector('.info-btn');
    btn?.setAttribute('aria-expanded', 'false');
    openItemPopover = null;
  }
}

function wireItemPopoverGlobals(): void {
  document.addEventListener('click', (e) => {
    if (openItemPopover && !openItemPopover.contains(e.target as Node)) closeItemPopover();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeItemPopover();
  });
}

function makeRow(container: HTMLElement, icon: string, title: string, popoverHtml: string): Row {
  const root = document.createElement('div');
  root.className = 'item';
  root.innerHTML = `
    <div class="item__info">
      <div class="item__title">
        <span class="item__icon">${icon}</span> ${title} <span class="item__count"></span>
        <button class="info-btn" aria-label="Details: ${title}" aria-expanded="false">i</button>
      </div>
      <div class="item__meta"></div>
    </div>
    <div class="popover popover--item" hidden>
      <h3>${icon} ${title}</h3>
      ${withCoinSvg(popoverHtml)}
    </div>`;
  const button = document.createElement('button');
  button.className = 'btn btn--buy';
  root.appendChild(button);
  container.appendChild(root);
  const popover = root.querySelector('.popover') as HTMLElement;
  const infoBtn = root.querySelector('.info-btn') as HTMLButtonElement;
  infoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = !popover.hidden;
    closeItemPopover();
    if (!wasOpen) {
      popover.hidden = false;
      infoBtn.setAttribute('aria-expanded', 'true');
      openItemPopover = popover;
    }
  });
  return {
    root,
    button,
    meta: root.querySelector('.item__meta') as HTMLElement,
    count: root.querySelector('.item__count') as HTMLElement,
    popover,
  };
}

/** Zeile im Popover, Layout wie die Gewinn-Aufschlüsselung. */
function popRow(label: string, value: string, dataKey = ''): string {
  return `<div class="breakdown__row"><span>${label}</span><strong${dataKey ? ` data-pop="${dataKey}"` : ''}>${value}</strong></div>`;
}

export function buildUI(s: GameState, onAction: () => void): void {
  wireItemPopoverGlobals();

  const team = $('team-list');
  for (const r of RANKS) {
    const row = makeRow(
      team,
      r.icon,
      r.name,
      `<div class="breakdown">
        ${popRow('Output pro Kopf', fmtRate(r.output))}
        ${popRow('× Motivation', '', 'mot')}
        ${popRow('× Reputation', '', 'rep')}
        <div class="breakdown__row breakdown__row--total"><span>= Effektiver Zuwachs</span><strong data-pop="eff"></strong></div>
      </div>
      <div class="breakdown">
        ${popRow('Basis-Motivation', r.motivation.toLocaleString('de-DE'))}
        ${popRow('Incident-Risiko', `${r.riskPoints.toLocaleString('de-DE')} Punkte`)}
        ${r.repThreshold > 0 ? popRow('Einstellbar ab', `Reputation ${r.repThreshold}`) : ''}
      </div>`,
    );
    row.button.addEventListener('click', () => {
      if (!s.unlockedRanks[r.id]) unlockRank(s, r.id);
      else hire(s, r.id);
      onAction();
    });
    rankRows.set(r.id, row);
  }

  const hw = $('hw-list');
  for (const h of HARDWARE) {
    if (h.basePrice === 0) continue; // Laptop ist Startgerät
    const row = makeRow(
      hw,
      h.icon,
      h.name,
      `<div class="breakdown">
        ${popRow('Kapazität', `+${fmtRate(h.capacity)}`)}
        ${popRow('Betriebskosten', `−${fmtRate(h.upkeep)}`)}
      </div>
      <p class="popover__tip">Kapazität verdient nur, wenn dein Team sie füllt. Reserve über dem Output schützt beim viralen Spike.</p>`,
    );
    row.button.addEventListener('click', () => {
      buyHardware(s, h.id);
      onAction();
    });
    hwRows.set(h.id, row);
  }

  const up = $('upgrade-list');
  for (const u of UPGRADES) {
    const row = makeRow(
      up,
      u.icon,
      u.name,
      `<p>${u.desc}</p>
      <div class="breakdown">${popRow('Effekt', u.impact)}</div>`,
    );
    row.button.addEventListener('click', () => {
      buyUpgrade(s, u.id);
      onAction();
    });
    upgradeRows.set(u.id, row);
  }

  // Gründer-Schulungen — In-Run-Progression des Gründers (nur Klick-Mechanik).
  // Effekt & aktiver Zuwachs sind zustandsabhängig → data-pop-Spans, die
  // render() bei offenem Popover aktualisiert.
  const tr = $('training-list');
  for (const t of TRAININGS) {
    const row = makeRow(
      tr,
      t.icon,
      t.name,
      `<p>${t.desc}</p>
      <div class="breakdown">
        ${popRow('Effekt', '', 'effect')}
        ${popRow('Bei aktivem Spielen', '', 'active')}
      </div>
      <p class="popover__tip">Schulungen verbessern nur deinen eigenen Klick — „Auftrag gewinnen" und die Incident-Behebung.</p>`,
    );
    row.button.addEventListener('click', () => {
      buyTraining(s, t.id);
      onAction();
    });
    trainingRows.set(t.id, row);
  }

  // Finanzierungsrunden — Angebote mit Cash, Anteilsabgabe und Hürde.
  // Der Bootstrap-Weg ("aus eigener Tasche") lebt im (i)-Popover der Zeile.
  const funding = $('funding-list');
  for (const round of ROUNDS) {
    const unlocks = [
      ...RANKS.filter((r) => r.requiresRound === round.id).map((r) => `${r.icon} ${r.name}`),
      ...HARDWARE.filter((h) => h.requiresRound === round.id).map((h) => `${h.icon} ${h.name}`),
    ].join(', ');
    const row = makeRow(
      funding,
      round.icon,
      round.name,
      `<div class="breakdown">
        ${popRow('Kapitalspritze', '', 'cash')}
        ${popRow('Anteilsabgabe', '', 'dilution')}
        ${popRow('Schaltet frei', unlocks)}
      </div>
      <p class="popover__tip">Hürde: ${round.hurdleText}</p>
      <p>Oder bootstrappen: Ära ohne Investor freikaufen — teuer, aber du behältst Anteile und ersparst dir die Hürde.</p>
      <button class="btn btn--buy btn--self-unlock" data-round="${round.id}"></button>`,
    );
    row.button.addEventListener('click', () => {
      acceptRound(s, round.id);
      onAction();
    });
    const selfBtn = row.popover.querySelector('.btn--self-unlock') as HTMLButtonElement;
    selfBtn.innerHTML = `${withCoinSvg(fmtMoney(round.selfUnlockPrice))} · aus eigener Tasche`;
    selfBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selfUnlockRound(s, round.id);
      onAction();
    });
    fundingRows.set(round.id, row);
  }

  $<HTMLButtonElement>('event-fix').addEventListener('click', () => {
    clickFixIncident(s);
    onAction();
  });

  // Info-Popovers (Reputation, Gewinn- & Bewertungs-Aufschlüsselung)
  wirePopover('rep-info-btn', 'rep-popover');
  wirePopover('income-info-btn', 'income-popover', onAction);
  wirePopover('valuation-info-btn', 'valuation-popover', onAction);
}

/** Info-Button + Popover verdrahten; Klick außerhalb & Escape schließen. */
function wirePopover(btnId: string, popoverId: string, onOpen?: () => void): void {
  const btn = $<HTMLButtonElement>(btnId);
  const popover = $(popoverId);
  const setOpen = (open: boolean) => {
    popover.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) onOpen?.();
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(popover.hidden);
  });
  document.addEventListener('click', (e) => {
    if (!popover.hidden && !popover.contains(e.target as Node)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}

/** Multiplikator im deutschen Format, z. B. "×0,80". */
function fmtFactor(n: number): string {
  return `×${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Direkter Impact einer Schulung, als exakter Rohwert relativ zum aktuellen
 * Stand ("×15 → ×17"). Bei Schulungen ist der Rohwert immer wahr — anders
 * als bei min()-Käufen, deshalb darf er hier sichtbar in der Zeile stehen.
 */
function trainingEffectText(s: GameState, t: TrainingDef, owned: boolean): string {
  const parts: string[] = [];
  if (t.dealMultBonus) {
    const m = dealMult(s);
    parts.push(owned ? `Auftrag +${t.dealMultBonus}×` : `Auftrag ×${m} → ×${m + t.dealMultBonus}`);
  }
  if (t.cooldownBonus) {
    const c = dealCooldown(s);
    parts.push(owned ? `Cooldown −${-t.cooldownBonus} s` : `Cooldown ${c} s → ${Math.max(1, c + t.cooldownBonus)} s`);
  }
  if (t.fixClickBonus) parts.push('Behebungs-Klicks ×2');
  return parts.join(' · ');
}

/**
 * Hardware-Auslastung als Dreistufen-Ampel: neutral → Gold, sobald die
 * Spike-Reserve fehlt (Kapazität < 1,2 × Output) → Rot bei 100 % (Engpass).
 * Die Team-Bar wurde bewusst entfernt: Es ist immer genau eine Seite der
 * Engpass, und das "mehr einstellen"-Signal tragen die grünen Hire-Zuwächse.
 */
function setHwUtil(ratio: number): void {
  const pct = Math.min(100, Math.round(ratio * 100));
  $('util-hw-pct').textContent = `${pct} %`;
  const fill = $('util-hw-fill');
  fill.style.width = `${pct}%`;
  const full = pct >= 100;
  fill.classList.toggle('util__fill--full', full);
  fill.classList.toggle('util__fill--warn', !full && ratio >= 1 / SPIKE_RESERVE_RATIO);
}

function reveal(s: GameState, key: string, condition: boolean): boolean {
  if (s.revealed.includes(key)) return true;
  if (condition) {
    s.revealed.push(key);
    return true;
  }
  return false;
}

export function render(s: GameState): void {
  const inc = income(s);
  const cap = capacity(s);
  const out = output(s);

  $('money').innerHTML = withCoinSvg(fmtMoney(s.money));
  $('income').innerHTML = `<span class="gain">${withCoinSvg(`+${fmtRate(inc)}`)}</span>`;
  $('rep-value').textContent = String(Math.floor(s.rep));
  $('rep-fill').style.width = `${Math.min(100, s.rep)}%`;
  if (!$('rep-popover').hidden) {
    $('rep-rate').textContent = `+${repPerMinute(s).toLocaleString('de-DE', { maximumFractionDigits: 2 })}/min`;
  }

  // Gewinn-Aufschlüsselung (nur bei offenem Popover aktualisieren)
  if (!$('income-popover').hidden) {
    const effOut = s.spikeRemaining > 0 ? out * SPIKE_MULT : out;
    const used = Math.min(cap, effOut);
    $('bd-founder').innerHTML = withCoinSvg(fmtRate(FOUNDER_OUTPUT));
    $('bd-team').innerHTML = withCoinSvg(fmtRate(out - FOUNDER_OUTPUT));
    $('bd-cap').innerHTML = withCoinSvg(fmtRate(cap));
    $('bd-spike-row').hidden = s.spikeRemaining <= 0;
    if (s.spikeRemaining > 0) $('bd-spike').textContent = `×${SPIKE_MULT}`;
    $('bd-used-label').textContent = `Genutzt — Engpass: ${cap <= effOut ? 'Hardware' : 'Team'}`;
    $('bd-used').innerHTML = withCoinSvg(fmtRate(used));
    // Nur der schlechte Zustand wird markiert: Hardware deckelt → rot
    // (Team-Engpass ist der gesunde Normalzustand — alles verdient).
    const capIsLimit = cap <= effOut;
    $('bd-cap-row').classList.toggle('breakdown__row--alert', capIsLimit);
    // Actionable Hinweis statt Mechanik-Erklärung — passend zum Engpass
    $('income-tip').textContent = capIsLimit
      ? 'Du könntest mehr verdienen, wenn du deine Hardware ausbaust.'
      : 'Du könntest mehr verdienen, wenn du mehr Leute einstellst.';
    $('bd-mot').textContent = fmtFactor(motivation(s));
    $('bd-rep').textContent = fmtFactor(repFactor(s));
    const mult = incomeMult(s);
    $('bd-mult-row').hidden = mult === 1;
    if (mult !== 1) $('bd-mult').textContent = fmtFactor(mult);
    $('bd-incident-row').hidden = !s.incident;
    if (s.incident) {
      $('bd-incident').textContent = fmtFactor(INCIDENTS[s.incident.defIndex].incomeMult);
    }
    $('bd-upkeep').innerHTML = withCoinSvg(`−${fmtRate(upkeep(s))}`);
    $('bd-total').innerHTML = withCoinSvg(`+${fmtRate(inc)}`);
  }

  // Hardware-Auslastung (Team-Bar entfernt — redundant zur min()-Logik)
  setHwUtil(Math.min(cap, out) / cap);

  // Spike-Banner (nur während des viralen Posts sichtbar)
  const spikeBanner = $('spike-banner');
  if (s.spikeRemaining > 0) {
    spikeBanner.hidden = false;
    spikeBanner.textContent = `🔥 VIRALER POST! Traffic ×20 für ${Math.ceil(s.spikeRemaining)} s — deine Reserve zahlt sich aus!`;
  } else {
    spikeBanner.hidden = true;
  }

  // Incident-Banner
  const banner = $('event-banner');
  if (s.incident) {
    banner.hidden = false;
    const def = INCIDENTS[s.incident.defIndex];
    $('event-title').textContent = `🚨 ${s.incident.title}`;
    $('event-detail').textContent =
      def.severity === 'heavy'
        ? `Alles steht! −${def.repLoss} Reputation. Selbstheilung in ${Math.ceil(s.incident.remaining)} s.`
        : `Gewinn halbiert. −${def.repLoss} Reputation. Selbstheilung in ${Math.ceil(s.incident.remaining)} s.`;
    $('event-fix').textContent = `Beheben (${s.incident.clicksLeft} Klicks)`;
  } else {
    banner.hidden = true;
  }

  // Klick-Button: Phase 1 Mashing, Phase 2 Cooldown-Abschluss
  const clickBtn = $<HTMLButtonElement>('click-btn');
  if (!s.milestoneReached) {
    $('click-title').textContent = 'Ticket bearbeiten';
    $('click-value').innerHTML = withCoinSvg(`+${fmtMoney(CLICK_VALUE)}`);
    clickBtn.disabled = false;
    clickBtn.style.setProperty('--cooldown', '100');
  } else {
    $('click-title').textContent = 'Auftrag gewinnen';
    if (s.clickCooldown > 0) {
      $('click-value').textContent = `wieder in ${Math.ceil(s.clickCooldown)} s`;
      clickBtn.disabled = true;
      clickBtn.style.setProperty('--cooldown', ((1 - s.clickCooldown / dealCooldown(s)) * 100).toFixed(1));
    } else {
      $('click-value').innerHTML = withCoinSvg(`+${fmtMoney(dealValue(s))}`);
      clickBtn.disabled = false;
      clickBtn.style.setProperty('--cooldown', '100');
    }
  }

  // Team — Ränge mit Ära-Gate erscheinen erst, wenn die Runde offen ist
  for (const r of RANKS) {
    const row = rankRows.get(r.id)!;
    const visible = reveal(
      s,
      `rank:${r.id}`,
      s.rep >= r.repThreshold * 0.5 && roundUnlocked(s, r.requiresRound),
    );
    row.root.hidden = !visible;
    if (!visible) continue;
    row.count.textContent = s.emp[r.id] ? `× ${s.emp[r.id]}` : '';
    if (!s.unlockedRanks[r.id]) {
      const repOk = s.rep >= r.repThreshold;
      const price = unlockPrice(s, r.id);
      setButton(row.button, ICON_LOCK, fmtMoney(price), 'Freischalten');
      row.button.disabled = !repOk || s.money < price;
      setAfford(row.button, repOk ? s.money : 0, price);
      row.meta.textContent = repOk
        ? 'Freischalten: Employer Branding'
        : `🔒 ab Reputation ${r.repThreshold}`;
    } else {
      const price = hirePrice(s, r.id);
      const blocked = s.rep < r.repThreshold;
      setButton(row.button, '', fmtMoney(price), 'Einstellen');
      row.button.disabled = s.money < price || blocked;
      setAfford(row.button, blocked ? 0 : s.money, price);
      if (blocked) {
        row.meta.textContent = `⚠️ Reputation unter ${r.repThreshold}`;
      } else {
        const delta = hireIncomeDelta(s, r.id);
        row.meta.innerHTML =
          delta > 0.001
            ? `<span class="gain">${withCoinSvg(`+${fmtRate(delta)}`)}</span>`
            : 'Kapazität voll — erst aufrüsten';
      }
    }
    // Mini-Rechnung im Popover: Brutto-Output × Motivation × Reputation
    // = effektiver Zuwachs — die Diskrepanz erklärt sich durch Vorrechnen.
    if (!row.popover.hidden) {
      // Motivation NACH der Einstellung — ein neuer Kopf verschiebt den Schnitt
      s.emp[r.id] = (s.emp[r.id] ?? 0) + 1;
      const motAfter = motivation(s);
      s.emp[r.id] -= 1;
      (row.popover.querySelector('[data-pop="mot"]') as HTMLElement).textContent = fmtFactor(motAfter);
      (row.popover.querySelector('[data-pop="rep"]') as HTMLElement).textContent = fmtFactor(repFactor(s));
      const effDelta = hireIncomeDelta(s, r.id);
      (row.popover.querySelector('[data-pop="eff"]') as HTMLElement).innerHTML =
        effDelta > 0.001
          ? `<span class="gain">+${fmtRate(effDelta)}</span>`
          : `+${fmtRate(0)} · Kapazität voll`;
    }
  }

  // Hardware — kombinierte Wertanzeige (min()-UI-Regel aus der Spec!)
  for (const h of HARDWARE) {
    if (h.basePrice === 0) continue;
    const row = hwRows.get(h.id)!;
    const visible = reveal(
      s,
      `hw:${h.id}`,
      s.stats.totalEarned >= h.revealAtTotalEarned &&
        (!h.revealAfterRankUnlock || !!s.unlockedRanks[h.revealAfterRankUnlock]) &&
        roundUnlocked(s, h.requiresRound),
    );
    row.root.hidden = !visible;
    if (!visible) continue;
    const price = hardwarePrice(s, h.id);
    row.count.textContent = s.hw[h.id] ? `× ${s.hw[h.id]}` : '';
    setButton(row.button, '', fmtMoney(price), 'Kaufen');
    row.button.disabled = s.money < price;
    setAfford(row.button, s.money, price);
    const delta = hardwareIncomeDelta(s, h.id);
    row.meta.innerHTML =
      delta > 0.001
        ? `<span class="gain">${withCoinSvg(`+${fmtRate(delta)}`)}</span>`
        : withCoinSvg(`Reserve +${fmtRate(h.capacity)}`);
  }

  // Gründer-Schulungen: erst ab Phase 2 sichtbar (progressive disclosure).
  // Die nächste offene Schulung ist immer sichtbar — als Sparziel.
  $('training-section').hidden = !reveal(s, 'trainings', s.milestoneReached);
  const nextTrainingId = TRAININGS.find((t) => !s.trainings.includes(t.id))?.id;
  for (const t of TRAININGS) {
    const row = trainingRows.get(t.id)!;
    const owned = s.trainings.includes(t.id);
    const visible = reveal(
      s,
      `training:${t.id}`,
      owned || t.id === nextTrainingId || s.money >= t.price * 0.3,
    );
    row.root.hidden = !visible;
    if (!visible) continue;
    if (owned) {
      setButton(row.button, ICON_CHECK, 'absolviert', 'Absolviert');
      row.button.disabled = true;
      row.button.style.setProperty('--afford', '0');
      row.root.classList.add('item--owned');
      row.meta.textContent = '';
    } else {
      setButton(row.button, '', fmtMoney(t.price), 'Buchen');
      row.button.disabled = s.money < t.price;
      setAfford(row.button, s.money, t.price);
      // Sichtbar bleibt der direkte Impact — bei Schulungen sind Rohwerte
      // immer exakt ("vorher → nachher"), anders als bei min()-Käufen.
      row.meta.textContent = trainingEffectText(s, t, false);
    }
    if (!row.popover.hidden) {
      (row.popover.querySelector('[data-pop="effect"]') as HTMLElement).textContent =
        trainingEffectText(s, t, owned);
      const active = row.popover.querySelector('[data-pop="active"]') as HTMLElement;
      if (owned) {
        active.textContent = 'wirkt bereits';
      } else {
        const delta = trainingActiveRateDelta(s, t.id);
        active.innerHTML =
          delta > 0.001
            ? `<span class="gain">${withCoinSvg(`+${fmtRate(delta)}`)}</span>`
            : 'wirkt bei Incidents';
      }
    }
  }

  // Bewertung & Finanzierung — sichtbar ab Produkt-Markt-Fit
  renderValuation(s);
  renderFunding(s);

  // Upgrades
  for (const u of UPGRADES) {
    const row = upgradeRows.get(u.id)!;
    const owned = s.upgrades.includes(u.id);
    const visible = reveal(s, `upg:${u.id}`, owned || s.money >= u.price * 0.3);
    row.root.hidden = !visible;
    if (!visible) continue;
    row.meta.textContent = u.impact;
    if (owned) {
      setButton(row.button, ICON_CHECK, 'gekauft', 'Gekauft');
      row.button.disabled = true;
      row.button.style.setProperty('--afford', '0');
      row.root.classList.add('item--owned');
    } else {
      setButton(row.button, '', fmtMoney(u.price), 'Kaufen');
      row.button.disabled = s.money < u.price;
      setAfford(row.button, s.money, u.price);
    }
  }
}

// ----------------------------- Bewertung & Finanzierung -----------------------------

/** Nächste noch nicht angenommene Runde (für die Fortschritts-Zeile). */
function nextRound(s: GameState): RoundDef | null {
  for (const r of ROUNDS) if (!s.rounds.includes(r.id)) return r;
  return null;
}

function renderValuation(s: GameState): void {
  const visible = reveal(s, 'valuation', s.pmfReached);
  $('valuation-stat').hidden = !visible;
  if (!visible) return;
  const v = valuation(s);
  $('valuation').innerHTML = withCoinSvg(`${s.stats.unicornSeen ? '🦄 ' : ''}${fmtMoney(v)}`);
  // Fortschritt zur nächsten Sprosse der Funding-Leiter
  const next = nextRound(s);
  $('valuation-next').textContent = s.valuationHighWater >= UNICORN_VALUATION
    ? '· Unicorn!'
    : next
      ? `· ${next.name} ab ${fmtMoney(next.threshold).replace('🪙 ', '')}`
      : `· 🦄 ab ${fmtMoney(UNICORN_VALUATION).replace('🪙 ', '')}`;

  if (!$('valuation-popover').hidden) {
    $('ts-ertrag').innerHTML = withCoinSvg(fmtMoney(ertragskraft(s)));
    $('ts-mult').textContent = fmtFactor(valuationMultiple(s));
    $('ts-mult-detail').textContent =
      `(Reputation ${fmtFactor(repMultiple(s))} · Gründer ${fmtFactor(gruenderBonus(s))}` +
      (trackRecordBonus(s) > 1 ? ` · Track Record ${fmtFactor(trackRecordBonus(s))})` : ')');
    $('ts-team').innerHTML = withCoinSvg(fmtMoney(teamValue(s)));
    $('ts-hw').innerHTML = withCoinSvg(fmtMoney(hardwareValue(s)));
    $('ts-cash').innerHTML = withCoinSvg(fmtMoney(s.money));
    $('ts-total').innerHTML = withCoinSvg(fmtMoney(v));
  }
}

function renderFunding(s: GameState): void {
  const sectionVisible = reveal(s, 'funding', s.pmfReached);
  $('funding-section').hidden = !sectionVisible;
  if (!sectionVisible) return;

  for (const round of ROUNDS) {
    const row = fundingRows.get(round.id)!;
    const status = roundStatus(s, round);
    // Progressive disclosure: die nächste Sprosse wird als Sparziel sichtbar,
    // sobald der Hochwasserstand in ihre Nähe kommt
    const visible = reveal(
      s,
      `funding:${round.id}`,
      status !== 'locked' || s.valuationHighWater >= round.threshold * 0.2,
    );
    row.root.hidden = !visible;
    if (!visible) continue;

    const selfBtn = row.popover.querySelector('.btn--self-unlock') as HTMLButtonElement;
    const selfDone = s.selfUnlocked.includes(round.id);
    if (!row.popover.hidden) {
      (row.popover.querySelector('[data-pop="cash"]') as HTMLElement).innerHTML =
        `<span class="gain">${withCoinSvg(`+${fmtMoney(roundCash(s, round))}`)}</span>`;
      (row.popover.querySelector('[data-pop="dilution"]') as HTMLElement).textContent =
        `−${Math.round(roundDilution(s, round) * 100)} Prozentpunkte`;
      selfBtn.hidden = status === 'accepted' || selfDone;
      selfBtn.disabled = s.money < round.selfUnlockPrice || status === 'locked';
    }

    switch (status) {
      case 'accepted':
        setButton(row.button, ICON_CHECK, 'an Bord', 'Angenommen');
        row.button.disabled = true;
        row.button.style.setProperty('--afford', '0');
        row.root.classList.add('item--owned');
        row.meta.textContent = `Hürde aktiv: ${round.hurdleText.split(':')[0]}`;
        break;
      case 'offered':
        setButton(row.button, '', 'Annehmen ✍️', 'Runde annehmen');
        row.button.disabled = false;
        row.button.style.setProperty('--afford', '0');
        row.meta.innerHTML =
          `<span class="gain">${withCoinSvg(`+${fmtMoney(roundCash(s, round))}`)}</span>` +
          ` · −${Math.round(roundDilution(s, round) * 100)} % Anteil` +
          (selfDone ? ' · Ära bereits freigekauft' : '');
        break;
      case 'trackGate':
        setButton(row.button, ICON_LOCK, 'Annehmen', 'Gesperrt');
        row.button.disabled = true;
        row.button.style.setProperty('--afford', '0');
        row.meta.textContent = `🔒 Investoren wollen Track Record: ${round.minExits} Exit${round.minExits > 1 ? 's' : ''}` +
          (selfDone ? ' · Ära bereits freigekauft' : ' — oder bootstrappen (i)');
        break;
      default: // locked
        setButton(row.button, ICON_LOCK, 'Annehmen', 'Gesperrt');
        row.button.disabled = true;
        row.button.style.setProperty('--afford', '0');
        row.meta.innerHTML = withCoinSvg(`ab Bewertung ${fmtMoney(round.threshold)}`);
    }
  }

  // Exit-Zeile: Erlös-Vorschau
  const exitVisible = s.pmfReached;
  $('exit-row').hidden = !exitVisible;
  if (exitVisible) {
    $('exit-meta').innerHTML =
      `Verkauf deines StartUps: <span class="gain">${withCoinSvg(`+${fmtMoney(exitProceeds(s))}`)}</span>` +
      ` <small>(Anteil ${Math.round(s.founderShare * 100)} %)</small>`;
  }
}

// ----------------------------- Exit-Overlay -----------------------------

/** Rendert Term-Sheet-Phase und Perk-Shop. In beiden Phasen live aktualisiert. */
export function renderExitOverlay(s: GameState, meta: MetaState): void {
  // Phase 1: Term Sheet
  const v = valuation(s);
  $('exit-buyer').textContent = buyerFor(v);
  $('ex-ertrag').innerHTML = withCoinSvg(fmtMoney(ertragskraft(s)));
  $('ex-mult').textContent = fmtFactor(valuationMultiple(s));
  $('ex-mult-detail').textContent =
    `(Rep ${fmtFactor(repMultiple(s))} · Gründer ${fmtFactor(gruenderBonus(s))}` +
    (trackRecordBonus(s) > 1 ? ` · Track Record ${fmtFactor(trackRecordBonus(s))})` : ')');
  $('ex-team').innerHTML = withCoinSvg(fmtMoney(teamValue(s)));
  $('ex-hw').innerHTML = withCoinSvg(fmtMoney(hardwareValue(s)));
  $('ex-cash').innerHTML = withCoinSvg(fmtMoney(s.money));
  $('ex-total').innerHTML = withCoinSvg(fmtMoney(v));
  $('ex-share').textContent = `${Math.round(s.founderShare * 100)} %`;
  $('ex-proceeds').innerHTML = withCoinSvg(fmtMoney(exitProceeds(s)));

  // Phase 2: Perk-Shop (Buttons wurden von main.ts mit stabilen IDs angelegt)
  $('perk-bank').innerHTML = withCoinSvg(fmtMoney(meta.bank));
  for (const p of PERKS) {
    const btn = document.getElementById(`perk-btn-${p.id}`) as HTMLButtonElement | null;
    const lvlEl = document.getElementById(`perk-lvl-${p.id}`);
    if (!btn || !lvlEl) continue; // Shop noch nicht gebaut
    const level = meta.perks[p.id] ?? 0;
    lvlEl.textContent = level ? `Stufe ${level}/${p.maxLevel}` : '';
    if (perkMaxed(meta, p)) {
      btn.innerHTML = `${ICON_CHECK}<span>max</span>`;
      btn.disabled = true;
      btn.style.setProperty('--afford', '0');
    } else {
      const price = perkPrice(meta, p.id);
      btn.innerHTML = `<span>${withCoinSvg(fmtMoney(price))}</span>`;
      btn.disabled = meta.bank < price;
      setAfford(btn, meta.bank, price);
    }
  }
}

// ----------------------------- Toasts -----------------------------

export function toast(message: string, kind: 'info' | 'warn' | 'gold' = 'info'): void {
  const container = $('toasts');
  const el = document.createElement('div');
  el.className = `toast toast--${kind}`;
  el.innerHTML = withCoinSvg(message); // nur eigene Strings, kein User-Input
  container.appendChild(el);
  window.setTimeout(() => el.classList.add('toast--visible'), 10);
  window.setTimeout(() => {
    el.classList.remove('toast--visible');
    window.setTimeout(() => el.remove(), 400);
  }, 6000);
}
