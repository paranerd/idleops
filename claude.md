# IdleOps – Klickerspiel

Incremental-/Idle-Game im StartUp-/IT-Setting: Gründer + Laptop → Unternehmen. Aktueller Stand: **spielbarer MVP** (Design-Iteration v3), wird per Playtests iteriert. Das Projekt lebt direkt im Wurzelverzeichnis; v1/v2 sind gelöscht.

## Orientierung

- **Quelle der Wahrheit:** `docs/spec.md` — Design, Kernformel, Balancing-Tabellen, Ausbauplan („Später": Exit-Prestige, Finanzierungsrunden, Org-Kaskade)
- **Stack:** Vite + TypeScript (strict) + SCSS, kein Framework. Architektur in `README.md`
- **Balancing:** Alle Werte leben in `src/config.ts` (1:1 zu den Spec-Tabellen). Änderungen vorher mit `python3 tools/balance_sim.py` gegenrechnen
- **Tests:** `npm test` (Vitest, Engine-Formeln) · Browser-Smoke-Test: `npm run smoke` (nach `npm run build`; ggf. `CHROMIUM_PATH` setzen)

## Leitplanken

- Möglichst **simpel**, in Code und Gameplay
- Kern-Formel: `Gewinn/s = min(Hardware-Kapazität, Team-Output) × Motivation × Reputations-Faktor − Betriebskosten`, geklemmt auf ≥ 0 (kein Bankrott)
- Keine Kaskade / kein BigInt einbauen, ohne zu fragen (bewusste Entscheidung, siehe Spec)
- Kauf-UI zeigt immer den effektiv vorberechneten Gewinn-Zuwachs, nie Rohwerte (min()-Falle)
- localStorage-Key des Spielstands nicht umbenennen (löscht sonst Spielstände)
