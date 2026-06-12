#!/usr/bin/env python3
"""Build full yard board PNGs from generated art and a fixed layout skeleton."""

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
        "surface": (58, 64, 68, 255),
        "surface2": (43, 49, 54, 255),
        "curb": (188, 187, 177, 255),
        "curb_dark": (100, 103, 96, 255),
        "line": (202, 172, 82, 175),
        "seam": (18, 22, 26, 132),
        "glow": (118, 173, 255, 34),
        "tint": (34, 43, 43, 38),
        "detail": "leaves",
    },
    "night_yard": {
        "surface": (28, 34, 43, 255),
        "surface2": (17, 22, 31, 255),
        "curb": (80, 78, 70, 255),
        "curb_dark": (38, 40, 45, 255),
        "line": (222, 154, 74, 185),
        "seam": (3, 5, 9, 150),
        "glow": (255, 176, 91, 70),
        "tint": (5, 8, 22, 74),
        "detail": "lamps",
    },
    "winter_yard": {
        "surface": (120, 139, 150, 255),
        "surface2": (83, 105, 118, 255),
        "curb": (219, 229, 231, 255),
        "curb_dark": (142, 162, 172, 255),
        "line": (232, 240, 244, 178),
        "seam": (48, 70, 82, 110),
        "glow": (145, 212, 255, 46),
        "tint": (194, 222, 236, 70),
        "detail": "snow",
    },
    "forest_yard": {
        "surface": (54, 62, 50, 255),
        "surface2": (38, 49, 37, 255),
        "curb": (122, 126, 96, 255),
        "curb_dark": (60, 76, 44, 255),
        "line": (195, 166, 77, 164),
        "seam": (13, 22, 12, 136),
        "glow": (133, 158, 99, 44),
        "tint": (29, 54, 28, 58),
        "detail": "leaves",
    },
    "rainy_yard": {
        "surface": (36, 50, 60, 255),
        "surface2": (19, 32, 42, 255),
        "curb": (89, 99, 106, 255),
        "curb_dark": (32, 43, 50, 255),
        "line": (151, 195, 204, 168),
        "seam": (4, 12, 18, 140),
        "glow": (125, 187, 255, 52),
        "tint": (14, 28, 42, 72),
        "detail": "puddles",
    },
    "underground_parking": {
        "surface": (60, 62, 66, 255),
        "surface2": (39, 42, 47, 255),
        "curb": (130, 132, 128, 255),
        "curb_dark": (63, 65, 67, 255),
        "line": (224, 184, 78, 190),
        "seam": (15, 16, 18, 150),
        "glow": (218, 232, 242, 36),
        "tint": (21, 23, 26, 54),
        "detail": "concrete",
    },
    "business_center": {
        "surface": (52, 60, 70, 255),
        "surface2": (34, 43, 55, 255),
        "curb": (164, 172, 178, 255),
        "curb_dark": (78, 88, 96, 255),
        "line": (190, 202, 218, 178),
        "seam": (13, 18, 24, 132),
        "glow": (120, 173, 255, 46),
        "tint": (12, 23, 34, 48),
        "detail": "clean",
    },
    "old_block_yard": {
        "surface": (76, 72, 62, 255),
        "surface2": (50, 50, 43, 255),
        "curb": (150, 142, 118, 255),
        "curb_dark": (82, 77, 60, 255),
        "line": (178, 148, 76, 145),
        "seam": (24, 23, 18, 142),
        "glow": (124, 174, 114, 38),
        "tint": (55, 43, 28, 54),
        "detail": "cracks",
    },
    "neon_yard": {
        "surface": (25, 28, 45, 255),
        "surface2": (10, 12, 26, 255),
        "curb": (40, 43, 60, 255),
        "curb_dark": (12, 14, 28, 255),
        "line": (88, 242, 255, 205),
        "seam": (4, 8, 18, 150),
        "glow": (184, 104, 255, 78),
        "tint": (24, 8, 48, 66),
        "detail": "neon",
    },
    "holiday_yard": {
        "surface": (70, 52, 49, 255),
        "surface2": (42, 33, 35, 255),
        "curb": (177, 157, 128, 255),
        "curb_dark": (93, 72, 62, 255),
        "line": (255, 209, 102, 184),
        "seam": (24, 15, 14, 136),
        "glow": (255, 122, 134, 64),
        "tint": (58, 24, 18, 56),
        "detail": "holiday",
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
    n = (x * 374761393 + y * 668265263 + seed * 1442695041) & 0xFFFFFFFF
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


def paeth(a, b, c):
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def read_png(path):
    data = Path(path).read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError(f"{path}: not a PNG")
    pos = 8
    width = height = color_type = None
    compressed = []
    while pos < len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        kind = data[pos + 4 : pos + 8]
        chunk = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(">IIBBBBB", chunk)
            if bit_depth != 8 or color_type not in (2, 6) or compression or filter_method or interlace:
                raise RuntimeError(f"{path}: unsupported PNG format")
        elif kind == b"IDAT":
            compressed.append(chunk)
        elif kind == b"IEND":
            break
    channels = 4 if color_type == 6 else 3
    raw = zlib.decompress(b"".join(compressed))
    stride = width * channels
    out = Canvas(width, height)
    prev = bytearray(stride)
    src = 0
    for y in range(height):
        filter_type = raw[src]
        src += 1
        row = bytearray(raw[src : src + stride])
        src += stride
        for i in range(stride):
            left = row[i - channels] if i >= channels else 0
            up = prev[i]
            up_left = prev[i - channels] if i >= channels else 0
            if filter_type == 1:
                row[i] = (row[i] + left) & 255
            elif filter_type == 2:
                row[i] = (row[i] + up) & 255
            elif filter_type == 3:
                row[i] = (row[i] + ((left + up) // 2)) & 255
            elif filter_type == 4:
                row[i] = (row[i] + paeth(left, up, up_left)) & 255
            elif filter_type != 0:
                raise RuntimeError(f"{path}: unsupported PNG filter {filter_type}")
        for x in range(width):
            si = x * channels
            color = (row[si], row[si + 1], row[si + 2], row[si + 3] if channels == 4 else 255)
            out.set_px(x, y, color)
        prev = row
    return out


def sample_bilinear(src, x, y):
    x = max(0, min(src.width - 1, x))
    y = max(0, min(src.height - 1, y))
    x0 = int(math.floor(x))
    y0 = int(math.floor(y))
    x1 = min(src.width - 1, x0 + 1)
    y1 = min(src.height - 1, y0 + 1)
    tx = x - x0
    ty = y - y0
    c00 = src.px(x0, y0)
    c10 = src.px(x1, y0)
    c01 = src.px(x0, y1)
    c11 = src.px(x1, y1)
    top = mix(c00, c10, tx)
    bottom = mix(c01, c11, tx)
    return mix(top, bottom, ty)


def resize_cover(src, width, height):
    scale = max(width / src.width, height / src.height)
    sample_w = width / scale
    sample_h = height / scale
    ox = (src.width - sample_w) / 2
    oy = (src.height - sample_h) / 2
    out = Canvas(width, height)
    for y in range(height):
        sy = oy + (y + 0.5) / scale - 0.5
        for x in range(width):
            sx = ox + (x + 0.5) / scale - 0.5
            out.set_px(x, y, sample_bilinear(src, sx, sy))
    return out


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


def grade_base(canvas, theme):
    tint = theme["tint"]
    for y in range(canvas.height):
        for x in range(canvas.width):
            i = (y * canvas.width + x) * 4
            vignette = math.hypot((x - 512) / 512, (y - 512) / 512)
            darken = max(0, min(0.28, (vignette - 0.35) * 0.24))
            for channel in range(3):
                base = canvas.pixels[i + channel]
                base = base * (1 - darken)
                base = base * (1 - tint[3] / 255) + tint[channel] * (tint[3] / 255)
                canvas.pixels[i + channel] = clamp(base)
            canvas.pixels[i + 3] = 255


def draw_surface_texture(c, x0, y0, x1, y1, theme, seed):
    for y in range(y0, y1):
        t = (y - y0) / max(1, y1 - y0)
        base = mix(theme["surface"], theme["surface2"], t)
        for x in range(x0, x1):
            n = stable_noise(x, y, seed)
            n2 = stable_noise(x // 5, y // 5, seed + 91)
            amount = (n - 0.5) * 18 + (n2 - 0.5) * 10
            c.set_px(x, y, (base[0] + amount, base[1] + amount, base[2] + amount, 255))


def draw_grid(c, theme):
    left, top, right, bottom = GRID["left"], GRID["top"], GRID["right"], GRID["bottom"]
    draw_surface_texture(c, left, top, right, bottom, theme, 17)

    for row in range(6):
        for col in range(6):
            alpha = 10 if (row + col) % 2 == 0 else 4
            fill_rect(c, left + col * CELL + 2, top + row * CELL + 2, CELL - 4, CELL - 4, (255, 255, 255, alpha))

    seam = theme["seam"]
    line = theme["line"]
    for i in range(7):
        x = left + i * CELL
        draw_line(c, x, top, x, bottom, 1.5 if i in (0, 6) else 1.05, seam)
        if i not in (0, 6):
            draw_line(c, x + 1.5, top + 2, x + 1.5, bottom - 2, 0.55, (255, 255, 255, 34))
        y = top + i * CELL
        draw_line(c, left, y, right, y, 1.5 if i in (0, 6) else 1.05, seam)
        if i not in (0, 6):
            draw_line(c, left + 2, y + 1.5, right - 2, y + 1.5, 0.55, (255, 255, 255, 34))

    stroke_rect(c, left, top, right - left, bottom - top, (line[0], line[1], line[2], 64), 1)


def draw_curb_frame(c, theme):
    left, top, right, bottom = GRID["left"], GRID["top"], GRID["right"], GRID["bottom"]
    curb = theme["curb"]
    dark = theme["curb_dark"]
    e = WIDE_EXIT
    outer = {"x": left - 46, "y": top - 46, "w": right - left + 92, "h": bottom - top + 92}
    fill_round_rect(c, outer["x"] - 5, outer["y"] + 6, outer["w"] + 10, outer["h"] + 8, 28, (0, 0, 0, 82))
    fill_round_rect(c, outer["x"], outer["y"], outer["w"], outer["h"], 32, dark)
    fill_round_rect(c, outer["x"] + 8, outer["y"] + 8, outer["w"] - 16, outer["h"] - 16, 24, curb)
    fill_round_rect(c, outer["x"] + 26, outer["y"] + 26, outer["w"] - 52, outer["h"] - 52, 18, (0, 0, 0, 80))

    # Reopen the right-side driveway through the curb. The exit is formed by
    # two curb walls continuing to the right, not by warning-stripe blocks.
    draw_surface_texture(c, e["x"], e["y"], e["right"], e["bottom"], theme, 614)
    fill_rect(c, e["x"], e["y"], e["right"] - e["x"], e["bottom"] - e["y"], (0, 0, 0, 34))

    wall_h = 31
    fill_rect(c, e["x"] - 4, e["y"] - wall_h, e["right"] - e["x"] + 4, wall_h, dark)
    fill_rect(c, e["x"] - 4, e["bottom"], e["right"] - e["x"] + 4, wall_h, dark)
    fill_rect(c, e["x"] - 1, e["y"] - wall_h + 7, e["right"] - e["x"] + 1, wall_h - 10, curb)
    fill_rect(c, e["x"] - 1, e["bottom"] + 3, e["right"] - e["x"] + 1, wall_h - 10, curb)
    fill_rect(c, e["x"] - 4, e["y"] - wall_h, 5, wall_h + 2, (0, 0, 0, 68))
    fill_rect(c, e["x"] - 4, e["bottom"] - 2, 5, wall_h + 2, (0, 0, 0, 68))

    for i in range(8):
        x = left - 34 + i * 100
        fill_rect(c, x, top - 38, 2, 26, (255, 255, 255, 20))
        fill_rect(c, x, bottom + 12, 2, 26, (0, 0, 0, 24))


def draw_wide_exit(c, theme):
    e = WIDE_EXIT
    draw_surface_texture(c, e["x"], e["y"], e["right"], e["bottom"], theme, 313)
    fill_rect(c, e["x"], e["y"], e["right"] - e["x"], e["bottom"] - e["y"], (0, 0, 0, 24))
    fill_rect(c, e["x"], e["y"], e["right"] - e["x"], e["bottom"] - e["y"], (theme["glow"][0], theme["glow"][1], theme["glow"][2], max(10, theme["glow"][3] // 5)))

    wall_h = 31
    curb = theme["curb"]
    dark = theme["curb_dark"]
    fill_rect(c, e["x"], e["y"] - wall_h, e["right"] - e["x"], wall_h, dark)
    fill_rect(c, e["x"], e["bottom"], e["right"] - e["x"], wall_h, dark)
    fill_rect(c, e["x"], e["y"] - wall_h + 7, e["right"] - e["x"], wall_h - 10, curb)
    fill_rect(c, e["x"], e["bottom"] + 3, e["right"] - e["x"], wall_h - 10, curb)
    draw_line(c, e["x"] + 8, e["y"] - 3, e["right"] - 8, e["y"] - 3, 1.0, (255, 255, 255, 26))
    draw_line(c, e["x"] + 8, e["bottom"] + 3, e["right"] - 8, e["bottom"] + 3, 1.0, (0, 0, 0, 58))
    draw_line(c, e["x"] + 2, e["y"] + 10, e["x"] + 2, e["bottom"] - 10, 1.1, (0, 0, 0, 70))


def draw_theme_details(c, theme, yard_id):
    detail = theme["detail"]
    if detail in ("leaves", "holiday"):
        colors = [(159, 104, 38, 135), (201, 157, 63, 120), (76, 112, 55, 130)]
        for i in range(58):
            x = int(stable_noise(i, 4, 5) * BOARD_SIZE)
            y = int(stable_noise(i, 7, 8) * BOARD_SIZE)
            if GRID["left"] - 8 < x < GRID["right"] + 8 and GRID["top"] - 8 < y < GRID["bottom"] + 8:
                continue
            color = colors[i % len(colors)]
            fill_ellipse(c, x, y, 3 + i % 4, 1.4 + i % 3, color)
    if detail == "snow" or yard_id == "holiday_yard":
        snow = (238, 248, 255, 128 if detail == "snow" else 82)
        fill_rect(c, GRID["left"] - 26, GRID["top"] - 24, GRID["right"] - GRID["left"] + 52, 18, snow)
        fill_rect(c, GRID["left"] - 26, GRID["bottom"] + 7, GRID["right"] - GRID["left"] + 52, 18, snow)
        for i in range(38):
            x = int(stable_noise(i, 11, 3) * BOARD_SIZE)
            y = int(stable_noise(i, 13, 7) * BOARD_SIZE)
            if GRID["left"] < x < GRID["right"] and GRID["top"] < y < GRID["bottom"]:
                continue
            fill_ellipse(c, x, y, 8 + i % 9, 3 + i % 5, (240, 250, 255, 72))
    if detail == "puddles":
        for i in range(12):
            x = 40 + int(stable_noise(i, 2, 22) * 930)
            y = 40 + int(stable_noise(i, 5, 24) * 930)
            if GRID["left"] < x < GRID["right"] and GRID["top"] < y < GRID["bottom"]:
                continue
            fill_ellipse(c, x, y, 28 + i % 18, 8 + i % 7, (155, 205, 230, 42))
            fill_ellipse(c, x - 4, y - 2, 14 + i % 10, 2 + i % 3, (255, 255, 255, 34))
    if detail == "lamps":
        for x, y in ((90, 210), (120, 830), (500, 72), (508, 952)):
            fill_ellipse(c, x, y, 48, 48, (theme["glow"][0], theme["glow"][1], theme["glow"][2], 38))
            fill_ellipse(c, x, y, 8, 8, (255, 224, 158, 72))
    if detail == "neon":
        draw_line(c, GRID["left"] + 20, GRID["top"] - 18, GRID["right"] - 28, GRID["top"] - 18, 2.2, (184, 104, 255, 130))
    if detail == "cracks":
        for i in range(16):
            x = GRID["left"] + 35 + int(stable_noise(i, 19, 2) * (GRID["right"] - GRID["left"] - 70))
            y = GRID["top"] + 35 + int(stable_noise(i, 23, 2) * (GRID["bottom"] - GRID["top"] - 70))
            length = 34 + (i % 4) * 13
            draw_line(c, x, y, x + length, y + (i % 5 - 2) * 9, 1.0, (14, 13, 10, 72))
    if detail == "concrete":
        for x, y in ((76, 76), (946, 76), (76, 948), (946, 948)):
            fill_ellipse(c, x, y, 34, 34, (70, 72, 74, 180))
            fill_ellipse(c, x - 6, y - 6, 18, 18, (160, 162, 160, 78))
    if detail == "holiday":
        lights = [(255, 122, 134, 145), (255, 209, 102, 145), (112, 213, 156, 145)]
        for i in range(22):
            x = GRID["left"] + i * ((GRID["right"] - GRID["left"]) / 21)
            fill_ellipse(c, x, GRID["top"] - 42, 5, 5, lights[i % 3])


def draw_skeleton_overlay(c, theme, yard_id):
    draw_curb_frame(c, theme)
    draw_grid(c, theme)
    draw_wide_exit(c, theme)
    draw_theme_details(c, theme, yard_id)


def build_board(yard_id):
    theme = THEMES[yard_id]
    src_path = YARDS_DIR / yard_id / "source" / "board-ai.png"
    if not src_path.exists():
        raise RuntimeError(f"{yard_id}: missing source {src_path}")
    canvas = resize_cover(read_png(src_path), BOARD_SIZE, BOARD_SIZE)
    grade_base(canvas, theme)
    draw_skeleton_overlay(canvas, theme, yard_id)
    return canvas


def build_skeleton_guide():
    c = Canvas(BOARD_SIZE, BOARD_SIZE, (20, 25, 31, 255))
    theme = THEMES["quiet_yard"]
    draw_curb_frame(c, theme)
    draw_grid(c, theme)
    draw_wide_exit(c, theme)
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
            "note": "Wide visual opening intentionally covers most of the right side so AI art does not need one-cell exit precision.",
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
