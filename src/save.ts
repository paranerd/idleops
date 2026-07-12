// ============================================================================
// save.ts — Speichern/Laden (localStorage) + Offline-Progress.
// Ohne Kaskade ist das Einkommen zwischen Käufen konstant:
// Offline-Verdienst = baseIncome × Zeit. Kein Simulieren nötig.
// Incidents feuern offline nicht (sanftes Design), Reputation
// steigt offline gedeckelt.
//
// Zwei Keys: SAVE_KEY = der laufende Run, META_SAVE_KEY = Exit-Perks & Co.
// (überlebt den Exit). Der Run-Key bleibt aus Kompatibilität unverändert.
// ============================================================================

import { AUTOSAVE_INTERVAL, HARDWARE, META_SAVE_KEY, PMF_RANK, REP_MAX, REP_OFFLINE_CAP_SECONDS, SAVE_KEY } from './config';
import { baseIncome, repPerMinute } from './engine';
import { advanceValuation } from './tick';
import { initialMeta, initialState, type GameState, type MetaState } from './state';

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

export function saveMeta(m: MetaState): void {
  if (saveDisabled) return;
  try {
    localStorage.setItem(META_SAVE_KEY, JSON.stringify(m));
  } catch {
    /* still scheitern */
  }
}

export function loadMeta(): MetaState {
  try {
    const raw = localStorage.getItem(META_SAVE_KEY);
    if (!raw) return initialMeta();
    const parsed = JSON.parse(raw) as MetaState;
    const base = initialMeta();
    return { ...base, ...parsed, perks: { ...base.perks, ...(parsed.perks ?? {}) } };
  } catch {
    return initialMeta();
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
  if (!raw) return { state: initialState(loadMeta()), offline: null };

  let state: GameState;
  try {
    // Über den Initial-State mergen, damit neue Felder nach Updates
    // sinnvolle Defaults bekommen.
    state = { ...initialState(), ...(JSON.parse(raw) as GameState) };
  } catch {
    return { state: initialState(loadMeta()), offline: null };
  }

  // Aktive Events verfallen beim Laden (offline passiert nichts Schlimmes)
  state.incident = null;
  state.spikeRemaining = 0;

  // Migration: Stand vor dem Bewertungs-Update — PMF ableiten,
  // Bewertungs-Tracking startet beim aktuellen Einkommen
  if (!state.pmfReached && state.unlockedRanks[PMF_RANK]) state.pmfReached = true;
  if (!state.emaIncome && !state.sustainedIncome) {
    state.emaIncome = baseIncome(state);
    state.sustainedIncome = state.emaIncome;
  }

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
    // Bewertung läuft offline weiter (der 10-min-Schnitt konvergiert
    // gegen baseIncome; Hochwasserstände werden fortgeschrieben)
    advanceValuation(state, seconds);
    offline = { seconds, earned };
  }
  return { state, offline };
}

/** Harter Reset: löscht Run UND Meta (Exit-Perks). */
export function resetSave(): void {
  saveDisabled = true;
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(META_SAVE_KEY);
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
