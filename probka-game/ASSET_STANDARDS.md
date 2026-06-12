# Asset Standards

These rules are mandatory for every generated yard and vehicle pack.

## Yard Board

- Board image size: `1024x1024` PNG.
- Camera: strict orthographic top-down. No perspective, no isometric tilt.
- The playable grid is always a visible `6x6` square.
- Every active yard uses the same calibrated `gridFrame` in `yards.js`: `left/top=125px`, `right/bottom=845px`.
- The playable grid is therefore always `720x720`, with exact `120x120` cells.
- `gridFrame` must align to the visible tile seams.
- Decoration can live outside this frame. It must not cover playable cells.
- The exit is part of the yard artwork, not a generic green stripe.
- Game logic still exits on row `2` zero-based, the third row from the top.
- The logical exit frame is computed from the yard `gridFrame`:
  - `cell = (gridFrame.bottom - gridFrame.top) / 6`;
  - `x = gridFrame.right`;
  - `y = gridFrame.top + cell * 2`;
  - `height = cell`.
- The background art uses one intentionally wide visual exit on the right side:
  - `x = 845`;
  - `y = 305`;
  - `width = 179`;
  - `height = 403`.
- This wide visual opening must be identical across all yard backgrounds. It is a broad right-side driveway between two curb walls that continue the same border material as the board frame.
- The exit must read as a polished road or driveway. Do not use yellow-black hazard blocks, striped guards, or warning-barrier stickers.
- Do not generate a separate narrow exit or a second exit elsewhere.

## Vehicles

- Generate separate sprites for every runtime-required size and orientation:
  - `2x1`, `3x1`;
  - `1x2`, `1x3`.
- Horizontal vehicle sprites face right.
- Vertical vehicle sprites are top-down, with the front consistently at the top.
- Runtime sprite canvas sizes:
  - `2x1`: `768x384`;
  - `3x1`: `1152x384`;
  - `1x2`: `384x768`;
  - `1x3`: `384x1152`.
- The vehicle body should occupy `90-96%` of its logical length and at least `72%` of its secondary axis after normalization.
- Never use a 2-cell car sprite for a 3-cell vehicle.
- No side-view vehicles in gameplay assets.

### Vehicle Footprint And Centering

Canvas size alone is not enough. Every vehicle PNG must also have a consistent
visible alpha bounding box, centered inside the canvas.

Target runtime traffic footprints:

| Asset | Canvas | Visible bbox target |
| --- | ---: | ---: |
| `car-2-h.png` | `768x384` | `720x310`, centered |
| `car-2-v.png` | `384x768` | `310x720`, centered |
| `van-3-h.png` | `1152x384` | `1088x310`, centered |
| `van-3-v.png` | `384x1152` | `310x1088`, centered |
| `truck-4-h.png` | `1536x384` | `1452x310`, centered |
| `truck-4-v.png` | `384x1536` | `310x1452`, centered |

Allowed tolerance for runtime traffic:

- Primary axis: about `+/- 2.5%` of the target bbox.
- Secondary axis: about `+/- 18px`.
- Center offset: no more than `8-14px`, depending on canvas length.

Target skin footprints:

- Skin source PNGs are always `384x768`.
- The visible car bbox should be about `312x700`, centered.
- This matters because target skins are alpha-trimmed before rendering; a short
  source car becomes a short in-game car even when the canvas is `384x768`.
- Skin art can vary by decorations, but the core car body should stay inside the
  same footprint.

## Obstacles

- One-cell obstacle sprites are `512x512` transparent PNG.
- The object must be centered.
- The object should occupy `70-85%` of the cell.
- Shadows and decorative details must stay inside the cell.
- No crop artifacts, no neighboring objects, no chroma-key fringe.

### Obstacle Footprint And Centering

Obstacle shapes are allowed to differ by kind, but each kind must stay
consistent across yards:

| Kind | Canvas | Visible bbox target |
| --- | ---: | ---: |
| `bin.png` | `512x512` | about `360x390`, centered |
| `cone.png` | `512x512` | about `384x416`, centered |
| `gate.png` | `512x512` | about `430x170`, centered |
| `theme-block.png` | `512x512` | about `380x330`, centered |

Wide/low gates are valid; they should not be forced into a square footprint.
Planters, benches, snow piles, leaf piles, and theme blocks can differ slightly,
but should remain visually one-cell objects.

Use:

```bash
python3 probka-game/tools/audit-asset-scale.py --mode all --only-fail
```

to check canvas size, alpha bbox, and centering before visual QA.

## Asset QA

Before integration:

- For a cold local sanity check, start with `node probka-game/tools/release-yandex.js --syntax-only`.
- For release file coverage without level-bank or browser work, use `node probka-game/tools/release-yandex.js --runtime-only`.
- For a release-level check of one yard, use `node probka-game/tools/release-yandex.js --check --quick --yard <yard_id>`.
- For yard PNG validation only, use `node probka-game/tools/validate-yard-assets.js --yard <yard_id>`.
- To regenerate all procedural themed traffic/obstacles, use `node probka-game/tools/generate-themed-yard-sprites.js --all`.
- The themed sprite generator writes both runtime assets and matching `source/traffic` + `source/obstacles` copies.
- To confirm every active yard has a procedural theme, use `node probka-game/tools/generate-themed-yard-sprites.js --check-coverage`.
- To create a lightweight visual review page, use `node probka-game/tools/generate-themed-yard-sprites.js --gallery`.
- To regenerate all full-art yard boards from AI source images and the deterministic shared skeleton, use `python3 probka-game/tools/generate-yard-boards.py`.
- Inspect every generated source and final sprite visually.
- Validate final PNG dimensions.
- Validate alpha: transparent corners for sprites, no colored background.
- Create a montage on dark background and inspect at 100% zoom.
- Place the pack in a real level and inspect:
  - level `1`;
  - a dense late level;
  - garage preview;
  - mobile viewport.
- Check that the visual exit and `level.exit.row` match.
- Check that every vehicle length visually matches its logical length.
