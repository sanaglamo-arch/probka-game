# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

Apply these improvements to the Singularity Inc. game in this project. You have full autonomy — don't ask, just do. Keep a working build at every step, keep RU+EN parity, and re-verify + rebuild assets at the end.

1) BUGFIXES + YANDEX MODERATION
- game.js:262 — the `a_safe` achievement is a no-op (`state.achievements['a_safe'] = state.achievements['a_safe']`). Set it to `true`. Also make the "clean run" condition survive reload (persist `_lastRunClean` or recompute on load) so it can actually unlock.
- styles.css — the img/button/a rule disables drag but not selection. Add `user-select:none` and `-webkit-user-select:none` there. Yandex requires text selection fully off.
- main.js — offline earnings can be lost if the tab closes before `visibilitychange` fires. Add a `pagehide`/`beforeunload`/`visibilitychange(hidden)` save so `lastSeen` is always written.

2) JUICE / FEEL
- Particle burst on the TRAIN tap and on each generator purchase.
- Generator card flash/pulse when bought.
- Misalignment incident: brief screen shake + red vignette pulse.
- Milestone pop (e.g. every 25 of a generator, and on prestige).
CSS/canvas only, no external libs, cap particle count for perf.

3) CONTENT / DEPTH
- Surface achievements in their own screen/tab (locked/unlocked list — you already track them in state).
- Add a few random timed events with RU+EN copy and a toast/banner: e.g. "Research Grant" (cash burst), "Data Leak" (temp risk spike), "AI Hype Cycle" (temp x2 output).
- Add 1–2 more generator tiers and/or 2–3 more Research (prestige) upgrades to extend the curve. Update BALANCE.md + the economy sim.

4) ONBOARDING + DESKTOP LAYOUT
- First-run 3-step tour: (1) tap TRAIN, (2) buy first generator, (3) watch Risk and fund Alignment. Skippable, shown once (persist a flag), RU+EN.
- Desktop: several screens (Alignment etc.) put content at the top with big empty space below. Center/balance the layout so wide screens don't look empty.

VERIFY + REBUILD (at the end)
- `node --check` every JS; load in headless Chrome with zero console errors.
- Run the smoke test (clicks, buy, prestige, save/reload, RU↔EN, incident).
- Confirm RU/EN parity for all new strings (events, onboarding, achievements).
- Regenerate ALL screenshots (seeded mid-game save), mobile + desktop of every screen, plus the new achievements screen and an onboarding shot.
- Rebuild dist/singularity-inc.zip (index.html at root, validated) and dist/store-assets-bundle.zip.
- Commit each phase. Final message: what changed + the new final numbers.
