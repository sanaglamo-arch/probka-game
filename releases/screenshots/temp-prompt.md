# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

R10 FIX — two layout bugs you marked "done" but are STILL broken. I independently verified the live build (seeded mid-game save) at 390×844 and 360/414 — both reproduce. Fix ONLY these two, then re-verify by rendering at those sizes yourself. Full autonomy, RU+EN, no store-rebuild/screenshots (release-time), zero external requests. Use the `ui-ux-pro-max` skill for layout.

BUG 1 — BUY-MODE BAR OVERLAPS A GENERATOR CARD (still broken):
On the main/Lab screen, the floating buy-mode bar (x1 / x10 / x100 / Max) sits ON TOP of the generator list and COVERS the card directly beneath it — the "Server" generator row is clearly visible peeking out from behind the buttons (its name, /sec, and value are half-hidden). This is a real overlap.
- Fix: the buy-mode bar must NEVER cover a generator card. Either (a) add bottom padding / scroll-margin to the generator list equal to the bar's height so no row can ever sit under it, or (b) make the bar part of the normal flow / a solid docked footer with the list scrolling above it (not under it). Verify at 360/390/414 that the last generator row is fully visible and tappable, never behind the bar.

BUG 2 — BOTTOM NAV HAS 9 TABS, CRAMPED & TRUNCATED ON MOBILE (still broken):
The bottom navigation shows 9 items (Lab, Upgrades, Research, Singularity, Alignment, World, Stats, Awards, Settings). At 360–390px the labels are truncated ("Upgrad.", "Resear.", "Singul.", "Alignm.", "Settin.") and the targets are too small/cramped for a flagship mobile game.
- Fix: reduce to a sane set of primary bottom tabs for mobile (aim ~5). Group the rest behind a "More" tab / overflow sheet or merge logically (e.g. keep Lab, Upgrades, Research, World, More — and put Singularity/Alignment/Stats/Awards/Settings inside "More" or where they fit). Every visible tab must show its FULL label and have a ≥48px touch target. Keep ALL destinations reachable. RU+EN.

VERIFY (do this and report):
- `node --check` all JS; zero console errors at 360×640 / 390×844 / 414×896.
- Render the main screen at those sizes and confirm by inspection: the buy bar covers NOTHING, the last generator row is fully visible, and every bottom-nav label is full + targets ≥48px.
- Keep a working dev build. Commit. Final message: confirm BOTH bugs are fixed and which sizes you verified.
