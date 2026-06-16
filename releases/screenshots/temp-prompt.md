# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

=== CONTEXT — READ THIS FIRST (you may be a fresh session) ===
- PROJECT: "Singularity Inc." — a polished idle / incremental ("clicker") web game about building an AI company (tap to train → buy GPU/server generators → prestige "Release a frontier model" → multi-vector Risk/Alignment, News/Trust/Market management layer → Singularity 2nd-prestige → Race-to-AGI narrative + endings).
- GOAL: a flagship-quality game targeting ANDROID / Google Play first; deep BUT accessible; monetization deferred. Fully localized RU + EN.
- WORKING DIR: `/root/singularity-inc/`. It IS a git repo, branch `claude/ai-tycoon`, remote `https://github.com/sanaglamo-arch/singularity-inc.git`. Commit your work as you go (push only if asked).
- STACK: vanilla JS + HTML + CSS, NO build step, NO framework. IIFE modules in `js/` exposing globals. ZERO external network requests at runtime.
  - `js/config.js` = all tunable numbers (generators, prestige/RP shop, autopilot, risk, singularity…). `js/game.js` = engine + state + economy. `js/ui.js` = all UI/rendering. `js/i18n.js` = RU+EN strings. `js/sdk.js` + `js/ads.js` = platform abstraction (Yandex SDK + graceful fallback). `js/music.js`/`js/audio.js` = procedural WebAudio. `js/fx.js`, `js/icons.js` (inline SVG), `js/format.js`, `js/main.js` (bootstrap). `index.html` + `styles.css` + `fonts.css`.
  - Save key: `singularity_inc_save_v1` (localStorage). Lang key: `singularity_inc_lang`.
- READ FIRST to orient: `README.md` and `BALANCE.md` (current design + economy), and `CAPACITOR.md` (Android wrapper).
- HOW TO RUN / TEST: serve the folder statically and open index.html — e.g. `python3 -m http.server 8099 --bind 127.0.0.1` then load `http://127.0.0.1:8099/index.html`. `__seed.html` writes a mid-game save to localStorage (load it, then load index.html in the same browser profile) to test late-game. For the fresh "Garage" state, use a clean profile / clear localStorage.
- TOOLING (don't assume binaries exist; probe + fall back): `node --check` to validate JS. The `zip` binary is likely MISSING → use python3 `zipfile`. PIL/ffmpeg likely MISSING → render images with headless Chrome (`google-chrome --headless=new --no-sandbox --disable-dev-shm-usage --hide-scrollbars --window-size=W,H --force-device-scale-factor=N --screenshot=out.png URL`).
- DESIGN SKILL: `ui-ux-pro-max` is installed at `/root/.claude/skills/ui-ux-pro-max/` — invoke it as a Skill, or read its `SKILL.md` + `data/` directly, for UI/layout/accessibility work.
- Verify your own work by RENDERING the game at mobile sizes (360/390/414) + desktop and inspecting — don't trust it blindly.

=== TASK ===

ROUND 12 — BUY CLARITY + BUY-MODES + LAYOUT/TYPOGRAPHY DISCIPLINE. Phase-1 (clarity) work. A player gave concrete feedback. Act as a demanding senior game-dev lead. Full autonomy — don't ask, just do. RU+EN parity, a working build at every step, zero external network requests. Use the `ui-ux-pro-max` skill for UI. NO store-rebuild/screenshots (release-time).

1) LAYOUT & TYPOGRAPHY DISCIPLINE (recurring — be ruthless and VERIFY by rendering):
- Do a STRICT pass across EVERY screen at mobile widths (360 / 390 / 414) AND desktop: NO text overlapping other text or other blocks; NO text spilling out of or onto its container; consistent, breathing padding/margins; nothing clipped or badly truncated; clear hierarchy. Text must look clean in BOTH the mobile and the web/desktop layouts.
- Render each screen at those sizes and inspect by eye; fix every overlap/overflow/cramped-spacing issue you find. Treat text-on-text or text-on-block as a BLOCKING bug. This keeps coming back — do it properly this time, screen by screen.

2) BUY CLARITY — make the VALUE of a purchase obvious (right now a player can't tell why to buy something):
- On EVERY generator card, clearly show the PER-UNIT output: "each: +X/sec" (how much ONE unit of this generator produces). A player must understand what one Laptop gives before buying it.
- Also show what the CURRENT purchase will add: for the selected buy-mode, the "+Total/sec" that buying N units adds, plus the total cost. The card should answer: "buy N → +Y/sec for $Z".
- Keep it clean and readable (use the skill) — informative, not cluttered. RU+EN.

3) BUY-MODES x1 / x10 / x100 / Max — confusing, and Max currently looks identical to x1:
- INVESTIGATE & FIX: confirm Max actually buys the MAXIMUM AFFORDABLE quantity (not 1). If the logic is broken, fix it.
- Make each mode's effect VISIBLE: the buy affordance must show the exact count and total cost for the selected mode — e.g. "Buy ×10 — $Z", "Buy Max (37) — $Z". x1 vs x10 vs x100 vs Max must look clearly DIFFERENT (different counts/costs), never identical.
- Add a one-line explanation of what the modes do (fold into the explain-everything tooltips): "choose how many units to buy per tap."

4) MINOR (found in QA): the satirical NEWS TICKER currently shows on the FRESH "Garage" start screen — per the unlock schedule it must be hidden until the World/News layer unlocks (Stage 6). Hide it on a fresh save; reveal it together with World.

VERIFY:
- `node --check` all JS; zero console errors at 360/390/414 + desktop; render each screen and confirm ZERO text overlaps/overflows and clean spacing in BOTH mobile and web layouts.
- Confirm: generator cards show the per-unit value AND the selected purchase's added /sec + cost; Max buys the true max-affordable and shows its count+cost (never identical to x1); the fresh save hides the news ticker.
- RU↔EN parity. Keep a working dev build. Commit each part. Final message: exactly what you fixed (the layout/overlap issues found + where, the buy-card value display, the Max fix), and which sizes you verified.
