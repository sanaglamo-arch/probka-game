# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

ROUND 6 — AUTO-BUY / MANAGER REWORK + bug hunt. A player found a real economy bug: money silently vanishes because a "manager" auto-buys its generator the instant it's affordable, dumping cash into a low-value low-tier unit (e.g. a GPU Rig at 5.26M that isn't worth buying). The current "manager" conflates two things — a +50% output buff AND a dumb "buy whenever affordable, one step per tick" autobuyer (game.js:~631). Rework it completely. Act as a demanding game-dev lead. Full autonomy — don't ask, just do. RU+EN parity, a working build at every step, verify + rebuild at the end, zero external network requests. Use the `ui-ux-pro-max` skill (invoke or read /root/.claude/skills/ui-ux-pro-max/ files) for the new UI.

1) DECOUPLE MANAGER FROM AUTO-BUY:
- "Manager" becomes a PURE permanent output buff for its generator (keep ~+50%, or rebalance). It NEVER spends your cash. A clean, worthwhile one-time purchase.
- Remove the old "buy whenever affordable each tick" behavior entirely.

2) NEW SMART "AUTOPILOT" (ROI + reserve + control):
- A separate auto-buy system. When active, each tick it considers all auto-enabled generators and buys the BEST-VALUE one — lowest cost per +output/sec gained (true ROI), NEVER cheapest-blindly. It must never make a purchase that's worse value than an available alternative.
- RESERVE control: a player-set reserve (slider / %), e.g. "keep 50% of cash". Autopilot only spends ABOVE the reserve, so manual buys, Breakthrough, and prestige always have cash. This directly fixes the "money disappears" feeling.
- PER-GENERATOR toggles: player turns Autopilot on/off per generator, so it never wastes on ones they don't want.
- OPTIONAL MODE "fill to next milestone then pause": buys a generator only up to its next 25/50/100 breakpoint, then stops — pushing the meaningful x2 without endless drain. Selectable.
- Gate Autopilot behind a sensible unlock (e.g. after the first prestige, or a one-time buy), so early game stays hands-on.

3) UI (use the skill):
- A clean Automation/Autopilot panel: global on/off, reserve slider with a live "keeps X" readout, per-generator toggles, a mode selector (Best value / Fill-to-milestone), and a status line showing what it's doing now ("Buying Data Center — best ROI"). RU+EN. Readable and premium, not cluttered.

4) SAVE MIGRATION (critical — no one should log in to a drained balance):
- Convert existing saves cleanly: keep the +50% manager buff, and default Autopilot to a SAFE state (off, or on with a healthy reserve). Never auto-spend a returning player's bank on load.

5) BUG HUNT / PLAYTEST PASS (the player is finding bugs by playing — find the rest first):
- Self-playtest the full economy and hunt specifically for: money silently spent in bad ways, negative/NaN balances, purchases that feel like a trap, milestone/multiplier miscounts, offline-earnings mismatches, prestige/Singularity edge cases, and missing/confusing feedback when cash is spent. Fix what you find; list each in the final message.

VERIFY + REBUILD:
- `node --check` every JS; zero console errors in headless Chrome.
- Smoke + targeted tests: Autopilot respects the reserve, buys best-ROI (not cheapest), per-gen toggles work, fill-to-milestone stops correctly, manager buff applies WITHOUT spending, save migration is safe, RU↔EN.
- RU/EN parity for all new strings.
- Regenerate affected screenshots (the Automation panel + any changed screens), mobile + desktop.
- Rebuild dist/singularity-inc.zip (index.html at root, validated) + dist/store-assets-bundle.zip.
- Commit each phase. Final message: what changed, the bugs you found + fixed, and the new automation design.
