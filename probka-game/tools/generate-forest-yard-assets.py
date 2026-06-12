#!/usr/bin/env python3
"""Generate the forest parking yard bitmap pack without external packages."""

from __future__ import annotations

import math
import random
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "yards" / "forest_parking"


def clamp(value, low=0, high=255):
    return max(low, min(high, int(round(value))))


def rgba(color):
    if len(color) == 3:
        return color[0], color[1], color[2], 255
    return color


def mix(a, b, t):
    return tuple(clamp(a[i] + (b[i] - a[i]) * t) for i in range(4))


class Canvas:
    def __init__(self, width, height, fill=(0, 0, 0, 0)):
        self.width = int(width)
        self.height = int(height)
        self.pixels = bytearray(self.width * self.height * 4)
        if fill[3]:
            for y in range(self.height):
                for x in range(self.width):
                    self.set_px(x, y, fill)

    def set_px(self, x, y, color):
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return
        i = (y * self.width + x) * 4
        self.pixels[i : i + 4] = bytes(rgba(color))

    def blend_px(self, x, y, color):
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return
        sr, sg, sb, sa = rgba(color)
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

    def copy_from(self, src, dx, dy, dw=None, dh=None):
        dw = int(dw or src.width)
        dh = int(dh or src.height)
        for y in range(dh):
            sy = min(src.height - 1, int(y * src.height / dh))
            for x in range(dw):
                sx = min(src.width - 1, int(x * src.width / dw))
                si = (sy * src.width + sx) * 4
                self.blend_px(dx + x, dy + y, src.pixels[si : si + 4])


def png_chunk(kind, data):
    payload = kind + data
    return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)


def write_png(canvas, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    stride = canvas.width * 4
    for y in range(canvas.height):
        rows.append(b"\x00" + bytes(canvas.pixels[y * stride : (y + 1) * stride]))
    data = b"".join(rows)
    header = struct.pack(">IIBBBBB", canvas.width, canvas.height, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n"
    png += png_chunk(b"IHDR", header)
    png += png_chunk(b"IDAT", zlib.compress(data, 9))
    png += png_chunk(b"IEND", b"")
    path.write_bytes(png)


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


def read_png_rgba(path):
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
            if bit_depth != 8 or color_type != 6 or compression or filter_method or interlace:
                raise RuntimeError(f"{path}: unsupported PNG format")
        elif kind == b"IDAT":
            compressed.append(chunk)
        elif kind == b"IEND":
            break
    raw = zlib.decompress(b"".join(compressed))
    bpp = 4
    stride = width * bpp
    out = Canvas(width, height)
    prev = bytearray(stride)
    src = 0
    for y in range(height):
        filter_type = raw[src]
        src += 1
        row = bytearray(raw[src : src + stride])
        src += stride
        for i in range(stride):
            left = row[i - bpp] if i >= bpp else 0
            up = prev[i]
            up_left = prev[i - bpp] if i >= bpp else 0
            if filter_type == 1:
                row[i] = (row[i] + left) & 255
            elif filter_type == 2:
                row[i] = (row[i] + up) & 255
            elif filter_type == 3:
                row[i] = (row[i] + ((left + up) // 2)) & 255
            elif filter_type == 4:
                row[i] = (row[i] + paeth(left, up, up_left)) & 255
            elif filter_type != 0:
                raise RuntimeError(f"{path}: unsupported filter {filter_type}")
        out.pixels[y * stride : (y + 1) * stride] = row
        prev = row
    return out


def fill_rect(c, x, y, w, h, color):
    for yy in range(max(0, int(y)), min(c.height, int(math.ceil(y + h)))):
        for xx in range(max(0, int(x)), min(c.width, int(math.ceil(x + w)))):
            c.blend_px(xx, yy, color)


def fill_ellipse(c, cx, cy, rx, ry, color):
    x0, x1 = int(cx - rx), int(cx + rx + 1)
    y0, y1 = int(cy - ry), int(cy + ry + 1)
    for y in range(max(0, y0), min(c.height, y1)):
        dy = (y + 0.5 - cy) / max(1, ry)
        for x in range(max(0, x0), min(c.width, x1)):
            dx = (x + 0.5 - cx) / max(1, rx)
            if dx * dx + dy * dy <= 1:
                c.blend_px(x, y, color)


def inside_round_rect(px, py, x, y, w, h, r):
    if px < x or py < y or px > x + w or py > y + h:
        return False
    cx = min(max(px, x + r), x + w - r)
    cy = min(max(py, y + r), y + h - r)
    return (px - cx) * (px - cx) + (py - cy) * (py - cy) <= r * r


def fill_round_rect(c, x, y, w, h, r, color):
    for yy in range(max(0, int(y)), min(c.height, int(math.ceil(y + h)))):
        for xx in range(max(0, int(x)), min(c.width, int(math.ceil(x + w)))):
            if inside_round_rect(xx + 0.5, yy + 0.5, x, y, w, h, r):
                c.blend_px(xx, yy, color)


def fill_round_rect_gradient(c, x, y, w, h, r, top, bottom, horizontal=False):
    for yy in range(max(0, int(y)), min(c.height, int(math.ceil(y + h)))):
        for xx in range(max(0, int(x)), min(c.width, int(math.ceil(x + w)))):
            if inside_round_rect(xx + 0.5, yy + 0.5, x, y, w, h, r):
                t = (xx - x) / max(1, w) if horizontal else (yy - y) / max(1, h)
                c.blend_px(xx, yy, mix(rgba(top), rgba(bottom), t))


def polygon_contains(points, x, y):
    inside = False
    j = len(points) - 1
    for i, point in enumerate(points):
        xi, yi = point
        xj, yj = points[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-6) + xi:
            inside = not inside
        j = i
    return inside


def fill_poly(c, points, color):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    for y in range(max(0, int(min(ys))), min(c.height, int(math.ceil(max(ys))) + 1)):
        for x in range(max(0, int(min(xs))), min(c.width, int(math.ceil(max(xs))) + 1)):
            if polygon_contains(points, x + 0.5, y + 0.5):
                c.blend_px(x, y, color)


def draw_line(c, x1, y1, x2, y2, radius, color):
    steps = max(1, int(math.hypot(x2 - x1, y2 - y1) * 0.45))
    for i in range(steps + 1):
        t = i / steps
        fill_ellipse(c, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, radius, radius, color)


def draw_leaf(c, cx, cy, size, angle, color):
    pts = []
    for px, py in [(0, -1), (0.62, -0.2), (0, 1), (-0.62, -0.2)]:
        ca, sa = math.cos(angle), math.sin(angle)
        pts.append((cx + (px * ca - py * sa) * size, cy + (px * sa + py * ca) * size))
    fill_poly(c, pts, color)
    draw_line(c, pts[0][0], pts[0][1], pts[2][0], pts[2][1], max(1, size * 0.08), (86, 65, 29, 70))


def downsample(src, scale):
    out = Canvas(src.width // scale, src.height // scale)
    area = scale * scale
    for y in range(out.height):
        for x in range(out.width):
            total = [0, 0, 0, 0]
            for sy in range(scale):
                for sx in range(scale):
                    i = ((y * scale + sy) * src.width + (x * scale + sx)) * 4
                    for k in range(4):
                        total[k] += src.pixels[i + k]
            out.set_px(x, y, tuple(clamp(v / area) for v in total))
    return out


def make_board():
    rng = random.Random(701)
    c = Canvas(1024, 1024, (0, 0, 0, 255))
    top = (53, 59, 50, 255)
    mid = (45, 50, 45, 255)
    low = (31, 37, 31, 255)
    for y in range(c.height):
        for x in range(c.width):
            dist_edge = min(x, y, c.width - 1 - x, c.height - 1 - y) / 170
            edge = max(0, 1 - min(1, dist_edge))
            t = y / (c.height - 1)
            base = mix(top, low, t)
            asphalt = mix(base, mid, 0.48)
            noise = rng.randrange(-8, 9) if (x * 13 + y * 7) % 19 == 0 else 0
            moss = edge * 46
            col = (
                clamp(asphalt[0] - edge * 14 + noise * 0.25),
                clamp(asphalt[1] + moss + noise * 0.35),
                clamp(asphalt[2] - edge * 12 + noise * 0.2),
                255,
            )
            c.set_px(x, y, col)

    for i in range(44):
        x = rng.randrange(0, 1024)
        y = rng.randrange(0, 1024)
        if min(x, y, 1024 - x, 1024 - y) > rng.randrange(32, 230):
            continue
        draw_leaf(c, x, y, rng.randrange(8, 20), rng.random() * math.pi, rng.choice([(166, 99, 38, 185), (190, 126, 45, 180), (96, 130, 54, 180), (111, 78, 34, 170)]))

    for i in range(18):
        x = rng.randrange(40, 980)
        y = rng.randrange(35, 990)
        draw_line(c, x, y, x + rng.randrange(-70, 80), y + rng.randrange(-35, 36), rng.randrange(1, 3), (14, 18, 15, 70))

    for y in [240, 555, 790]:
        draw_line(c, 75, y + rng.randrange(-25, 26), 940, y + rng.randrange(-20, 21), 9, (21, 25, 22, 62))
        draw_line(c, 75, y + 36 + rng.randrange(-18, 18), 940, y + 34 + rng.randrange(-18, 18), 6, (22, 28, 23, 42))

    for i in range(7):
        fill_ellipse(c, rng.randrange(60, 950), rng.randrange(60, 950), rng.randrange(18, 48), rng.randrange(7, 18), (14, 20, 17, rng.randrange(28, 55)))
    return c


def draw_wheel(c, x, y, w, h):
    fill_round_rect(c, x, y, w, h, max(4, min(w, h) * 0.25), (14, 16, 15, 230))
    fill_round_rect(c, x + w * 0.24, y + h * 0.18, w * 0.52, h * 0.64, max(2, h * 0.2), (78, 83, 75, 180))


def make_vehicle(width, height, length=2, axis="horizontal"):
    scale = 2
    c = Canvas(width * scale, height * scale)
    W, H = c.width, c.height
    horizontal = axis == "horizontal"
    if horizontal:
        bx, by, bw, bh = W * 0.055, H * 0.19, W * 0.89, H * 0.62
        body_top = (143, 158, 96, 255) if length == 2 else (129, 116, 84, 255)
        body_bottom = (69, 92, 55, 255) if length == 2 else (83, 75, 56, 255)
        fill_ellipse(c, W * 0.5, H * 0.82, W * 0.37, H * 0.075, (0, 0, 0, 58))
        fill_round_rect_gradient(c, bx, by, bw, bh, H * 0.09, body_top, body_bottom)
        fill_round_rect(c, bx + bw * 0.07, by + bh * 0.12, bw * 0.2, bh * 0.26, H * 0.045, (188, 205, 184, 155))
        fill_round_rect(c, bx + bw * 0.34, by + bh * 0.12, bw * 0.22, bh * 0.26, H * 0.045, (167, 190, 174, 135))
        if length == 3:
            fill_round_rect(c, bx + bw * 0.61, by + bh * 0.12, bw * 0.16, bh * 0.24, H * 0.04, (163, 185, 166, 122))
        fill_round_rect(c, bx + bw * 0.79, by + bh * 0.34, bw * 0.12, bh * 0.2, H * 0.04, (223, 207, 116, 200))
        fill_round_rect(c, bx + bw * 0.02, by + bh * 0.42, bw * 0.04, bh * 0.2, H * 0.03, (157, 53, 42, 210))
        draw_wheel(c, bx + bw * 0.12, by + bh * 0.82, W * 0.08, H * 0.04)
        draw_wheel(c, bx + bw * 0.73, by + bh * 0.82, W * 0.08, H * 0.04)
        draw_wheel(c, bx + bw * 0.12, by - H * 0.035, W * 0.08, H * 0.04)
        draw_wheel(c, bx + bw * 0.73, by - H * 0.035, W * 0.08, H * 0.04)
        draw_line(c, bx + bw * 0.09, by + bh * 0.65, bx + bw * 0.86, by + bh * 0.58, H * 0.01, (48, 66, 43, 125))
        leaf_points = [(0.18, 0.17), (0.42, 0.7), (0.66, 0.2), (0.82, 0.68)]
    else:
        bx, by, bw, bh = W * 0.145, H * 0.055, W * 0.71, H * 0.89
        body_top = (129, 116, 84, 255) if length == 3 else (143, 158, 96, 255)
        body_bottom = (69, 92, 55, 255) if length == 2 else (83, 75, 56, 255)
        fill_ellipse(c, W * 0.82, H * 0.5, W * 0.075, H * 0.37, (0, 0, 0, 58))
        fill_round_rect_gradient(c, bx, by, bw, bh, W * 0.09, body_top, body_bottom, horizontal=True)
        fill_round_rect(c, bx + bw * 0.12, by + bh * 0.08, bw * 0.26, bh * 0.19, W * 0.045, (188, 205, 184, 150))
        fill_round_rect(c, bx + bw * 0.12, by + bh * 0.36, bw * 0.26, bh * 0.21, W * 0.045, (167, 190, 174, 132))
        if length == 3:
            fill_round_rect(c, bx + bw * 0.12, by + bh * 0.63, bw * 0.24, bh * 0.16, W * 0.04, (163, 185, 166, 120))
        fill_round_rect(c, bx + bw * 0.35, by + bh * 0.83, bw * 0.2, bh * 0.11, W * 0.04, (223, 207, 116, 200))
        fill_round_rect(c, bx + bw * 0.42, by + bh * 0.02, bw * 0.2, bh * 0.04, W * 0.03, (157, 53, 42, 210))
        draw_wheel(c, bx - W * 0.035, by + bh * 0.14, W * 0.04, H * 0.08)
        draw_wheel(c, bx - W * 0.035, by + bh * 0.72, W * 0.04, H * 0.08)
        draw_wheel(c, bx + bw - W * 0.005, by + bh * 0.14, W * 0.04, H * 0.08)
        draw_wheel(c, bx + bw - W * 0.005, by + bh * 0.72, W * 0.04, H * 0.08)
        draw_line(c, bx + bw * 0.64, by + bh * 0.1, bx + bw * 0.58, by + bh * 0.86, W * 0.01, (48, 66, 43, 125))
        leaf_points = [(0.2, 0.15), (0.67, 0.34), (0.22, 0.62), (0.7, 0.82)]

    rng = random.Random(800 + width + height + length)
    leaf_cols = [(184, 118, 38, 190), (115, 137, 61, 185), (205, 145, 55, 170), (91, 109, 53, 170)]
    for px, py in leaf_points:
        draw_leaf(c, W * px + rng.randrange(-12, 13), H * py + rng.randrange(-10, 11), rng.randrange(10, 19), rng.random() * math.pi, rng.choice(leaf_cols))
    fill_round_rect(c, bx + bw * 0.12, by + bh * 0.08, bw * 0.48 if horizontal else bw * 0.16, bh * 0.06 if horizontal else bh * 0.5, max(3, H * 0.018), (230, 225, 188, 55))
    return downsample(c, scale)


def make_bin():
    scale = 2
    c = Canvas(512 * scale, 512 * scale)
    W, H = c.width, c.height
    fill_ellipse(c, W * 0.5, H * 0.81, W * 0.3, H * 0.06, (0, 0, 0, 58))
    fill_round_rect_gradient(c, W * 0.25, H * 0.27, W * 0.5, H * 0.54, W * 0.06, (62, 115, 66, 255), (24, 68, 42, 255))
    fill_round_rect(c, W * 0.22, H * 0.19, W * 0.56, H * 0.13, W * 0.05, (65, 102, 53, 255))
    fill_round_rect(c, W * 0.32, H * 0.35, W * 0.08, H * 0.42, W * 0.02, (100, 146, 82, 70))
    fill_round_rect(c, W * 0.61, H * 0.35, W * 0.07, H * 0.42, W * 0.02, (15, 35, 24, 65))
    fill_ellipse(c, W * 0.32, H * 0.83, W * 0.06, H * 0.04, (20, 22, 18, 220))
    fill_ellipse(c, W * 0.68, H * 0.83, W * 0.06, H * 0.04, (20, 22, 18, 220))
    for x, y in [(0.35, 0.22), (0.52, 0.24), (0.62, 0.2)]:
        draw_leaf(c, W * x, H * y, W * 0.035, 0.4 + x, (179, 111, 35, 210))
    return downsample(c, scale)


def make_cone():
    scale = 2
    c = Canvas(512 * scale, 512 * scale)
    W, H = c.width, c.height
    fill_ellipse(c, W * 0.5, H * 0.82, W * 0.28, H * 0.07, (0, 0, 0, 54))
    fill_round_rect(c, W * 0.23, H * 0.75, W * 0.54, H * 0.1, W * 0.035, (73, 52, 31, 255))
    fill_poly(c, [(W * 0.5, H * 0.14), (W * 0.74, H * 0.77), (W * 0.26, H * 0.77)], (224, 115, 37, 255))
    fill_poly(c, [(W * 0.5, H * 0.14), (W * 0.61, H * 0.77), (W * 0.41, H * 0.77)], (249, 157, 61, 95))
    fill_round_rect(c, W * 0.38, H * 0.39, W * 0.24, H * 0.07, W * 0.02, (244, 238, 208, 230))
    fill_round_rect(c, W * 0.33, H * 0.58, W * 0.34, H * 0.075, W * 0.02, (244, 238, 208, 230))
    for x, y in [(0.27, 0.76), (0.7, 0.78), (0.5, 0.84)]:
        draw_leaf(c, W * x, H * y, W * 0.03, y * 4, (128, 85, 33, 180))
    return downsample(c, scale)


def make_gate():
    scale = 2
    c = Canvas(512 * scale, 512 * scale)
    W, H = c.width, c.height
    fill_ellipse(c, W * 0.5, H * 0.82, W * 0.34, H * 0.07, (0, 0, 0, 58))
    fill_round_rect_gradient(c, W * 0.18, H * 0.38, W * 0.64, H * 0.18, W * 0.035, (139, 91, 46, 255), (89, 55, 30, 255))
    for x in [0.24, 0.69]:
        fill_round_rect(c, W * x, H * 0.26, W * 0.075, H * 0.5, W * 0.03, (93, 66, 40, 255))
        fill_ellipse(c, W * (x + 0.037), H * 0.32, W * 0.025, H * 0.025, (31, 28, 24, 230))
    for x in [0.3, 0.48, 0.66]:
        draw_line(c, W * x, H * 0.41, W * (x + 0.1), H * 0.54, W * 0.018, (218, 145, 44, 220))
    draw_line(c, W * 0.2, H * 0.59, W * 0.8, H * 0.59, W * 0.012, (45, 33, 22, 90))
    for x, y in [(0.18, 0.62), (0.82, 0.56), (0.54, 0.34)]:
        draw_leaf(c, W * x, H * y, W * 0.035, x * 6, (118, 139, 63, 180))
    return downsample(c, scale)


def make_leaf_pile():
    scale = 2
    c = Canvas(512 * scale, 512 * scale)
    W, H = c.width, c.height
    fill_ellipse(c, W * 0.52, H * 0.74, W * 0.32, H * 0.08, (0, 0, 0, 48))
    rng = random.Random(966)
    fill_ellipse(c, W * 0.5, H * 0.61, W * 0.3, H * 0.19, (103, 83, 38, 140))
    for i in range(72):
        x = W * 0.5 + rng.randrange(-180, 181)
        y = H * 0.55 + rng.randrange(-142, 132)
        s = rng.randrange(28, 64)
        col = rng.choice([(183, 103, 36, 235), (211, 147, 54, 230), (108, 133, 59, 225), (137, 82, 37, 225), (226, 176, 75, 220)])
        draw_leaf(c, x, y, s, rng.random() * math.pi, col)
    draw_line(c, W * 0.24, H * 0.72, W * 0.72, H * 0.56, W * 0.018, (92, 55, 31, 170))
    draw_line(c, W * 0.35, H * 0.64, W * 0.76, H * 0.72, W * 0.015, (79, 47, 25, 150))
    return downsample(c, scale)


def bbox(canvas):
    min_x, min_y = canvas.width, canvas.height
    max_x, max_y = -1, -1
    for y in range(canvas.height):
        for x in range(canvas.width):
            if canvas.pixels[(y * canvas.width + x) * 4 + 3] > 12:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    return min_x, min_y, max_x, max_y


def validate_sprite(name, canvas, min_fill=0.48):
    x0, y0, x1, y1 = bbox(canvas)
    if x1 < x0:
        raise RuntimeError(f"{name}: transparent sprite")
    bw = (x1 - x0 + 1) / canvas.width
    bh = (y1 - y0 + 1) / canvas.height
    if bw < min_fill or bh < min_fill:
        raise RuntimeError(f"{name}: object too small ({bw:.2f} x {bh:.2f})")
    if x0 <= 1 or y0 <= 1 or x1 >= canvas.width - 2 or y1 >= canvas.height - 2:
        raise RuntimeError(f"{name}: object touches the edge {x0,y0,x1,y1}")
    print(f"{name}: {canvas.width}x{canvas.height}, bbox={x0,y0,x1,y1}, fill={bw:.2f}x{bh:.2f}")


def make_montage(assets):
    c = Canvas(1800, 1180, (11, 16, 14, 255))
    c.copy_from(assets["board"], 60, 60, 760, 760)
    c.copy_from(assets["car2h"], 900, 70, 560, 280)
    c.copy_from(assets["van3h"], 870, 380, 760, 254)
    c.copy_from(assets["car2v"], 1500, 70, 220, 440)
    x = 860
    for key in ["bin", "cone", "gate", "leaf"]:
        c.copy_from(assets[key], x, 760, 180, 180)
        x += 210
    return c


def main():
    assets = {
        "board": make_board(),
        "car2h": make_vehicle(768, 384, 2, "horizontal"),
        "car2v": make_vehicle(384, 768, 2, "vertical"),
        "van3h": make_vehicle(1152, 384, 3, "horizontal"),
        "van3v": make_vehicle(384, 1152, 3, "vertical"),
        "bin": make_bin(),
        "cone": make_cone(),
        "gate": make_gate(),
        "leaf": make_leaf_pile(),
    }

    validate_sprite("forest-car-2-h", assets["car2h"], 0.72)
    validate_sprite("forest-car-2-v", assets["car2v"], 0.72)
    validate_sprite("forest-van-3-h", assets["van3h"], 0.75)
    validate_sprite("forest-van-3-v", assets["van3v"], 0.75)
    for key in ["bin", "cone", "gate", "leaf"]:
        validate_sprite(f"obstacle-{key}", assets[key], 0.42)

    write_png(assets["board"], OUT / "board.png")
    write_png(assets["car2h"], OUT / "traffic" / "forest-car-2-h.png")
    write_png(assets["car2v"], OUT / "traffic" / "forest-car-2-v.png")
    write_png(assets["van3h"], OUT / "traffic" / "forest-van-3-h.png")
    write_png(assets["van3v"], OUT / "traffic" / "forest-van-3-v.png")
    write_png(assets["bin"], OUT / "obstacles" / "bin.png")
    write_png(assets["cone"], OUT / "obstacles" / "cone.png")
    write_png(assets["gate"], OUT / "obstacles" / "gate.png")
    write_png(assets["leaf"], OUT / "obstacles" / "leaf-pile.png")
    write_png(make_montage(assets), OUT / "qa" / "forest-pack-montage.png")


if __name__ == "__main__":
    main()
