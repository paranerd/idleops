// ============================================================================
// save.ts — Speichern/Laden (localStorage) + Offline-Progress.
// Ohne Kaskade ist das Einkommen zwischen Käufen konstant:
// Offline-Verdienst = baseIncome × Zeit. Kein Simulieren nötig.
// Incidents feuern offline nicht (sanftes Design), Reputation
// steigt offline gedeckelt.
// ============================================================================

import { AUTOSAVE_INTERVAL, HARDWARE, REP_MAX, REP_OFFLINE_CAP_SECONDS, SAVE_KEY } from './config';
import { baseIncome, repPerMinute } from './engine';
import { initialState, type GameState } from './state';

export interface OfflineReport {
  seconds: number;
  earned: number;
}

// Nach einem Reset darf nichts mehr gespeichert werden — sonst schreibt der
// beforeunload-Handler des Auto-Saves den alten State direkt wieder zurück
// und macht den Reset rückgängig.
let saveDisabled = false;

export function save(s: GameState): void {
  if (saveDisabled) return;
  s.lastSave = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* Speicher voll / privater Modus — still scheitern */
  }
}

/** Lädt den Spielstand; wendet Offline-Progress an. */
export function load(): { state: GameState; offline: OfflineReport | null } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    /* ignorieren */
  }
  if (!raw) return { state: initialState(), offline: null };

  let state: GameState;
  try {
    // Über den Initial-State mergen, damit neue Felder nach Updates
    // sinnvolle Defaults bekommen.
    state = { ...initialState(), ...(JSON.parse(raw) as GameState) };
  } catch {
    return { state: initialState(), offline: null };
  }

  // Aktive Events verfallen beim Laden (offline passiert nichts Schlimmes)
  state.incident = null;
  state.spikeRemaining = 0;

  // Migration: Hardware mit Rang-Gate wieder verstecken, falls sie ein
  // früherer Stand ohne das Gate schon "revealed" hatte
  state.revealed = state.revealed.filter((key) => {
    const hw = HARDWARE.find((h) => `hw:${h.id}` === key);
    if (!hw?.revealAfterRankUnlock) return true;
    return !!state.unlockedRanks[hw.revealAfterRankUnlock];
  });

  const seconds = Math.max(0, (Date.now() - state.lastSave) / 1000);
  let offline: OfflineReport | null = null;
  if (seconds > 10) {
    const earned = baseIncome(state) * seconds;
    state.money += earned;
    state.stats.totalEarned += earned;
    const repSeconds = Math.min(seconds, REP_OFFLINE_CAP_SECONDS);
    state.rep = Math.min(REP_MAX, state.rep + (repPerMinute(state) / 60) * repSeconds);
    offline = { seconds, earned };
  }
  return { state, offline };
}

export function resetSave(): void {
  saveDisabled = true;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignorieren */
  }
}

/** Autosave-Intervall + Speichern beim Verlassen. */
export function setupAutosave(s: GameState): void {
  window.setInterval(() => save(s), AUTOSAVE_INTERVAL * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save(s);
  });
  window.addEventListener('beforeunload', () => save(s));
}
