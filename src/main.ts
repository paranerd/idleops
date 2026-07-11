import '../styles/main.scss';
import { CLICK_VALUE } from './config';
import { dealClick } from './engine';
import { load, resetSave, save, setupAutosave } from './save';
import { startLoop } from './tick';
import { buildUI, render, toast } from './ui/render';
import { fmt, fmtMoney, withCoinSvg } from './ui/format';
import type { GameEvent } from './events';
import type { MilestoneEvent } from './tick';

const { state, offline } = load();

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
    resetBtn.textContent = 'Wirklich? Alles geht verloren!';
    window.setTimeout(() => {
      resetArmed = false;
      resetBtn.textContent = 'Neues Spiel';
    }, 3000);
    return;
  }
  resetSave();
  window.location.reload();
});

function handleEvent(e: GameEvent | MilestoneEvent): void {
  switch (e.kind) {
    case 'milestone':
      toast('🎉 Meilenstein: Dein passives Einkommen übersteigt deine Freelance-Arbeit. Du hast dein letztes Ticket geschlossen — ab jetzt gewinnst du Aufträge!', 'gold');
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
