#!/usr/bin/env python3
"""Draw full yard board PNGs procedurally in the game's cartoon style.

No AI source images: every theme is painted from scratch with flat shapes,
soft shadows and a fixed layout skeleton (grid frame + wide right exit).
"""

from __future__ import annotations

import argparse
import json
import math
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
YARDS_DIR = ROOT / "assets" / "yards"
GUIDES_DIR = YARDS_DIR / "_guides"

BOARD_SIZE = 1024
GRID = {"left": 125, "top": 125, "right": 845, "bottom": 845}
CELL = 120
WIDE_EXIT = {"x": 845, "y": 305, "right": 1024, "bottom": 708}
RING = 46
WALL_H = 31

YARD_ORDER = [
    "quiet_yard",
    "night_yard",
    "winter_yard",
    "forest_yard",
    "rainy_yard",
    "underground_parking",
    "business_center",
    "old_block_yard",
    "neon_yard",
    "holiday_yard",
]

THEMES = {
    "quiet_yard": {
        "env": "quiet",
        "field": (104, 112, 122), "field2": (88, 96, 107),
        "tick": (242, 244, 248, 130), "seam": (22, 26, 32, 64),
        "curb": (210, 207, 196), "curb_dark": (106, 108, 102),
        "tint": (255, 243, 210, 12),
    },
    "night_yard": {
        "env": "night",
        "field": (47, 55, 70), "field2": (36, 44, 58),
        "tick": (255, 202, 124, 110), "seam": (6, 9, 16, 88),
        "curb": (108, 102, 90), "curb_dark": (44, 44, 50),
        "tint": (16, 22, 52, 30),
    },
    "winter_yard": {
        "env": "winter",
        "field": (112, 124, 136), "field2": (96, 108, 122),
        "tick": (240, 246, 252, 140), "seam": (52, 70, 86, 70),
        "curb": (222, 232, 240), "curb_dark": (140, 158, 172),
        "tint": (208, 228, 246, 22),
    },
    "forest_yard": {
        "env": "forest",
        "field": (104, 110, 96), "field2": (88, 96, 84),
        "tick": (224, 206, 140, 120), "seam": (26, 32, 22, 80),
        "curb": (152, 152, 120), "curb_dark": (74, 86, 56),
        "tint": (52, 84, 44, 18),
    },
    "rainy_yard": {
        "env": "rainy",
        "field": (56, 70, 82), "field2": (44, 56, 68),
        "tick": (172, 208, 218, 110), "seam": (8, 16, 24, 90),
        "curb": (116, 126, 132), "curb_dark": (52, 62, 68),
        "tint": (16, 34, 50, 26),
    },
    "underground_parking": {
        "env": "underground",
        "field": (100, 102, 108), "field2": (86, 88, 95),
        "tick": (235, 196, 88, 130), "seam": (24, 25, 28, 84),
        "curb": (156, 158, 154), "curb_dark": (72, 74, 74),
        "tint": (210, 222, 235, 10),
    },
    "business_center": {
        "env": "business",
        "field": (74, 84, 98), "field2": (60, 70, 84),
        "tick": (240, 246, 252, 135), "seam": (14, 20, 28, 78),
        "curb": (192, 200, 208), "curb_dark": (98, 108, 118),
        "tint": (190, 214, 246, 12),
    },
    "old_block_yard": {
        "env": "oldblock",
        "field": (96, 92, 82), "field2": (80, 78, 70),
        "tick": (212, 190, 138, 82), "seam": (28, 26, 20, 88),
        "curb": (168, 158, 130), "curb_dark": (88, 82, 64),
        "tint": (70, 56, 34, 16),
    },
    "neon_yard": {
        "env": "neon",
        "field": (32, 34, 54), "field2": (22, 24, 42),
        "tick": (120, 238, 255, 120), "seam": (6, 8, 20, 96),
        "curb": (62, 66, 94), "curb_dark": (22, 24, 44),
        "tint": (34, 14, 58, 26),
    },
    "holiday_yard": {
        "env": "holiday",
        "field": (78, 62, 58), "field2": (64, 52, 50),
        "tick": (255, 214, 130, 120), "seam": (28, 18, 16, 86),
        "curb": (192, 168, 132), "curb_dark": (100, 78, 64),
        "tint": (88, 40, 26, 18),
    },
}


def clamp(value, low=0, high=255):
    return max(low, min(high, int(round(value))))


def rgba(color):
    return color if len(color) == 4 else (color[0], color[1], color[2], 255)


def mix(a, b, t):
    a = rgba(a)
    b = rgba(b)
    return tuple(clamp(a[i] + (b[i] - a[i]) * t) for i in range(4))


def stable_noise(x, y, seed=0):
    n = (int(x) * 374761393 + int(y) * 668265263 + seed * 1442695041) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


class Canvas:
    def __init__(self, width, height, fill=(0, 0, 0, 0)):
        self.width = int(width)
        self.height = int(height)
        self.pixels = bytearray(self.width * self.height * 4)
        if fill[3]:
            for y in range(self.height):
                for x in range(self.width):
                    self.set_px(x, y, fill)

    def px(self, x, y):
        i = (y * self.width + x) * 4
        return tuple(self.pixels[i : i + 4])

    def set_px(self, x, y, color):
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return
        i = (y * self.width + x) * 4
        self.pixels[i : i + 4] = bytes(tuple(clamp(v) for v in rgba(color)))

    def blend_px(self, x, y, color):
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return
        sr, sg, sb, sa = tuple(clamp(v) for v in rgba(color))
        if sa <= 0:
            return
        i = (y * self.width + x) * 4
        dr, dg, db, da = self.pixels[i], self.pixels[i + 1], self.pixels[i + 2], self.pixels[i + 3]
        s = sa / 255.0
        d = da / 255.0
        out_a = s + d * (1 - s)
        if out_a <= 0:
            self.pixels[i : i + 4] = b"\x00\x00\x00\x00"
            return
        self.pixels[i] = clamp((sr * s + dr * d * (1 - s)) / out_a)
        self.pixels[i + 1] = clamp((sg * s + dg * d * (1 - s)) / out_a)
        self.pixels[i + 2] = clamp((sb * s + db * d * (1 - s)) / out_a)
        self.pixels[i + 3] = clamp(out_a * 255)


def png_chunk(kind, data):
    payload = kind + data
    return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)


def write_png(canvas, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    stride = canvas.width * 4
    raw = b"".join(b"\x00" + bytes(canvas.pixels[y * stride : (y + 1) * stride]) for y in range(canvas.height))
    header = struct.pack(">IIBBBBB", canvas.width, canvas.height, 8, 6, 0, 0, 0)
    data = b"\x89PNG\r\n\x1a\n"
    data += png_chunk(b"IHDR", header)
    data += png_chunk(b"IDAT", zlib.compress(raw, 9))
    data += png_chunk(b"IEND", b"")
    path.write_bytes(data)


def fill_rect(c, x, y, w, h, color):
    for yy in range(max(0, int(y)), min(c.height, int(math.ceil(y + h)))):
        for xx in range(max(0, int(x)), min(c.width, int(math.ceil(x + w)))):
            c.blend_px(xx, yy, color)


def fill_ellipse(c, cx, cy, rx, ry, color):
    for y in range(max(0, int(cy - ry)), min(c.height, int(cy + ry + 1))):
        dy = (y + 0.5 - cy) / max(1, ry)
        for x in range(max(0, int(cx - rx)), min(c.width, int(cx + rx + 1))):
            dx = (x + 0.5 - cx) / max(1, rx)
            if dx * dx + dy * dy <= 1:
                c.blend_px(x, y, color)


def fill_circle(c, cx, cy, r, color):
    fill_ellipse(c, cx, cy, r, r, color)


def draw_line(c, x1, y1, x2, y2, radius, color):
    dx = x2 - x1
    dy = y2 - y1
    steps = max(1, int(math.hypot(dx, dy) / max(1, radius * 0.75)))
    for i in range(steps + 1):
        t = i / steps
        fill_ellipse(c, x1 + dx * t, y1 + dy * t, radius, radius, color)


def stroke_rect(c, x, y, w, h, color, thickness=2):
    fill_rect(c, x, y, w, thickness, color)
    fill_rect(c, x, y + h - thickness, w, thickness, color)
    fill_rect(c, x, y, thickness, h, color)
    fill_rect(c, x + w - thickness, y, thickness, h, color)


def fill_round_rect(c, x, y, w, h, radius, color):
    fill_rect(c, x + radius, y, w - radius * 2, h, color)
    fill_rect(c, x, y + radius, w, h - radius * 2, color)
    fill_ellipse(c, x + radius, y + radius, radius, radius, color)
    fill_ellipse(c, x + w - radius, y + radius, radius, radius, color)
    fill_ellipse(c, x + radius, y + h - radius, radius, radius, color)
    fill_ellipse(c, x + w - radius, y + h - radius, radius, radius, color)


def fill_glow(c, cx, cy, radius, color, alpha, clip=None):
    x_lo = max(0, int(cx - radius))
    x_hi = min(c.width, int(cx + radius + 1))
    y_lo = max(0, int(cy - radius))
    y_hi = min(c.height, int(cy + radius + 1))
    if clip:
        x_lo = max(x_lo, int(clip[0]))
        y_lo = max(y_lo, int(clip[1]))
        x_hi = min(x_hi, int(clip[2]))
        y_hi = min(y_hi, int(clip[3]))
    for y in range(y_lo, y_hi):
        dy = y + 0.5 - cy
        for x in range(x_lo, x_hi):
            dx = x + 0.5 - cx
            d = math.hypot(dx, dy)
            if d >= radius:
                continue
            t = 1 - d / radius
            c.blend_px(x, y, (color[0], color[1], color[2], alpha * t * t))


def texture_rect(c, x0, y0, x1, y1, base, base2, amp=13, seed=0):
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    for y in range(max(0, y0), min(c.height, y1)):
        t = (y - y0) / max(1, y1 - y0)
        row = mix(base, base2, t)
        for x in range(max(0, x0), min(c.width, x1)):
            n = stable_noise(x, y, seed)
            n2 = stable_noise(x // 6, y // 6, seed + 31)
            a = (n - 0.5) * amp + (n2 - 0.5) * amp * 0.8
            c.set_px(x, y, (row[0] + a, row[1] + a, row[2] + a, 255))


def is_protected(x, y, pad=0):
    x0 = GRID["left"] - RING - pad
    y0 = GRID["top"] - RING - pad
    x1 = GRID["right"] + RING + pad
    y1 = GRID["bottom"] + RING + pad
    if x0 < x < x1 and y0 < y < y1:
        return True
    if x > WIDE_EXIT["x"] - pad and WIDE_EXIT["y"] - WALL_H - pad < y < WIDE_EXIT["bottom"] + WALL_H + pad:
        return True
    return False


def scatter_points(count, seed, pad=12):
    points = []
    for i in range(count * 4):
        if len(points) >= count:
            break
        x = stable_noise(i, 3, seed) * BOARD_SIZE
        y = stable_noise(i, 7, seed + 5) * BOARD_SIZE
        if is_protected(x, y, pad):
            continue
        points.append((x, y, stable_noise(i, 11, seed + 9)))
    return points


def draw_tree(c, x, y, r, dark, mid, light, seed=1):
    fill_ellipse(c, x + r * 0.16, y + r * 0.2, r * 1.05, r * 0.95, (10, 14, 10, 60))
    fill_circle(c, x, y, r, dark)
    for i in range(8):
        ang = stable_noise(i, 5, seed) * math.pi * 2
        rad = r * (0.28 + 0.16 * stable_noise(i, 9, seed))
        fill_circle(c, x + math.cos(ang) * r * 0.4, y + math.sin(ang) * r * 0.4, rad + r * 0.26, mid)
    fill_circle(c, x - r * 0.22, y - r * 0.26, r * 0.36, light)


def draw_bush(c, x, y, r, dark, mid):
    fill_ellipse(c, x + 2, y + 3, r * 1.05, r * 0.8, (10, 14, 10, 55))
    fill_ellipse(c, x, y, r, r * 0.78, dark)
    fill_ellipse(c, x - r * 0.25, y - r * 0.18, r * 0.55, r * 0.45, mid)
    fill_ellipse(c, x + r * 0.3, y - r * 0.05, r * 0.45, r * 0.38, mid)


def draw_fir(c, x, y, r, dark, mid, cap):
    fill_ellipse(c, x + r * 0.14, y + r * 0.18, r * 1.05, r * 0.95, (8, 14, 12, 60))
    fill_circle(c, x, y, r, dark)
    fill_circle(c, x - r * 0.04, y - r * 0.04, r * 0.66, mid)
    fill_circle(c, x - r * 0.08, y - r * 0.08, r * 0.32, cap)


def draw_lamp(c, x, y, warm=(255, 198, 122)):
    fill_glow(c, x, y, 92, warm, 66)
    fill_circle(c, x, y, 10, (58, 58, 62, 255))
    fill_circle(c, x, y, 6.5, (255, 226, 168, 255))
    fill_circle(c, x - 2, y - 2, 2.2, (255, 255, 255, 190))


def draw_garland(c, x1, y1, x2, y2, colors, spacing=36, seed=0):
    draw_line(c, x1, y1, x2, y2, 1.1, (28, 20, 18, 130))
    length = math.hypot(x2 - x1, y2 - y1)
    n = max(1, int(length // spacing))
    for i in range(n + 1):
        t = i / n
        bx = x1 + (x2 - x1) * t
        by = y1 + (y2 - y1) * t + math.sin(t * n * math.pi) * 3
        col = colors[i % len(colors)]
        fill_glow(c, bx, by, 17, col, 78)
        fill_circle(c, bx, by, 5, (col[0], col[1], col[2], 240))
        fill_circle(c, bx - 1.4, by - 1.4, 1.8, (255, 255, 255, 170))


def draw_neon_line(c, x1, y1, x2, y2, color):
    steps = max(1, int(math.hypot(x2 - x1, y2 - y1) / 14))
    for i in range(steps + 1):
        t = i / steps
        fill_glow(c, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 22, color, 36)
    draw_line(c, x1, y1, x2, y2, 2.2, (color[0], color[1], color[2], 235))
    draw_line(c, x1, y1, x2, y2, 0.9, (255, 255, 255, 130))


def draw_sidewalk_band(c, base, seam, inner=45, outer=79, tile=62):
    edges = [
        (inner, inner, BOARD_SIZE - inner, outer),
        (inner, BOARD_SIZE - outer, BOARD_SIZE - inner, BOARD_SIZE - inner),
        (inner, outer, outer, BOARD_SIZE - outer),
        (BOARD_SIZE - outer, outer, BOARD_SIZE - inner, BOARD_SIZE - outer),
    ]
    for (x0, y0, x1, y1) in edges:
        texture_rect(c, x0, y0, x1, y1, base, mix(base, (0, 0, 0), 0.08), amp=8, seed=77)
        for tx in range(int(x0), int(x1) + 1, tile):
            fill_rect(c, tx, y0, 1.6, y1 - y0, seam)
        for ty in range(int(y0), int(y1) + 1, tile):
            fill_rect(c, x0, ty, x1 - x0, 1.6, seam)
        fill_rect(c, x0, y0, x1 - x0, 2, (255, 255, 255, 26))


def draw_puddle(c, x, y, rx, ry):
    fill_ellipse(c, x, y, rx, ry, (86, 116, 142, 165))
    fill_ellipse(c, x - rx * 0.12, y - ry * 0.15, rx * 0.66, ry * 0.6, (132, 168, 196, 120))
    fill_ellipse(c, x - rx * 0.3, y - ry * 0.34, rx * 0.3, ry * 0.24, (208, 230, 242, 110))
    draw_line(c, x - rx * 0.6, y - ry * 0.95, x + rx * 0.5, y - ry * 0.95, 0.9, (215, 235, 245, 60))


def draw_gift(c, x, y, size, body, ribbon=(255, 244, 235, 220)):
    fill_round_rect(c, x + 2, y + 3, size, size, 5, (12, 8, 8, 80))
    fill_round_rect(c, x, y, size, size, 5, body)
    fill_round_rect(c, x + 2, y + 2, size - 4, size * 0.32, 4, (255, 255, 255, 46))
    fill_rect(c, x + size / 2 - 2.2, y, 4.4, size, ribbon)
    fill_rect(c, x, y + size / 2 - 2.2, size, 4.4, ribbon)
    fill_circle(c, x + size / 2, y + size / 2, 4, ribbon)


def env_quiet(c):
    texture_rect(c, 0, 0, BOARD_SIZE, BOARD_SIZE, (104, 158, 84), (90, 142, 72), amp=16, seed=3)
    for (x, y, r) in scatter_points(26, 21, pad=4):
        fill_ellipse(c, x, y, 22 + r * 26, 12 + r * 14, (66, 116, 56, 46))
    draw_sidewalk_band(c, (198, 194, 184), (150, 146, 136, 120))
    greens = ((54, 104, 54, 255), (74, 132, 62, 255), (100, 160, 78, 255))
    for (x, y, r) in ((150, 38, 30), (560, 36, 26), (986, 120, 34), (982, 880, 30), (430, 988, 28), (38, 560, 26)):
        draw_bush(c, x, y, r, greens[0], greens[1])
    for i, (x, y) in enumerate(((942, 40), (40, 942), (40, 150), (820, 986), (970, 770))):
        draw_tree(c, x, y, 42 + (i % 3) * 7, greens[0], greens[1], greens[2], seed=i + 2)
    petals = ((255, 236, 240, 220), (255, 214, 120, 220), (240, 248, 255, 220))
    for (x, y, r) in scatter_points(30, 41, pad=10):
        col = petals[int(r * 3) % 3]
        fill_circle(c, x, y, 2.6, col)
        fill_circle(c, x, y, 1.1, (255, 220, 120, 230))


def env_night(c):
    texture_rect(c, 0, 0, BOARD_SIZE, BOARD_SIZE, (33, 38, 54), (24, 28, 42), amp=12, seed=4)
    draw_sidewalk_band(c, (58, 60, 72), (34, 36, 46, 140))
    dark = (28, 46, 42, 255)
    mid = (38, 62, 52, 255)
    light = (52, 82, 64, 255)
    for i, (x, y) in enumerate(((942, 40), (40, 942), (40, 150), (820, 986))):
        draw_tree(c, x, y, 40 + (i % 2) * 8, dark, mid, light, seed=i + 4)
    for (x, y) in ((40, 540), (520, 38), (520, 986), (968, 160), (968, 856)):
        draw_lamp(c, x, y)
    for (x, y, r) in scatter_points(14, 61, pad=8):
        fill_circle(c, x, y, 1.6, (170, 190, 230, 60 + int(r * 60)))


def env_winter(c):
    texture_rect(c, 0, 0, BOARD_SIZE, BOARD_SIZE, (224, 236, 246), (206, 222, 236), amp=9, seed=5)
    draw_sidewalk_band(c, (196, 212, 226), (160, 180, 200, 130))
    for (x, y, r) in scatter_points(20, 81, pad=2):
        rx = 26 + r * 30
        fill_ellipse(c, x + 3, y + 4, rx, rx * 0.5, (150, 178, 204, 90))
        fill_ellipse(c, x, y, rx, rx * 0.5, (246, 251, 255, 235))
        fill_ellipse(c, x - rx * 0.2, y - 3, rx * 0.5, rx * 0.22, (255, 255, 255, 200))
    fir_dark = (40, 80, 62, 255)
    fir_mid = (56, 102, 76, 255)
    cap = (238, 248, 255, 255)
    for i, (x, y) in enumerate(((942, 44), (44, 942), (44, 160), (560, 38), (964, 850), (380, 988))):
        draw_fir(c, x, y, 34 + (i % 3) * 8, fir_dark, fir_mid, cap)


def env_forest(c):
    texture_rect(c, 0, 0, BOARD_SIZE, BOARD_SIZE, (46, 60, 42), (36, 50, 34), amp=14, seed=6)
    sets = (
        ((44, 84, 46, 255), (60, 106, 54, 255), (84, 134, 66, 255)),
        ((38, 74, 44, 255), (52, 96, 52, 255), (74, 124, 62, 255)),
        ((52, 92, 46, 255), (70, 116, 58, 255), (96, 144, 70, 255)),
    )
    for i in range(60):
        x = stable_noise(i, 13, 7) * BOARD_SIZE
        y = stable_noise(i, 17, 7) * BOARD_SIZE
        r = 26 + stable_noise(i, 19, 7) * 30
        if is_protected(x, y, r * 0.4):
            continue
        dark, mid, light = sets[i % 3]
        draw_tree(c, x, y, r, dark, mid, light, seed=i)
    band = []
    for i in range(12):
        x = min(994, 30 + i * 88)
        band.append((x + stable_noise(i, 3, 70) * 30, 28 + stable_noise(i, 5, 70) * 26))
        band.append((x + stable_noise(i, 7, 71) * 30, 996 - stable_noise(i, 9, 71) * 26))
    for i in range(10):
        y = 80 + i * 90
        band.append((28 + stable_noise(i, 11, 72) * 26, y))
        if not (WIDE_EXIT["y"] - 70 < y < WIDE_EXIT["bottom"] + 70):
            band.append((986 - stable_noise(i, 13, 73) * 26, y))
    for j, (x, y) in enumerate(band):
        r = 28 + stable_noise(j, 17, 74) * 22
        dark, mid, light = sets[j % 3]
        draw_tree(c, x, y, r, dark, mid, light, seed=j + 40)
    leaf_colors = ((172, 122, 52, 190), (204, 160, 70, 180), (120, 142, 58, 180))
    for (x, y, r) in scatter_points(24, 91, pad=-30):
        if is_protected(x, y, -36):
            continue
        fill_ellipse(c, x, y, 4 + r * 3, 2.4 + r * 2, leaf_colors[int(r * 3) % 3])


def env_rainy(c):
    texture_rect(c, 0, 0, BOARD_SIZE, BOARD_SIZE, (46, 56, 66), (36, 46, 56), amp=10, seed=8)
    draw_sidewalk_band(c, (70, 80, 88), (44, 52, 60, 140))
    for (x, y, r) in scatter_points(11, 101, pad=6):
        draw_puddle(c, x, y, 26 + r * 26, 10 + r * 9)
    dark = (32, 52, 46, 255)
    mid = (42, 68, 56, 255)
    light = (56, 88, 66, 255)
    for i, (x, y) in enumerate(((942, 40), (40, 942), (968, 866))):
        draw_tree(c, x, y, 38 + i * 4, dark, mid, light, seed=i + 8)
    for (x, y) in ((300, 40), (760, 986)):
        fill_round_rect(c, x - 20, y - 9, 40, 18, 4, (30, 36, 42, 255))
        for i in range(4):
            fill_rect(c, x - 15 + i * 8, y - 5, 3, 10, (14, 18, 22, 255))


def env_underground(c):
    texture_rect(c, 0, 0, BOARD_SIZE, BOARD_SIZE, (94, 96, 102), (82, 84, 90), amp=9, seed=9)
    stroke_rect(c, 6, 6, BOARD_SIZE - 12, BOARD_SIZE - 12, (52, 54, 60, 255), 14)
    stroke_rect(c, 20, 20, BOARD_SIZE - 40, BOARD_SIZE - 40, (120, 122, 126, 90), 2)
    for (x, y) in ((44, 44), (978, 44), (44, 978), (978, 978), (510, 44), (510, 978)):
        fill_round_rect(c, x - 27, y - 27, 54, 54, 8, (58, 60, 66, 255))
        fill_round_rect(c, x - 20, y - 20, 40, 40, 6, (122, 124, 130, 255))
        stroke_rect(c, x - 20, y - 20, 40, 40, (214, 178, 70, 170), 3)
    for (x, y, horiz) in ((250, 36, True), (760, 36, True), (250, 988, True), (760, 988, True), (36, 350, False), (36, 690, False)):
        if horiz:
            fill_glow(c, x, y, 64, (210, 225, 250), 44)
            fill_round_rect(c, x - 52, y - 5, 104, 10, 4, (236, 242, 250, 245))
        else:
            fill_glow(c, x, y, 64, (210, 225, 250), 44)
            fill_round_rect(c, x - 5, y - 52, 10, 104, 4, (236, 242, 250, 245))
    for (x, y, r) in scatter_points(12, 111, pad=14):
        fill_ellipse(c, x, y, 14 + r * 16, 4 + r * 4, (40, 42, 46, 50))


def env_business(c):
    texture_rect(c, 0, 0, BOARD_SIZE, BOARD_SIZE, (172, 178, 186), (156, 164, 174), amp=8, seed=10)
    for tx in range(0, BOARD_SIZE + 1, 56):
        fill_rect(c, tx, 0, 1.4, BOARD_SIZE, (124, 132, 142, 100))
        fill_rect(c, 0, tx, BOARD_SIZE, 1.4, (124, 132, 142, 100))
    hedge_dark = (54, 102, 60, 255)
    hedge_mid = (72, 126, 70, 255)
    for (x, y, w, h) in ((150, 22, 250, 36), (620, 22, 250, 36), (150, 966, 250, 36), (620, 966, 250, 36), (22, 300, 36, 200), (22, 620, 36, 200)):
        fill_round_rect(c, x + 3, y + 5, w, h, 12, (20, 30, 22, 70))
        fill_round_rect(c, x, y, w, h, 12, hedge_dark)
        for i in range(int(w * h / 420)):
            bx = x + 8 + stable_noise(i, 23, 12) * (w - 16)
            by = y + 8 + stable_noise(i, 29, 12) * (h - 16)
            fill_circle(c, bx, by, 7, hedge_mid)
    for (x, y) in ((44, 44), (978, 44), (44, 978), (978, 978), (968, 820)):
        fill_round_rect(c, x - 24, y - 24, 48, 48, 9, (88, 94, 102, 255))
        fill_round_rect(c, x - 19, y - 19, 38, 38, 7, (108, 114, 122, 255))
        draw_bush(c, x, y, 16, hedge_dark, hedge_mid)
    for (x, y, r) in scatter_points(10, 121, pad=10):
        fill_circle(c, x, y + 1.5, 4.4, (60, 66, 74, 120))
        fill_circle(c, x, y, 4, (168, 176, 186, 255))
        fill_circle(c, x - 1, y - 1, 1.6, (235, 240, 246, 200))


def env_oldblock(c):
    texture_rect(c, 0, 0, BOARD_SIZE, BOARD_SIZE, (86, 82, 72), (72, 70, 62), amp=18, seed=11)
    for (x, y, r) in scatter_points(14, 131, pad=0):
        fill_ellipse(c, x, y, 30 + r * 36, 18 + r * 18, (58, 54, 46, 70))
    for (x, y, r) in scatter_points(10, 141, pad=0):
        fill_ellipse(c, x, y, 24 + r * 22, 14 + r * 12, (104, 92, 66, 56))
    for i in range(10):
        x = stable_noise(i, 31, 13) * BOARD_SIZE
        y = stable_noise(i, 37, 13) * BOARD_SIZE
        if is_protected(x, y, 8):
            continue
        length = 30 + (i % 4) * 16
        draw_line(c, x, y, x + length, y + (i % 5 - 2) * 10, 1.0, (26, 24, 18, 110))
        draw_line(c, x + length * 0.4, y + (i % 3 - 1) * 4, x + length * 0.4 + 14, y + 12, 0.8, (26, 24, 18, 90))
    grass_dark = (74, 104, 52, 255)
    grass_mid = (96, 128, 62, 255)
    for (x, y, r) in scatter_points(20, 151, pad=2):
        draw_bush(c, x, y, 6 + r * 7, grass_dark, grass_mid)
    fill_round_rect(c, 226, 944, 150, 64, 8, (142, 110, 68, 255))
    fill_round_rect(c, 238, 952, 126, 48, 6, (208, 184, 130, 255))
    for (x, y, r) in (((266, 968, 0.4)), ((318, 984, 0.7))):
        fill_circle(c, x, y, 5 + r * 4, (188, 162, 108, 255))
    fill_circle(c, 700, 44, 24, (40, 38, 34, 255))
    fill_circle(c, 700, 44, 15, (86, 82, 72, 255))
    draw_tree(c, 952, 110, 40, (52, 84, 46, 255), (70, 106, 54, 255), (94, 134, 64, 255), seed=14)
    draw_tree(c, 60, 700, 36, (52, 84, 46, 255), (70, 106, 54, 255), (94, 134, 64, 255), seed=15)


def env_neon(c):
    texture_rect(c, 0, 0, BOARD_SIZE, BOARD_SIZE, (18, 18, 34), (12, 12, 24), amp=8, seed=16)
    cyan = (90, 238, 255)
    magenta = (220, 110, 255)
    draw_neon_line(c, 30, 30, 994, 30, cyan)
    draw_neon_line(c, 30, 994, 994, 994, cyan)
    draw_neon_line(c, 30, 30, 30, 994, magenta)
    draw_neon_line(c, 994, 30, 994, 270, magenta)
    draw_neon_line(c, 994, 744, 994, 994, magenta)
    for (x, y) in ((58, 58), (966, 58), (58, 966), (966, 966)):
        fill_round_rect(c, x - 22, y - 22, 44, 44, 8, (26, 28, 50, 255))
        fill_glow(c, x, y, 26, cyan, 70)
        fill_circle(c, x, y, 6, (140, 244, 255, 240))
    for (x, y, r) in scatter_points(16, 161, pad=10):
        col = cyan if r > 0.5 else magenta
        fill_rect(c, x, y, 10 + r * 12, 2.4, (col[0], col[1], col[2], 130))


def env_holiday(c):
    texture_rect(c, 0, 0, BOARD_SIZE, BOARD_SIZE, (62, 46, 44), (50, 38, 38), amp=12, seed=18)
    for (x, y, r) in scatter_points(18, 171, pad=2):
        rx = 18 + r * 22
        fill_ellipse(c, x, y, rx, rx * 0.5, (240, 240, 248, 60))
    bulbs = ((255, 120, 130), (255, 210, 100), (120, 220, 160), (130, 180, 255))
    draw_garland(c, 30, 36, 994, 36, bulbs, seed=1)
    draw_garland(c, 30, 988, 994, 988, bulbs, seed=2)
    draw_garland(c, 36, 70, 36, 954, bulbs, seed=3)
    draw_garland(c, 988, 70, 988, 240, bulbs, seed=4)
    draw_garland(c, 988, 776, 988, 954, bulbs, seed=5)
    draw_gift(c, 86, 86, 30, (208, 76, 88, 255))
    draw_gift(c, 122, 100, 24, (96, 144, 210, 255))
    draw_gift(c, 906, 902, 30, (232, 182, 86, 255))
    draw_gift(c, 882, 928, 22, (208, 76, 88, 255))
    fir_dark = (38, 76, 58, 255)
    fir_mid = (54, 98, 72, 255)
    for (x, y, r) in ((938, 96, 36), (96, 930, 34)):
        draw_fir(c, x, y, r, fir_dark, fir_mid, (238, 246, 255, 255))


ENVS = {
    "quiet": env_quiet,
    "night": env_night,
    "winter": env_winter,
    "forest": env_forest,
    "rainy": env_rainy,
    "underground": env_underground,
    "business": env_business,
    "oldblock": env_oldblock,
    "neon": env_neon,
    "holiday": env_holiday,
}


def draw_curb_ring(c, t):
    left, top, right, bottom = GRID["left"], GRID["top"], GRID["right"], GRID["bottom"]
    curb = t["curb"]
    dark = t["curb_dark"]
    ox, oy = left - RING, top - RING
    ow, oh = right - left + RING * 2, bottom - top + RING * 2
    fill_round_rect(c, ox - 6, oy + 8, ow + 12, oh + 8, 30, (0, 0, 0, 76))
    fill_round_rect(c, ox, oy, ow, oh, 32, dark)
    fill_round_rect(c, ox + 7, oy + 7, ow - 14, oh - 14, 25, curb)
    fill_round_rect(c, ox + 9, oy + 9, ow - 18, oh - 18, 23, (255, 255, 255, 30))
    fill_round_rect(c, ox + 13, oy + 13, ow - 26, oh - 26, 21, curb)
    fill_round_rect(c, ox + 26, oy + 26, ow - 52, oh - 52, 18, (0, 0, 0, 92))
    for i in range(7):
        x = left + i * CELL
        fill_rect(c, x - 1, top - RING + 9, 2, RING - 18, (0, 0, 0, 46))
        fill_rect(c, x - 1, bottom + 9, 2, RING - 18, (0, 0, 0, 46))
        y = top + i * CELL
        fill_rect(c, left - RING + 9, y - 1, RING - 18, 2, (0, 0, 0, 46))
        fill_rect(c, right + 9, y - 1, RING - 18, 2, (0, 0, 0, 46))


def draw_playfield(c, t):
    left, top, right, bottom = GRID["left"], GRID["top"], GRID["right"], GRID["bottom"]
    texture_rect(c, left, top, right, bottom, t["field"], t["field2"], amp=12, seed=17)
    for row in range(6):
        for col in range(6):
            if (row + col) % 2 == 0:
                fill_rect(c, left + col * CELL + 1, top + row * CELL + 1, CELL - 2, CELL - 2, (255, 255, 255, 6))
    fill_glow(c, (left + right) / 2, (top + bottom) / 2, 430, (255, 255, 255), 14, clip=(left, top, right, bottom))
    seam = t["seam"]
    for i in range(1, 6):
        x = left + i * CELL
        draw_line(c, x, top + 3, x, bottom - 3, 0.9, seam)
        y = top + i * CELL
        draw_line(c, left + 3, y, right - 3, y, 0.9, seam)
    tick = t["tick"]
    tick_len = 15
    inset = 7
    w = 2.6
    for row in range(6):
        for col in range(6):
            x0 = left + col * CELL + inset
            y0 = top + row * CELL + inset
            x1 = left + (col + 1) * CELL - inset
            y1 = top + (row + 1) * CELL - inset
            for (cx, cy, dx, dy) in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)):
                fill_rect(c, min(cx, cx + dx * tick_len), cy - w / 2, tick_len, w, tick)
                fill_rect(c, cx - w / 2, min(cy, cy + dy * tick_len), w, tick_len, tick)
    stroke_rect(c, left, top, right - left, bottom - top, (0, 0, 0, 56), 3)
    stroke_rect(c, left + 3, top + 3, right - left - 6, bottom - top - 6, (255, 255, 255, 18), 1)


def draw_driveway(c, t):
    e = WIDE_EXIT
    curb = t["curb"]
    dark = t["curb_dark"]
    texture_rect(c, e["x"], e["y"], e["right"], e["bottom"], t["field"], t["field2"], amp=12, seed=313)
    width = e["right"] - e["x"]
    for i in range(width):
        shade = 12 + int(26 * i / width)
        fill_rect(c, e["x"] + i, e["y"], 1, e["bottom"] - e["y"], (0, 0, 0, shade))
    lane_y = GRID["top"] + CELL * 2.5
    for track in (lane_y - 27, lane_y + 27):
        fill_rect(c, e["x"], track - 4, width, 8, (0, 0, 0, 22))
        fill_rect(c, e["x"], track - 1.5, width, 3, (0, 0, 0, 18))
    tick = t["tick"]
    arrow_alpha = min(120, tick[3] + 10)
    for ax in (e["x"] + 52, e["x"] + 100):
        draw_line(c, ax, lane_y - 16, ax + 18, lane_y, 3.2, (tick[0], tick[1], tick[2], arrow_alpha))
        draw_line(c, ax, lane_y + 16, ax + 18, lane_y, 3.2, (tick[0], tick[1], tick[2], arrow_alpha))
    fill_rect(c, e["x"] - 4, e["y"] - WALL_H, e["right"] - e["x"] + 4, WALL_H, dark)
    fill_rect(c, e["x"] - 4, e["bottom"], e["right"] - e["x"] + 4, WALL_H, dark)
    fill_rect(c, e["x"] - 1, e["y"] - WALL_H + 7, e["right"] - e["x"] + 1, WALL_H - 10, curb)
    fill_rect(c, e["x"] - 1, e["bottom"] + 3, e["right"] - e["x"] + 1, WALL_H - 10, curb)
    fill_rect(c, e["x"] - 1, e["y"] - WALL_H + 7, e["right"] - e["x"] + 1, 3, (255, 255, 255, 36))
    fill_rect(c, e["x"] - 1, e["bottom"] + 3, e["right"] - e["x"] + 1, 3, (255, 255, 255, 36))
    fill_rect(c, e["x"] - 4, e["y"] - WALL_H, 5, WALL_H + 2, (0, 0, 0, 70))
    fill_rect(c, e["x"] - 4, e["bottom"] - 2, 5, WALL_H + 2, (0, 0, 0, 70))
    draw_line(c, e["x"] + 2, e["y"] + 10, e["x"] + 2, e["bottom"] - 10, 1.1, (0, 0, 0, 66))


def post_fx(c, t, yard_id):
    left, top, right, bottom = GRID["left"], GRID["top"], GRID["right"], GRID["bottom"]
    if yard_id == "winter_yard":
        for i in range(26):
            x = left + stable_noise(i, 43, 19) * (right - left)
            edge = top if i % 2 == 0 else bottom
            fill_ellipse(c, x, edge + (6 if i % 2 == 0 else -6), 16 + (i % 4) * 7, 6, (244, 250, 255, 90))
        for i in range(14):
            y = top + stable_noise(i, 47, 19) * (bottom - top)
            edge = left if i % 2 == 0 else right
            fill_ellipse(c, edge + (6 if i % 2 == 0 else -6), y, 6, 14 + (i % 4) * 6, (244, 250, 255, 86))
    if yard_id == "night_yard":
        for (x, y) in ((left + 30, top + 30), (right - 30, bottom - 30)):
            fill_glow(c, x, y, 130, (255, 196, 122), 26, clip=(left, top, right, bottom))
    if yard_id == "neon_yard":
        for (x, y) in ((left + 20, top + 20), (right - 20, top + 20), (left + 20, bottom - 20), (right - 20, bottom - 20)):
            fill_glow(c, x, y, 120, (110, 220, 255), 22, clip=(left, top, right, bottom))
    if yard_id == "holiday_yard":
        fill_glow(c, (left + right) / 2, top + 40, 240, (255, 190, 120), 18, clip=(left, top, right, bottom))
    if yard_id == "rainy_yard":
        for i in range(90):
            x = stable_noise(i, 53, 23) * BOARD_SIZE
            y = stable_noise(i, 59, 23) * BOARD_SIZE
            draw_line(c, x, y, x + 7, y + 20, 0.7, (210, 228, 240, 26))
    if yard_id == "forest_yard":
        greens = ((44, 84, 46, 255), (60, 106, 54, 255), (84, 134, 66, 255))
        for (x, y, r) in ((92, 92, 46), (878, 884, 42)):
            draw_tree(c, x, y, r, greens[0], greens[1], greens[2], seed=int(x))
    if yard_id == "quiet_yard":
        greens = ((54, 104, 54, 255), (74, 132, 62, 255), (100, 160, 78, 255))
        draw_tree(c, 90, 90, 40, greens[0], greens[1], greens[2], seed=33)


def grade(c, t):
    tint = t["tint"]
    for y in range(c.height):
        for x in range(c.width):
            i = (y * c.width + x) * 4
            vignette = math.hypot((x - 512) / 512, (y - 512) / 512)
            darken = max(0, min(0.2, (vignette - 0.55) * 0.3))
            for channel in range(3):
                base = c.pixels[i + channel]
                base = base * (1 - darken)
                base = base * (1 - tint[3] / 255) + tint[channel] * (tint[3] / 255)
                c.pixels[i + channel] = clamp(base)
            c.pixels[i + 3] = 255


def build_board(yard_id):
    theme = THEMES[yard_id]
    canvas = Canvas(BOARD_SIZE, BOARD_SIZE, (16, 18, 24, 255))
    ENVS[theme["env"]](canvas)
    draw_curb_ring(canvas, theme)
    draw_playfield(canvas, theme)
    draw_driveway(canvas, theme)
    post_fx(canvas, theme, yard_id)
    grade(canvas, theme)
    return canvas


def build_skeleton_guide():
    c = Canvas(BOARD_SIZE, BOARD_SIZE, (20, 25, 31, 255))
    theme = THEMES["quiet_yard"]
    draw_curb_ring(c, theme)
    draw_playfield(c, theme)
    draw_driveway(c, theme)
    stroke_rect(c, GRID["left"], GRID["top"], GRID["right"] - GRID["left"], GRID["bottom"] - GRID["top"], (255, 44, 44, 220), 2)
    for i in range(1, 6):
        draw_line(c, GRID["left"] + i * CELL, GRID["top"], GRID["left"] + i * CELL, GRID["bottom"], 1.0, (255, 44, 44, 190))
        draw_line(c, GRID["left"], GRID["top"] + i * CELL, GRID["right"], GRID["top"] + i * CELL, 1.0, (255, 44, 44, 190))
    stroke_rect(c, WIDE_EXIT["x"], WIDE_EXIT["y"], WIDE_EXIT["right"] - WIDE_EXIT["x"], WIDE_EXIT["bottom"] - WIDE_EXIT["y"], (0, 255, 120, 225), 4)
    return c


def write_layout_metadata():
    GUIDES_DIR.mkdir(parents=True, exist_ok=True)
    layout = {
        "board": {"width": BOARD_SIZE, "height": BOARD_SIZE},
        "gridFrame": GRID,
        "cell": CELL,
        "wideVisualExitFrame": {
            "x": WIDE_EXIT["x"],
            "y": WIDE_EXIT["y"],
            "width": WIDE_EXIT["right"] - WIDE_EXIT["x"],
            "height": WIDE_EXIT["bottom"] - WIDE_EXIT["y"],
            "note": "Wide visual opening intentionally covers most of the right side; boards are drawn procedurally in the cartoon style.",
        },
    }
    (GUIDES_DIR / "yard-board-layout.json").write_text(json.dumps(layout, indent=2) + "\n", encoding="utf8")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--yard", choices=YARD_ORDER)
    parser.add_argument("--skeleton-only", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    write_layout_metadata()
    write_png(build_skeleton_guide(), GUIDES_DIR / "wide-yard-board-skeleton.png")
    if args.skeleton_only:
        print(GUIDES_DIR / "wide-yard-board-skeleton.png")
        return
    yard_ids = [args.yard] if args.yard else YARD_ORDER
    for yard_id in yard_ids:
        out = YARDS_DIR / yard_id / "board.png"
        write_png(build_board(yard_id), out)
        print(out)


if __name__ == "__main__":
    main()
