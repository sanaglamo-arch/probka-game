#!/usr/bin/env python3
"""Normalize visible PNG sprite footprints to the project asset standard."""

from __future__ import annotations

import argparse
import math
import re
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


TARGETS = {
    "skin": (384, 768, 312, 700),
    "car-2-h": (768, 384, 720, 310),
    "car-2-v": (384, 768, 310, 720),
    "van-3-h": (1152, 384, 1088, 310),
    "van-3-v": (384, 1152, 310, 1088),
    "truck-4-h": (1536, 384, 1452, 310),
    "truck-4-v": (384, 1536, 310, 1452),
    "obstacle-bin": (512, 512, 360, 390),
    "obstacle-cone": (512, 512, 384, 416),
    "obstacle-gate": (512, 512, 430, 170),
    "obstacle-block": (512, 512, 380, 330),
    "obstacle": (512, 512, 380, 330),
}


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
        self.pixels[i : i + 4] = bytes(clamp(v) for v in color)

    def blend_px(self, x, y, color):
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return
        sr, sg, sb, sa = [clamp(v) for v in color]
        if sa <= 0:
            return
        i = (y * self.width + x) * 4
        dr, dg, db, da = self.pixels[i], self.pixels[i + 1], self.pixels[i + 2], self.pixels[i + 3]
        s = sa / 255.0
        d = da / 255.0
        out_a = s + d * (1 - s)
        if out_a <= 0:
            return
        self.pixels[i] = clamp((sr * s + dr * d * (1 - s)) / out_a)
        self.pixels[i + 1] = clamp((sg * s + dg * d * (1 - s)) / out_a)
        self.pixels[i + 2] = clamp((sb * s + db * d * (1 - s)) / out_a)
        self.pixels[i + 3] = clamp(out_a * 255)


def clamp(value, low=0, high=255):
    return max(low, min(high, int(round(value))))


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


def read_png(path: Path) -> Canvas:
    data = path.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError(f"{path}: not a PNG")
    pos = 8
    width = height = color_type = None
    compressed = []
    while pos < len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        kind = data[pos + 4 : pos + 8]
        payload = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(">IIBBBBB", payload)
            if bit_depth != 8 or color_type not in (2, 6) or compression or filter_method or interlace:
                raise RuntimeError(f"{path}: unsupported PNG format")
        elif kind == b"IDAT":
            compressed.append(payload)
        elif kind == b"IEND":
            break
    if width is None or height is None or color_type is None:
        raise RuntimeError(f"{path}: missing PNG header")
    channels = 4 if color_type == 6 else 3
    raw = zlib.decompress(b"".join(compressed))
    stride = width * channels
    previous = bytearray(stride)
    source = 0
    canvas = Canvas(width, height)
    for y in range(height):
        filter_type = raw[source]
        source += 1
        row = bytearray(raw[source : source + stride])
        source += stride
        for i in range(stride):
            left = row[i - channels] if i >= channels else 0
            up = previous[i]
            up_left = previous[i - channels] if i >= channels else 0
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
            di = (y * width + x) * 4
            canvas.pixels[di] = row[si]
            canvas.pixels[di + 1] = row[si + 1]
            canvas.pixels[di + 2] = row[si + 2]
            canvas.pixels[di + 3] = row[si + 3] if channels == 4 else 255
        previous = row
    return canvas


def png_chunk(kind, data):
    payload = kind + data
    return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)


def write_png(canvas: Canvas, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    stride = canvas.width * 4
    raw = b"".join(b"\x00" + bytes(canvas.pixels[y * stride : (y + 1) * stride]) for y in range(canvas.height))
    header = struct.pack(">IIBBBBB", canvas.width, canvas.height, 8, 6, 0, 0, 0)
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", header)
        + png_chunk(b"IDAT", zlib.compress(raw, 6))
        + png_chunk(b"IEND", b"")
    )


def alpha_bounds(canvas: Canvas, threshold=12):
    min_x = canvas.width
    min_y = canvas.height
    max_x = -1
    max_y = -1
    for y in range(canvas.height):
        row = y * canvas.width * 4
        for x in range(canvas.width):
            if canvas.pixels[row + x * 4 + 3] <= threshold:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    if max_x < min_x:
        return None
    return min_x, min_y, max_x, max_y


def crop(canvas: Canvas, box):
    x0, y0, x1, y1 = box
    out = Canvas(x1 - x0 + 1, y1 - y0 + 1)
    for y in range(out.height):
        src = ((y0 + y) * canvas.width + x0) * 4
        dst = y * out.width * 4
        out.pixels[dst : dst + out.width * 4] = canvas.pixels[src : src + out.width * 4]
    return out


def sample_bilinear(src: Canvas, x, y):
    x = max(0, min(src.width - 1, x))
    y = max(0, min(src.height - 1, y))
    x0 = int(math.floor(x))
    y0 = int(math.floor(y))
    x1 = min(src.width - 1, x0 + 1)
    y1 = min(src.height - 1, y0 + 1)
    tx = x - x0
    ty = y - y0
    samples = [src.px(x0, y0), src.px(x1, y0), src.px(x0, y1), src.px(x1, y1)]
    weights = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty]
    # Premultiplied interpolation keeps soft alpha edges cleaner.
    out_a = sum(samples[i][3] * weights[i] for i in range(4))
    if out_a <= 0:
        return 0, 0, 0, 0
    out = []
    for channel in range(3):
        value = sum(samples[i][channel] * samples[i][3] * weights[i] for i in range(4)) / out_a
        out.append(clamp(value))
    out.append(clamp(out_a))
    return tuple(out)


def resize(src: Canvas, width, height):
    out = Canvas(width, height)
    for y in range(height):
        sy = (y + 0.5) * src.height / height - 0.5
        for x in range(width):
            sx = (x + 0.5) * src.width / width - 0.5
            out.set_px(x, y, sample_bilinear(src, sx, sy))
    return out


def paste(dst: Canvas, src: Canvas, x0, y0):
    for y in range(src.height):
        for x in range(src.width):
            dst.blend_px(x0 + x, y0 + y, src.px(x, y))


def classify(path: Path, mode: str):
    posix = path.as_posix()
    name = path.name[:-4] if path.name.endswith(".png") else path.name
    if mode in {"all", "skins"} and "assets/skins/v3" in posix:
        return "skin"
    if mode in {"all", "traffic"} and "/traffic/" in posix:
        for key in ["car-2-h", "car-2-v", "van-3-h", "van-3-v", "truck-4-h", "truck-4-v"]:
            if name == key or name.endswith(f"-{key}"):
                return key
    if mode in {"all", "obstacles"} and "/obstacles/" in posix:
        if name.startswith("raw-"):
            return None
        if name == "bin":
            return "obstacle-bin"
        if name == "cone":
            return "obstacle-cone"
        if name == "gate":
            return "obstacle-gate"
        if name in {"theme-block", "snow", "leaf-pile"}:
            return "obstacle-block"
        return "obstacle"
    return None


def collect_paths(mode: str, yard: str | None):
    paths = []
    if mode in {"all", "skins"}:
        paths.extend(path for path in (ROOT / "assets" / "skins" / "v3").glob("*.png") if not path.name.startswith("qa-"))
    if mode in {"all", "traffic", "obstacles"}:
        yards_root = ROOT / "assets" / "yards"
        yard_dirs = [yards_root / yard] if yard else [yards_root / yard_id for yard_id in active_yard_ids()]
        for yard_dir in yard_dirs:
            if mode in {"all", "traffic"}:
                paths.extend((yard_dir / "traffic").glob("*.png"))
            if mode in {"all", "obstacles"}:
                paths.extend((yard_dir / "obstacles").glob("*.png"))
    return sorted(p for p in paths if p.is_file())


def active_yard_ids():
    text = (ROOT / "yards.js").read_text("utf8")
    return re.findall(r'id:\s*"([^"]+)"', text)


def matching_source_path(path: Path):
    parts = path.relative_to(ROOT).parts
    if len(parts) < 5 or parts[0:2] != ("assets", "yards"):
        return None
    yard = parts[2]
    group = parts[3]
    if group not in {"traffic", "obstacles"}:
        return None
    return ROOT / "assets" / "yards" / yard / "source" / group / parts[4]


def normalize(path: Path, kind: str, dry_run=False):
    target = TARGETS[kind]
    canvas_w, canvas_h, target_w, target_h = target
    image = read_png(path)
    if image.width != canvas_w or image.height != canvas_h:
        raise RuntimeError(f"canvas {image.width}x{image.height}, expected {canvas_w}x{canvas_h}")
    bounds = alpha_bounds(image)
    if not bounds:
        raise RuntimeError("transparent/no alpha")
    x0, y0, x1, y1 = bounds
    current_w = x1 - x0 + 1
    current_h = y1 - y0 + 1
    obj = crop(image, bounds)
    resized = resize(obj, target_w, target_h)
    out = Canvas(canvas_w, canvas_h)
    paste_x = (canvas_w - target_w) // 2
    paste_y = (canvas_h - target_h) // 2
    paste(out, resized, paste_x, paste_y)
    rel = path.relative_to(ROOT).as_posix()
    print(f"{rel}: {current_w}x{current_h} -> {target_w}x{target_h}", flush=True)
    if dry_run:
        return out
    write_png(out, path)
    source = matching_source_path(path)
    if source and source.exists():
        write_png(out, source)
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["all", "skins", "traffic", "obstacles"], default="traffic")
    parser.add_argument("--yard", help="Limit yard traffic/obstacle normalization to one yard id.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    count = 0
    for path in collect_paths(args.mode, args.yard):
        kind = classify(path, args.mode)
        if not kind:
            continue
        normalize(path, kind, dry_run=args.dry_run)
        count += 1
    print(f"normalized {count} asset(s){' (dry run)' if args.dry_run else ''}")


if __name__ == "__main__":
    main()
