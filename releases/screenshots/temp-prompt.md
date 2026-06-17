# Временный промт (обновляется)

> Открой на GitHub → «Copy raw» → вставь в окно сборки.

---

The bugfix round is DONE and independently verified (valuation/funding sane + consistent, no toast flood, standings correct, alignment arrow, RU player row). Now keep building the game toward `GAME-DESIGN.md` (re-read it). Full autonomy — don't ask, don't stop, commit each step. RU+EN parity, working build at every step, zero external runtime requests, safe save migration, no layout overflow at 360/390/414. Self-verify by RENDERING (`__view.html?tab=...&stage=fresh|mid|late|finale`) and, for anything number/state-related, by INSPECTING THE RUNTIME directly (screenshots of time-evolving state can mislead).

PRIORITY 1 — EARLY-GAME CLARITY (the first ~10 minutes; this is where players form their impression and where confusion has already bitten us):
- Play the fresh → first model → first funding flow as a brand-new player and smooth every confusion.
- When the player ADVANCES A MODEL GENERATION, clearly show what it gave — like a projection/summary: "Model vN released → +X% permanent output, market share +Y%, unlocked Z." The gain must feel earned and understood (this is the heart of the no-reset loop).
- When a FUNDING ROUND unlocks, the "where did this money come from" must be obvious (you already added the explanation — verify it actually reads clearly on the button + ⓘ at the moment it appears).
- FIX a narrative nit: the Act 2 intro goal says "Scale up and release your **first** frontier model" but it fires right AFTER the player released model v1 — reword so the goal is the NEXT milestone, not one already done.
- Make sure the first 10 minutes never leave the player asking "what do I do / why / what did that give me".

PRIORITY 2 — REAL-TIME PROCESS FEEL (the month-long engine must feel good, not like dead waiting):
- Training a model, building a datacenter, and running research are timed processes. Each must have a clear PROGRESS BAR + ETA, a satisfying COMPLETION moment (toast/flash/sound), and VISIBLE speed-up when the player taps / uses a boost / adds compute or researchers. While one timer runs, there must always be something else to do (parallel tracks). Audit for any "nothing to do but wait" gaps and fill them.

PRIORITY 3 — keep polishing per GAME-DESIGN.md and keep self-verifying. After each meaningful change, render the affected screen(s) and confirm no regressions/overflow, then continue. Commit with clear messages; never go idle.
