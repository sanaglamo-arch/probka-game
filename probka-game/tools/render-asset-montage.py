#!/usr/bin/env python3
"""Render simple PNG montages for visual asset QA."""

from __future__ import annotations

import argparse
import importlib.util
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
NORMALIZER = ROOT / "tools" / "normalize-asset-scale.py"
spec = importlib.util.spec_from_file_location("asset_scale", NORMALIZER)
asset_scale = importlib.util.module_from_spec(spec)
spec.loader.exec_module(asset_scale)


def copy_scaled(dst, src, dx, dy, dw, dh):
    for y in range(dh):
        sy = min(src.height - 1, int(y * src.height / dh))
        for x in range(dw):
            sx = min(src.width - 1, int(x * src.width / dw))
            dst.blend_px(dx + x, dy + y, src.px(sx, sy))


def render_skins():
    files = sorted((ROOT / "assets" / "skins" / "v3").glob("*.png"))
    thumb_w = 128
    thumb_h = 256
    gap = 28
    cols = 6
    rows = (len(files) + cols - 1) // cols
    canvas = asset_scale.Canvas(cols * thumb_w + (cols + 1) * gap, rows * thumb_h + (rows + 1) * gap, (12, 15, 18, 255))
    for index, file in enumerate(files):
        image = asset_scale.read_png(file)
        col = index % cols
        row = index // cols
        x = gap + col * (thumb_w + gap)
        y = gap + row * (thumb_h + gap)
        copy_scaled(canvas, image, x, y, thumb_w, thumb_h)
    out = ROOT / "assets" / "skins" / "v3" / "qa-skins-montage.png"
    asset_scale.write_png(canvas, out)
    print(out)


def active_yard_ids():
    text = (ROOT / "yards.js").read_text("utf8")
    return re.findall(r'id:\s*"([^"]+)"', text)


def render_traffic():
    yard_ids = active_yard_ids()
    row_h = 260
    width = 1640
    canvas = asset_scale.Canvas(width, row_h * len(yard_ids) + 40, (12, 15, 18, 255))
    slots = [
        ("car-2-h.png", 42, 35, 360, 180),
        ("van-3-h.png", 438, 35, 540, 180),
        ("car-2-v.png", 1030, 18, 128, 224),
        ("van-3-v.png", 1190, 0, 112, 252),
        ("truck-4-h.png", 1340, 55, 260, 130),
    ]
    for row, yard_id in enumerate(yard_ids):
        y0 = 20 + row * row_h
        bg = (16, 20, 24, 255) if row % 2 else (14, 18, 21, 255)
        for y in range(y0, min(canvas.height, y0 + row_h - 8)):
            for x in range(20, width - 20):
                canvas.set_px(x, y, bg)
        traffic_dir = ROOT / "assets" / "yards" / yard_id / "traffic"
        for filename, x, y, w, h in slots:
            file = traffic_dir / filename
            if not file.exists():
                continue
            image = asset_scale.read_png(file)
            copy_scaled(canvas, image, x, y0 + y, w, h)
    out = ROOT / "assets" / "yards" / "_guides" / "active-traffic-montage.png"
    asset_scale.write_png(canvas, out)
    print(out)


def render_yard_grids(filename="board-grid-check.png", output="active-board-grid-montage.png"):
    yard_ids = active_yard_ids()
    thumb = 512
    gap = 24
    cols = 2
    rows = (len(yard_ids) + cols - 1) // cols
    canvas = asset_scale.Canvas(cols * thumb + (cols + 1) * gap, rows * thumb + (rows + 1) * gap, (12, 15, 18, 255))
    for index, yard_id in enumerate(yard_ids):
        file = ROOT / "assets" / "yards" / yard_id / "qa" / filename
        if not file.exists():
            continue
        image = asset_scale.read_png(file)
        col = index % cols
        row = index // cols
        x = gap + col * (thumb + gap)
        y = gap + row * (thumb + gap)
        copy_scaled(canvas, image, x, y, thumb, thumb)
    out = ROOT / "assets" / "yards" / "_guides" / output
    asset_scale.write_png(canvas, out)
    print(out)


def render_yard_boards(filename="board.png", output="active-board-montage.png"):
    yard_ids = active_yard_ids()
    thumb = 512
    gap = 24
    cols = 2
    rows = (len(yard_ids) + cols - 1) // cols
    canvas = asset_scale.Canvas(cols * thumb + (cols + 1) * gap, rows * thumb + (rows + 1) * gap, (12, 15, 18, 255))
    for index, yard_id in enumerate(yard_ids):
        file = ROOT / "assets" / "yards" / yard_id / filename
        if not file.exists():
            continue
        image = asset_scale.read_png(file)
        col = index % cols
        row = index // cols
        x = gap + col * (thumb + gap)
        y = gap + row * (thumb + gap)
        copy_scaled(canvas, image, x, y, thumb, thumb)
    out = ROOT / "assets" / "yards" / "_guides" / output
    asset_scale.write_png(canvas, out)
    print(out)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        choices=["skins", "traffic", "yard-boards", "yard-grids", "yard-canonical-grids", "yard-skeleton-grids"],
        default="traffic",
    )
    args = parser.parse_args()
    if args.mode == "skins":
        render_skins()
    elif args.mode == "traffic":
        render_traffic()
    elif args.mode == "yard-boards":
        render_yard_boards()
    elif args.mode == "yard-grids":
        render_yard_grids()
    elif args.mode == "yard-canonical-grids":
        render_yard_grids("board-canonical-grid-check.png", "active-board-canonical-grid-montage.png")
    elif args.mode == "yard-skeleton-grids":
        render_yard_grids("board-skeleton-check.png", "active-board-skeleton-grid-montage.png")


if __name__ == "__main__":
    main()
