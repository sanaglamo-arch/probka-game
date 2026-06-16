# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

ROUND 7 — turn the idle clicker into an "idle + management sim". Big round: a full Alignment/Crisis rework + a News & Decisions system + a Market layer + a Trust resource. Plus a bug fix. Act as a demanding senior game-dev lead. Full autonomy — don't ask, just do. RU+EN parity, a working build at every step, verify + rebuild at the end, zero external network requests. Use the `ui-ux-pro-max` skill (invoke or read /root/.claude/skills/ui-ux-pro-max/ files) for ALL new UI + its accessibility/contrast/touch checks.

LEAD MANDATE — GATE THE COMPLEXITY: these systems add real depth, but a new player must NOT be hit with all of it at once. Early game stays simple (tap → buy). Risk vectors, News, Trust, and the Market unlock PROGRESSIVELY as the player grows, each introduced with a short one-line hint. Reveal depth over time — never overwhelm on the first session.

0) BUG FIX: when Breakthrough is active, its remaining-time indicator renders BEHIND the first generator (Laptop) buy block — wrong stacking/position. Fix it so the timer sits cleanly above/near the Breakthrough button, always on top (z-index/layout), on mobile AND desktop.

1) ALIGNMENT / CRISIS REWORK (the current single Risk bar is trivially defeated by spam-tapping — replace it entirely):
- MULTI-VECTOR RISK: replace the one Risk bar with several risk vectors, each driven by different activity — Capability (raw compute/output growth), Privacy/Data (certain generators), Public Trust / Regulatory (hype, fast prestiges), Security (accrues over time / certain upgrades). One button can't fix all.
- PROACTIVE ALIGNMENT (kills the exploit): Alignment becomes an INVESTMENT (research / safety staff / policies) that lowers the PROBABILITY and SEVERITY of crises over time. NO instant in-the-moment zeroing. Any reactive action has a cost + cooldown so spamming is not viable.
- VARIED CRISIS EVENTS with branching + escalation: multiple distinct crisis types, each tied to a risk vector, each presenting 2–3 response choices that trade off (pay cash / pause output / accept future risk). Mishandled or ignored small crises ESCALATE (e.g. bias complaint → regulatory probe → forced shutdown). Make it a real risk/reward strategy: scaling fast = more income but more/worse crises; investing in safety = slower but stable.

2) NEWS & DECISIONS SYSTEM (new core strategic layer):
- NEWS TAB: a living feed reacting to game state + world events — a mix of flavor (satirical AI headlines) and ACTIONABLE items.
- OPPORTUNITIES / DEALS (time-limited): e.g. "GPU shortage" (prices rise, limited buy-at-old-price), "AI hype — raise a round" (cash injection), "new chip drop" (one-time upgrade). Tap to act before the window closes.
- DECISION CARDS: each actionable news item is a choice affecting economy / a risk vector / Trust (e.g. "competitor open-sources a model → match them [spend research] or ignore [output dip]").
- TRUST / REPUTATION resource: moved by your decisions; it GATES content (government contracts, certain generators/upgrades/events require high Trust). Show it clearly in the HUD.

3) MARKET / INVESTING MINIGAME (the deep layer):
- A simple market where you invest cash into a few AI-sector assets whose prices drift and SPIKE/CRASH based on news events. Buy low / sell high for an active economic skill layer. Keep it readable (a few assets, a small sparkline/chart), and balance it so it's a bonus, not a mandatory grind or an exploit.

4) DESIGN (use the skill): new tabs/panels (News, Market, reworked Alignment) must match the premium look — readable cards, clear feedback, micro-interactions, RU+EN. Run accessibility/contrast/touch checks and fix fails.

5) BALANCE: these systems interact with the whole economy (generators, prestige, Singularity, Autopilot from R6). Re-run the economy sim with EVERYTHING active; ensure no exploit, no runaway, no dead walls; tune and document in BALANCE.md. The Alignment rework specifically MUST remove the "tap-to-zero" exploit.

VERIFY + REBUILD:
- `node --check` every JS; zero console errors in headless Chrome.
- Smoke + targeted: multi-vector risk rises/mitigates correctly, crises trigger + branch + escalate, alignment can't be spam-zeroed, news feed fires actionable items, decisions apply effects, Trust gates content, market buy/sell works and isn't exploitable, complexity gating unlocks in order, autopilot still works, save/reload, RU↔EN.
- RU/EN parity for ALL new strings (risk vectors, crises, news headlines, decisions, trust, market — there are many).
- Regenerate ALL screenshots (seeded mid-game), mobile + desktop, including the NEW News, Market, and reworked Alignment screens + a crisis-decision moment.
- Rebuild dist/singularity-inc.zip (index.html at root, validated) + dist/store-assets-bundle.zip.
- Commit each phase. Final message: what changed, the new systems + how they gate/unlock, the balance numbers, and confirmation the spam-exploit is gone.
