"""Gegenrechnung Gründer-Schulungen: erweitert das Sim-Modell um Phase-2-Klicks.

Aktiver Spieler nutzt jeden 'Auftrag gewinnen'-Cooldown und kauft Schulungen,
sobald leistbar (nach den regulären Käufen). Vergleich: idle / aktiv ohne
Schulungen / aktiv mit Schulungen. Cap-Ziel: aktiv voll ausgebaut <= +100% ggü. idle.
"""
import importlib.util, sys, io, contextlib

spec = importlib.util.spec_from_file_location("bs", str(__import__("pathlib").Path(__file__).parent / "balance_sim.py"))
bs = importlib.util.module_from_spec(spec)
with contextlib.redirect_stdout(io.StringIO()):
    spec.loader.exec_module(bs)

SCHULUNGEN = [
    # name, Preis, Effekt, Wert
    ("Networking-Seminar",          500.0, "cooldown", -4),   # 30 -> 26 s
    ("AWS-Zertifikat",             1200.0, "mult",     +2),   # 15 -> 17 x
    ("Incident-Response-Training", 2500.0, None,       0),    # Incident-Klicks x2 (nicht sim-relevant)
    ("Scrum-Master-Zertifikat",    4000.0, "cooldown", -3),   # 26 -> 23 s
    ("Verhandlungstraining",       8000.0, "mult",     +3),   # 17 -> 20 x
    ("MBA",                       50000.0, "both",     0),    # +1x und -1 s
]

def run(active_p2_clicks, buy_schulungen):
    s = bs.State()
    mult, cooldown = 15.0, 30.0
    next_click = 0.0
    owned = []
    passive_gt_click = None
    bought_at = {}
    for t in range(75 * 60):
        minutes = t / 60
        clicking = minutes < bs.ACTIVE_CLICK_MINUTES
        inc = s.income()
        s.money += inc + (bs.CLICK_VALUE * bs.CLICK_RATE if clicking and passive_gt_click is None else 0)
        if passive_gt_click is not None and active_p2_clicks and t >= next_click:
            s.money += mult * inc
            next_click = t + cooldown
        s.rep += (bs.REP_BASE_PER_MIN + bs.REP_PER_EMPLOYEE * sum(s.emp.values())) / 60
        for _ in range(5):
            b = bs.best_purchase(s)
            if not b or b == ("save",):
                break
            for kind, name, price in b[1]:
                s.money -= price
                if kind == "emp":
                    if not s.unlocked[name]: s.unlocked[name] = True
                    s.emp[name] += 1
                elif kind == "hw": s.hw[name] += 1
                else: s.upgrades.add(name)
        if buy_schulungen:
            for name, price, eff, val in SCHULUNGEN:
                if name not in owned and s.money >= price:
                    s.money -= price; owned.append(name); bought_at[name] = minutes
                    if eff == "cooldown": cooldown += val
                    elif eff == "mult": mult += val
                    elif eff == "both": mult += 1; cooldown -= 1
        if passive_gt_click is None and s.income() > bs.CLICK_VALUE * bs.CLICK_RATE:
            passive_gt_click = minutes
    # effektiver Klick-Bonus am Ende: mult/cooldown als kontinuierliche Rate
    return s.income(), mult, cooldown, bought_at

idle, *_ = run(False, False)
aktiv, m0, c0, _ = run(True, False)
aktiv_s, m1, c1, when = run(True, True)

print(f"Idle 75 min:                {idle:7.1f} €/s")
print(f"Aktiv ohne Schulungen:      {aktiv:7.1f} €/s  (+{(aktiv/idle-1)*100:.0f}% | Klickrate {m0:.0f}x/{c0:.0f}s = +{m0/c0*100:.0f}% Einkommensäquiv.)")
print(f"Aktiv mit Schulungen:       {aktiv_s:7.1f} €/s  (+{(aktiv_s/idle-1)*100:.0f}% | Klickrate {m1:.0f}x/{c1:.0f}s = +{m1/c1*100:.0f}% Einkommensäquiv.)")
print("\nKaufzeitpunkte der Schulungen (aktiver Spieler):")
for n, t in when.items():
    print(f"  {t:5.1f} min  {n}")
