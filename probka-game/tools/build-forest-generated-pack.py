#!/usr/bin/env python3
"""Build the forest parking asset pack from generated source sheets.

The source sheets are original generated images saved under
assets/yards/forest_parking/source/. Runtime assets are alpha PNGs with
stable cell-friendly dimensions.
"""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "yards" / "forest_parking"
SRC = OUT / "source"

BOARD_SOURCE = SRC / "forest-board-source.png"
VEHICLE_SOURCE = SRC / "forest-vehicles-source.png"
OBSTACLE_SOURCE = SRC / "forest-obstacles-source.png"


def clamp(value, low=0, high=255):
    return max(low, min(high, int(round(value))))


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
    idat = []
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
            idat.append(payload)
        elif kind == b"IEND":
            break
    raw = zlib.decompress(b"".join(idat))
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


def crop(src, x, y, w, h):
    out = Canvas(w, h)
    for py in range(h):
        for px in range(w):
            out.set_px(px, py, src.px(x + px, y + py))
    return out


def resize(src, width, height):
    out = Canvas(width, height)
    for y in range(height):
        sy = min(src.height - 1, int((y + 0.5) * src.height / height))
        for x in range(width):
            sx = min(src.width - 1, int((x + 0.5) * src.width / width))
            out.set_px(x, y, src.px(sx, sy))
    return out


def remove_chroma(src, key=(255, 0, 255)):
    out = Canvas(src.width, src.height)
    kr, kg, kb = key
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = src.px(x, y)
            dist = math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)
            magenta_bias = r > 105 and b > 105 and g < min(r, b) * 0.7 and (r + b - 2 * g) > 110
            alpha = 0 if dist < 70 else 255
            if 70 <= dist < 170:
                alpha = clamp((dist - 70) / 100 * 255)
            if magenta_bias:
                alpha = 0
            if alpha <= 0:
                out.set_px(x, y, (0, 0, 0, 0))
            else:
                # Soft despill from magenta antialiasing.
                if magenta_bias:
                    neutral = max(18, min(75, g + 24))
                    r = clamp(neutral)
                    b = clamp(neutral + 4)
                else:
                    r = clamp(min(r, max(g, b) + 48))
                    b = clamp(min(b, max(r, g) + 48))
                out.set_px(x, y, (r, g, b, alpha * a / 255))
    return out


def bbox(src, min_alpha=12):
    x0, y0, x1, y1 = src.width, src.height, -1, -1
    for y in range(src.height):
        for x in range(src.width):
            if src.px(x, y)[3] >= min_alpha:
                x0 = min(x0, x)
                y0 = min(y0, y)
                x1 = max(x1, x)
                y1 = max(y1, y)
    return x0, y0, x1, y1


def auto_crop_alpha(src, padding=12):
    x0, y0, x1, y1 = bbox(src)
    if x1 < x0:
        return src
    x0 = max(0, x0 - padding)
    y0 = max(0, y0 - padding)
    x1 = min(src.width - 1, x1 + padding)
    y1 = min(src.height - 1, y1 + padding)
    return crop(src, x0, y0, x1 - x0 + 1, y1 - y0 + 1)


def fit_to_canvas(src, width, height, scale=0.92):
    cropped = auto_crop_alpha(src)
    target_w = int(width * scale)
    target_h = int(height * scale)
    ratio = min(target_w / cropped.width, target_h / cropped.height)
    fitted = resize(cropped, max(1, int(cropped.width * ratio)), max(1, int(cropped.height * ratio)))
    out = Canvas(width, height)
    dx = (width - fitted.width) // 2
    dy = (height - fitted.height) // 2
    blit(out, fitted, dx, dy)
    return out


def clean_magenta_fringe(src):
    out = Canvas(src.width, src.height)
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = src.px(x, y)
            bright_key = r > 65 and b > 65 and g < 95 and (r + b - 2 * g) > 105
            dark_key_shadow = g < 45 and r > g + 28 and b > g + 24 and (r + b - 2 * g) > 52
            contaminated = bright_key or dark_key_shadow
            if contaminated:
                out.set_px(x, y, (0, 0, 0, 0))
            else:
                out.set_px(x, y, (r, g, b, a))
    return out


def blit(dst, src, dx, dy):
    for y in range(src.height):
        for x in range(src.width):
            dst.blend_px(dx + x, dy + y, src.px(x, y))


def validate_alpha(path, min_pixels=1000):
    img = read_png(path)
    x0, y0, x1, y1 = bbox(img)
    alpha_pixels = 0
    for y in range(img.height):
        for x in range(img.width):
            if img.px(x, y)[3] > 20:
                alpha_pixels += 1
    if alpha_pixels < min_pixels:
        raise RuntimeError(f"{path}: too few visible pixels ({alpha_pixels})")
    if x0 <= 0 or y0 <= 0 or x1 >= img.width - 1 or y1 >= img.height - 1:
        raise RuntimeError(f"{path}: sprite touches edge ({x0},{y0},{x1},{y1})")


def make_montage():
    board = read_png(OUT / "board.png")
    board = resize(board, 360, 360)
    sheet = Canvas(1280, 820, (9, 12, 16, 255))
    blit(sheet, board, 28, 28)

    x = 430
    y = 42
    for name in ["forest-car-2-h.png", "forest-van-3-h.png", "forest-car-2-v.png", "forest-van-3-v.png"]:
        sprite = read_png(OUT / "traffic" / name)
        w = 300 if sprite.width > sprite.height else 128
        h = 128 if sprite.width > sprite.height else 300
        if name == "forest-van-3-v.png":
            h = 330
        blit(sheet, resize(sprite, w, h), x, y)
        x += w + 34
        if x > 1040:
            x = 430
            y += 360

    x = 34
    y = 450
    for name in ["bin.png", "cone.png", "gate.png", "leaf-pile.png"]:
        sprite = read_png(OUT / "obstacles" / name)
        blit(sheet, resize(sprite, 150, 150), x, y)
        x += 180
    write_png(sheet, OUT / "qa" / "forest-generated-pack-montage.png")


def main():
    board = read_png(BOARD_SOURCE)
    write_png(resize(board, 1024, 1024), OUT / "board.png")

    vehicle_sheet = remove_chroma(read_png(VEHICLE_SOURCE))
    vehicle_specs = {
        "forest-car-2-h.png": (36, 132, 388, 238, 768, 384, 0.94),
        "forest-van-3-h.png": (440, 130, 410, 238, 1152, 384, 0.94),
        "forest-pickup-2-h.png": (440, 130, 410, 238, 768, 384, 0.94),
        "forest-sedan-2-h.png": (865, 136, 355, 224, 768, 384, 0.94),
        "forest-car-2-v.png": (42, 500, 350, 585, 384, 768, 0.94),
        "forest-pickup-2-v.png": (428, 510, 340, 575, 384, 768, 0.94),
        "forest-van-3-v.png": (862, 440, 348, 690, 384, 1152, 0.94),
    }
    traffic_dir = OUT / "traffic"
    for filename, (x, y, w, h, out_w, out_h, scale) in vehicle_specs.items():
        sprite = crop(vehicle_sheet, x, y, w, h)
        write_png(clean_magenta_fringe(fit_to_canvas(sprite, out_w, out_h, scale)), traffic_dir / filename)

    # Runtime currently has one horizontal 2-cell and one vertical 2-cell traffic asset.
    # Keep them as the beige SUV; extra generated variants are retained for future polish.
    write_png(read_png(traffic_dir / "forest-car-2-h.png"), traffic_dir / "forest-car-2-h.png")
    write_png(read_png(traffic_dir / "forest-car-2-v.png"), traffic_dir / "forest-car-2-v.png")
    write_png(read_png(traffic_dir / "forest-van-3-h.png"), traffic_dir / "forest-van-3-h.png")
    write_png(read_png(traffic_dir / "forest-van-3-v.png"), traffic_dir / "forest-van-3-v.png")

    obstacle_sheet = remove_chroma(read_png(OBSTACLE_SOURCE))
    obstacle_specs = {
        "bin.png": (35, 430, 280, 370, 512, 512, 0.9),
        "cone.png": (335, 405, 265, 355, 512, 512, 0.9),
        "gate.png": (585, 455, 330, 290, 512, 512, 0.9),
        "leaf-pile.png": (925, 430, 300, 330, 512, 512, 0.9),
    }
    obstacle_dir = OUT / "obstacles"
    for filename, (x, y, w, h, out_w, out_h, scale) in obstacle_specs.items():
        sprite = crop(obstacle_sheet, x, y, w, h)
        final = clean_magenta_fringe(fit_to_canvas(sprite, out_w, out_h, scale))
        path = obstacle_dir / filename
        write_png(final, path)
        validate_alpha(path)

    for filename in ["forest-car-2-h.png", "forest-car-2-v.png", "forest-van-3-h.png", "forest-van-3-v.png"]:
        validate_alpha(traffic_dir / filename)

    make_montage()
    print(f"Built forest generated pack: {OUT}")
    print(f"QA montage: {OUT / 'qa' / 'forest-generated-pack-montage.png'}")


if __name__ == "__main__":
    main()
