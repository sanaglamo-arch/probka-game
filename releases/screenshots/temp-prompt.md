# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

ROUND 11 — PROGRESSION & PRESTIGE REDESIGN (core design, not polish). Two serious problems a real player hit: (1) too much is unlocked at once — systems aren't introduced in a sane order, so the game is overwhelming and confusing; (2) prestige feels pointless — "I sold the company, got RP, and… so what?", and the RP shop has worthless flat items (p_start = flat 1e6 cash, p_start2 = flat 1e9 cash — meaningless once you earn it in seconds). Fix BOTH properly. Act as a demanding senior game-dev lead. Full autonomy — don't ask, just do. RU+EN parity, a working build at every step, SAFE save migration, zero external requests. Use the `ui-ux-pro-max` skill for UI. NO store-rebuild/screenshots (release-time).

The game ALREADY has partial gating: `state.seen` (one-time hints), `worldUnlocked()` / `marketUnlocked()` / `autopilotUnlocked()` / `singUnlocked()` / `rivalsRevealed()`. EXTEND that into one complete, deliberate system — do NOT build a parallel one.

=== PART 1 — PROGRESSIVE UNLOCK / PLAYER JOURNEY ===
A new player must see ONE thing at a time; depth reveals as they grow. The bottom nav must show ONLY unlocked tabs (this also fixes the current 9-tab cramming — early game has 1–2 tabs). Every unlock fires a one-time, skippable intro hint (use `state.seen`). Tie the schedule to the narrative acts (garage→startup→frontier→race→singularity).

Concrete schedule — keep this ORDER; tune exact triggers:
- STAGE 1 "Garage" (fresh save): visible = TRAIN button, cash, ONE generator (laptop), buy x1. HIDE everything else — later generators appear only as they come within reach, and there are NO other tabs, NO risk bar, NO World/Research/Alignment/Upgrades yet. Just the core tap→buy loop.
- STAGE 2 "Scaling": as the player buys, reveal the next generators (gpuRig, serverRack, …) when within reach; reveal buy-modes x10/x100/Max; reveal MILESTONES (x2) with a celebratory first-milestone hint; reveal the UPGRADES tab when the first upgrade is affordable; reveal INSIGHT FLASH (a delightful early surprise) and BREAKTHROUGH.
- STAGE 3 "Automation": reveal MANAGERS (buff) and then AUTOPILOT when the player has enough generators that manual buying is tedious (keep the existing autopilot unlock).
- STAGE 4 "First Prestige" (when growth clearly slows, ~30–45 min): introduce "Release a Frontier Model" as a guided, celebratory FIRST moment that TEACHES the loop. After it: reveal the RESEARCH tab + RP (reworked — see Part 2).
- STAGE 5 "Risks of Scale" (after 1st prestige / a capability threshold): ONLY NOW reveal multi-vector RISK, ALIGNMENT and CRISES. They must NOT be visible before the first prestige. Thematic one-line intro.
- STAGE 6 "The Industry" (after 1st prestige, a bit later): reveal the WORLD tab — News, Trust, Market, Rivals. This dense management layer must NOT appear at start.
- STAGE 7 "Endgame": SINGULARITY (2nd prestige) + ARTIFACTS + ENDINGS/RACE — gated as today (singUnlocked).
AUDIT: a brand-new save must show ONLY Stage-1 UI. Start fresh and confirm nothing from later stages is visible.

=== PART 2 — PRESTIGE / RP REWORK (make it obviously worth it) ===
Current shop (js/config.js): p_mult1/2/3/4 (one-time globalMult ×2/×3/×5/×10), p_start (1e6 cash, 40 RP), p_start2 (1e9 cash, 1500 RP). The player doesn't feel any value and the startCash items are nonsense.

Fix concretely:
1. GIVE RP IMMEDIATE, VISIBLE VALUE. Add a BASELINE passive: each RP grants a permanent global-output multiplier FOREVER (mirror how Singularity Cores already give "+10% each forever"). The instant you prestige you must SEE "+X% output, permanently" — never "got RP and nothing". Pick a sane per-RP value/curve. Keep the spendable research/upgrade tree ON TOP for bigger structural choices.
2. FIRST PRESTIGE MUST BE REWARDING: tune RP gain so the first prestige grants enough to clearly feel the boost AND afford a visible first upgrade. The next run must be noticeably faster.
3. KILL THE FLAT STARTING-CASH ITEMS (p_start, p_start2). Replace with SCALING or STRUCTURAL boosts, e.g.: start-cash = a % of your best-run total earned (scales forever); "keep N% of your generator levels on prestige"; "start each run with the first K generators owned"; "start with Autopilot unlocked"; "+1 buy-multiplier tier from the start". Starting boosts must scale or be structural — never a flat pittance.
4. SHOW THE PROJECTION at the prestige screen, LOUD: "Release now → +N RP (= +X% output forever). Your next frontier model reaches here in ~⅓ the time." Show current-run vs. potential so the value is undeniable.
5. FIRST PRESTIGE = TAUGHT CELEBRATORY MOMENT (ties to Part 1 Stage 4 + the existing prestige ritual): explicitly teach "you reset, but come back PERMANENTLY stronger and faster — this is the heart of the game." Shown once.
6. KEEP THE LAYERS COHERENT & DISTINCT: RP = the frequent loop (permanent multipliers, done often). Singularity Cores = the rare deep reset (resets RP too, for a stronger meta-currency). Each screen states its own purpose in one line so they never blur.
7. SAFE SAVE MIGRATION (critical): players who already own p_start/p_start2 or spent RP must NOT be broken or robbed — grandfather the effect or refund the RP into the new system. No one logs in worse off.
8. BALANCE: re-tune the whole curve with the new RP value + removed flat items + the unlock schedule — no exploits, no walls, first prestige ~30–45 min. Document in BALANCE.md + the economy sim.

VERIFY:
- `node --check` all JS; zero console errors; a FRESH save shows ONLY Stage-1 UI; each unlock fires once and in order; the prestige screen shows the projection and grants visible permanent value; first prestige teaches the loop; flat startCash items are gone; SAVE MIGRATION safe (load an old/seeded save → not broken, not robbed); RU↔EN.
- Keep a working dev build. Commit each part. Final message: the full unlock schedule you implemented (stage → triggers), the new RP design (per-RP value, reworked shop items, projection wording), how migration is handled, and the tuned numbers.
