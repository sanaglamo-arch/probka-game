# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

ROUND 8 — TUNE & HARDEN the new management-sim layer. R7 added a lot at once (multi-vector risk, branching crises, news feed, Trust, Market) and shipped it UNTUNED. Now make it actually FUN and balanced — not just present. Act as a demanding senior game-dev lead. Full autonomy — don't ask, just do. RU+EN parity, a working build at every step, verify + rebuild at the end, zero external network requests. Use the `ui-ux-pro-max` skill for UI polish + its accessibility/contrast/touch checks.

LEAD'S FRAMING: a big systems round just landed without tuning. RESIST adding more systems this round. This is balance, feel, anti-exploit, variety, and a real playtest of the new layer.

1) CRISIS TUNING (frequency + severity):
- Tune crisis cadence by game stage: tense but NOT nagging/spammy. Gentle early game, more pressure later.
- Ignored/mishandled escalation must carry a real consequence, and proactive Alignment investment must VISIBLY pay off (fewer/smaller crises). Re-confirm the spam-tap exploit is truly gone.
- Make each crisis decision feel weighty — clear tradeoffs, a beat of spectacle, satisfying resolution feedback.

2) FIRST-SINGULARITY PACING:
- Tune the full curve with EVERYTHING active (autopilot, market income, trust gates, crises) so the first Singularity is reachable and satisfying — not a slog, not trivial. Pick a good time-to-first-Singularity and document the curve in BALANCE.md.

3) MARKET BALANCE + ANTI-EXPLOIT:
- Ensure the Market is a fun BONUS, not a mandatory grind or a money printer. No risk-free buy-low/sell-high infinite loop; reasonable volatility, sane caps, spread/fees if needed. It should add flavor + light strategy, never trivialize the economy.

4) TRUST ECONOMY:
- Make Trust matter: earnable AND loseable, with gates that feel meaningful (content/contracts that genuinely want high Trust). Not trivial to max, not impossible.

5) CONTENT VARIETY (supports tuning, not bloat):
- Expand news headlines, crisis types, and decision cards so the feed doesn't repeat quickly. RU+EN for all.

6) FEEL / UI POLISH (skill): the "World" tab is dense — improve readability and hierarchy (news vs. crisis vs. market), add micro-interactions on market buy/sell and crisis choices, make the Trust HUD clear. Run accessibility/contrast/touch checks and fix fails.

7) FULL PLAYTEST:
- Play the whole arc with all systems on. Find where it's confusing, annoying, exploitable, repetitive, or boring — and fix it. Give an HONEST verdict on whether the management layer is genuinely fun and well-integrated.

VERIFY + REBUILD:
- `node --check` every JS; zero console errors in headless Chrome.
- Smoke + targeted: crisis cadence/escalation, alignment payoff, market not exploitable, trust gates, news variety, gating order, autopilot + all prior systems intact, save/reload, RU↔EN.
- RU/EN parity for all new strings.
- Regenerate ALL screenshots (seeded mid-game), mobile + desktop, including a FOCUSED Market screen and a tuned crisis moment.
- Rebuild dist/singularity-inc.zip (index.html at root, validated) + dist/store-assets-bundle.zip.
- Commit each phase. Final message: the tuning numbers (crisis cadence, time-to-first-Singularity), exploits closed, and your honest fun assessment.
