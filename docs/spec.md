# IdleOps – v3

*(Arbeitstitel bis 10.07.2026: „IT Idle Clicker")*

Ein simples Incremental-/Klickerspiel im StartUp-/IT-Setting. Der Spieler gründet ein StartUp, hat zunächst nur sich selbst und einen Laptop und baut daraus ein Unternehmen auf. Zwei Schienen (Hardware und Angestellte) begrenzen sich gegenseitig, Reputation ist die Risiko-Ressource, Incidents sind der Gegenspieler.

Designziel: **möglichst simpel** – bewusst ohne Kaskade und Zweitressource; Prestige („Der Exit") ist als spätere Ausbaustufe skizziert (siehe „Später").

## Setting

Der Spieler ist Gründer eines StartUps. Er hat zunächst nur sich und einen Laptop und verdient Geld mit Freelance-Aufträgen (Klick-Mechanik). Das StartUp hat zu Beginn keine Reputation. Diese wird nach und nach aufgebaut, kann aber durch Incidents auch wieder abgebaut werden.

Das Fernziel des Spiels ist die **Unicorn-Bewertung: 1 Mrd Unternehmenswert**. Sie ist bewusst nicht in einem einzigen Durchlauf erreichbar, sondern über mehrere Gründungen hinweg (siehe „Bewertung & Meilensteine: der Weg zum Unicorn“ und „Der Exit“ unter „Später“).

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

Multiplikator und Cooldown von Phase 2 sind nicht statisch: Sie sind über **Gründer-Schulungen** ausbaubar (siehe nächster Abschnitt).

## Gründer-Schulungen

Der Gründer ist im Gameplay der Klick — Schulungen und Zertifikate sind seine **Progression innerhalb eines Runs**. Sie verbessern ausschließlich die Klick-Mechanik, nicht die min()-Formel: Damit bleibt aktives Spielen dauerhaft attraktiv, die Erzählfigur Gründer bleibt präsent, und es entsteht keine Überschneidung mit Tech-Upgrades (Incidents) oder Perks (Motivation).

- **Einmalkäufe für Geld**, eigener kleiner „Gründer"-Bereich in der UI; sichtbar ab Phase 2 (progressive disclosure). Die **nächste offene Schulung ist immer sichtbar** — der Spieler soll wissen, worauf er spart; weitere erscheinen erst, wenn sie fast leistbar sind.
- **Der Effekt passt immer zum Thema der Schulung**:
  - *Fach-Zertifikate* qualifizieren für größere Aufträge → **Klick-Multiplikator ↑** (z. B. AWS-Zertifikat: Enterprise-Kunden vergeben dickere Aufträge)
  - *Netzwerk-/Prozess-Schulungen* bringen schneller den nächsten Auftrag → **Cooldown ↓** (z. B. Networking-Seminar: man kennt sich)
  - *Incident-Trainings* stärken die Feuerwehr-Rolle des Klicks → Behebungs-Klicks zählen doppelt
- **Abgrenzung zu den Exit-Perks** (siehe „Später"): Schulungen sind, was der Gründer *in diesem Run* lernt (gehen beim Exit verloren); Exit-Perks sind, wer er *über Runs hinweg* geworden ist. Deshalb fassen Schulungen nur den Klick an, Exit-Perks das Grundspiel.
- **Balancing-Leitplanke**: Voll ausgebaut darf der Klick höchstens ~+100 % Einkommensäquivalent bringen (Multiplikator ÷ Cooldown ≤ 1,0 × Gewinn/s), sonst fühlt sich Idle-Spielen bestraft an. Startwert ist +50 % (15× / 30 s), voll ausgebaut +95 % (21× / 22 s).
- Der satirische Ton bleibt: Der teuerste Eintrag ist der MBA („teuer, Effekt fragwürdig").

## Reputation (angezeigt als Rating C…AAA)

Reputation ist die zweite zentrale Größe neben Geld – und die einzige, die **sinken** kann. Intern läuft sie weiter auf einer 0–100-Skala; **angezeigt** wird sie aber als Kredit-Rating (Entscheidung 12.07.2026): der Header zeigt „AA", die genaue Zahl steht im Popover. Neun Stufen, so gelegt, dass die Rang-Schwellen sauber auf Ratings fallen — Junior (8) → CC, Senior (25) → CCC, Staff (40) → B, Principal (60) → BBB, 10x (80) → A, Spitze AAA ab 93. Das fühlt sich wie ein echtes Firmen-Rating an und macht Unlock-Hinweise lesbar („🔒 ab Rating CCC"). Werte in `config.ts` (`REP_RATINGS`), Label in `ui/format.ts` (`ratingLabel`).

- **Aufbau** (`repPerMinute`): Steigt bei incident-freiem Betrieb. Der Angestellten-Beitrag ist **pro Rang gestaffelt** (`rank.repGain`, Entscheidung 12.07.2026) — ein Senior/Principal hebt die Marke stärker als ein Intern (real erhöht ein erfahrener Hire die Firmen-Reputation mehr). Die Summe ist gedeckelt (`REP_EMP_RATE_CAP = 2,5/min`), und der Aufbau ist **logistisch** zäh (× (1 − Rep/105)): früh (Rating C/CC) kaum spürbar, die letzten Stufen bis AAA sind echte Arbeit. Dauerhafte Perks/„Bekannter Name" geben einen Sockel. Per `balance_sim.py` + `endgame_sim.py` gegengerechnet: Early-Gates unverändert (Junior ~10 min, Senior ~23–31 min).
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

**Anzeige-Konvention**: Im Spiel wird Geld als neutrale Münze dargestellt („🪙 100" statt „100 €") — global verständlich, ohne reale Währungsassoziationen. Die Münze markiert **Bestände und Preise**; Raten stehen ohne Münze („+0,24/s"), dort ist der Kontext klar. Die €-Werte in dieser Spec sind interne Recheneinheiten.

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

### Gründer-Schulungen

Per Simulation gegengerechnet (Sim um Phase-2-Klicks erweitert; aktiver Spieler nutzt jeden Cooldown): Kaufzeitpunkte verteilen sich über ~14–50 min und füllen die Wartezeiten vor den Reputations-Gates mit; voll ausgebaut liegt der Klick-Bonus bei +95 % Einkommensäquivalent (Cap: +100 %).

| Schulung | Preis | Effekt | Thema |
|---|---|---|---|
| Networking-Seminar | 500 € | Cooldown 30 s → 26 s | Man kennt sich – der nächste Auftrag kommt schneller |
| AWS-Zertifikat | 1.200 € | Multiplikator 15× → 17× | Qualifiziert für dicke Enterprise-Aufträge |
| Incident-Response-Training | 2.500 € | Incident-Behebungs-Klicks zählen doppelt | Der Gründer als geübte Feuerwehr |
| Scrum-Master-Zertifikat (2-Tages-Kurs) | 4.000 € | Cooldown 26 s → 23 s | Schneller geliefert, schneller der nächste Auftrag |
| Verhandlungstraining | 8.000 € | Multiplikator 17× → 20× | Höhere Abschlüsse rausverhandeln |
| MBA | 50.000 € | +1× und −1 s | Teuer, Effekt fragwürdig |

**UI der Schulungen** (Entscheidung 10.07.2026): Sichtbar in der Zeile ist der direkte Impact als exakter Rohwert relativ zum aktuellen Stand („×15 → ×17", „30 s → 26 s"). Das ist eine bewusste Ausnahme von der Nie-Rohwerte-Regel: Schulungs-Boni sind additiv und immer exakt wahr — anders als bei min()-Käufen kann der Rohwert hier nicht in die Irre führen. Flavor-Text, Effekt-Details und der effektive Zuwachs („+X €/s bei aktivem Spielen") stehen im (i)-Popover der Zeile.

### Viraler Spike

- Chance auf Auslösung ca. alle 8–12 min
- Output-Potenzial ×20 für 60 s; Auszahlung = min(Kapazität, Output × 20)
- Kapazität < 1,2 × Output beim Start → **Hug of Death**: kein Bonus, −5 Reputation

### UI-Konsequenz aus der min()-Formel (wichtig!)

Ein Kapazitätskauf allein erhöht das Einkommen **nie** (mit Betriebskosten senkt er es sogar kurzzeitig). Die Kauf-UI muss deshalb den kombinierten Wert zeigen – z. B. „+0 €/s jetzt, +1,5 €/s mit dem nächsten Hire" – sonst wirken Hardware-Käufe kaputt. (In der Simulation führte das naive „kaufe nur, was sofort Einkommen bringt" zu einem kompletten Deadlock.)

Dasselbe gilt spiegelbildlich für Angestellte: Der Roh-Output eines Rangs (z. B. „0,2 €/s") ist **nicht** der Gewinn-Zuwachs – Motivation und Reputations-Faktor skalieren ihn herunter (bei Rep 0: 0,2 × ~0,95 × 0,8 ≈ 0,15 €/s), und bei voller Kapazität ist der Zuwachs 0. Die Kauf-UI zeigt deshalb immer den **effektiv vorberechneten Gewinn-Zuwachs** des Kaufs an, nicht den Rohwert. (Einzige Ausnahme: Gründer-Schulungen — deren Boni sind additiv und immer exakt, siehe dort.)

**Kompakte Kauf-Zeilen mit (i)-Popover** (Entscheidung 10.07.2026): Jede Kauf-Zeile (Team, Hardware, Upgrades, Schulungen) zeigt nur Icon, Titel, eine Impact-Zeile und den Kauf-Button. Alle Details — Rohwerte, Flavor-Text, Erklärungen — leben in einem (i)-Popover pro Zeile (statt nativer Tooltips, die auf Touch-Geräten nicht funktionieren). Es ist höchstens ein Item-Popover gleichzeitig offen; Klick außerhalb und Escape schließen.

**Engpass-Anzeige** (Entscheidung 11.07.2026): Nur die Hardware-Auslastung hat eine Balken-Anzeige — die Team-Bar ist entfernt (redundant: Es ist immer genau eine Seite der Engpass, und das „mehr einstellen"-Signal tragen die grünen Hire-Zuwächse in der Team-Liste). Der Hardware-Balken ist eine Dreistufen-Ampel: neutral → **Gold** ab Auslastung ≥ 1/1,2 (~83 %, keine Spike-Reserve mehr, Hug-of-Death-Risiko) → **Rot pulsierend** bei 100 % (Engpass, Team-Output verpufft). Kein „Engpass"-Text mehr am Balken. Im Gewinn-Popover wird nur der schlechte Zustand markiert: Deckelt die Hardware (Output verpufft), färbt sich die Kapazitäts-Zeile **rot** — Team-Engpass ist der gesunde Normalzustand und bleibt unmarkiert. Der Popover-Hinweis ist actionable und dynamisch statt mechanik-erklärend: „Du könntest mehr verdienen, wenn du deine Hardware ausbaust" bzw. „…wenn du mehr Leute einstellst". Hardware-Meta bei fehlendem Sofort-Zuwachs kurz: „Reserve +1,00/s".

**Vorzeichen-Konvention für Geldbeträge** (Entscheidung 11.07.2026): „+🪙 …" in Geld-Grün bedeutet immer *Geld kommt rein* (Klick-Button, Gewinn-Zuwachs-Metas, Klick-Float, Gewinn/s). Beträge auf Kauf-Buttons stehen ohne Vorzeichen, ohne Plus-Icon und in neutraler Farbe — ein Klick darauf *kostet*. Schloss (Freischaltung) und Haken (gekauft) bleiben als Status-Icons erhalten.

## MVP-Umfang (erster Prototyp)

1. Geld-Anzeige + Gewinn/s mit Engpass-Hinweis (Hardware vs. Team)
2. Klick-Button („Freelance-Auftrag abarbeiten") inkl. Meilenstein „passives Einkommen > Klick-Einkommen"
3. 3 Hardware-Stufen (Laptop, Raspberry Pi, Tower PC) mit Kapazität + Betriebskosten
4. 2–3 Angestellten-Ränge (Intern, Junior, Senior) mit Output, Motivation, Incident-Risiko
5. Reputation: Aufbau über Zeit, Verlust durch Incidents, Rang-Freischaltung ab Schwelle
6. 2 Incident-Typen (leicht/schwer) mit Klick-Behebung
7. 3–4 Tech-Upgrades (davon 1× Auto-Behebung) + 2 dauerhafte Perks
8. Gründer-Schulungen (6 Stück, Klick-Progression) — *Ergänzung 10.07.2026*
9. Der virale Spike als Event
10. Speichern/Laden mit Offline-Progress

## Später (bewusst nicht im MVP)

- Weitere Hardware-Stufen (bis Orbital Cloud) und Ränge (bis 10x Engineer)
- Temporäre Perks
- Mehr Incident-Typen, Ton-Eskalation, Katastrophen-Event
- **Bewertung & Meilensteine: der Weg zum Unicorn** (siehe unten) – Unternehmens-Bewertung als Langzeit-Fortschrittsanzeige, Finanzierungsrunden (Seed, Series A/B/C) als Meilenstein-Angebote mit Cash, Unlock und Hürde. Keine Reset-Mechanik – ergänzt den Exit, konkurriert nicht mit ihm.
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

### Bewertung & Meilensteine: der Weg zum Unicorn

*(Umgesetzt 12.07.2026: config.ts/state.ts/engine.ts/tick.ts/events.ts/save.ts/main.ts/render.ts, Tests in `valuation.test.ts`, Balancing in `tools/endgame_sim.py`. Kalibrierung mit paranerd entschieden; Zahlen ab Run 1 per Sim gegengerechnet.)*

Kalibrierung (entschieden):

- Gesamtspielzeit bis zum Unicorn: **~25–40 h** für einen aktiven Spieler, über **4–6 Exit-Runs** – jeder Run erreicht grob das 2,5–3-Fache der Bewertungs-Decke des vorherigen
- Die Bewertung ist **live sichtbar ab dem Meilenstein Produkt-Markt-Fit** (progressive disclosure): eigener Header-Stat neben Cash (Münze + Wert + Fortschritt „· Series A ab 10 M" + (i)), im selben Stil wie Cash und Rating.
- **Meilenstein-Mix**: Erzähl-Meilensteine feuern automatisch (Feier + Unlock), Finanzierungsrunden sind echte Angebote (annehmen = Cash + Hürde, ablehnen bleibt spielbar)
- **UI: der „Investor-Hub" (Entscheidung 12.07.2026)**: Es gibt **kein eigenes Finanzierungs-Panel** mehr. Das (i)-Popover neben der Bewertung ist der komplette Investor-Bereich — Term Sheet (Aufschlüsselung inkl. × Dein Anteil = Verkaufserlös), der **Verkaufen-Button** (zwei-Klick-Bestätigung, weil endgültig) und die **Finanzierungsrunden** (kompakte Zeilen mit „annehmen" und „aus eigener Tasche"). Ein pulsierendes **Badge** am (i) signalisiert ein wartendes Term Sheet; zusätzlich ein Toast. Nach dem Verkauf öffnet ein Overlay den Perk-Shop; dessen „Neu gründen"-Aktion klebt **sticky** unten und ist immer erreichbar — auch wenn kein Perk leistbar ist (dann „Ohne Kauf neu gründen", der Erlös bleibt in der Bank).
- **UI: nächster Unlock immer sichtbar (Entscheidung 12.07.2026)**: In Team und Hardware ist die jeweils nächste noch gesperrte Stufe stets sichtbar — mit Bedingung („🔒 ab Rating CCC" bzw. „🔒 ab 💼 Series A"), damit man weiß, worauf man hinarbeitet. Runden-gesperrte Hardware-Ären erscheinen erst ab Produkt-Markt-Fit (vorher wäre „ab Seed" in Minute 1 verfrüht).

**Leitidee**: Die Funding-Leiter ist gleichzeitig Meilenstein-Kette, Fortschrittsmaß pro Run und die harte Grenze gegen das „Unicorn in einem Rutsch“. Die späten Hardware-**und Rang**-Ären sind hinter Finanzierungsrunden gegated, die Bewertungs-Schwellen wachsen pro Sprosse um ×7–10, und die Endgame-Käufe haben ein **steileres Preiswachstum** (×1,20–1,35 statt ×1,15), sodass eine Ära einen Run trägt statt durchzurauschen. Run 1 endet dadurch von selbst um Series A; jeder weitere Run schafft mit Exit-Perks ungefähr eine Sprosse mehr. Es braucht **keine künstliche Bremse** (kein sqrt/log auf der Bewertung – intransparent, widerspricht dem Vorrechnen-Prinzip) und **keine harten Caps** auf Angestellte oder Hardware (fühlen sich in Idle-Games gemein an). Reputation wird stattdessen **logistisch** zäh (Rate × (1 − Rep/105)) – früh unverändert, spät echte Arbeit, und der Namens-Perk-Sockel bekommt so langfristig Wert.

#### Die Bewertung (Term Sheet)

```
Bewertung = Ertragskraft × Multiple + Team-Wert + Hardware-Wert + Cash

Ertragskraft  = nachhaltiger Gewinn/s × 2.000     ← 10-Minuten-Schnitt (Hochwasserstand), NICHT Peak
Team-Wert     = Σ pro Kopf: 0,5 × Rang-Basispreis ← Acquihire-Prämie
Hardware-Wert = Σ gezahlte Kaufpreise × 0,5       ← Restwert (geometrische Summe)
Cash          = Kontostand × 1

Multiple      = Rep-Multiple × Gründer-Bonus × Track-Record   ← wirkt NUR auf die Ertragskraft
Rep-Multiple  = 1 + 2 × Rep/100                   ← ×1,0 … ×3,0 (Cap durch Rep-Skala)
Gründer-Bonus = 1 + 0,05 × gekaufte Schulungen    ← max ×1,30
Track-Record  = 1 + 0,2 × Perk-Stufe              ← Exit-Perk (siehe „Der Exit“)
```

Regeln:

- **Das Multiple wirkt nur auf die Ertragskraft**, nicht auf Team/Hardware/Cash (Design-Korrektur bei der Umsetzung): Assets sind Assets. Multiplizierte man die Summe, würde Funding-Cash sich selbst multiplizieren – ein Feedback-Loop, der die Kurve sprengt (in der Sim führte er zum Unicorn in Run 1).
- **Nachhaltiger Gewinn/s statt Peak**: Hochwasserstand des gleitenden 10-Minuten-Schnitts von `baseIncome` (spike- **und** incident-frei). Ein Peak-Wert wäre durch den viralen Spike (×20 für 60 s) exploitbar; der Schnitt ist spike-fest und belohnt stabilen Betrieb.
- **Team-Prämie 0,5× statt 2×** (Korrektur): Bei 2× wäre ein teurer Rang als reiner Bewertungs-Boost kaufbar (Arbitrage). 0,5× spiegelt den Hardware-Restwert und bleibt ehrlich.
- **Cash zählt 1:1** – aber Ausgeben schlägt Horten immer: 1 € in einen Hire investiert bringt Team-Wert *plus* Ertragskraft-Zuwachs ×2.000 ×Multiple. Es gibt kein „vor dem Exit auf Geld sitzen“.
- **Der Gründer-Bonus löst das Schulungs-Spannungsfeld**: Schulungen bleiben In-Run und gehen beim Exit verloren – aber der Käufer *bezahlt* für sie (ein Acquihire kauft genau die Skills des Gründers).
- **Meilensteine triggern auf den Hochwasserstand** der Bewertung (ein Reputations-Einbruch zieht ein Angebot nicht zurück); der Exit zahlt den *aktuellen* Wert.
- 1 Mrd = 10⁹ passt in `number` – **weiterhin kein BigInt**.
- Alle Konstanten (Ertrags-Multiple, Schwellen, Perk-Preise) leben in `config.ts`.

#### Meilensteine

**Erzähl-Meilensteine** (automatisch, Feier + Unlock, keine Hürde):

1. **„Das letzte Ticket“** – existiert bereits (Klick Phase 1 → 2)
2. **„Produkt-Markt-Fit“** – bei der Senior-Freischaltung: schaltet den viralen Spike und die Bewertungs-Anzeige frei („Investoren werden aufmerksam“)

**Finanzierungsrunden** (Angebote an Bewertungs-Schwellen; Ära gated **Hardware und Ränge**):

| Runde | Schwelle | Cash | Anteil | Track Record | Ära-Unlock | Hürde |
|---|---|---|---|---|---|---|
| Seed | 1 M | +150 k | −10 % | – | VPS · Staff | „Investoren-Reporting“: +15 % Incident-Risiko, neuer leichter Incident *Board Meeting* |
| Series A | 10 M | +1,5 M | −15 % | – | Cluster · Datacenter · Principal | Bürokratie: +10 % Betriebskosten |
| Series B | 75 M | +10 M | −15 % | 1 Exit | Cloud · 10x Engineer | Wachstumsdruck: unter Reputation 50 sinkt die Motivation (−0,15) |
| Series C | 300 M | +40 M | −15 % | 2 Exits | Orbital Cloud | *Reorg* (schwerer Incident) + nochmals +10 % Betriebskosten |
| **Unicorn** | **1 Mrd** | – | – | – | Feier, 🦄, IPO als bester Käufer | – |

Cash ist eine **feste Summe**, nicht „% der Bewertung“ (Umsetzungs-Korrektur): ein Prozentsatz der Bewertung wäre der gleiche Feedback-Loop wie beim Multiple. Das Investoren-Standing-Perk hebt den Cash und mildert die Dilution.

Vier Regeln:

1. **Hürden fassen nur Betriebskosten, Incidents und Motivation an** – nie den min()-Kern.
2. **Track-Record-Gate**: Series B/C bieten Investoren erst ab 1 bzw. 2 früheren Exits an – die Leiter erzwingt so mehrere Runs, ohne harten Cap. Die Ära bleibt trotzdem per „aus eigener Tasche“ erreichbar.
3. **Ablehnen ist echt spielbar**: Das Angebot bleibt liegen; der Ära-Unlock ist alternativ „aus eigener Tasche“ kaufbar (Seed 400 k, A 4 M, B 30 M, C 120 M – rund das 3–4-Fache des Rundencashs). Solange kein Investor an Bord ist, aber das erste Angebot vorliegt: Bootstrap-Bonus (+0,05 Motivation, „Wir gehören uns selbst“).
4. **Schwellen triggern auf den Hochwasserstand** (siehe oben).

#### Zielkurve (per `tools/endgame_sim.py` gegengerechnet)

Der Sim-Bot spielt gierig-optimal (jeder Cooldown genutzt, bester €/€-Kauf); ein Mensch ist langsamer, die Bot-Stunden sind also eine **Untergrenze**. Gemessener Lauf mit den finalen Werten:

| Run | Exit bei ca. | Erreichte Sprosse | Bot-Dauer |
|---|---|---|---|
| 1 | ~66 M | Series A | ~4,7 h |
| 2 | ~100 M | Series B | ~2,8 h |
| 3 | ~620 M | Series C | ~5,7 h |
| 4 | ~960 M | Series C | ~4,3 h |
| 5 | ≥ 1 Mrd 🦄 | Unicorn | ~2,2 h |

→ **Unicorn im 5. Run nach ~20 h Bot-Zeit** (menschlich in der 25–40-h-Zielspanne). Das Seed-Angebot fällt in Session 1 nach ~35 min. Bei jeder Balancing-Änderung an den späten Rängen/Hardware/Perks: `endgame_sim.py` erneut laufen lassen.

#### Umgesetzt vs. noch offen

Umgesetzt (12.07.2026): Bewertung, alle Ära-Gates, Finanzierungsrunden inkl. Hürden + Bootstrap, **Dilution** (Anteil sichtbar im Term Sheet, Erlös = Bewertung × Anteil – mit paranerd entschieden einzubauen), Exit-Screen, Perk-Shop, Meta-Save. Late-Game-Content: Staff/Principal/10x + VPS/Cluster/Datacenter/Cloud/Orbital.

Offen / zum Feintunen im Playtest: exakte Perk-Preise und Hürden-Stärke (erste per Sim gesetzte Werte); ob der Bootstrap-Weg attraktiv genug ist; ob die Dilution-Zahl im Term Sheet gut lesbar ist.

### Prestige-System: „Der Exit"

Reset mit permanenten Boni, erzählerisch als Unternehmensverkauf: Der Spieler verkauft sein StartUp und gründet ein neues – erfahrener, vernetzter, mit Kapital.

- **Exit-Wert = die aktuelle Bewertung** (Formel siehe „Bewertung & Meilensteine“; ersetzt den früheren Stand „Peak-Gewinn/s × Reputations-Multiple“ – der wäre durch den viralen Spike exploitbar, und der Kontostand verfällt nicht mehr, sondern zählt 1:1). Der Exit-Screen *ist* das Term Sheet: alle Posten als exakte Rohwerte sichtbar (bewusste Analogie zu den Schulungen). Reputation behält ihren zweiten, langfristigen Job über das Rep-Multiple: Ein Data Breach kurz vor dem Exit tut richtig weh.
- **Käufer skaliert mit der Unternehmensgröße** (Flavor): lokale Werbeagentur → Mittelständler → Big-Tech-Acquihire („wird sechs Monate später eingestampft“) → nach dem Unicorn-Meilenstein: IPO mit bestem Multiple.
- **Der Exit-Screen ist ein Zwei-Phasen-Overlay**: Phase 1 zeigt das Term Sheet (alle Posten als exakte Rohwerte, dann × Dein Anteil = Erlös); nach „Verkaufen“ Phase 2 der Perk-Shop, danach „Neu gründen“ startet den Run mit den gekauften Perks. Der Run-Save und der Meta-Save (Perks, Bank, Exit-Zähler, Best-Bewertung) liegen in **getrennten localStorage-Keys** – der Run-Key ist unverändert (Kompatibilität mit bestehenden Spielständen).
- **Erlös wird in wählbare Gründer-Perks investiert** (jeder Reset ist eine Entscheidung, kein flacher Multiplikator). Zwei Klassen – ohne Decken-Heber kein Unicorn (finale Werte, per Sim kalibriert; Preis ×3 pro Stufe):

| Perk | Klasse | Basispreis · max | Effekt pro Stufe |
|---|---|---|---|
| **Netzwerk** | Decken-Heber | 15 M · 8 | ×1,25 Gewinn (multiplikativ) |
| **Track Record** | Decken-Heber | 10 M · 8 | +0,2 aufs Bewertungs-Multiple |
| **Investoren-Standing** | Decken-Heber | 8 M · 5 | +50 % Runden-Cash, −2 Punkte Dilution |
| **Angel-Kapital** | Beschleuniger | 2 M · 5 | Startgeld 2 k × 8^(Stufe−1) im neuen Run |
| **Bekannter Name** | Beschleuniger | 3 M · 5 | +12 Start-Reputation (max 60) |
| **Alte Kollegen** | Beschleuniger | 4 M · 5 | ×0,9 auf Einstellungen + Freischaltungen |

„Gelernte Lektionen“ (−Incident-Risiko) aus dem Entwurf ist vorerst nicht drin – die drei Decken-Heber decken den Plateau-Hub ab; nachrüstbar, falls im Playtest ein vierter Decken-Heber fehlt.

- **Balancing-Regel**: Decken-Heber multiplizieren das erreichbare Plateau eines Runs, Beschleuniger machen Runs nur kürzer. Perk-Preise geometrisch (×3 pro Stufe), Budget = Exit-Erlös – da die Erlöse selbst geometrisch wachsen, kauft jeder Run ~1–2 neue Stufen pro Schiene.

Jeder Perk verstärkt eine andere Mechanik des Grundspiels.

## Technische Umsetzung

- **Architektur**: Single-Page-App, Game-State als ein Objekt; TypeScript + SCSS
- **Game-Loop**: `requestAnimationFrame` mit Delta-Time (nicht nur `setInterval`)
- **Offline-Progress**: beim Laden `Date.now() - lastSave` verrechnen; Incidents feuern offline nicht (sanftes Design), Reputation steigt offline gedeckelt
- **Speichern**: JSON in `localStorage`, Auto-Save-Intervall
- **Zahlen**: normale `number` reichen (keine Kaskade → kein BigInt/break_infinity nötig); Anzeige mit Suffixen (k, M, B, …)
- **UI**: Höhere Ränge, Hardware-Stufen und Perks erst anzeigen, wenn (fast) erreichbar – progressive disclosure
