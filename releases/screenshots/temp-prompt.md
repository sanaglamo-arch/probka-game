# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

ROUND 9 — THE RACE TO AGI: a narrative campaign + rival labs + multiple endings. This is the round that gives the game a SOUL and a reason to replay — it ties every existing system (generators, prestige, Singularity, multi-vector risk, Trust, crises, news, market) into a journey with stakes, competition, and branching climaxes. Act as a demanding senior game-dev lead. Full autonomy — don't ask, just do. RU+EN parity, a working build at every step, verify + rebuild at the end, zero external network requests. Use the `ui-ux-pro-max` skill for all new UI + its accessibility/contrast/touch checks.

LEAD MANDATE — STORY THROUGH SYSTEMS, GATE THE REVEAL: do NOT bolt on a separate "story mode". The narrative rides on the systems you already have (news feed, crises, milestones, prestige). Keep early game simple; reveal acts, rivals, and stakes progressively. The journey should feel emergent, not on-rails.

1) NARRATIVE CAMPAIGN / ACTS:
- Structure the whole progression into named ACTS, each with a one-screen intro beat, a clear goal, and a reveal/twist: e.g. Garage → Startup → Frontier Lab → The Race → Singularity. Use existing milestones/prestige as act boundaries. Each intro is a short, satirical, atmospheric beat (RU+EN) — not a wall of text.
- A subtle "act progress / next chapter" indicator so the player always feels forward motion toward AGI.

2) RIVAL LABS — "Race to AGI":
- 2–4 named rival AI labs (with personalities/flavor) that progress toward AGI on their OWN timeline, shown in a clear standings panel (their progress vs. yours). They react to world events and to the race heating up.
- Light interaction via existing systems: out-compete them (raw progress), slow them (open-source a model = Trust+ but capability−; via news/decisions), poach talent, or race recklessly (speed+ but risk+). Make rivals feel ALIVE and create genuine tension ("Helion Labs is 12% from AGI — move!").

3) STORY VIA NEWS + KEY DECISIONS:
- Drive the storyline through the existing news/crisis feed plus a handful of pivotal STORY decisions at act boundaries that branch the path (and set up the ending). Keep choices meaningful (tied to Risk vectors / Trust / speed).

4) MULTIPLE ENDINGS / CLIMAX (the payoff + replayability):
- The AGI/Singularity climax resolves into one of several distinct ENDINGS based on alignment vectors, Trust, crisis handling, race outcome, and speed — e.g. "Aligned Singularity" (win, safely), "Reckless Foom" (win, darkly), "Nationalized / Shut Down" (scaled too fast, lost control), "Beaten to AGI" (a rival got there first). Each ending = a short cinematic + a permanent badge + a small meta-perk, encouraging replay to chase the others.
- An ENDINGS / collection screen showing which you've unlocked, nudging "try a different strategy next run". Tie cleanly into the existing Singularity reset (each run can pursue a different ending).

5) DESIGN (skill): act-intro screens, the rivals standings panel, the endings/collection screen, and the climax cinematics must look premium and cohesive — atmospheric, readable, motion. RU+EN.

6) BALANCE + GATING: rivals' pace, act lengths, and ending thresholds tuned so the journey is satisfying (a reachable first ending, meaningful variety between endings), and none of it breaks the economy or the R8 management-sim tuning. Document in BALANCE.md. Gate the reveal of rivals/endings behind progress.

VERIFY + REBUILD:
- `node --check` every JS; zero console errors in headless Chrome.
- Smoke + targeted: acts advance + intros fire, rival standings progress + react, story decisions branch, each ending is reachable and triggers correctly, endings collection persists, a new run can pursue a different ending, all prior systems (autopilot, market, crises, trust) intact, save/reload, RU↔EN.
- RU/EN parity for ALL new strings (acts, rivals, story beats, endings — lots).
- Regenerate ALL screenshots (seeded mid-game), mobile + desktop, including a new ACT INTRO, the RIVALS standings, and an ENDING/climax screen.
- Rebuild dist/singularity-inc.zip (index.html at root, validated) + dist/store-assets-bundle.zip.
- Commit each phase. Final message: the act/ending structure, how rivals + endings tie to existing systems, the balance numbers, and an honest take on whether the game now has a satisfying journey + replay hook.
