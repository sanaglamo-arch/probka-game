# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

=== CONTEXT — READ THIS FIRST (you may be a fresh session) ===
- PROJECT: "Singularity Inc." — a polished idle / incremental ("clicker") web game about building an AI company (tap to train → buy GPU/server generators → prestige "Release a frontier model" → multi-vector Risk/Alignment, News/Trust/Market management layer → Singularity 2nd-prestige → Race-to-AGI narrative + endings).
- GOAL: a flagship-quality game targeting ANDROID / Google Play first; deep BUT accessible; monetization deferred. Fully localized RU + EN.
- WORKING DIR: `/root/singularity-inc/`. It IS a git repo, branch `claude/ai-tycoon`, remote `https://github.com/sanaglamo-arch/singularity-inc.git`. Commit your work as you go (push only if asked).
- STACK: vanilla JS + HTML + CSS, NO build step, NO framework. IIFE modules in `js/` exposing globals. ZERO external network requests at runtime.
  - `js/config.js` = all tunable numbers. `js/game.js` = engine + state + economy. `js/ui.js` = all UI/rendering. `js/i18n.js` = RU+EN strings. `js/sdk.js`+`js/ads.js` = platform abstraction (graceful fallback). `js/music.js`/`js/audio.js` = procedural WebAudio. `js/fx.js`, `js/icons.js`, `js/format.js`, `js/main.js`. `index.html` + `styles.css` + `fonts.css`. Save key `singularity_inc_save_v1`.
- READ FIRST: `README.md` and `BALANCE.md` (current design + economy).
- RUN/TEST: `python3 -m http.server 8099 --bind 127.0.0.1` in the folder → `http://127.0.0.1:8099/index.html`. `__seed.html` writes a mid-game save (load it, then index.html, same browser profile). Fresh "Garage" = clean profile / cleared localStorage.
- TOOLING (probe + fall back): `node --check` validates JS. `zip` likely MISSING → python3 `zipfile`. PIL/ffmpeg likely MISSING → headless Chrome (`google-chrome --headless=new --no-sandbox --disable-dev-shm-usage --hide-scrollbars --window-size=W,H --force-device-scale-factor=N --screenshot=out.png URL`).
- DESIGN SKILL: `ui-ux-pro-max` at `/root/.claude/skills/ui-ux-pro-max/`.
- Verify your own work by RENDERING the game at 360/390/414 + desktop and inspecting — don't trust it blindly.

=== TASK ===

ROUND 13 — PHASE 2: FUN & BALANCE (deep playtest + full economy hardening). We've stabilized the layout (Phase 0) and made the deep game legible (Phase 1: progressive unlocks, ≤5-tab nav, explain-everything, buy clarity, prestige rework). Now PROVE it is actually FUN end-to-end and balance the WHOLE economy with every system active. This round decides flagship vs. "competent idle". Act as a demanding senior game-dev lead. FEATURE FREEZE — do NOT add new systems; this is playtest, tuning, balance, and feel only. Full autonomy — don't ask, just do. RU+EN parity, a working build at every step, zero external requests. NO store-rebuild/screenshots (release-time).

1) MULTI-PERSONA PLAYTEST (actually simulate the full arc; write findings + fix):
- Play as THREE personas:
  • Casual Tapper — active, taps a lot, short sessions.
  • Idle Checker — logs in briefly, leans on offline earnings + autopilot.
  • Optimizer — min-maxes, chases prestige efficiency.
- For each, judge: is the first 60 SECONDS gripping? the first 10 minutes? Where is there dead time, boredom, confusion, or a wall? FIX what you find. The first session MUST hook.

2) PACING / THE COMPULSION LOOP:
- Map and tune the time-to-each-beat: first generator (seconds), first upgrade, first milestone ×2, first manager/autopilot, FIRST PRESTIGE (~30–45 min), first World/risk unlock, first Singularity. No dead zones, no walls, ALWAYS a visible next goal. Use the economy sim to confirm the curve is smooth.

3) FULL ECONOMY BALANCE AUDIT — with EVERYTHING active (generators, milestones, upgrades, managers, autopilot, RP per-RP multiplier + research tree, scaling startCash %, risk/alignment/crises, news/trust/market, breakthrough, insight, tap-combo, singularity, artifacts). Hunt and FIX:
- EXPLOITS: market money-printing / risk-free arbitrage; alignment trivialization; breakthrough+insight+combo stacking into runaway; autopilot abuse; any infinite/instant path.
- WALLS: any point progress stalls too long.
- RP economy: confirm prestige is clearly worth it and each run accelerates correctly; the per-RP multiplier + research tree + startCash% don't double-count into runaway.
- OFFLINE earnings: rewarding but not trivializing active play.
Document the full tuned curve + final numbers in BALANCE.md.

4) PRESTIGE LOOP VALIDATION (verify the R11 rework feels good in play):
- First prestige = a taught, genuinely rewarding moment; the next run is visibly faster; subsequent prestiges accelerate. Time-to-2nd-prestige and time-to-first-Singularity reasonable. The projection wording is honest.

5) MANAGEMENT LAYER (World) — make it earn its place:
- Verify risk/alignment/crises/news/trust/market actually ADD meaningful decisions and fun — not chores or ignorable filler. Crisis cadence tense-not-nagging. Market a fun OPTIONAL bonus. Trust meaningful. Simplify or cut anything that's just noise.

6) NEVER-LOST:
- The next-goal nudge + unlock pacing must mean the player ALWAYS knows the next thing to do and feels momentum. Verify across the whole arc.

VERIFY:
- `node --check` all JS; zero console errors; a fresh save still shows ONLY Stage-1 Garage; run the economy sim across the full arc; confirm no exploit / no wall and the pacing targets above; RU↔EN parity.
- Render key screens at 360/390/414 — confirm NO regressions in layout/clarity from R10–R12.
- Keep a working dev build. Commit each part. FINAL MESSAGE: your HONEST verdict — is it fun for hours? the tuned pacing numbers (time-to-each-beat), the exploits you closed, and the single biggest thing still holding it back from "flagship".
