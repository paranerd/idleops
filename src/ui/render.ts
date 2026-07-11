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
  RANKS,
  SPIKE_MULT,
  TRAININGS,
  UPGRADES,
  type TrainingDef,
} from '../config';
import {
  buyHardware,
  buyTraining,
  buyUpgrade,
  capacity,
  dealCooldown,
  dealMult,
  dealValue,
  hardwareIncomeDelta,
  hardwarePrice,
  hire,
  hireIncomeDelta,
  hirePrice,
  income,
  incomeMult,
  motivation,
  output,
  repFactor,
  repPerMinute,
  trainingActiveRateDelta,
  unlockRank,
  upkeep,
} from '../engine';
import { clickFixIncident } from '../events';
import type { GameState } from '../state';
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
        ${popRow('Basis-Motivation', r.motivation.toLocaleString('de-DE'))}
        ${popRow('Incident-Risiko', `${r.riskPoints.toLocaleString('de-DE')} Punkte`)}
        ${r.repThreshold > 0 ? popRow('Einstellbar ab', `Reputation ${r.repThreshold}`) : ''}
      </div>
      <p class="popover__tip">Die Zeile zeigt den effektiven Gewinn-Zuwachs der nächsten Einstellung — Motivation, Reputation und Kapazität sind schon eingerechnet.</p>`,
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

  $<HTMLButtonElement>('event-fix').addEventListener('click', () => {
    clickFixIncident(s);
    onAction();
  });

  // Info-Popovers (Reputation & Gewinn-Aufschlüsselung)
  wirePopover('rep-info-btn', 'rep-popover');
  wirePopover('income-info-btn', 'income-popover', onAction);
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

function setUtil(which: 'team' | 'hw', ratio: number): void {
  const pct = Math.min(100, Math.round(ratio * 100));
  const full = pct >= 100;
  $(`util-${which}-pct`).textContent = full ? '100 % · Engpass' : `${pct} %`;
  const fill = $(`util-${which}-fill`);
  fill.style.width = `${pct}%`;
  fill.classList.toggle('util__fill--full', full);
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

  // Auslastung: die 100-%-Seite ist der Engpass
  const used = Math.min(cap, out);
  setUtil('team', used / out);
  setUtil('hw', used / cap);

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

  // Team
  for (const r of RANKS) {
    const row = rankRows.get(r.id)!;
    const visible = reveal(s, `rank:${r.id}`, s.rep >= r.repThreshold * 0.5);
    row.root.hidden = !visible;
    if (!visible) continue;
    row.count.textContent = s.emp[r.id] ? `× ${s.emp[r.id]}` : '';
    if (!s.unlockedRanks[r.id]) {
      const repOk = s.rep >= r.repThreshold;
      setButton(row.button, ICON_LOCK, fmtMoney(r.unlockCost), 'Freischalten');
      row.button.disabled = !repOk || s.money < r.unlockCost;
      setAfford(row.button, repOk ? s.money : 0, r.unlockCost);
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
  }

  // Hardware — kombinierte Wertanzeige (min()-UI-Regel aus der Spec!)
  for (const h of HARDWARE) {
    if (h.basePrice === 0) continue;
    const row = hwRows.get(h.id)!;
    const visible = reveal(
      s,
      `hw:${h.id}`,
      s.stats.totalEarned >= h.revealAtTotalEarned &&
        (!h.revealAfterRankUnlock || !!s.unlockedRanks[h.revealAfterRankUnlock]),
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
        : withCoinSvg(`Reserve: +${fmtRate(h.capacity)} Kapazität`);
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
