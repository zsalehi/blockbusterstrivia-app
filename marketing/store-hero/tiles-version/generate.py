"""Store hero backgrounds on the BlockBusters logo lattice (flat-top hexes, columns 1.5r apart,
odd columns dropped half a hex). Writes hero-light.svg and hero-dark.svg next to this file.

    python3 generate.py

The centre is kept clear for the store's headline and button; coloured tiles build up
toward the edges. Change SEED for a different arrangement.
"""
import math
import random
from pathlib import Path

W, H = 2880, 1440          # 2:1, wide enough for retina desktop
R = 78                     # hex radius
SEAM = 4                   # gap between tiles, like the logo
SEED = 7
OUT = Path(__file__).parent

BRAND = {"red": "#d85545", "blue": "#3481b5", "yellow": "#e8c547", "cell": "#243141"}
LETTERS = "BLOCKBUSTERSTRIVIA"

THEMES = {
    "light": {"bg": "#f6f4ef", "outline": "#e2ddd2", "cell": BRAND["cell"]},
    "dark": {"bg": "#121923", "outline": "#1e2835", "cell": "#2a3a4d"},
}

SQ3 = math.sqrt(3)


def hex_points(r):
    h = SQ3 * r
    pts = [(r, 0), (r / 2, h / 2), (-r / 2, h / 2), (-r, 0), (-r / 2, -h / 2), (r / 2, -h / 2)]
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def cells():
    hh = SQ3 * R
    cols = int(W / (1.5 * R)) + 3
    rows = int(H / hh) + 3
    for c in range(-1, cols):
        for r in range(-1, rows):
            cx = c * 1.5 * R
            cy = r * hh + (hh / 2 if c % 2 else 0)
            yield c, r, cx, cy


def build(theme_name):
    t = THEMES[theme_name]
    rnd = random.Random(SEED)
    outline = hex_points(R - SEAM)
    tile = hex_points(R - SEAM)
    parts = [f'<rect width="{W}" height="{H}" fill="{t["bg"]}"/>']
    tiles = []
    for c, r, cx, cy in cells():
        # Elliptical clearing around the headline: 0 at the centre, 1 at its edge.
        d = math.hypot((cx - W / 2) / (W * 0.31), (cy - H / 2) / (H * 0.40))
        roll = rnd.random()
        pick = rnd.random()
        letter_roll = rnd.random()
        letter = rnd.choice(LETTERS)
        parts.append(
            f'<polygon transform="translate({cx:.1f} {cy:.1f})" points="{outline}" fill="none" '
            f'stroke="{t["outline"]}" stroke-width="3"/>'
        )
        p = 0.88 * smoothstep(0.95, 1.75, d)
        if roll >= p:
            continue
        colour = (
            BRAND["red"] if pick < 0.40 else
            BRAND["blue"] if pick < 0.80 else
            t["cell"] if pick < 0.92 else
            BRAND["yellow"]
        )
        g = f'<g transform="translate({cx:.1f} {cy:.1f})"><polygon points="{tile}" fill="{colour}"/>'
        if letter_roll < 0.22 and colour != BRAND["yellow"]:
            g += (
                f'<text y="2" text-anchor="middle" dominant-baseline="central" fill="#ffffff" '
                f'font-family="Bebas Neue, sans-serif" font-size="{R * 0.95:.0f}">{letter}</text>'
            )
        tiles.append(g + "</g>")
    parts += tiles
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
        + "".join(parts)
        + "</svg>"
    )
    (OUT / f"hero-{theme_name}.svg").write_text(svg)


for name in THEMES:
    build(name)
print("wrote", ", ".join(f"hero-{n}.svg" for n in THEMES))
