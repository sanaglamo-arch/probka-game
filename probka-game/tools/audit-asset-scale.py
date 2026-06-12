#!/usr/bin/env python3
"""Audit PNG asset canvas size, visible alpha bounds, and centering.

The goal is not to judge art quality. This reports whether a sprite has a
consistent visible footprint relative to its runtime cell box.
"""

from __future__ import annotations

import argparse
import csv
import math
import re
import struct
import sys
import zlib
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Spec:
    width: int
    height: int
    bbox_w: tuple[int, int]
    bbox_h: tuple[int, int]
    center_dx: int
    center_dy: int
    label: str


SPECS = {
    "skin": Spec(384, 768, (296, 328), (680, 724), 8, 10, "target skin 1x2"),
    "car-2-h": Spec(768, 384, (704, 736), (292, 328), 10, 8, "traffic 2x1 horizontal"),
    "car-2-v": Spec(384, 768, (292, 328), (704, 736), 8, 10, "traffic 1x2 vertical"),
    "van-3-h": Spec(1152, 384, (1060, 1112), (292, 328), 12, 8, "traffic 3x1 horizontal"),
    "van-3-v": Spec(384, 1152, (292, 328), (1060, 1112), 8, 12, "traffic 1x3 vertical"),
    "truck-4-h": Spec(1536, 384, (1420, 1484), (292, 328), 14, 8, "traffic 4x1 horizontal"),
    "truck-4-v": Spec(384, 1536, (292, 328), (1420, 1484), 8, 14, "traffic 1x4 vertical"),
    "obstacle-bin": Spec(512, 512, (300, 420), (330, 430), 14, 14, "one-cell bin/container"),
    "obstacle-cone": Spec(512, 512, (340, 392), (390, 430), 14, 14, "one-cell cone/limiter"),
    "obstacle-gate": Spec(512, 512, (350, 460), (120, 260), 14, 20, "one-cell barrier/gate"),
    "obstacle-block": Spec(512, 512, (320, 430), (250, 390), 14, 18, "one-cell theme block"),
    "obstacle": Spec(512, 512, (300, 430), (260, 430), 14, 18, "one-cell obstacle"),
}


class Png:
    def __init__(self, width, height, pixels):
        self.width = width
        self.height = height
        self.pixels = pixels


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


def read_png(path: Path) -> Png:
    data = path.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError("not a PNG")
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
                raise RuntimeError("unsupported PNG format")
        elif kind == b"IDAT":
            compressed.append(payload)
        elif kind == b"IEND":
            break
    if width is None or height is None or color_type is None:
        raise RuntimeError("missing PNG header")
    channels = 4 if color_type == 6 else 3
    raw = zlib.decompress(b"".join(compressed))
    stride = width * channels
    prev = bytearray(stride)
    src = 0
    pixels = bytearray(width * height * 4)
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
                raise RuntimeError(f"unsupported PNG filter {filter_type}")
        for x in range(width):
            src_i = x * channels
            dst_i = (y * width + x) * 4
            pixels[dst_i] = row[src_i]
            pixels[dst_i + 1] = row[src_i + 1]
            pixels[dst_i + 2] = row[src_i + 2]
            pixels[dst_i + 3] = row[src_i + 3] if channels == 4 else 255
        prev = row
    return Png(width, height, pixels)


def alpha_bounds(image: Png, threshold=12):
    min_x = image.width
    min_y = image.height
    max_x = -1
    max_y = -1
    count = 0
    for y in range(image.height):
        row = y * image.width * 4
        for x in range(image.width):
            if image.pixels[row + x * 4 + 3] <= threshold:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
            count += 1
    if max_x < min_x:
        return None
    return min_x, min_y, max_x, max_y, count


def spec_for(path: Path, mode: str) -> tuple[str, Spec] | tuple[None, None]:
    name = path.name
    if mode in {"all", "skins"} and "assets/skins/v3" in path.as_posix():
        return "skin", SPECS["skin"]
    if mode in {"all", "traffic"} and "/traffic/" in path.as_posix():
        stem = name[:-4] if name.endswith(".png") else name
        for key in ["car-2-h", "car-2-v", "van-3-h", "van-3-v", "truck-4-h", "truck-4-v"]:
            if stem == key or stem.endswith(f"-{key}"):
                return key, SPECS[key]
    if mode in {"all", "obstacles"} and "/obstacles/" in path.as_posix():
        name_key = path.name[:-4] if path.name.endswith(".png") else path.name
        if name_key.startswith("raw-"):
            return None, None
        if name_key == "bin":
            return "obstacle-bin", SPECS["obstacle-bin"]
        if name_key == "cone":
            return "obstacle-cone", SPECS["obstacle-cone"]
        if name_key == "gate":
            return "obstacle-gate", SPECS["obstacle-gate"]
        if name_key in {"theme-block", "snow", "leaf-pile"}:
            return "obstacle-block", SPECS["obstacle-block"]
        return "obstacle", SPECS["obstacle"]
    return None, None


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


def status_for(value, allowed):
    return allowed[0] <= value <= allowed[1]


def audit_one(path: Path, kind: str, spec: Spec):
    image = read_png(path)
    bounds = alpha_bounds(image)
    row = {
        "status": "ok",
        "kind": kind,
        "path": path.relative_to(ROOT).as_posix(),
        "canvas": f"{image.width}x{image.height}",
        "bbox": "",
        "bbox_w": "",
        "bbox_h": "",
        "center_dx": "",
        "center_dy": "",
        "coverage": "",
        "issues": "",
    }
    issues = []
    if image.width != spec.width or image.height != spec.height:
        issues.append(f"canvas expected {spec.width}x{spec.height}")
    if not bounds:
        issues.append("transparent/no alpha")
    else:
        x0, y0, x1, y1, count = bounds
        bbox_w = x1 - x0 + 1
        bbox_h = y1 - y0 + 1
        center_dx = ((x0 + x1 + 1) / 2) - image.width / 2
        center_dy = ((y0 + y1 + 1) / 2) - image.height / 2
        coverage = count / (image.width * image.height)
        row.update(
            {
                "bbox": f"{x0},{y0},{x1},{y1}",
                "bbox_w": bbox_w,
                "bbox_h": bbox_h,
                "center_dx": f"{center_dx:.1f}",
                "center_dy": f"{center_dy:.1f}",
                "coverage": f"{coverage:.3f}",
            }
        )
        if not status_for(bbox_w, spec.bbox_w):
            issues.append(f"bbox_w {bbox_w} not {spec.bbox_w[0]}..{spec.bbox_w[1]}")
        if not status_for(bbox_h, spec.bbox_h):
            issues.append(f"bbox_h {bbox_h} not {spec.bbox_h[0]}..{spec.bbox_h[1]}")
        if abs(center_dx) > spec.center_dx:
            issues.append(f"center_dx {center_dx:.1f} > {spec.center_dx}")
        if abs(center_dy) > spec.center_dy:
            issues.append(f"center_dy {center_dy:.1f} > {spec.center_dy}")
    row["issues"] = "; ".join(issues)
    row["status"] = "ok" if not issues else "fix"
    return row


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["all", "skins", "traffic", "obstacles"], default="traffic")
    parser.add_argument("--yard", help="Limit yard traffic/obstacle audit to one yard id.")
    parser.add_argument("--format", choices=["table", "csv"], default="table")
    parser.add_argument("--only-fail", action="store_true")
    args = parser.parse_args()

    rows = []
    for path in collect_paths(args.mode, args.yard):
        kind, spec = spec_for(path, args.mode)
        if not spec:
            continue
        try:
            rows.append(audit_one(path, kind, spec))
        except Exception as error:
            rows.append(
                {
                    "status": "fix",
                    "kind": kind or "",
                    "path": path.relative_to(ROOT).as_posix(),
                    "canvas": "",
                    "bbox": "",
                    "bbox_w": "",
                    "bbox_h": "",
                    "center_dx": "",
                    "center_dy": "",
                    "coverage": "",
                    "issues": str(error),
                }
            )

    if args.only_fail:
        rows = [row for row in rows if row["status"] != "ok"]

    fields = ["status", "kind", "path", "canvas", "bbox_w", "bbox_h", "center_dx", "center_dy", "coverage", "issues"]
    if args.format == "csv":
        writer = csv.DictWriter(sys.stdout, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
        return

    widths = {field: len(field) for field in fields}
    for row in rows:
        for field in fields:
            widths[field] = max(widths[field], min(72, len(str(row[field]))))
    print("  ".join(field.ljust(widths[field]) for field in fields))
    print("  ".join("-" * widths[field] for field in fields))
    for row in rows:
        print("  ".join(str(row[field])[: widths[field]].ljust(widths[field]) for field in fields))
    total = len(rows)
    failed = sum(1 for row in rows if row["status"] != "ok")
    print(f"\nasset scale audit: {total - failed}/{total} ok, {failed} need normalization")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
