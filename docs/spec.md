# IdleOps – v3

*(Arbeitstitel bis 10.07.2026: „IT Idle Clicker")*

Ein simples Incremental-/Klickerspiel im StartUp-/IT-Setting. Der Spieler gründet ein StartUp, hat zunächst nur sich selbst und einen Laptop und baut daraus ein Unternehmen auf. Zwei Schienen (Hardware und Angestellte) begrenzen sich gegenseitig, Reputation ist die Risiko-Ressource, Incidents sind der Gegenspieler.

Designziel: **möglichst simpel** – bewusst ohne Kaskade und Zweitressource; Prestige („Der Exit") ist als spätere Ausbaustufe skizziert (siehe „Später").

## Setting

Der Spieler ist Gründer eines StartUps. Er hat zunächst nur sich und einen Laptop und verdient Geld mit Freelance-Aufträgen (Klick-Mechanik). Das StartUp hat zu Beginn keine Reputation. Diese wird nach und nach aufgebaut, kann aber durch Incidents auch wieder abgebaut werden.

## Kernloop

```
Gewinn/s = min(Hardware-Kapazität, Angestellten-Output) × Motivation × Reputations-Faktor − Betriebskosten
```

- Das Ergebnis ist auf **≥ 0 geklemmt**: Geld kann nie sinken, nur langsamer wachsen. Kein Bankrott, kein Game Over – Rückschläge ja, Todesspirale nein.
- **min()**: Der Engpass zählt. Viele Angestellte bei wenig Hardware bringen genauso wenig wie viel Hardware mit wenig Angestellten. Die zentrale Spielerentscheidung ist immer: *Was ist gerade mein Engpass?*
- **Motivation** (0,5–1,5): Multiplikator aus Angestellten-Rängen und Perks.
- **Reputations-Faktor** (z. B. 0,8–1,2): Reputation wirkt leicht auf den Gewinn – hohe Reputation bringt Kunden.
- **Betriebskosten**: Hardware kostet laufend Geld (siehe Hardware).

Die UI zeigt jederzeit an, welcher Faktor der Engpass ist („Deine Server langweilen sich" / „Dein Team ist am Limit").

## Klick-Mechanik: zwei Phasen

Der Klick-Button wechselt mit dem Meilenstein Beschriftung **und Mechanik**:

- **Phase 1 – „Ticket bearbeiten"** (vor dem Meilenstein): Button-Mashing, +0,50 € pro Klick. Die ersten Käufe werden durch Klicken finanziert (erster Kauf nach ~15 Klicks, Genre-Standard). Erzählung: Der Gründer bootstrappt sein StartUp mit Freelance-Tickets.
- **Phase 2 – „Auftrag gewinnen"** (nach dem Meilenstein): Jeder Klick ist ein dicker Abschluss — **15 × Gewinn/s**, dafür **30 s Cooldown** (Button füllt sich sichtbar wieder). Weil der Wert mit dem Einkommen skaliert, bleibt der Klick dauerhaft relevant: Wer jeden Cooldown nutzt, holt bis zu +50 % — die Belohnung für aktives Spielen. Kein Mashing mehr nötig.

Weitere Aufgaben des Klicks:

1. **Incident-Behebung**: Incidents werden anfangs manuell per Klick behoben (siehe Incidents). Mit Upgrades wird das wegautomatisiert.
2. **Rettungsanker**: Selbst bei 0 € und Reputation am Boden kann der Gründer immer selbst klicken. Es gibt keinen unrettbaren Zustand.

**Meilenstein-Moment**: Wenn das passive Einkommen erstmals das Klick-Einkommen übersteigt → Feier-Event („Du hast dein letztes Ticket geschlossen — ab jetzt gewinnst du Aufträge!") und der Button wechselt in Phase 2.

## Reputation

Reputation ist die zweite zentrale Größe neben Geld – und die einzige, die **sinken** kann.

- **Aufbau**: Steigt langsam bei incident-freiem Betrieb (Rate skaliert mit Unternehmensgröße). Dauerhafte Perks geben einen kleinen permanenten Sockel.
- **Verlust**: Incidents ziehen Reputation ab – je schwerer der Incident, desto mehr.
- **Boden**: Reputation kann nicht unter 0 fallen.
- **Wirkung**:
  - Schaltet Angestellten-Ränge frei (Gate für die Progression).
  - Leichter Faktor auf den Gewinn (siehe Kernloop).
  - **Unterschreiten einer Rang-Schwelle**: Angestellte dieses Rangs streiken *nicht*, aber ihre Motivation sinkt stark („Die Leute schauen sich nach anderen Jobs um"). Neueinstellungen dieses Rangs sind erst wieder möglich, wenn die Schwelle erneut erreicht ist.

## Angestellte

Angestellte erhöhen den Angestellten-Output (linke Seite der min-Formel).

- Jeder Rang hat: **Output/s**, **Basis-Motivation** und **Basis-Incident-Risiko**.
- Niedrige Ränge: höheres Incident-Risiko, niedrigere Basis-Motivation. Hohe Ränge: umgekehrt.
- **Freischaltung**: Höhere Ränge werden bei Erreichen einer Reputations-Schwelle plus einmaliger Geldzahlung freigeschaltet („Employer Branding").
- **Einstellung**: Jede Einstellung kostet einmalig Geld, exponentiell steigend pro Rang (Faktor ~1,15 pro Kauf innerhalb eines Rangs).

Ränge:

1. Intern
2. Junior Software Developer
3. Senior Software Developer
4. Staff Software Developer
5. Principal Software Developer
6. 10x Engineer

### Motivation

Motivation ist ein **Multiplikator auf den Gewinn** (0,5–1,5) und senkt zusätzlich leicht das Incident-Risiko. Sie ergibt sich aus: Basis-Motivation der Ränge + dauerhafte Perks + temporäre Perks − Reputations-Malus (siehe Reputation).

## Hardware

Hardware bestimmt die Kapazität (rechte Seite der min-Formel). Der Spieler beginnt mit einem Laptop und kauft immer bessere Stufen.

- Jede Stufe hat: **Kapazität**, **Kaufpreis** (einmalig) und **Betriebskosten/s** (laufend).
- Betriebskosten werden in der Kernformel abgezogen, das Ergebnis ist auf ≥ 0 geklemmt – Hardware kann das Wachstum bremsen, aber nie Schulden erzeugen.
- **Überkapazität ist eine bewusste Strategie**: Wer mehr Hardware hat als das Team auslastet, zahlt drauf – profitiert aber beim viralen Spike (siehe unten).

Stufen:

1. Laptop (Start)
2. Raspberry Pi
3. Tower PC
4. VPS
5. Cluster
6. Datacenter
7. Cloud
8. Orbital Cloud

## Viraler Spike (Highlight-Mechanik)

Event: **„Viraler Post"** – der mögliche Output vervielfacht sich (z. B. ×20) für 60 Sekunden.

- Genug **Hardware-Reserve** über dem Team-Output → Geldregen.
- Zu wenig Reserve → „Hug of Death": Seite crasht, Chance verpasst, **Reputationsverlust**.

Das gibt der min-Formel strategische Tiefe: Es lohnt sich, nicht immer nur den Engpass zu kaufen, sondern Reserve vorzuhalten.

## Incidents

Incidents drosseln den Gewinn für eine gewisse Zeit und kosten – oft schwerwiegender – **Reputation**, die erst wieder aufgebaut werden muss.

- Basis-Incident-Wahrscheinlichkeit, beeinflusst von Hardware-Stufe, Angestellten-Rängen und Tech-Upgrades.
- Schwere Incidents sind seltener als leichte.
- **Behebung**: Anfangs manuell per Klick (mehrere Klicks je nach Schwere). Mit Tech-Upgrades (Runbooks, On-Call Rotation) werden Incidents automatisch behoben – der Übergang von manuell zu automatisiert erzählt die DevOps-Geschichte.
- **Ton skaliert mit der Spielphase**: anfangs bastelig („SD-Karte des Raspberry Pi korrupt"), später enterprisig, am Ende absurd.

Beispiele:

- **„Zertifikat abgelaufen"** – Gewinn/s halbiert, kleiner Reputationsverlust
- **„DNS."** – einfach nur „DNS." Alles steht. (Es ist immer DNS.)
- **„Config-Fehler"** – Gewinn/s −30 % für kurze Zeit
- **„Ein Engineer hat freitags deployed"** – 50 % Chance auf kaskadierendes Failure (zweiter Incident folgt sofort)
- **„Data Breach"** (selten, schwer) – großer Reputationsverlust
- **„Cloud-Anbieter erhöht Preise"** – Betriebskosten +20 % für x Minuten (entfällt, sobald der Spieler selbst Cloud-Stufe erreicht hat)
- **Katastrophen-Event** (selten): `sudo rm -rf /` – massiver Verlust, per Upgrade abwendbar

## Tech Upgrades

Tech Upgrades senken die Incident-Wahrscheinlichkeit und/oder beschleunigen die Behebung. Einige erhöhen die Motivation.

Beispiele:

- **CI/CD** – weniger Incidents
- **Unit-Tests / End-to-End-Tests** – weniger Incidents
- **YAML-Linter** – −30 % Incident-Wahrscheinlichkeit
- **Backups** – Katastrophen-Events halb so schlimm
- **High Availability** – Incidents drosseln statt stoppen
- **Observability-Stack** – Incidents werden schneller behoben
- **Runbooks** – leichte Incidents beheben sich automatisch
- **On-Call Rotation** – alle Incidents beheben sich automatisch (spät, teuer)
- **Caching** – „Es gibt nur zwei schwere Probleme in der Informatik…" (+Gewinn)
- **`sudo rm -rf /` verbieten** – einmalig, verhindert das Katastrophen-Event

## Dauerhafte Perks

Erhöhen die Motivation dauerhaft ein wenig und geben einen kleinen permanenten Reputations-Sockel.

Beispiele: Obstschale, Snacks, Kantine, Restaurant, Massage, No-Meeting-Mittwoch, TGIF-Parties

## Temporäre Perks

Erhöhen die Motivation vorübergehend relativ stark. Teuer, mit zeitlichem Cooldown.

Beispiele: Sommerfest, Offsite

## Balancing-Startwerte (MVP)

Per Simulation verifiziert (gieriger Spieler mit Spar-Logik; Sim-Skript: `tools/balance_sim.py`). Gemessene Pacing-Kurve:

| Meilenstein | mit Klicken (~2 Klicks/s) | reines Idle |
|---|---|---|
| Erster Kauf (Intern) | 0,3 min | 1,4 min |
| Passiv > Klick-Einkommen | 2,0 min | 5,9 min |
| Junior freigeschaltet | ~10 min | ~17 min |
| Senior freigeschaltet | ~30 min | ~37 min |
| Gewinn nach 60 min | ~400 €/s | ~200 €/s |

Keine Kauf-Flauten: In jedem 5-Minuten-Fenster gibt es Käufe; die Upgrades füllen die Wartezeiten vor den Reputations-Gates.

### Grundwerte

- **Klick Phase 1** („Ticket bearbeiten"): 0,50 € pro Klick
- **Klick Phase 2** („Auftrag gewinnen", ab Meilenstein): 15 × Gewinn/s pro Klick, 30 s Cooldown
- **Gründer**: fest angestellt, Output 0,3 €/s, Motivation 1,0, kein Incident-Risiko
- **Preiswachstum**: ×1,15 pro Kauf innerhalb einer Stufe (Hardware wie Angestellte)
- **Motivation** = Kopfzahl-gewichteter Schnitt der Basis-Motivation (inkl. Gründer) + Perk-Boni, gedeckelt bei 1,5
- **Reputations-Faktor** = 0,8 + 0,4 × Reputation/100

### Hardware

| Stufe | Kapazität | Kaufpreis (Basis) | Betriebskosten | Sichtbar ab |
|---|---|---|---|---|
| Laptop | 1,0 €/s | – (Start) | 0 | Start |
| Raspberry Pi | +1,0 €/s | 15 € | 0,02 €/s | Start |
| Tower PC | +8,0 €/s | 250 € | 0,20 €/s | Junior freigeschaltet |

Betriebskosten liegen bei ~2 % der Kapazität – Überkapazität (Spike-Reserve) ist bezahlbar, aber nicht gratis.

**Kapazitäts-Chunks passen zur Team-Ära**: Ein Pi deckt ~4–5 Interns, ein Tower ~5 Juniors. Große Kapazität wird erst sichtbar, wenn der Rang existiert, dessen Team sie füllen kann — sonst ist sie ein Trap-Kauf (Playtest-Erkenntnis: Tower PC in der Intern-Ära bräuchte ~19 weitere Interns, um sich zu lohnen).

### Angestellte

| Rang | Output | Einstellkosten (Basis) | Basis-Motivation | Rep-Schwelle | Freischaltung |
|---|---|---|---|---|---|
| Intern | 0,2 €/s | 20 € | 0,9 | – | – |
| Junior | 1,5 €/s | 300 € | 1,0 | 8 | 150 € |
| Senior | 8,0 €/s | 3.000 € | 1,1 | 25 | 1.500 € |

Amortisation steigt mit dem Rang (Intern 100 s → Junior 200 s → Senior ~375 s) – höhere Ränge sind pro € schwächer, bringen aber Motivation und weniger Incidents.

### Reputation

- Skala 0–100, Start 0
- Aufbau: +0,5/min Basis **+0,05/min pro Angestelltem** (incident-frei) – wächst mit der Firma, damit die Gates zum Ausbautempo passen
- Verlust: leichter Incident −2, schwerer Incident −10, Hug of Death −5

### Incidents

- Risikopunkte pro Kopf: Intern 3 / Junior 1 / Senior 0,3
- Wahrscheinlichkeit: 0,15 %/min × Risikopunkte, gedeckelt bei 8 %/min (≈ 1 Incident pro 12 min im Early-Mid-Game)
- **Leicht** (5× so häufig): Gewinn −50 % für 30 s oder 3 Klicks, −2 Reputation
- **Schwer**: Gewinn 0 für 60 s oder 10 Klicks, −10 Reputation

### Upgrades & Perks (MVP-Auswahl)

| Name | Preis | Effekt |
|---|---|---|
| Obstschale (Perk) | 300 € | +0,05 Motivation |
| CI/CD | 800 € | −25 % Incident-Wahrscheinlichkeit |
| Snacks (Perk) | 2.000 € | +0,05 Motivation |
| Caching | 5.000 € | +25 % Gewinn |
| Unit-Tests | 12.000 € | −25 % Incident-Wahrscheinlichkeit |

### Viraler Spike

- Chance auf Auslösung ca. alle 8–12 min
- Output-Potenzial ×20 für 60 s; Auszahlung = min(Kapazität, Output × 20)
- Kapazität < 1,2 × Output beim Start → **Hug of Death**: kein Bonus, −5 Reputation

### UI-Konsequenz aus der min()-Formel (wichtig!)

Ein Kapazitätskauf allein erhöht das Einkommen **nie** (mit Betriebskosten senkt er es sogar kurzzeitig). Die Kauf-UI muss deshalb den kombinierten Wert zeigen – z. B. „+0 €/s jetzt, +1,5 €/s mit dem nächsten Hire" – sonst wirken Hardware-Käufe kaputt. (In der Simulation führte das naive „kaufe nur, was sofort Einkommen bringt" zu einem kompletten Deadlock.)

Dasselbe gilt spiegelbildlich für Angestellte: Der Roh-Output eines Rangs (z. B. „0,2 €/s") ist **nicht** der Gewinn-Zuwachs – Motivation und Reputations-Faktor skalieren ihn herunter (bei Rep 0: 0,2 × ~0,95 × 0,8 ≈ 0,15 €/s), und bei voller Kapazität ist der Zuwachs 0. Die Kauf-UI zeigt deshalb immer den **effektiv vorberechneten Gewinn-Zuwachs** des Kaufs an, nicht den Rohwert.

## MVP-Umfang (erster Prototyp)

1. Geld-Anzeige + Gewinn/s mit Engpass-Hinweis (Hardware vs. Team)
2. Klick-Button („Freelance-Auftrag abarbeiten") inkl. Meilenstein „passives Einkommen > Klick-Einkommen"
3. 3 Hardware-Stufen (Laptop, Raspberry Pi, Tower PC) mit Kapazität + Betriebskosten
4. 2–3 Angestellten-Ränge (Intern, Junior, Senior) mit Output, Motivation, Incident-Risiko
5. Reputation: Aufbau über Zeit, Verlust durch Incidents, Rang-Freischaltung ab Schwelle
6. 2 Incident-Typen (leicht/schwer) mit Klick-Behebung
7. 3–4 Tech-Upgrades (davon 1× Auto-Behebung) + 2 dauerhafte Perks
8. Der virale Spike als Event
9. Speichern/Laden mit Offline-Progress

## Später (bewusst nicht im MVP)

- Weitere Hardware-Stufen (bis Orbital Cloud) und Ränge (bis 10x Engineer)
- Temporäre Perks
- Mehr Incident-Typen, Ton-Eskalation, Katastrophen-Event
- **Finanzierungsrunden** (Seed, Series A/B/C) als Mid-Game-Entscheidung: Kapitalspritze jetzt gegen dauerhaften Malus (Investoren-Druck → höheres Incident-Risiko oder höhere Reputations-Erwartungen). Keine Reset-Mechanik – ergänzt den Exit, konkurriert nicht mit ihm.
- Satirisches Endgame (der Spieler wird selbst Cloud-Provider)
- **Org-Kaskade** als Option, falls sich das Mid-Game flach anfühlt (siehe unten)
- Prestige-System **„Der Exit"** (siehe unten)

### Option: Org-Kaskade (nicht auf Vorrat einbauen!)

Falls die Progression nach ein paar Stunden Spielzeit flach wirkt, kann die Angestellten-Schiene zur Kaskade nach Swarm-Simulator-Vorbild werden – **die Org-Hierarchie als Produktionskette**. Wichtigste Designregel: **IC-Ränge und Kaskade nicht vermischen** – Karrieren kaskadieren nicht (ein Principal „produziert" keine Seniors), die Kaskade gehört in die Management-Schiene, denn dort ist sie real: Führungskräfte stellen ein.

**Vor der Kaskade** (Early Game, wie im MVP): IC-Ränge als klassische Generatoren – Intern, Junior, Senior.

**Der Umbau beim Kaskaden-Start**: Ab dem Moment „Ersten Team Lead befördern" gibt es nur noch *eine* Produktionseinheit – den **Developer**. Die IC-Ränge werden zu **globalen Seniority-Upgrades** auf Developer-Qualität (jede Stufe multipliziert den Output aller Developer und senkt das Incident-Risiko; Staff, Principal und 10x Engineer leben dort weiter – der 10x als Pointe: der einzige Nicht-Manager mit absurdem Multiplikator). Eine Einheit + Qualitäts-Upgrades statt paralleler Einheiten-Typen hält Code und min()-Balancing simpel (Swarm-Simulator-Muster: Einheiten + Mutationen).

**Die Kette** (bei fünf Management-Stufen deckeln – jede weitere potenziert die Zahlen):

1. **Developer** – produziert Output (Tier-1-Einheit)
2. **Team Lead** – rekrutiert Developer
3. **Engineering Manager** – rekrutiert Team Leads
4. **Director of Engineering** – rekrutiert EMs
5. **VP of Engineering** – rekrutiert Directors
6. **CTO** – rekrutiert VPs (satirischer Deckel: produziert außerdem nur noch Slide-Decks)

Satire inklusive: Je höher die Stufe, desto weiter weg von echter Arbeit – ganz oben produziert die Hierarchie nur noch Hierarchie.

**Einstiegszeitpunkt** (der k3s-Moment von v2): nach dem dritten IC-Rang – wenn Senior freigeschaltet ist und ~15 Angestellte manuell eingestellt wurden, nach ca. 30–60 Min. Spielzeit erscheint das teure Upgrade **„Ersten Team Lead befördern"**. Nicht früher: Der Spieler muss das manuelle Einstellen erst als mühsam *erlebt* haben, damit sich der erste Team Lead wie eine Erlösung anfühlt. Nicht später: Staff/Principal als reine Generatoren wären neben einer laufenden Kaskade sofort bedeutungslos (deshalb die Umdeutung zu Upgrades).

Weitere Punkte:

- **Fügt sich in die min()-Formel ein, statt sie zu ersetzen**: Die Kaskade beschleunigt nur die linke Seite (Angestellten-Output wächst exponentiell), Hardware bleibt lineare Kapazitätsgrenze und bremst. Rollenverteilung wie in v2: Kaskade = Wachstum, Hardware = Kapazität.
- Reputation und Incidents bleiben intakt: Reputations-Gates gelten für Management-Stufen; naheliegender neuer Incident: **„Reorg"**.
- **Eigener Twist ab Director** (v2-Regel: späte Stufen brauchen eigene Mechanik, sonst nur größere Zahlen): z. B. Director schaltet Budget-Verhandlungen frei, VP senkt Betriebskosten durch „Vendor-Deals".
- **Preis**: BigInt/break_infinity und polynomieller Offline-Progress kommen zurück, Balancing wird deutlich härter. Deshalb: erst einbauen, wenn der MVP gespielt wurde und das Mid-Game es wirklich braucht.

### Prestige-System: „Der Exit"

Reset mit permanenten Boni, erzählerisch als Unternehmensverkauf: Der Spieler verkauft sein StartUp und gründet ein neues – erfahrener, vernetzter, mit Kapital.

- **Exit-Wert** = Peak-Gewinn/s des Runs × **Reputations-Multiple**. Reputation bekommt damit einen zweiten, langfristigen Job: Sie bestimmt den Verkaufspreis. Ein Data Breach kurz vor dem Exit tut richtig weh.
- **Käufer skaliert mit der Unternehmensgröße** (Flavor): lokale Werbeagentur → Mittelständler → Big-Tech-Acquihire („wird sechs Monate später eingestampft") → IPO.
- **Erlös wird in wählbare Gründer-Perks investiert** (jeder Reset ist eine Entscheidung, kein flacher Multiplikator):
  - **Netzwerk** – dauerhafter Gewinn-Multiplikator
  - **Bekannter Name** – neues StartUp startet mit Sockel-Reputation
  - **Alte Kollegen** – Ränge schalten früher frei / Einstellungen billiger
  - **Gelernte Lektionen** – niedrigeres Incident-Risiko
  - **Angel-Kapital** – Startgeld im neuen Run

Jeder Perk verstärkt eine andere Mechanik des Grundspiels. Der Exit wird erst gebaut, wenn das Grundspiel durchgespielt und balanced ist – er tunt die Endphase, die muss erst existieren.

## Technische Umsetzung

- **Architektur**: Single-Page-App, Game-State als ein Objekt; TypeScript + SCSS
- **Game-Loop**: `requestAnimationFrame` mit Delta-Time (nicht nur `setInterval`)
- **Offline-Progress**: beim Laden `Date.now() - lastSave` verrechnen; Incidents feuern offline nicht (sanftes Design), Reputation steigt offline gedeckelt
- **Speichern**: JSON in `localStorage`, Auto-Save-Intervall
- **Zahlen**: normale `number` reichen (keine Kaskade → kein BigInt/break_infinity nötig); Anzeige mit Suffixen (k, M, B, …)
- **UI**: Höhere Ränge, Hardware-Stufen und Perks erst anzeigen, wenn (fast) erreichbar – progressive disclosure
