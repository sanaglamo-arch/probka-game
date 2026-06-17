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

VERIFY:
- node --check all JS; zero console errors. Render Lab/Race at fresh/mid/late (use __view.html) and confirm valuation + funding numbers are now SANE and in-scale with cash; the funding flow is explained; RU↔EN parity. No layout overflow at 360/390/414. Safe save migration. Commit with clear messages; update BALANCE.md with the new funding/valuation numbers.
