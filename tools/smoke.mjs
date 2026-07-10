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
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
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

// 3) Auslastungs-Anzeige (Team sollte anfangs der Engpass sein: 100 %)
console.log('Auslastung Team:', await page.textContent('#util-team-pct'), '| HW:', await page.textContent('#util-hw-pct'));

// 3b) Progressive disclosure: Junior/Senior/Tower/Upgrades anfangs versteckt?
const visibleTeamRows = await page.locator('#team-list .item:visible').count();
const visibleHwRows = await page.locator('#hw-list .item:visible').count();
const visibleUpgrades = await page.locator('#upgrade-list .item:visible').count();
const incidentBannerVisible = await page.locator('#event-banner').isVisible();
console.log(`Sichtbar: Team ${visibleTeamRows} (soll 1), HW ${visibleHwRows} (soll 1), Upgrades ${visibleUpgrades} (soll 0), Incident-Banner ${incidentBannerVisible} (soll false)`);

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

console.log('Fehler auf der Seite:', errors.length ? errors : 'keine');

await browser.close();
server.close();
