#!/usr/bin/env python3
"""Build the forest parking asset pack from the approved reference crops."""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TMP = Path("/private/tmp/probka-forest-ref")
OUT = ROOT / "assets" / "yards" / "forest_parking"
BASE = ROOT / "assets" / "traffic" / "base"


def clamp(value, low=0, high=255):
    return max(low, min(high, int(round(value))))


def smoothstep(edge0, edge1, x):
    if edge0 == edge1:
        return 1 if x >= edge1 else 0
    t = max(0, min(1, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)


class Canvas:
    def __init__(self, width, height, fill=(0, 0, 0, 0)):
        self.width = width
        self.height = height
        self.pixels = bytearray(width * height * 4)
        if fill[3]:
            for y in range(height):
                for x in range(width):
                    self.set_px(x, y, fill)

    def px(self, x, y):
        i = (y * self.width + x) * 4
        return tuple(self.pixels[i : i + 4])

    def set_px(self, x, y, color):
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return
        i = (y * self.width + x) * 4
        self.pixels[i : i + 4] = bytes(tuple(clamp(v) for v in color))

    def blend_px(self, x, y, color):
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return
        sr, sg, sb, sa = tuple(clamp(v) for v in color)
        if sa <= 0:
            return
        i = (y * self.width + x) * 4
        dr, dg, db, da = self.pixels[i], self.pixels[i + 1], self.pixels[i + 2], self.pixels[i + 3]
        s = sa / 255
        d = da / 255
        out_a = s + d * (1 - s)
        if out_a <= 0:
            return
        self.pixels[i] = clamp((sr * s + dr * d * (1 - s)) / out_a)
        self.pixels[i + 1] = clamp((sg * s + dg * d * (1 - s)) / out_a)
        self.pixels[i + 2] = clamp((sb * s + db * d * (1 - s)) / out_a)
        self.pixels[i + 3] = clamp(out_a * 255)

    def copy_from(self, src, dx, dy, dw=None, dh=None):
        dw = dw or src.width
        dh = dh or src.height
        for y in range(dh):
            sy = min(src.height - 1, int(y * src.height / dh))
            for x in range(dw):
                sx = min(src.width - 1, int(x * src.width / dw))
                self.blend_px(dx + x, dy + y, src.px(sx, sy))


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
        raise RuntimeError(f"{path}: not PNG")
    pos = 8
    width = height = color_type = None
    chunks = []
    while pos < len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        kind = data[pos + 4 : pos + 8]
        payload = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(">IIBBBBB", payload)
            if bit_depth != 8 or color_type not in (2, 6) or compression or filter_method or interlace:
                raise RuntimeError(f"{path}: unsupported PNG")
        elif kind == b"IDAT":
            chunks.append(payload)
        elif kind == b"IEND":
            break
    raw = zlib.decompress(b"".join(chunks))
    channels = 4 if color_type == 6 else 3
    stride = width * channels
    prev = bytearray(stride)
    src = 0
    canvas = Canvas(width, height)
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
                raise RuntimeError(f"{path}: unsupported filter")
        for x in range(width):
            i = x * channels
            if channels == 4:
                canvas.set_px(x, y, (row[i], row[i + 1], row[i + 2], row[i + 3]))
            else:
                canvas.set_px(x, y, (row[i], row[i + 1], row[i + 2], 255))
        prev = row
    return canvas


def png_chunk(kind, payload):
    data = kind + payload
    return struct.pack(">I", len(payload)) + data + struct.pack(">I", zlib.crc32(data) & 0xFFFFFFFF)


def write_png(canvas, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    stride = canvas.width * 4
    for y in range(canvas.height):
        rows.append(b"\x00" + bytes(canvas.pixels[y * stride : (y + 1) * stride]))
    payload = zlib.compress(b"".join(rows), 9)
    header = struct.pack(">IIBBBBB", canvas.width, canvas.height, 8, 6, 0, 0, 0)
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", header) + png_chunk(b"IDAT", payload) + png_chunk(b"IEND", b""))


def bbox(canvas, min_alpha=16):
    x0, y0, x1, y1 = canvas.width, canvas.height, -1, -1
    for y in range(canvas.height):
        for x in range(canvas.width):
            if canvas.px(x, y)[3] >= min_alpha:
                x0 = min(x0, x)
                y0 = min(y0, y)
                x1 = max(x1, x)
                y1 = max(y1, y)
    return x0, y0, x1, y1


def remove_dark_background(src):
    bg_samples = []
    for x, y in [(4, 4), (src.width - 5, 4), (4, src.height - 5), (src.width - 5, src.height - 5)]:
        bg_samples.append(src.px(x, y))
    bg = tuple(sum(sample[i] for sample in bg_samples) / len(bg_samples) for i in range(3))
    out = Canvas(src.width, src.height)
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = src.px(x, y)
            dist = math.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2)
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            sat = max(r, g, b) - min(r, g, b)
            keep = smoothstep(16, 50, dist)
            if lum > 42 and sat > 16:
                keep = max(keep, 0.72)
            if lum > 70:
                keep = max(keep, 0.9)
            alpha = clamp(a * keep)
            out.set_px(x, y, (r, g, b, alpha))
    return out


def tint_vehicle(src, target):
    out = Canvas(src.width, src.height)
    tr, tg, tb = target
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = src.px(x, y)
            if a < 8:
                out.set_px(x, y, (r, g, b, a))
                continue
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            sat = max(r, g, b) - min(r, g, b)
            is_window = b > r + 16 and b > g + 4 and lum < 145
            is_light = (r > 170 and g > 120 and b < 105) or (r > 160 and g < 80 and b < 80)
            if is_window or is_light or lum < 34 or sat > 80:
                out.set_px(x, y, (r, g, b, a))
                continue
            shade = max(0.34, min(1.25, lum / 190))
            nr = clamp(tr * shade)
            ng = clamp(tg * shade)
            nb = clamp(tb * shade)
            strength = 0.72 if lum > 105 else 0.42
            out.set_px(x, y, (
                clamp(r * (1 - strength) + nr * strength),
                clamp(g * (1 - strength) + ng * strength),
                clamp(b * (1 - strength) + nb * strength),
                a
            ))
    return out


def fill_ellipse(canvas, cx, cy, rx, ry, color):
    for y in range(max(0, int(cy - ry)), min(canvas.height, int(cy + ry + 1))):
        dy = (y + 0.5 - cy) / max(1, ry)
        for x in range(max(0, int(cx - rx)), min(canvas.width, int(cx + rx + 1))):
            dx = (x + 0.5 - cx) / max(1, rx)
            if dx * dx + dy * dy <= 1:
                canvas.blend_px(x, y, color)


def draw_leaf(canvas, cx, cy, size, angle, color):
    ca, sa = math.cos(angle), math.sin(angle)
    pts = []
    for px, py in [(0, -1), (0.7, -0.12), (0, 1), (-0.7, -0.12)]:
        pts.append((cx + (px * ca - py * sa) * size, cy + (px * sa + py * ca) * size))
    min_x = max(0, int(min(p[0] for p in pts)))
    max_x = min(canvas.width, int(max(p[0] for p in pts)) + 1)
    min_y = max(0, int(min(p[1] for p in pts)))
    max_y = min(canvas.height, int(max(p[1] for p in pts)) + 1)
    for y in range(min_y, max_y):
        for x in range(min_x, max_x):
            inside = False
            j = len(pts) - 1
            for i, (xi, yi) in enumerate(pts):
                xj, yj = pts[j]
                if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-6) + xi:
                    inside = not inside
                j = i
            if inside:
                canvas.blend_px(x, y, color)


def add_vehicle_leaves(canvas, axis, length):
    points = [(0.28, 0.18, -0.4), (0.64, 0.72, 0.5), (0.82, 0.22, 0.2)] if axis == "h" else [(0.32, 0.2, -0.3), (0.72, 0.58, 0.45), (0.36, 0.82, 0.1)]
    if length == 3:
        points.append((0.46, 0.44, -0.1))
    for i, (x, y, angle) in enumerate(points):
        draw_leaf(canvas, canvas.width * x, canvas.height * y, min(canvas.width, canvas.height) * (0.028 + i * 0.004), angle, (190, 117, 34, 165))
        fill_ellipse(canvas, canvas.width * x, canvas.height * y, min(canvas.width, canvas.height) * 0.016, min(canvas.width, canvas.height) * 0.006, (60, 82, 35, 90))


def validate(name, canvas, min_w, min_h):
    x0, y0, x1, y1 = bbox(canvas)
    if x1 < x0:
        raise RuntimeError(f"{name}: empty")
    fw = (x1 - x0 + 1) / canvas.width
    fh = (y1 - y0 + 1) / canvas.height
    if fw < min_w or fh < min_h:
        raise RuntimeError(f"{name}: too small {fw:.2f}x{fh:.2f}")
    if x0 <= 0 or y0 <= 0 or x1 >= canvas.width - 1 or y1 >= canvas.height - 1:
        raise RuntimeError(f"{name}: touches edge {(x0, y0, x1, y1)}")
    print(f"{name}: {canvas.width}x{canvas.height} bbox={(x0, y0, x1, y1)} fill={fw:.2f}x{fh:.2f}")


def make_montage(items):
    c = Canvas(1800, 1180, (13, 15, 18, 255))
    c.copy_from(items["board"], 40, 40, 780, 780)
    c.copy_from(items["car2h"], 910, 90, 560, 280)
    c.copy_from(items["van3h"], 875, 405, 720, 240)
    c.copy_from(items["car2v"], 1500, 95, 220, 440)
    x = 845
    for key in ["bin", "cone", "gate", "leaf"]:
        c.copy_from(items[key], x, 760, 185, 185)
        x += 220
    return c


def main():
    board = read_png(TMP / "swift-board.png")
    surface = read_png(TMP / "swift-surface.png")
    bin_sprite = remove_dark_background(read_png(TMP / "bin.png"))
    cone_sprite = remove_dark_background(read_png(TMP / "cone.png"))
    gate_sprite = remove_dark_background(read_png(TMP / "gate.png"))
    leaf_sprite = remove_dark_background(read_png(TMP / "leaf.png"))

    car2h = tint_vehicle(read_png(BASE / "base-car-2-h.png"), (118, 145, 76))
    car2v = tint_vehicle(read_png(BASE / "base-car-2-v.png"), (205, 151, 47))
    van3h = tint_vehicle(read_png(BASE / "base-van-3-h.png"), (184, 157, 103))
    van3v = tint_vehicle(read_png(BASE / "base-van-3-v.png"), (128, 151, 86))
    add_vehicle_leaves(car2h, "h", 2)
    add_vehicle_leaves(car2v, "v", 2)
    add_vehicle_leaves(van3h, "h", 3)
    add_vehicle_leaves(van3v, "v", 3)

    validate("forest-car-2-h", car2h, 0.78, 0.62)
    validate("forest-car-2-v", car2v, 0.62, 0.78)
    validate("forest-van-3-h", van3h, 0.8, 0.62)
    validate("forest-van-3-v", van3v, 0.62, 0.8)
    for name, sprite in [("bin", bin_sprite), ("cone", cone_sprite), ("gate", gate_sprite), ("leaf", leaf_sprite)]:
        validate(name, sprite, 0.35, 0.35)

    write_png(board, OUT / "board.png")
    write_png(surface, OUT / "surface.png")
    write_png(car2h, OUT / "traffic" / "forest-car-2-h.png")
    write_png(car2v, OUT / "traffic" / "forest-car-2-v.png")
    write_png(van3h, OUT / "traffic" / "forest-van-3-h.png")
    write_png(van3v, OUT / "traffic" / "forest-van-3-v.png")
    write_png(bin_sprite, OUT / "obstacles" / "bin.png")
    write_png(cone_sprite, OUT / "obstacles" / "cone.png")
    write_png(gate_sprite, OUT / "obstacles" / "gate.png")
    write_png(leaf_sprite, OUT / "obstacles" / "leaf-pile.png")
    write_png(make_montage({"board": board, "car2h": car2h, "car2v": car2v, "van3h": van3h, "van3v": van3v, "bin": bin_sprite, "cone": cone_sprite, "gate": gate_sprite, "leaf": leaf_sprite}), OUT / "qa" / "forest-reference-pack-montage.png")


if __name__ == "__main__":
    main()
