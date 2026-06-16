# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

ROUND 14 — PHASE 3: PRODUCTION POLISH (make it read as "premium"). The game is now legible, balanced, and bug-light. This round is the last 10% that separates a flagship from a competent idle: game feel, audio, a signature visual identity, and rock-solid 60fps performance on Android. Act as a demanding senior game-dev lead. FEATURE FREEZE — NO new systems; only feel, polish, performance, identity. Full autonomy — don't ask, just do. RU+EN parity, a working build at every step, zero external network requests. Use the `ui-ux-pro-max` skill for visual/identity work. NO store-rebuild/screenshots (release-time). Verify your work by RENDERING at 360/390/414 + desktop and by profiling — don't trust it blindly.

1) PERFORMANCE — lock ~60fps on a mid/low-end Android (priority #1 for the Play target):
- Profile the tick + render. Fix jank: pool & cap particles; throttle DOM writes (odometer, /sec, long lists — update only what CHANGED, not the whole DOM each frame); eliminate layout thrash (batch DOM reads then writes); tighten the rAF loop; pause ALL offscreen / inactive-tab work; lazy-render heavy panels (market sparklines, long lists, endings).
- Fast initial load; NO memory growth over a long session (verify listeners / timers / particle arrays don't leak). Measure and report frame times BEFORE vs AFTER.

2) GAME FEEL / JUICE MASTERING — every interaction must feel good:
- Tune animation timing & easing across the whole UI so it feels snappy and intentional (nothing laggy or floaty).
- The dopamine PEAKS must each be genuinely satisfying and consistent: the TRAIN tap (squash/stretch + ripple + particle + number pop), generator buy, milestone ×2, Insight Flash claim, Breakthrough activation, the Prestige Ritual, the Singularity reset, and endings. Layered feedback (motion + particle + sound + haptic), well-timed, never janky.
- Mobile haptics fire at the right moments and feel good (not buzzy spam).

3) AUDIO MASTERING — make sound a feature, not an afterthought:
- Balance the SFX mix (levels, no clipping/harshness); polish the ambient music (clean loop, pleasant, non-intrusive); duck/layer sensibly; pause when the tab is hidden; respect the toggles. Add subtle distinct SFX where peaks lack them. All procedural / local (no external files).

4) SIGNATURE VISUAL IDENTITY (use the skill) — from "good neon" to memorable:
- Push the look to a cohesive, distinctive art direction with personality (not generic dark-neon). Polish the splash/loading screen, the first-impression main screen, and ALL empty states. Enforce consistent iconography, typography, spacing, and color across EVERY screen.
- The main/Lab screen should be genuinely thumb-stopping; refine the TRAIN orb to be the crown jewel.
- App icon: a crisp, premium, Android adaptive-ready icon (keep a square non-alpha icon for other platforms).

5) MICRO-POLISH SWEEP:
- Micro-interactions on every interactive element (buttons, tabs, toggles, buy, claim). Smooth tab/screen transitions. Loading/skeleton states where content pops in. A final consistency pass — kill every rough edge you can find.

VERIFY:
- `node --check` all JS; zero game console errors at 360/390/414 + desktop; a fresh save still shows ONLY Stage-1 Garage (no regressions from R10–R13).
- Performance: confirm smooth ~60fps and report measured frame times; no memory growth over a long run.
- RU↔EN parity for any new copy (splash etc.). Render key screens at the sizes above and confirm no layout/clarity regressions.
- Keep a working dev build. Commit each part. FINAL MESSAGE: what you polished (feel, audio, identity, perf), the before/after frame-time numbers, and your honest take on whether it now reads as "premium / flagship".
