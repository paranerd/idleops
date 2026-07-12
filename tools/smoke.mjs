// Smoke-Test: startet einen statischen Server für dist/, klickt, kauft, screenshottet.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const DIST = new URL('../dist', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = createServer((req, res) => {
  let path = join(DIST, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!existsSync(path)) path = join(DIST, 'index.html');
  res.setHeader('Content-Type', MIME[extname(path)] ?? 'application/octet-stream');
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(4173, r));

// CHROMIUM_PATH setzen, falls der Playwright-Standard-Browser nicht installiert ist
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
let page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto('http://localhost:4173/');
await page.waitForTimeout(500);

// 1) Anfangszustand
const money0 = await page.textContent('#money');
console.log('Start-Geld:', money0);

// 2) 30× klicken -> 15 €
for (let i = 0; i < 30; i += 1) await page.click('#click-btn');
await page.waitForTimeout(300);
const money1 = await page.textContent('#money');
console.log('Nach 30 Klicks:', money1);

// 3) Hardware-Auslastung (anfangs ist das Team der Engpass => HW deutlich unter 100 %)
console.log('Auslastung HW:', await page.textContent('#util-hw-pct'));

// 3b) Progressive disclosure: Junior/Senior/Tower/Upgrades anfangs versteckt?
const visibleTeamRows = await page.locator('#team-list .item:visible').count();
const visibleHwRows = await page.locator('#hw-list .item:visible').count();
const visibleUpgrades = await page.locator('#upgrade-list .item:visible').count();
const incidentBannerVisible = await page.locator('#event-banner').isVisible();
// Team 2: Intern (freigeschaltet) + Junior als nächstes Ziel ("🔒 ab Rating CC")
console.log(`Sichtbar: Team ${visibleTeamRows} (soll 2: Intern + nächstes Ziel Junior), HW ${visibleHwRows} (soll 1), Upgrades ${visibleUpgrades} (soll 0), Incident-Banner ${incidentBannerVisible} (soll false)`);
console.log('Junior-Ziel-Bedingung:', (await page.locator('#team-list .item', { hasText: 'Junior' }).locator('.item__meta').textContent().catch(() => '—'))?.trim());

// 4) Ersten Intern einstellen (20 €) — erst genug klicken
for (let i = 0; i < 15; i += 1) await page.click('#click-btn');
await page.waitForTimeout(200);
const hireBtn = page.locator('#team-list .item:first-child .btn--buy');
console.log('Intern-Button:', await hireBtn.textContent(), '| disabled:', await hireBtn.isDisabled());
await hireBtn.click();
await page.waitForTimeout(200);
console.log('Team nach Kauf:', await page.textContent('#team-list .item:first-child .item__title'));

// 5) Raspberry Pi kaufen (kombinierte Wertanzeige checken)
for (let i = 0; i < 50; i += 1) await page.click('#click-btn');
await page.waitForTimeout(200);
console.log('Pi-Meta:', await page.textContent('#hw-list .item:first-child .item__meta'));
await page.click('#hw-list .item:first-child .btn--buy');
await page.waitForTimeout(200);
console.log('Pi-Anzahl:', await page.textContent('#hw-list .item:first-child .item__title'));

// 5b) Kauf-Fortschritt: disabled Buttons haben --afford > 0
const piBtn = page.locator('#hw-list .item:first-child .btn--buy');
if (await piBtn.isDisabled()) {
  const afford = await piBtn.evaluate((el) => el.style.getPropertyValue('--afford'));
  console.log('Kauf-Fortschritt Pi (--afford):', afford);
}

// 6) Läuft die Zeit? (passives Einkommen)
const before = await page.textContent('#money');
await page.waitForTimeout(3000);
const after = await page.textContent('#money');
console.log('Passiv (3 s):', before, '->', after);

// 7) Save/Reload: bleibt der Fortschritt erhalten?
await page.reload();
await page.waitForTimeout(500);
console.log('Nach Reload — Team:', await page.textContent('#team-list .item:first-child .item__title'));

// 8) Reputation-Popover: öffnen, Rate prüfen, Outside-Click schließt
await page.click('#rep-info-btn');
const popoverVisible = await page.locator('#rep-popover').isVisible();
const repRate = await page.textContent('#rep-rate');
await page.click('body', { position: { x: 10, y: 400 } });
const popoverClosed = !(await page.locator('#rep-popover').isVisible());
console.log(`Popover: sichtbar ${popoverVisible} (soll true), Rate "${repRate}", Outside-Click schließt ${popoverClosed} (soll true)`);
await page.click('#rep-info-btn'); // fürs Screenshot-Foto wieder öffnen
await page.waitForTimeout(200);

await page.screenshot({ path: 'screenshot.png', fullPage: true });

// 9) "Neues Spiel": Doppelklick-Reset muss den Spielstand wirklich löschen
await page.keyboard.press('Escape'); // Popover schließen, es überlappt den Footer
await page.click('#reset-btn');
await page.click('#reset-btn'); // Bestätigung
await page.waitForLoadState('load');
await page.waitForTimeout(500);
const moneyReset = await page.textContent('#money');
const teamReset = (await page.textContent('#team-list .item:first-child .item__count')).trim();
console.log(`Nach Reset — Geld: ${moneyReset} (soll ~0 €), Intern-Anzahl: "${teamReset}" (soll leer)`);

// ============================================================================
// 10) Endgame-Smoke: Bewertung, Finanzierung, Exit, Perks.
// Wir injizieren einen fortgeschrittenen Spielstand per addInitScript in einen
// FRISCHEN Context (sonst überschreibt der beforeunload-Autosave der schon
// geladenen Seite die Injektion). So sieht die App den Stand beim ersten Laden.
// ============================================================================
console.log('\n=== Endgame ===');
const endSave = {
  money: 2_000_000, rep: 60,
  hw: { laptop: 1, pi: 5, tower: 10 },
  emp: { intern: 5, junior: 10, senior: 8 },
  unlockedRanks: { intern: true, junior: true, senior: true },
  upgrades: [], trainings: ['networking', 'aws-cert'],
  incident: null, spikeRemaining: 0, clickCooldown: 0,
  milestoneReached: true, pmfReached: true,
  emaIncome: 300, sustainedIncome: 300,
  valuationHighWater: 2_000_000, rounds: [], selfUnlocked: [],
  founderShare: 1, perks: {}, exitsBefore: 0,
  revealed: [], stats: { clicks: 0, totalEarned: 5_000_000, incidents: 0, spikes: 0 },
  lastSave: Date.now(),
};
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctx.addInitScript((save) => {
  localStorage.setItem('it-idle-clicker-v3', JSON.stringify(save));
}, endSave);
const page2 = await ctx.newPage();
page2.on('pageerror', (e) => errors.push(String(e)));
page2.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page2.goto('http://localhost:4173/');
await page2.waitForTimeout(600);
page = page2; // ab hier im Endgame-Context weiterarbeiten

// Bewertungs-Anzeige + Rating im Header (kein "Seed ab 1M" mehr im Header)
const valVisible = await page.locator('#valuation-stat').isVisible();
console.log('Bewertungs-Stat sichtbar:', valVisible, '| Wert:', (await page.textContent('#valuation')).trim());
console.log('Header-Label (soll nur "Bewertung"):', (await page.textContent('.stat--valuation .stat__label')).replace(/\s+/g, ' ').trim());
console.log('Header-Rating (Rep 60 → soll BBB):', (await page.textContent('#rep-rating')).trim());
console.log('Funding-Badge sichtbar (Seed-Angebot liegt vor):', await page.locator('#funding-badge').isVisible());

// Nächster gesperrter Rang immer sichtbar (Staff ist round-gated): mit Bedingung?
const staffRow = page.locator('#team-list .item', { hasText: 'Staff' });
console.log('Staff-Zeile sichtbar:', await staffRow.isVisible().catch(() => false),
            '| Bedingung:', (await staffRow.locator('.item__meta').textContent().catch(() => '—'))?.trim());

// Bewertungs-Popover = Investor-Hub: Fortschrittsbalken + Term Sheet + Finanzierung
await page.click('#valuation-info-btn');
await page.waitForTimeout(150);
console.log('Fortschritt zur nächsten Runde (im Popover):', (await page.textContent('#next-round-label')).replace(/\s+/g, ' ').trim(),
            '| Balken:', await page.locator('#next-round-fill').evaluate((el) => el.style.width));
console.log('Term Sheet — Ertragskraft:', (await page.textContent('#ts-ertrag')).trim(),
            '| Multiple:', (await page.textContent('#ts-mult')).trim(),
            '| Bewertung:', (await page.textContent('#ts-total')).trim(),
            '| Erlös:', (await page.textContent('#ts-proceeds')).trim());
const fundVisible = await page.locator('#funding-block').isVisible();
const seedMeta = (await page.textContent('#funding-list .fund-item:first-child .fund-item__meta')).trim();
console.log('Finanzierungs-Block im Popover:', fundVisible, '| Seed:', seedMeta);
await page.screenshot({ path: 'screenshot-hub.png' });

// Seed annehmen (Accept-Button in der ersten Fund-Zeile) -> Cash rein, VPS frei
await page.click('#funding-list .fund-item:first-child .fund-item__actions .btn--buy');
await page.waitForTimeout(300);
const moneyAfterSeed = (await page.textContent('#money')).trim();
console.log('Nach Seed — Geld:', moneyAfterSeed);
const vpsVisible = await page.locator('#hw-list .item', { hasText: 'VPS' }).isVisible().catch(() => false);
console.log('VPS-Stufe nach Seed sichtbar:', vpsVisible);

// Verkaufen: EIN Klick öffnet direkt das Perk-Overlay (keine Vorab-Bestätigung mehr)
await page.click('#sell-btn');
await page.waitForTimeout(300);
console.log('Perk-Overlay nach Verkauf sichtbar:', await page.locator('#exit-overlay').isVisible(),
            '| Verkauft:', (await page.textContent('#sold-info')).trim(),
            '| Bank:', (await page.textContent('#perk-bank')).trim());
const perkRows = await page.locator('#perk-list-decke .item, #perk-list-tempo .item').count();
console.log('Perk-Zeilen:', perkRows, '(soll 6)');

// Punkt 1: "Doch nicht verkaufen" nimmt den Verkauf zurück (Overlay weg, Run läuft weiter)
await page.click('#exit-cancel-btn');
await page.waitForTimeout(200);
const overlayAfterCancel = await page.locator('#exit-overlay').isVisible();
const moneyAfterCancel = (await page.textContent('#money')).trim();
console.log('Nach "Doch nicht": Overlay sichtbar:', overlayAfterCancel, '(soll false)',
            '| Geld unverändert:', moneyAfterCancel, `(war ${moneyAfterSeed})`);

// Erneut verkaufen für den Perk-Screenshot + Abschluss-Check
await page.click('#valuation-info-btn');
await page.waitForTimeout(120);
await page.click('#sell-btn');
await page.waitForTimeout(250);
const netzwerkBtn = page.locator('#perk-btn-netzwerk');
console.log('Netzwerk-Button:', (await netzwerkBtn.textContent()).trim(), '| disabled:', await netzwerkBtn.isDisabled());
const newRunBtn = page.locator('#new-run-btn');
const cancelBtn = page.locator('#exit-cancel-btn');
console.log('Abschluss-Aktionen sichtbar — Neu gründen:', await newRunBtn.isVisible(), `(${(await newRunBtn.textContent()).trim()})`,
            '| Doch nicht:', await cancelBtn.isVisible());

await page.screenshot({ path: 'screenshot-perks.png' });
console.log('Endgame-Fehler:', errors.length ? errors : 'keine');

console.log('\nFehler auf der Seite:', errors.length ? errors : 'keine');

await browser.close();
server.close();
