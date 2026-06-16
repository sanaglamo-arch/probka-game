# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

ROUND 4 — DEPTH, ENDGAME, and the moments that make idlers addictive, plus a critical design-polish pass. Act as a demanding senior game-dev lead. Full autonomy — don't ask, just do. Keep RU+EN parity, a working build at every step, re-verify + rebuild at the end. Zero external network requests (all assets local/inline).

USE THE DESIGN SKILL (mandatory): a `ui-ux-pro-max` skill is at `/root/.claude/skills/ui-ux-pro-max/`. Invoke it if available; otherwise READ `/root/.claude/skills/ui-ux-pro-max/SKILL.md` + its `data/`/`scripts/` and apply its palette/typography/style guidance and run its accessibility/contrast/touch-target checks on the result.

LEAD'S VERDICT ON ROUND 3 (be honest): the visual overhaul is a real step up — the glowing TRAIN orb, neon cards, Insight Flash all land. But it's "good, not exceptional", and the GAME still lacks long-term depth and climactic moments. Idlers live or die on (a) an endgame that keeps players for weeks and (b) dopamine spikes at key moments. Both are thin right now. Fix that.

1) ENDGAME / META-PROGRESSION (biggest gap — kills "nothing to chase after an hour"):
- SECOND PRESTIGE LAYER "The Singularity": unlocks late (after N total Research Points or the first AGI-tier generator). Resets generators AND Research Points for a permanent meta-currency ("Singularity Cores") that buys a small meta-upgrade tree with strong global modifiers. Short narrative beat on trigger.
- RESEARCH / TECH TREE (Egg Inc / Realm Grinder): a tree of unlockable techs gated by progress, each multiplying a category (tap, a generator class, offline, risk). Long-term strategic planning.
- PRESTIGE ARTIFACTS + SYNERGIES: on prestige, grant a few build-crafting artifacts (e.g. "+5% all mult", "risk gain −20%", a gamble one); equipping tagged pairs grants synergy bonuses. Makes each run unique.
Keep all math sane; document in BALANCE.md + the economy sim.

2) CLIMACTIC MOMENTS (dopamine — currently flat):
- PRESTIGE RITUAL: turn "Release a frontier model" from a button-tap into a MOMENT — a short cinematic (model-release graphics, light sweep, number cascade, confetti/particles, audio sting) + a quick allocation choice if feasible.
- MILESTONE CELEBRATIONS: 25/50/100 breakpoints get a real flash + popup + sound, not just a color shift.
- EVOLVING BACKDROP toward AGI: the ambient backdrop visibly escalates across milestones/prestiges (quiet startup → server farm → data center → orbital → AGI glow), giving a sense of scale.

3) CRITICAL DESIGN-POLISH PASS (good → exceptional, use the skill):
- Generator cards read a bit flat/dark/samey — add depth, hierarchy, per-tier identity; make /sec and milestone progress pop.
- Tighten the TRAIN orb (crisp premium icon, charge/heat shimmer, even more satisfying press).
- Consistent inline-SVG iconography across ALL screens (kill any remaining emoji/inconsistency).
- Micro-interactions on every interactive element (buy, tab, toggle, claim). Run the skill's contrast/touch-target/focus checks and fix every fail.

4) AUDIO (last missing juice):
- Subtle procedural ambient music (WebAudio, no external files), OFF by default, own toggle; richer SFX for tap/buy/milestone/prestige/insight. Pause when tab hidden.

5) BALANCE AUDIT:
- Run the economy sim with ALL current mechanics (insight flash, milestone x2, breakthrough, tap combo, new endgame). No runaway / no dead walls; tune to a satisfying first prestige (~30–45 min) and a reachable-but-meaningful Singularity. Document final numbers.

VERIFY + REBUILD:
- `node --check` every JS; zero console errors in headless Chrome.
- Smoke test incl. second prestige, tech tree, artifacts, prestige ritual, music toggle, insight/milestone/breakthrough/combo, save/reload, RU↔EN.
- RU/EN parity for ALL new strings.
- Regenerate ALL screenshots (seeded mid-game), mobile + desktop of every screen, including new Singularity / tech-tree / artifacts screens + a prestige-ritual moment.
- Rebuild dist/singularity-inc.zip (index.html at root, validated) + dist/store-assets-bundle.zip.
- Commit each phase. Final message: what changed + before/after notes + the new final numbers.
