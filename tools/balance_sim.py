#!/usr/bin/env python3
"""Pacing-Simulation für IdleOps v3 (MVP-Umfang).

Greedy-Spieler: klickt aktiv in den ersten Minuten, kauft immer die Option
mit dem besten Einkommens-Delta pro Euro. Incidents sind für die
Pacing-Kurve deaktiviert (separat betrachtet).
"""

# ---------------------------- Parameter (Startwerte) ----------------------------
CLICK_VALUE = 0.50        # € pro Klick
CLICK_RATE = 2.0          # Klicks/s bei aktivem Spielen
ACTIVE_CLICK_MINUTES = 12 # so lange klickt der Spieler aktiv

FOUNDER_OUTPUT = 0.3      # €/s, der Gründer arbeitet immer

HARDWARE = {
    # name: (Kapazität €/s, Basispreis €, Betriebskosten €/s, Start-Anzahl)
    "Laptop":       (1.0,    0.0,  0.00, 1),
    "Raspberry Pi": (1.0,   15.0,  0.02, 0),
    "Tower PC":     (8.0,  250.0,  0.20, 0),
}

EMPLOYEES = {
    # name: (Output €/s, Basispreis €, Basis-Motivation, Rep-Schwelle, Freischaltkosten €)
    "Intern": (0.2,   20.0, 0.9,  0,    0.0),
    "Junior": (1.5,  300.0, 1.0,  8,  150.0),
    "Senior": (8.0, 3000.0, 1.1, 25, 1500.0),
}

UPGRADES = [
    # name, Preis €, Effekt ("income_mult" | "motivation"), Wert
    ("Obstschale",   300.0, "motivation", 0.05),
    ("CI/CD",        800.0, "income_mult", 1.10),   # weniger Incidents ≈ +10 % effektiv
    ("Snacks",      2000.0, "motivation", 0.05),
    ("Caching",     5000.0, "income_mult", 1.25),
    ("Unit-Tests", 12000.0, "income_mult", 1.15),
]

COST_GROWTH = 1.15        # Preisfaktor pro Kauf innerhalb einer Stufe
REP_BASE_PER_MIN = 0.5    # Reputationsaufbau pro Minute (Basis)
# Reputationsaufbau ist pro RANG gestaffelt (spiegelt config.ts rank.repGain) und
# logistisch zäh (× (1 − Rep/105)); der Angestellten-Beitrag ist gedeckelt.
REP_GAIN = {"Intern": 0.04, "Junior": 0.08, "Senior": 0.16}
REP_EMP_CAP = 2.5
REP_SOFTCAP = 105
SIM_MINUTES = 75

# ---------------------------- Modell ----------------------------

class State:
    def __init__(self):
        self.money = 0.0
        self.rep = 0.0
        self.hw = {k: v[3] for k, v in HARDWARE.items()}
        self.emp = {k: 0 for k in EMPLOYEES}
        self.unlocked = {k: (v[3] == 0) for k, v in EMPLOYEES.items()}
        self.unlocked["Intern"] = True
        self.upgrades = set()

    def capacity(self):
        return sum(HARDWARE[k][0] * n for k, n in self.hw.items())

    def upkeep(self):
        return sum(HARDWARE[k][2] * n for k, n in self.hw.items())

    def output(self):
        return FOUNDER_OUTPUT + sum(EMPLOYEES[k][0] * n for k, n in self.emp.items())

    def motivation(self):
        heads = 1 + sum(self.emp.values())  # inkl. Gründer (Motivation 1,0)
        total = 1.0 + sum(EMPLOYEES[k][2] * n for k, n in self.emp.items())
        bonus = sum(v for name, _, t, v in UPGRADES if name in self.upgrades and t == "motivation")
        return min(1.5, total / heads + bonus)

    def rep_factor(self):
        return 0.8 + 0.4 * min(self.rep, 100) / 100

    def income_mult(self):
        m = 1.0
        for name, _, t, v in UPGRADES:
            if name in self.upgrades and t == "income_mult":
                m *= v
        return m

    def income(self):
        base = min(self.capacity(), self.output())
        gross = base * self.motivation() * self.rep_factor() * self.income_mult()
        return max(0.0, gross - self.upkeep())

    def hw_price(self, name):
        return HARDWARE[name][1] * COST_GROWTH ** self.hw[name] if name != "Laptop" else float("inf")

    def emp_price(self, name):
        p = EMPLOYEES[name][1] * COST_GROWTH ** self.emp[name]
        if not self.unlocked[name]:
            p += EMPLOYEES[name][4]  # Freischaltung einpreisen
        return p


def options(s: State):
    opts = []
    for name in HARDWARE:
        if name != "Laptop":
            opts.append(("hw", name, s.hw_price(name)))
    for name in EMPLOYEES:
        if EMPLOYEES[name][3] <= s.rep:
            opts.append(("emp", name, s.emp_price(name)))
    for name, price, _, _ in UPGRADES:
        if name not in s.upgrades:
            opts.append(("upg", name, price))
    return opts


def apply(s: State, kind, name, n=1):
    if kind == "upg":
        s.upgrades.add(name) if n > 0 else s.upgrades.discard(name)
    else:
        (s.hw if kind == "hw" else s.emp)[name] += n


def best_purchase(s: State):
    """Beste Option(en) nach Einkommens-Delta pro €, mit Spar-Logik.

    Bewertet Einzelkäufe UND Paare (Hardware+Angestellter), weil bei min()
    ein Kapazitätskauf allein nie Einkommen bringt — ein echter Spieler
    kauft in Erwartung des nächsten Hires. Betrachtet auch Optionen, die
    erst in ~2 Minuten leistbar sind: Ist die beste Option noch nicht
    leistbar, wird gespart (Rückgabe ("save",)).
    """
    base = s.income()
    horizon = s.money + 120 * base  # in ~2 min erreichbar
    best = None  # (score, [(kind, name, price), ...], total_price)
    opts = options(s)
    for i, (k1, n1, p1) in enumerate(opts):
        if p1 <= horizon:
            apply(s, k1, n1); delta = s.income() - base; apply(s, k1, n1, -1)
            if delta > 0 and (best is None or delta / p1 > best[0]):
                best = (delta / p1, [(k1, n1, p1)], p1)
        for k2, n2, p2 in opts[i:]:
            if k1 == k2:
                continue  # nur gemischte Paare (Kapazität + Output)
            if p1 + p2 > horizon:
                continue
            apply(s, k1, n1); apply(s, k2, n2)
            delta = s.income() - base
            apply(s, k1, n1, -1); apply(s, k2, n2, -1)
            if delta > 0:
                score = delta / (p1 + p2)
                if best is None or score > best[0]:
                    best = (score, [(k1, n1, p1), (k2, n2, p2)], p1 + p2)
    if best is None:
        return None
    if best[2] > s.money:
        return ("save",)
    return best


def run():
    s = State()
    milestones = []
    first_buy = passive_gt_click = None
    log = []
    buys_window = [0]
    for t in range(SIM_MINUTES * 60):
        minutes = t / 60
        clicking = minutes < ACTIVE_CLICK_MINUTES
        s.money += s.income() + (CLICK_VALUE * CLICK_RATE if clicking else 0)
        emp_rep = min(REP_EMP_CAP, sum(REP_GAIN[k] * n for k, n in s.emp.items()))
        s.rep += (REP_BASE_PER_MIN + emp_rep) * max(0.0, 1 - s.rep / REP_SOFTCAP) / 60

        # Freischaltungen + Käufe (mehrere pro Sekunde möglich)
        for _ in range(5):
            b = best_purchase(s)
            if not b or b == ("save",):
                break
            for kind, name, price in b[1]:
                s.money -= price
                buys_window[0] += 1
                if kind == "emp":
                    if not s.unlocked[name]:
                        s.unlocked[name] = True
                        milestones.append((minutes, f"{name} freigeschaltet + erster {name}"))
                    s.emp[name] += 1
                elif kind == "hw":
                    s.hw[name] += 1
                else:
                    s.upgrades.add(name)
                    milestones.append((minutes, f"Upgrade gekauft: {name}"))
                if first_buy is None:
                    first_buy = minutes
                    milestones.append((minutes, f"Erster Kauf: {name}"))

        if passive_gt_click is None and s.income() > CLICK_VALUE * CLICK_RATE:
            passive_gt_click = minutes
            milestones.append((minutes, "MEILENSTEIN: passives Einkommen > Klick-Einkommen"))

        if t % 300 == 0:
            log.append((minutes, s.income(), s.capacity(), s.output(), s.upkeep(),
                        dict(s.emp), {k: v for k, v in s.hw.items() if v}, buys_window[0]))
            buys_window[0] = 0

    print("=== Meilensteine ===")
    for m, txt in milestones[:40]:
        print(f"  {m:6.1f} min  {txt}")
    print("\n=== Verlauf (alle 5 min; Käufe = im vorigen Fenster) ===")
    print(f"  {'min':>5} {'€/s':>8} {'Kap.':>8} {'Output':>8} {'Upkeep':>7} {'Käufe':>6}  Team / Hardware")
    ABBR = {"Laptop": "L", "Raspberry Pi": "Pi", "Tower PC": "T"}
    for m, inc, cap, out, up, emp, hw, buys in log:
        team = ",".join(f"{k[0]}{v}" for k, v in emp.items() if v)
        hws = ",".join(f"{ABBR[k]}{v}" for k, v in hw.items())
        print(f"  {m:5.0f} {inc:8.1f} {cap:8.1f} {out:8.1f} {up:7.2f} {buys:6d}  {team or '-'} / {hws}")

    # Spike-Check bei Minute 30: lohnt sich Reserve?
    print(f"\nEngpass am Ende: {'Hardware' if s.capacity() < s.output() else 'Team'}"
          f" (Kap. {s.capacity():.0f} vs. Output {s.output():.0f})")

run()
