# Временный промт (обновляется)

> Открой на GitHub → «Copy raw» → вставь в окно сборки.

---

BUGFIX ROUND — a full playtest (fresh → mid → late → finale, every tab, via __view.html) turned up real bugs. Fix ALL of them properly, then re-verify by rendering. Full autonomy — don't ask, don't stop. RU+EN parity, working build at every step, safe save migration, zero external runtime requests, commit each fix with a clear message, update BALANCE.md where economy changes.

== BUG 1 (CRITICAL) — VALUATION & FUNDING ARE BROKEN ==
Repro: at a mid state (cash $1.42M) the Lab HUD shows **VALUATION $164 TRILLION**, while the STATS tab shows **Valuation 40.66M** for the SAME state — inconsistent AND wildly inflated. Funding buttons pay out insane lumps: **"Raise Series B · +$294.6B"** (mid), **"Raise IPO · +$22T"** (late). A player who releases a model and takes a round is handed "free" billions from nowhere.
Root cause: `valuation() = max(moneyRate*SECONDS_YEAR*VAL_REV_MULT, cash+compute*2)` — annualising the per-second rate (×~31.5M) then ×VAL_REV_MULT explodes it; it's also time-sensitive (grows as moneyRate climbs) so different screens show different numbers; `takeFunding()` grants `valuation*cashFrac` → trillions.
Fix:
- **Valuation:** re-derive so it's a believable company number IN THE SAME UNIVERSE as your cash/revenue (e.g. a sane revenue multiple WITHOUT the ×SECONDS_YEAR explosion, and/or based on cumulative earnings + market share). It must be STABLE and CONSISTENT on every screen (Lab HUD == Stats == anywhere). Grows impressively but plausibly — never $164T at $1.4M cash.
- **Funding payouts:** a meaningful BOOST, never a game-skip. Re-tune so each round pays roughly "a few minutes of current income" (or a hand-tuned curve vs. current cash/cps), NOT valuation×frac. Seed = small head-start; later rounds bigger but still minutes-of-income, never hours/days. Simulate taking every round at its earliest gen — it must NOT trivialise the next stage.
- **Clarity:** when a round unlocks, explain WHERE the money comes from — "Releasing model vN unlocked your Seed round: investors put in $X for equity." One line on the button/panel + ⓘ tooltip, RU+EN.
- **Money-scenario sweep:** check EVERY money source (model release/market-share income, funding, daily/boost, offline, windfalls, news/event cash) — nothing may hand a sum wildly out of scale; no money-printer. Re-confirm the month-long arc still holds; document new numbers in BALANCE.md.

== BUG 2 (HIGH) — ACHIEVEMENT/MILESTONE TOAST FLOOD ==
Repro: loading a mid/late/finale state makes 8–13 toasts (achievements + UNICORN/DECACORN milestones) stack and BURY the entire screen — at the finale the ending screen is completely hidden behind toasts.
Fix:
- Queue/cap toasts: show at most ~2–3 at once; the rest queue and appear in sequence; never cover the whole screen.
- On save-LOAD, do NOT re-fire already-earned achievement/milestone toasts — only genuinely NEW unlocks should toast. (Re-check this fires correctly once valuation is fixed, since UNICORN/DECACORN are valuation-gated.)

== BUG 3 (MEDIUM) — MARKET-SHARE STANDINGS SORT STILL WRONG (your "fix" did NOT work) ==
You committed "standings verified green", but it is STILL BROKEN. I re-rendered the CURRENT build via `__view.html?tab=world&stage=mid` and the standings STILL show **#1 Helion 11%, #2 Cerebra 13%, #3 You 12%, #4 OmniNet 9%** — rank #1 has LESS share than #2 and #3. (At stage=late it looks right; at stage=mid and stage=finale the rivals are mis-ranked.)
Note: `standings()` in game.js DOES have a `.sort(b.share - a.share)`, yet the DISPLAYED order/ranks don't match. So the bug is between the sorted array and what's shown — most likely `updateStandings()` in ui.js: the DOM-reorder `appendChild` is gated on `sig !== _standSig` (id-order caching) so rows may never actually re-order, while rank labels get set per-row → labels and visual rows desync. OR rival-share init makes the array unsorted.
Fix: make the DISPLAYED rank AND row order ALWAYS match the descending market-share, in EVERY state (mid/late/finale). VERIFY by actually RENDERING `__view.html?tab=world&stage=mid` and `&stage=finale` and reading the result — do NOT trust that a `.sort` exists in code. The repro state has rival defaults Helion 11 / Cerebra 13 / OmniNet 9 with You 12, so the correct display is: #1 Cerebra 13%, #2 You 12%, #3 Helion 11%, #4 OmniNet 9%.

UPDATE: your commit "fix(bug3): standings always reorder DOM to sorted share" did NOT fix it — I re-rendered the CURRENT build and `__view.html?tab=world&stage=mid` STILL shows #1 Helion 11% above #2 Cerebra 13% and #3 You 12%. So the DOM-reorder was not the (only) cause. STRONG HYPOTHESIS: `standings()` sorts with `b.share - a.share`, but in this state the rival shares (`state.rivalShare[id]`) are non-numeric / undefined → `b.share - a.share` is NaN → `Array.sort` leaves them in insertion order (rivals-array order with You spliced in = exactly what's shown). FIX ROBUSTLY: coerce every share to a finite Number (default 0) BEFORE sorting, in `standings()` — harmless if already numeric, fixes it if NaN. Also ensure `ensureRivalShare()` always yields numbers. Then RE-RENDER `__view.html?tab=world&stage=mid` AND `&stage=finale` yourself and confirm rank matches share before claiming done.

== BUG 5 (MINOR, RU) — "You" not localized in standings ==
In the market-share standings the player row shows "You" in English even in RU. Localize it (e.g. "Вы"). (RU otherwise reads clean — no overflow.)

== BUG 4 (MINOR) — ALIGNMENT ARROW DIRECTION ==
On the Alignment risk vectors, each rising rate shows a "▼" down-arrow (e.g. "▼ +0.14/s") — confusing. Use a rising/up indicator (or drop the arrow) so it reads as "risk going up".

VERIFY (render via __view.html at fresh/mid/late/finale on Lab/World/Team/Stats):
- node --check all JS; zero console errors.
- Valuation is sane (in-scale with cash) and IDENTICAL on Lab HUD and Stats; funding payouts are a sensible boost (not trillions) and the funding flow is explained.
- No toast flood — finale/ending screen is readable; earned achievements don't re-toast on load.
- Standings rank matches shown % in every state.
- RU↔EN parity; no layout overflow at 360/390/414; safe save migration.
- Commit each fix; update BALANCE.md. Final message: each bug, the fix, and how you verified.
