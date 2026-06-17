# Временный промт (обновляется)

> Открой на GitHub → «Copy raw» → вставь в окно сборки.

---

URGENT ECONOMY BUG + scenario audit. A player released a model and was instantly handed a huge unexplained lump of cash. Confirmed via the harness at mid-game: with **$1.42M cash**, the HUD shows **VALUATION $164 TRILLION** and a funding button **"Raise Series B · +$294.6B"**. The valuation is inflated by a factor of millions, so funding rounds dump game-breaking amounts. Fix this properly, then audit the whole money scenario for sanity. Full autonomy, RU+EN, commit each step, no external runtime requests, verify by rendering.

ROOT CAUSE: `valuation() = max(moneyRate * SECONDS_YEAR * VAL_REV_MULT, cash + compute*2)`. Annualising the per-second rate (×~31.5M) then ×VAL_REV_MULT makes valuation dwarf actual cash by ~6 orders of magnitude. `takeFunding()` grants `valuation * cashFrac`, so a round pays out trillions/billions vs. the player's real ~$1M. That's the "free 500M from nowhere".

1) FIX FUNDING PAYOUT (the actual break):
- Funding must be a MEANINGFUL BOOST, never a game-skip. Re-tune so a round pays out on the order of the player's CURRENT scale — e.g. cap it to "a few minutes of current income" or a hand-tuned curve relative to current cash/cps — NOT `valuation × frac` when valuation is an inflated annualised number.
- Pick concrete targets: Seed ≈ a small head-start; each later round bigger but still on the order of minutes-of-income, never hours/days. Simulate: after taking every round at the earliest gen it unlocks, the player must NOT trivialise the next stage. Document the new funding values + the reasoning in BALANCE.md.

2) FIX VALUATION DISPLAY (so it's believable):
- Valuation should read like a real company number that's in the same universe as your cash/revenue — not $164T at $1.4M cash. Re-derive it sanely (e.g. a believable revenue multiple WITHOUT the ×SECONDS_YEAR explosion, or based on cumulative earnings + market share), so it grows impressively but plausibly. It's a pride metric; it must feel real.

3) MAKE THE FLOW CLEAR (the "откуда деньги?" confusion):
- When a funding round unlocks, explain it: "Releasing model vN unlocked your Seed round. Investors put in $X for a slice of equity." The player must always understand WHERE money comes from and WHY it appeared. Add a one-line explanation on the funding button/panel (RU+EN) + the ⓘ tooltip.

4) FULL MONEY-SCENARIO AUDIT (the player asked to check the scenarios):
- Play/sim the first ~hour and the whole arc and CHECK every source of money for sanity: model release → market-share → income, funding rounds, daily/boost rewards, offline earnings, windfalls, news/event cash. Nothing should hand the player a sum that's wildly out of scale with where they are. Fix anything that does. Confirm there's no other "money from nowhere" and no money-printer exploit. Re-confirm the month-long arc still holds (no walls, no trivialising skips) and document.

ADDITIONAL PLAYTEST ISSUES (found while you fix the above — handle these too):
5) MARKET-SHARE STANDINGS SORT IS WRONG in some states. At a mid-game state the World/Race standings showed: #1 Helion 11%, #2 Cerebra 13%, #3 You 12%, #4 OmniNet 9% — i.e. the ranks do NOT match the % (Cerebra 13% should outrank Helion 11%, and You 12% should outrank #1). At late game it sorted right. Bug: the standings aren't reliably sorted by the displayed share (or rank-key ≠ displayed value) when shares are close. Fix so rank ALWAYS matches the shown market-share %, in every state. A player must never see "#1" with less share than "#3".
6) ACHIEVEMENT/MILESTONE TOAST FLOOD. On loading a state (and likely on big jumps / save-load), 8+ achievement + UNICORN/DECACORN toasts stack and cover the WHOLE screen at once, burying the UI. Queue/cap them: show at most ~2–3 at a time, the rest queue and appear in sequence; on a fresh save-load, don't re-fire already-earned achievement toasts at all (only NEW unlocks should toast). (The UNICORN/DECACORN valuation milestones will also need re-checking once valuation is fixed.)
7) (minor) On the Alignment vectors, each rate shows a "▼" down-arrow next to a POSITIVE rising rate (e.g. "▼ +0.14/s") — confusing. Use an up/rising indicator (or drop the arrow) so it reads as "risk rising".

VERIFY:
- node --check all JS; zero console errors. Render Lab/Race/Team at fresh/mid/late (use __view.html) and confirm: valuation + funding are SANE and in-scale with cash; the funding flow is explained; standings rank matches shown share in every state; toasts don't flood/cover the UI; RU↔EN parity; no layout overflow at 360/390/414. Safe save migration. Commit with clear messages; update BALANCE.md with the new funding/valuation numbers.
