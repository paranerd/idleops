import '../styles/main.scss';
import { CLICK_VALUE, PERKS, ROUNDS } from './config';
import { buyPerk, buyerFor, dealClick, exitProceeds, valuation } from './engine';
import { load, loadMeta, resetSave, save, saveMeta, setupAutosave } from './save';
import { startLoop } from './tick';
import { buildUI, render, renderExitOverlay, toast } from './ui/render';
import { fmt, fmtMoney, withCoinSvg } from './ui/format';
import type { GameEvent } from './events';
import type { ProgressEvent } from './tick';
import { initialState, type MetaState } from './state';

let { state, offline } = load();
const meta: MetaState = loadMeta();

buildUI(state, () => render(state));

// Klick-Button: Phase 1 "Ticket bearbeiten" (Mashing) / Phase 2 "Auftrag gewinnen" (Cooldown)
const clickBtn = document.getElementById('click-btn') as HTMLButtonElement;
clickBtn.addEventListener('click', (e) => {
  let gain: number;
  if (!state.milestoneReached) {
    state.money += CLICK_VALUE;
    state.stats.totalEarned += CLICK_VALUE;
    gain = CLICK_VALUE;
  } else {
    const deal = dealClick(state);
    if (deal === false) return; // noch im Cooldown
    gain = deal;
  }
  state.stats.clicks += 1;
  clickBtn.classList.remove('btn--click-pulse');
  void clickBtn.offsetWidth; // Animation neu triggern
  clickBtn.classList.add('btn--click-pulse');
  spawnClickFloat(e, gain);
  render(state);
});

// Juice: verdienter Betrag schwebt vom Klickpunkt nach oben
function spawnClickFloat(e: MouseEvent, amount: number): void {
  const float = document.createElement('span');
  float.className = 'click-float';
  float.innerHTML = withCoinSvg(`+${fmtMoney(amount)}`);
  const rect = clickBtn.getBoundingClientRect();
  const x = e.clientX > 0 ? e.clientX - rect.left : rect.width / 2;
  float.style.left = `${x + (Math.random() * 24 - 12)}px`;
  clickBtn.parentElement!.appendChild(float);
  window.setTimeout(() => float.remove(), 900);
}

// Reset mit Doppelklick-Bestätigung (kein confirm() — blockiert den Browser)
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
let resetArmed = false;
resetBtn.addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    resetBtn.textContent = 'Wirklich? Alles (auch Perks) geht verloren!';
    window.setTimeout(() => {
      resetArmed = false;
      resetBtn.textContent = 'Neues Spiel';
    }, 3000);
    return;
  }
  resetSave();
  window.location.reload();
});

// ----------------------------- Der Exit -----------------------------
// Verkaufen passiert im Bewertungs-Popover (Term Sheet) mit EINEM Klick. Der
// Verkauf ist erst mit "Neu gründen" endgültig — bis dahin ist er über
// "Doch nicht verkaufen" im Perk-Overlay vollständig zurücknehmbar (der Run
// läuft unberührt weiter, Meta wird auf den Stand vor dem Verkauf zurückgesetzt).

const overlay = document.getElementById('exit-overlay') as HTMLElement;
const sellBtn = document.getElementById('sell-btn') as HTMLButtonElement;

// Snapshot des Meta-Stands vor dem (vorläufigen) Verkauf — für "Doch nicht".
let metaBeforeSell: MetaState | null = null;

sellBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  doSell();
});

function doSell(): void {
  metaBeforeSell = structuredClone(meta);
  const proceeds = exitProceeds(state);
  const soldValuation = valuation(state);
  const buyer = buyerFor(soldValuation);
  meta.bank += proceeds;
  meta.exits += 1;
  meta.bestValuation = Math.max(meta.bestValuation, soldValuation);
  if (soldValuation >= 1e9) meta.unicornReached = true;
  saveMeta(meta);
  // Popover schließen, Perk-Overlay öffnen
  document.getElementById('valuation-popover')!.hidden = true;
  document.getElementById('valuation-info-btn')!.setAttribute('aria-expanded', 'false');
  buildPerkShop();
  const sold = document.getElementById('sold-info')!;
  sold.innerHTML = withCoinSvg(`Verkauft an ${buyer} für <strong>+${fmtMoney(proceeds)}</strong>.`);
  overlay.hidden = false;
  renderExitOverlay(meta);
}

// "Doch nicht verkaufen": Verkauf (inkl. etwaiger Perk-Käufe) rückgängig,
// zurück in den laufenden Run.
document.getElementById('exit-cancel-btn')!.addEventListener('click', () => {
  if (metaBeforeSell) {
    // Meta-Objekt in place zurücksetzen (bleibt dieselbe Referenz für buildPerkShop)
    Object.assign(meta, metaBeforeSell);
    meta.perks = { ...metaBeforeSell.perks };
    metaBeforeSell = null;
    saveMeta(meta);
  }
  overlay.hidden = true;
  render(state);
});

// Perk-Shop einmal aufbauen (Buttons pro Perk, in zwei Klassen-Spalten).
// Buttons bekommen stabile IDs, damit renderExitOverlay sie ohne Import findet.
let perkShopBuilt = false;
function buildPerkShop(): void {
  if (perkShopBuilt) return;
  perkShopBuilt = true;
  for (const kind of ['decke', 'tempo'] as const) {
    const list = document.getElementById(`perk-list-${kind}`)!;
    for (const p of PERKS.filter((x) => x.kind === kind)) {
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `
        <div class="item__info">
          <div class="item__title"><span class="item__icon">${p.icon}</span> ${p.name} <span class="item__count" id="perk-lvl-${p.id}"></span></div>
          <div class="item__meta">${p.desc}</div>
        </div>`;
      const btn = document.createElement('button');
      btn.className = 'btn btn--buy';
      btn.id = `perk-btn-${p.id}`;
      btn.addEventListener('click', () => {
        if (buyPerk(meta, p.id)) {
          saveMeta(meta);
          renderExitOverlay(meta);
        }
      });
      row.appendChild(btn);
      list.appendChild(row);
    }
  }
}

document.getElementById('new-run-btn')!.addEventListener('click', () => {
  // Neuer Run mit den gekauften Perks; Meta bleibt, Run-State wird frisch.
  // WICHTIG: state-Objekt IN PLACE mutieren, nicht neu zuweisen — die
  // Autosave-Handler (setupAutosave) halten eine Referenz auf genau dieses
  // Objekt. Ein neu zugewiesenes Objekt würde beim reload() vom beforeunload-
  // Autosave des ALTEN Objekts überschrieben → der Reload zeigte wieder den
  // alten Run ("Neu gründen tut scheinbar nichts").
  saveMeta(meta);
  Object.assign(state, initialState(meta));
  save(state);
  window.location.reload();
});

function handleEvent(e: GameEvent | ProgressEvent): void {
  switch (e.kind) {
    case 'milestone':
      toast('🎉 Meilenstein: Dein passives Einkommen übersteigt deine Freelance-Arbeit. Du hast dein letztes Ticket geschlossen — ab jetzt gewinnst du Aufträge!', 'gold');
      break;
    case 'pmf':
      toast('🚀 Produkt-Markt-Fit! Deine Seniors liefern — die Presse wird aufmerksam. Ab jetzt kann ein viraler Post durchschlagen, und Investoren bewerten dein StartUp.', 'gold');
      break;
    case 'roundOffer': {
      const def = ROUNDS.find((r) => r.id === e.roundId);
      if (def) toast(`${def.icon} Ein Term Sheet liegt auf dem Tisch: ${def.name}! Öffne das (i) neben deiner Bewertung.`, 'gold');
      break;
    }
    case 'unicorn':
      toast('🦄 UNICORN! Deine Bewertung hat die Milliarde geknackt. Du kannst jetzt zum Höchstpreis verkaufen (IPO) — oder einfach weiterbauen.', 'gold');
      document.body.classList.add('unicorn-flash');
      window.setTimeout(() => document.body.classList.remove('unicorn-flash'), 2000);
      break;
    case 'incidentStart':
      toast(`🚨 Incident: ${e.title}`, 'warn');
      if (e.severity === 'heavy') {
        document.body.classList.add('shake');
        window.setTimeout(() => document.body.classList.remove('shake'), 600);
      }
      break;
    case 'incidentFixed':
      toast(`✅ Behoben: ${e.title}`);
      break;
    case 'incidentAutoFixed':
      toast(`🤖 Runbooks haben übernommen: ${e.title} automatisch behoben.`);
      break;
    case 'incidentSelfHealed':
      toast(`⏱️ Vorbei: ${e.title}`);
      break;
    case 'spikeStart':
      toast('🔥 Viraler Post! Traffic ×20 — deine Hardware-Reserve zahlt sich aus!', 'gold');
      break;
    case 'spikeEnd':
      toast('Der virale Sturm ist vorbei.');
      break;
    case 'hugOfDeath':
      toast('💀 Hug of Death: Ein viraler Post — aber deine Hardware war am Limit. Seite gecrasht, Chance verpasst, −5 Reputation. Halte Kapazitäts-Reserve vor!', 'warn');
      break;
  }
}

if (offline) {
  const mins = Math.round(offline.seconds / 60);
  toast(
    offline.earned > 0
      ? `👋 Willkommen zurück! Dein Team hat in ${fmt(mins)} min ${fmtMoney(offline.earned)} verdient.`
      : '👋 Willkommen zurück!',
  );
}

setupAutosave(state);

window.setInterval(() => {
  save(state);
}, 30_000);

startLoop(state, (events) => {
  for (const e of events) handleEvent(e);
  render(state);
});

render(state);
