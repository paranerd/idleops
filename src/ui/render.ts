// ============================================================================
// render.ts — liest den State, aktualisiert das DOM. Statische Struktur
// wird einmal gebaut (Buttons pro Definition), dynamische Werte jeden
// Frame aktualisiert.
// ============================================================================

import {
  CLICK_VALUE,
  DEAL_COOLDOWN,
  FOUNDER_OUTPUT,
  HARDWARE,
  INCIDENTS,
  RANKS,
  UPGRADES,
} from '../config';
import {
  buyHardware,
  buyUpgrade,
  capacity,
  dealValue,
  hardwareIncomeDelta,
  hardwarePrice,
  hire,
  hireIncomeDelta,
  hirePrice,
  income,
  motivation,
  output,
  repPerMinute,
  unlockRank,
  upkeep,
} from '../engine';
import { clickFixIncident } from '../events';
import type { GameState } from '../state';
import { fmtMoney, fmtRate } from './format';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

// Inline-SVGs statt Icon-Library — bleibt self-contained
const ICON_PLUS =
  '<svg class="btn__icon" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">' +
  '<path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>';
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
    btn.innerHTML = `${icon}<span>${label}</span>`;
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
}

const hwRows = new Map<string, Row>();
const rankRows = new Map<string, Row>();
const upgradeRows = new Map<string, Row>();

function makeRow(container: HTMLElement, icon: string, title: string, desc: string, tooltip = ''): Row {
  const root = document.createElement('div');
  root.className = 'item';
  if (tooltip) root.title = tooltip;
  root.innerHTML = `
    <div class="item__info">
      <div class="item__title"><span class="item__icon">${icon}</span> ${title} <span class="item__count"></span></div>
      ${desc ? `<div class="item__desc">${desc}</div>` : ''}
      <div class="item__meta"></div>
    </div>`;
  const button = document.createElement('button');
  button.className = 'btn btn--buy';
  root.appendChild(button);
  container.appendChild(root);
  return {
    root,
    button,
    meta: root.querySelector('.item__meta') as HTMLElement,
    count: root.querySelector('.item__count') as HTMLElement,
  };
}

export function buildUI(s: GameState, onAction: () => void): void {
  const team = $('team-list');
  for (const r of RANKS) {
    const row = makeRow(
      team,
      r.icon,
      r.name,
      '', // Details nur im Tooltip — die Zeile bleibt kompakt
      `Output ${fmtRate(r.output)} · Motivation ${r.motivation.toLocaleString('de-DE')} · Incident-Risiko ${r.riskPoints.toLocaleString('de-DE')} Punkte`,
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
      '', // Details nur im Tooltip
      `Kapazität +${fmtRate(h.capacity)} · Betriebskosten ${fmtRate(h.upkeep)}`,
    );
    row.button.addEventListener('click', () => {
      buyHardware(s, h.id);
      onAction();
    });
    hwRows.set(h.id, row);
  }

  const up = $('upgrade-list');
  for (const u of UPGRADES) {
    const row = makeRow(up, u.icon, u.name, u.desc);
    row.button.addEventListener('click', () => {
      buyUpgrade(s, u.id);
      onAction();
    });
    upgradeRows.set(u.id, row);
  }

  $<HTMLButtonElement>('event-fix').addEventListener('click', () => {
    clickFixIncident(s);
    onAction();
  });

  // Reputation-Info-Popover
  const infoBtn = $<HTMLButtonElement>('rep-info-btn');
  const popover = $('rep-popover');
  const setOpen = (open: boolean) => {
    popover.hidden = !open;
    infoBtn.setAttribute('aria-expanded', String(open));
  };
  infoBtn.addEventListener('click', (e) => {
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

  $('money').textContent = fmtMoney(s.money);
  $('income').textContent = `+${fmtRate(inc)}`;
  $('rep-value').textContent = String(Math.floor(s.rep));
  $('rep-fill').style.width = `${Math.min(100, s.rep)}%`;
  if (!$('rep-popover').hidden) {
    $('rep-rate').textContent = `+${repPerMinute(s).toLocaleString('de-DE', { maximumFractionDigits: 2 })}/min`;
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
    $('click-value').textContent = `+${fmtMoney(CLICK_VALUE)}`;
    clickBtn.disabled = false;
    clickBtn.style.setProperty('--cooldown', '100');
  } else {
    $('click-title').textContent = 'Auftrag gewinnen';
    if (s.clickCooldown > 0) {
      $('click-value').textContent = `wieder in ${Math.ceil(s.clickCooldown)} s`;
      clickBtn.disabled = true;
      clickBtn.style.setProperty('--cooldown', ((1 - s.clickCooldown / DEAL_COOLDOWN) * 100).toFixed(1));
    } else {
      $('click-value').textContent = `+${fmtMoney(dealValue(s))}`;
      clickBtn.disabled = false;
      clickBtn.style.setProperty('--cooldown', '100');
    }
  }

  $('founder-hint').textContent =
    `Du: ${fmtRate(FOUNDER_OUTPUT)} · Motivation ×${motivation(s).toLocaleString('de-DE', { maximumFractionDigits: 2 })}` +
    ` · Betriebskosten ${fmtRate(upkeep(s))}`;

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
      setButton(row.button, ICON_PLUS, fmtMoney(price), 'Einstellen');
      row.button.disabled = s.money < price || blocked;
      setAfford(row.button, blocked ? 0 : s.money, price);
      if (blocked) {
        row.meta.textContent = `⚠️ Reputation unter ${r.repThreshold}`;
      } else {
        const delta = hireIncomeDelta(s, r.id);
        row.meta.textContent = delta > 0.001 ? `+${fmtRate(delta)}` : 'Kapazität voll — erst aufrüsten';
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
    setButton(row.button, ICON_PLUS, fmtMoney(price), 'Kaufen');
    row.button.disabled = s.money < price;
    setAfford(row.button, s.money, price);
    const delta = hardwareIncomeDelta(s, h.id);
    row.meta.textContent =
      delta > 0.001 ? `+${fmtRate(delta)}` : `Reserve: +${fmtRate(h.capacity)} Kapazität`;
  }

  // Upgrades
  for (const u of UPGRADES) {
    const row = upgradeRows.get(u.id)!;
    const owned = s.upgrades.includes(u.id);
    const visible = reveal(s, `upg:${u.id}`, owned || s.money >= u.price * 0.3);
    row.root.hidden = !visible;
    if (!visible) continue;
    if (owned) {
      setButton(row.button, ICON_CHECK, 'gekauft', 'Gekauft');
      row.button.disabled = true;
      row.button.style.setProperty('--afford', '0');
      row.root.classList.add('item--owned');
    } else {
      setButton(row.button, ICON_PLUS, fmtMoney(u.price), 'Kaufen');
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
  el.textContent = message;
  container.appendChild(el);
  window.setTimeout(() => el.classList.add('toast--visible'), 10);
  window.setTimeout(() => {
    el.classList.remove('toast--visible');
    window.setTimeout(() => el.remove(), 400);
  }, 6000);
}
