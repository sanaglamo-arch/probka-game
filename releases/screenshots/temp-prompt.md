# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

ROUND 5 — STOP ADDING, START MASTERING. We've piled on features for four rounds (endgame, viral mechanics, full redesign, audio). Now PROVE the game is actually fun, make the pieces cohere, and make it unforgettable. Act as a demanding senior game-dev lead. Full autonomy — don't ask, just do. RU+EN parity, a working build at every step, re-verify + rebuild at the end. Zero external network requests (all assets local/inline).

USE THE DESIGN SKILL (mandatory): `ui-ux-pro-max` at `/root/.claude/skills/ui-ux-pro-max/`. Invoke it if available; otherwise read `SKILL.md` + its `data/`/`scripts/` and apply its guidance + run its accessibility/contrast/touch-target checks.

LEAD'S FRAMING (be honest with yourself): the game is feature-rich but UNPROVEN — nobody has verified it's actually fun end-to-end, the balance with all the new mechanics is untested in practice, and the look is "good", not "unforgettable". This round is quality, cohesion, and spectacle — NOT new systems. Resist adding mechanics; make the existing ones sing.

1) DEEP PLAYTEST + BALANCE HARDENING (most important):
- Simulate/play the FULL arc with every mechanic active (tap+combo, generators, milestone x2, upgrades, tech tree, research prestige, artifacts+synergy, Singularity meta-layer, risk/alignment+incidents, insight flash, breakthrough, world events).
- Find and FIX: the first-60-seconds hook, any mid-game dead zones or progress walls, whether each prestige layer is reachable and feels rewarding, and whether insight/breakthrough/combo synergize vs. trivialize the economy.
- Tune to: a gripping first minute, a satisfying first prestige (~30–45 min), a meaningful-but-reachable first Singularity, smooth pacing throughout. Document the full curve in BALANCE.md.
- Add a lightweight "next goal" nudge so players are never lost (subtle hint at the next unlock / affordable milestone / when to prestige).

2) SIGNATURE IDENTITY + FIRST IMPRESSION (skill):
- Push the visual from "good neon" to a cohesive, memorable art direction with a distinct personality. Polish splash/loading, first-run, and ALL empty states.
- Make the main screen a thumb-stopper — the kind of screenshot that earns a click in a store catalog.

3) SPECTACLE PASS on the dopamine peaks (make them WOW, not just present):
- Insight Flash claim, Breakthrough activation, 25/50/100 milestones, the Prestige Ritual, and the Singularity reset should EACH be a genuine spectacle — layered particles, light, motion, sound stings, screen-wide feedback. These are the moments players replay for.

4) DEPTH WITHOUT BLOAT:
- Cosmetic skins (earned, no pay-to-win): themes for the lab/backdrop, the TRAIN orb, and/or GPU icons; a small unlock gallery.
- Expand the satirical news-ticker into a light NARRATIVE ARC with story beats: garage → frontier lab → AGI → Singularity, tied to milestones (RU+EN).
- Add achievements tied to the NEW systems (tech tree, artifacts, Singularity); a couple may grant small permanent perks.

5) FULL QA SWEEP:
- `node --check` all JS; zero console errors in headless Chrome.
- Smoke + edge cases: huge numbers, long offline, prestige mid-incident, artifact-synergy stacking, Singularity reset, music toggle, save/reload, RU↔EN.
- Skill accessibility pass (contrast/focus/touch) — fix fails.
- RU/EN parity for ALL strings (incl. nudges, narrative, cosmetics, new achievements).
- Regenerate ALL screenshots (seeded mid-game), mobile + desktop of EVERY screen — including the new Singularity / tech-tree / artifacts / cosmetics screens and a spectacle moment (insight or prestige ritual).
- Rebuild dist/singularity-inc.zip (index.html at root, validated) + dist/store-assets-bundle.zip.
- Commit each phase. Final message: what changed, the tuned final numbers, and your HONEST assessment of whether it's now genuinely fun.
