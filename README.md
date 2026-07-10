# IdleOps

Incremental-/Klickerspiel im StartUp-/IT-Setting — DevOps trifft Idle Game.

**▶ Spielen:** https://paranerd.github.io/idleops/

Spec: `docs/spec.md`, Balancing-Simulation: `tools/balance_sim.py`.

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server mit Hot Reload
npm test         # Engine-Tests (Vitest)
npm run build    # Produktions-Build nach dist/ (inkl. Type-Check)
npm run preview  # Build lokal ansehen
npm run smoke    # Browser-Smoke-Test gegen dist/ (nach build; ggf. CHROMIUM_PATH setzen)
```

Stack: Vite + TypeScript (strict) + SCSS, kein Framework.

## Architektur

Game-State ist **ein Objekt** (`src/state.ts`). Die Spiellogik besteht aus puren
Funktionen darüber (`src/engine.ts`) — dieselben Formeln wie in `balance_sim.py`,
per Vitest getestet. Zufall (Incidents, Spike) liegt separat in `src/events.ts`.

```
docs/spec.md           # Design-Spec — Quelle der Wahrheit
tools/balance_sim.py   # Pacing-Simulation (vor Balancing-Änderungen laufen lassen)
tools/smoke.mjs        # Playwright-Smoke-Test (npm run smoke)
src/
├── config.ts          # ALLE Balancing-Werte (Daten, kein Code) — Quelle: docs/spec.md
├── state.ts           # GameState-Typ + Startzustand
├── engine.ts          # pure Funktionen: capacity, output, motivation, income, Käufe
├── events.ts          # Incidents + viraler Spike (Zufall)
├── tick.ts            # advance(state, dt) + rAF-Loop mit Delta-Time
├── save.ts            # localStorage, Auto-Save, Offline-Progress
├── engine.test.ts     # Formel-Tests gegen die Spec-Werte
└── ui/
    ├── render.ts      # DOM-Aufbau + Frame-Updates, Auslastungs-Anzeige
    └── format.ts      # Zahlenformatierung (k, M, B)
```

Kern-Formel (aus der Spec):

```
Gewinn/s = min(Hardware-Kapazität, Team-Output) × Motivation × Reputations-Faktor − Betriebskosten
```

geklemmt auf ≥ 0 — kein Bankrott, kein Game Over.

## Deployment

Jeder Push auf `main` baut das Spiel (inkl. Tests) und veröffentlicht `dist/`
automatisch auf GitHub Pages — Workflow: `.github/workflows/deploy.yml`.
Einmalig nötig: Repo-Settings → Pages → Source auf **„GitHub Actions"** stellen.
Dank `base: './'` in `vite.config.ts` funktioniert der Build unter
`/idleops/` ohne weitere Anpassung.

## Balancing ändern

Alle Zahlen leben in `src/config.ts` und entsprechen 1:1 den Tabellen in
`docs/spec.md`. Änderungen vorab mit `python3 tools/balance_sim.py` gegenrechnen
(Pacing-Ziele: erster Kauf < 30 s, Meilenstein 2–6 min, Junior ~10 min,
Senior ~30 min).
