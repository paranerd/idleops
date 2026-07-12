#!/usr/bin/env python3
"""Endgame-Simulation für IdleOps: Bewertung, Funding-Leiter, Exits, Unicorn.

Erweitert balance_sim.py um:
- alle 6 Ränge und 8 Hardware-Stufen (Kandidaten-Werte für config.ts)
- Phase-2-Klicks (aktiver Spieler nutzt jeden Cooldown) + Gründer-Schulungen
- die Bewertungs-Formel aus der Spec (Term Sheet) inkl. Hochwasserstand
- Finanzierungsrunden mit Ära-Gates, Cash, Dilution und Hürden
- Exit-Zyklen mit Gründer-Perks (Decken-Heber + Beschleuniger)

Ziel (Spec "Zielkurve"): Seed nach ~45-60 min in Run 1; Run 1 exitet bei
~15-25 M um Series A; Unicorn (1 Mrd) in Run 5-6; Gesamtspielzeit ~25-40 h.
"""

# ---------------------------- Kandidaten-Werte (-> config.ts) ----------------------------

COST_GROWTH = 1.15            # MVP-Stufen (unverändert, validiert)
GROWTH_LATE = {               # steiler für Endgame-Content
    "VPS": 1.20, "Cluster": 1.22, "Datacenter": 1.25, "Cloud": 1.33, "Orbital": 1.35,
    "Staff": 1.20, "Principal": 1.25, "10x": 1.33,
}
def growth(name):
    return GROWTH_LATE.get(name, COST_GROWTH)
FOUNDER_OUTPUT = 0.3
CLICK_VALUE = 0.5
CLICK_RATE = 2.0
ACTIVE_CLICK_MINUTES = 12

HARDWARE = {
    # name: (Kapazität €/s, Basispreis €, Betriebskosten €/s, Start, benötigte Runde oder None)
    "Laptop":       (1.0,       0.0,    0.00, 1, None),
    "Raspberry Pi": (1.0,      15.0,    0.02, 0, None),
    "Tower PC":     (8.0,     250.0,    0.20, 0, None),
    "VPS":          (40.0,   5000.0,    1.00, 0, "Seed"),
    "Cluster":      (250.0, 160e3,      6.00, 0, "Series A"),
    "Datacenter":   (1200.0, 1.4e6,    30.00, 0, "Series A"),
    "Cloud":        (8000.0, 30e6,    600.00, 0, "Series B"),
    "Orbital":      (50e3,  200e6,   4000.00, 0, "Series C"),
}

EMPLOYEES = {
    # name: (Output €/s, Basispreis €, Basis-Motivation, Rep-Schwelle, Freischaltkosten €, benötigte Runde)
    "Intern":    (0.2,     20.0, 0.9,   0,     0.0, None),
    "Junior":    (1.5,    300.0, 1.0,   8,   150.0, None),
    "Senior":    (8.0,   3000.0, 1.1,  25,  1500.0, None),
    "Staff":     (40.0,   80e3,  1.15, 40,  30e3,  "Seed"),
    "Principal": (250.0, 1.4e6,  1.2,  60, 500e3,  "Series A"),
    "10x":       (1500.0, 15e6,  1.25, 80, 6e6,   "Series B"),
}

UPGRADES = [
    ("Obstschale",   300.0, "motivation", 0.05),
    ("CI/CD",        800.0, "income_mult", 1.10),
    ("Snacks",      2000.0, "motivation", 0.05),
    ("Caching",     5000.0, "income_mult", 1.25),
    ("Unit-Tests", 12000.0, "income_mult", 1.15),
]

TRAININGS = [
    # name, Preis, dealMult-Bonus, Cooldown-Bonus (s)
    ("Networking",    500.0, 0, -4),
    ("AWS-Zert",     1200.0, 2,  0),
    ("Incident-Tr",  2500.0, 0,  0),
    ("Scrum",        4000.0, 0, -3),
    ("Verhandlung",  8000.0, 3,  0),
    ("MBA",         50000.0, 1, -1),
]
DEAL_MULT_BASE = 15.0
DEAL_CD_BASE = 30.0

# Bewertung
VAL_INCOME_MULT = 2000.0
VAL_TEAM_MULT = 0.5        # × Rang-Basispreis pro Kopf (wie HW-Restwert; 2× wäre Arbitrage)
VAL_HW_RESIDUAL = 0.5      # × gezahlte Kaufpreise
GRUENDER_BONUS_PER_TRAINING = 0.05

ROUNDS = [
    # name, Schwelle, Cash (fix), Dilution, Upkeep-Malus, min. Exits (Track Record)
    ("Seed",     1e6,  150e3, 0.10, 1.00, 0),
    ("Series A", 1e7,  1.5e6, 0.15, 1.10, 0),
    ("Series B", 75e6, 10e6,  0.15, 1.00, 1),
    ("Series C", 300e6,40e6,  0.15, 1.10, 2),
]
UNICORN = 1e9

PERKS = {
    # name: (Basispreis, Preisfaktor/Stufe, Kategorie)
    "Netzwerk":    (15e6, 3.0, "decke"),   # ×1,25 Gewinn pro Stufe (multiplikativ)
    "TrackRecord": (10e6, 3.0, "decke"),   # +0,2 Multiple pro Stufe
    "Investoren":  (8e6, 3.0, "terms"),    # +50 % Funding-Cash, Dilution −2pp pro Stufe
    "Angel":       (2e6, 3.0, "tempo"),    # Startgeld 2000 × 8^(L-1)
    "Name":        (3e6, 3.0, "tempo"),    # Start-Reputation +12/Stufe (max 60)
    "Kollegen":    (4e6, 3.0, "tempo"),    # Hires/Unlocks −10 %/Stufe
}
PERK_PRIORITY = ["Netzwerk", "TrackRecord", "Angel", "Name", "Kollegen", "Investoren"]

MAX_RUN_HOURS = 7.0
PLATEAU_WINDOW_MIN = 40   # Exit, wenn Bewertung in diesem Fenster kaum wächst
PLATEAU_GROWTH = 1.10
BUY_EVERY_S = 5

# ---------------------------- Modell ----------------------------

class Meta:
    def __init__(self):
        self.perks = {k: 0 for k in PERKS}
        self.bank = 0.0
        self.exits = 0

    def perk_price(self, name):
        base, growth, _ = PERKS[name]
        return base * growth ** self.perks[name]

    def spend(self):
        bought = []
        while True:
            for name in PERK_PRIORITY:
                p = self.perk_price(name)
                if p <= self.bank:
                    self.bank -= p
                    self.perks[name] += 1
                    bought.append(f"{name}{self.perks[name]}")
                    break
            else:
                return bought


class Run:
    def __init__(self, meta: Meta):
        self.m = meta
        self.money = 2000.0 * 8 ** (meta.perks["Angel"] - 1) if meta.perks["Angel"] else 0.0
        self.rep = min(60.0, 12.0 * meta.perks["Name"])
        self.hw = {k: v[3] for k, v in HARDWARE.items()}
        self.emp = {k: 0 for k in EMPLOYEES}
        self.unlocked = {k: (v[4] == 0) for k, v in EMPLOYEES.items()}
        self.upgrades = set()
        self.trainings = set()
        self.rounds = set()          # angenommene Runden
        self.share = 1.0
        self.upkeep_malus = 1.0
        self.val_high = 0.0
        self.milestone = False       # Phase 2

    # --- Grundspiel (wie balance_sim) ---
    def capacity(self):
        return sum(HARDWARE[k][0] * n for k, n in self.hw.items())

    def upkeep(self):
        return sum(HARDWARE[k][2] * n for k, n in self.hw.items()) * self.upkeep_malus

    def output(self):
        return FOUNDER_OUTPUT + sum(EMPLOYEES[k][0] * n for k, n in self.emp.items())

    def motivation(self):
        heads = 1 + sum(self.emp.values())
        total = 1.0 + sum(EMPLOYEES[k][2] * n for k, n in self.emp.items())
        bonus = sum(v for name, _, t, v in UPGRADES if name in self.upgrades and t == "motivation")
        if not self.rounds:
            bonus += 0.05  # Bootstrap-Bonus
        return min(1.5, total / heads + bonus)

    def income_mult(self):
        m = 1.25 ** self.m.perks["Netzwerk"]
        for name, _, t, v in UPGRADES:
            if name in self.upgrades and t == "income_mult":
                m *= v
        return m

    def rep_factor(self):
        return 0.8 + 0.4 * min(self.rep, 100) / 100

    def income(self):
        base = min(self.capacity(), self.output())
        gross = base * self.motivation() * self.rep_factor() * self.income_mult()
        return max(0.0, gross - self.upkeep())

    def hire_discount(self):
        return 0.9 ** self.m.perks["Kollegen"]

    def hw_price(self, name):
        return HARDWARE[name][1] * growth(name) ** self.hw[name] if name != "Laptop" else float("inf")

    def emp_price(self, name):
        p = EMPLOYEES[name][1] * growth(name) ** self.emp[name]
        if not self.unlocked[name]:
            p += EMPLOYEES[name][4]
        return p * self.hire_discount()

    # --- Klick Phase 2 (aktiver Spieler nutzt jeden Cooldown) ---
    def click_rate_bonus(self):
        if not self.milestone:
            return 0.0
        mult = DEAL_MULT_BASE + sum(t[2] for t in TRAININGS if t[0] in self.trainings)
        cd = DEAL_CD_BASE + sum(t[3] for t in TRAININGS if t[0] in self.trainings)
        return mult / max(1.0, cd) * self.income()

    # --- Bewertung (Term Sheet) ---
    def hw_paid(self):
        total = 0.0
        for k, n in self.hw.items():
            base = HARDWARE[k][1]
            if n and base:
                g = growth(k)
                total += base * (g ** n - 1) / (g - 1)
        return total

    def valuation(self):
        ertrag = self.income() * VAL_INCOME_MULT
        team = sum(VAL_TEAM_MULT * EMPLOYEES[k][1] * n for k, n in self.emp.items())
        hw = VAL_HW_RESIDUAL * self.hw_paid()
        rep_mult = 1 + 2 * min(self.rep, 100) / 100
        gruender = 1 + GRUENDER_BONUS_PER_TRAINING * len(self.trainings)
        track = 1 + 0.2 * self.m.perks["TrackRecord"]
        return ertrag * rep_mult * gruender * track + team + hw + self.money

    # --- Runden ---
    def maybe_accept_rounds(self, log, minutes):
        for name, threshold, cash_fix, dilution, upkeep_malus, min_exits in ROUNDS:
            if name in self.rounds or self.val_high < threshold or self.m.exits < min_exits:
                continue
            lvl = self.m.perks["Investoren"]
            cash = cash_fix * (1 + 0.5 * lvl)
            self.money += cash
            self.share -= max(0.05, dilution - 0.02 * lvl)
            self.upkeep_malus *= upkeep_malus
            self.rounds.add(name)
            ertrag = self.income() * VAL_INCOME_MULT
            team = sum(VAL_TEAM_MULT * EMPLOYEES[k][1] * n for k, n in self.emp.items())
            hwv = VAL_HW_RESIDUAL * self.hw_paid()
            log.append((minutes, f"{name} angenommen: +{cash/1e6:.2f} M Cash, Anteil {self.share*100:.0f} % "
                                 f"[I={self.income():,.0f}/s E={ertrag/1e6:.1f}M T={team/1e6:.1f}M H={hwv/1e6:.1f}M C={self.money/1e6:.1f}M]"))


def options(r: Run):
    opts = []
    for name, (_, price, _, _, req) in HARDWARE.items():
        if name == "Laptop":
            continue
        if req and req not in r.rounds:
            continue
        opts.append(("hw", name, r.hw_price(name)))
    for name in EMPLOYEES:
        req = EMPLOYEES[name][5]
        if EMPLOYEES[name][3] <= r.rep and (req is None or req in r.rounds):
            opts.append(("emp", name, r.emp_price(name)))
    for name, price, _, _ in UPGRADES:
        if name not in r.upgrades:
            opts.append(("upg", name, price))
    return opts


def apply(r: Run, kind, name, n=1):
    if kind == "upg":
        r.upgrades.add(name) if n > 0 else r.upgrades.discard(name)
    else:
        (r.hw if kind == "hw" else r.emp)[name] += n


def best_purchase(r: Run):
    base = r.income()
    horizon = r.money + 120 * (base + r.click_rate_bonus())
    best = None
    opts = options(r)
    for i, (k1, n1, p1) in enumerate(opts):
        if p1 <= horizon:
            apply(r, k1, n1); delta = r.income() - base; apply(r, k1, n1, -1)
            if delta > 0 and (best is None or delta / p1 > best[0]):
                best = (delta / p1, [(k1, n1, p1)], p1)
        for k2, n2, p2 in opts[i:]:
            if k1 == k2 or p1 + p2 > horizon:
                continue
            apply(r, k1, n1); apply(r, k2, n2)
            delta = r.income() - base
            apply(r, k1, n1, -1); apply(r, k2, n2, -1)
            if delta > 0:
                score = delta / (p1 + p2)
                if best is None or score > best[0]:
                    best = (score, [(k1, n1, p1), (k2, n2, p2)], p1 + p2)
    if best is None:
        return None
    if best[2] > r.money:
        return ("save",)
    return best


def simulate_run(meta: Meta, run_no: int, verbose=True):
    r = Run(meta)
    log = []
    val_history = []  # (minute, bewertung)
    seed_minute = None
    t = 0
    while t < MAX_RUN_HOURS * 3600:
        minutes = t / 60
        clicking = minutes < ACTIVE_CLICK_MINUTES
        inc = r.income() + r.click_rate_bonus() + (CLICK_VALUE * CLICK_RATE if clicking and not r.milestone else 0)
        r.money += inc * BUY_EVERY_S
        rep_rate = (0.5 + min(1.5, 0.05 * sum(r.emp.values()))) * max(0.0, 1 - r.rep / 105)
        r.rep = min(100.0, r.rep + rep_rate / 60 * BUY_EVERY_S)

        if not r.milestone and r.income() > CLICK_VALUE * CLICK_RATE:
            r.milestone = True

        # Schulungen kaufen, sobald leistbar und < 15 % des Vermögens
        for name, price, _, _ in TRAININGS:
            if name not in r.trainings and r.money >= price * 3:
                r.money -= price
                r.trainings.add(name)

        for _ in range(6):
            b = best_purchase(r)
            if not b or b == ("save",):
                break
            for kind, name, price in b[1]:
                r.money -= price
                if kind == "emp":
                    if not r.unlocked[name]:
                        r.unlocked[name] = True
                        log.append((minutes, f"{name} freigeschaltet"))
                    r.emp[name] += 1
                elif kind == "hw":
                    r.hw[name] += 1
                else:
                    r.upgrades.add(name)

        v = r.valuation()
        r.val_high = max(r.val_high, v)
        if seed_minute is None and r.val_high >= 1e6:
            seed_minute = minutes
        r.maybe_accept_rounds(log, minutes)
        val_history.append((minutes, r.val_high))
        if verbose and t % 900 == 0:
            log.append((minutes, f"[Timeline] I={r.income():,.0f}/s Val={r.valuation()/1e6:.2f}M Rep={r.rep:.0f} Geld={r.money/1e6:.2f}M"))

        # Plateau-Exit: Bewertung wächst kaum noch
        if minutes > 60:
            past = next((vv for mm, vv in val_history if mm >= minutes - PLATEAU_WINDOW_MIN), None)
            if past and r.val_high < past * PLATEAU_GROWTH:
                break
        if r.val_high >= UNICORN:
            break
        t += BUY_EVERY_S

    exit_val = r.valuation()
    proceeds = exit_val * r.share
    meta.bank += proceeds
    meta.exits += 1
    if verbose:
        hours = t / 3600
        team = ",".join(f"{k[:2]}{v}" for k, v in r.emp.items() if v)
        hws = ",".join(f"{k[:2]}{v}" for k, v in r.hw.items() if v)
        print(f"Run {run_no}: {hours:4.1f} h · Exit {exit_val/1e6:8.1f} M · Anteil {r.share*100:3.0f} % "
              f"· Erlös {proceeds/1e6:8.1f} M · Runden: {sorted(r.rounds, key=lambda x: [n for n,*_ in ROUNDS].index(x))}")
        if seed_minute is not None and run_no == 1:
            print(f"        Seed-Schwelle (1 M) erreicht nach {seed_minute:.0f} min")
        print(f"        Team {team} / HW {hws} / Gewinn {r.income():,.0f} €/s")
        for m, txt in log:
            print(f"        {m:6.1f} min  {txt}")
    return exit_val, t / 3600


def main():
    meta = Meta()
    total_hours = 0.0
    for run_no in range(1, 9):
        exit_val, hours = simulate_run(meta, run_no)
        total_hours += hours
        if exit_val >= UNICORN:
            print(f"\n🦄 UNICORN in Run {run_no} nach insgesamt {total_hours:.1f} h Spielzeit!")
            break
        bought = meta.spend()
        print(f"        Perks gekauft: {', '.join(bought) if bought else '—'} · Rest-Bank {meta.bank/1e6:.1f} M\n")
    else:
        print(f"\nKein Unicorn nach 8 Runs ({total_hours:.1f} h) — Decken-Heber zu schwach/teuer?")


if __name__ == "__main__":
    main()
