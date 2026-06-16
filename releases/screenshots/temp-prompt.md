# Временный промт (обновляется)

> Открой на GitHub → «Copy raw» → вставь в окно сборки.

---

MISSION — implement the new game vision from the design doc, and KEEP WORKING NONSTOP. You are the lead engineer building "Singularity Inc." in `/root/singularity-inc` (git repo, branch `claude/ai-tycoon`). We have rewritten the game's design into a doc. Read it, then transform the existing game to match it, working CONTINUOUSLY for as long as you can — do NOT stop, do NOT ask, commit every step. Full autonomy.

STEP 0 — READ THE DESIGN DOC (do this FIRST, fully):
Read `GAME-DESIGN.md` in the project root — it is the FULL, APPROVED spec and the source of truth. (If missing locally: `curl -s https://raw.githubusercontent.com/sanaglamo-arch/probka-game/claude/polish-game-ui/releases/screenshots/GAME-DESIGN.md -o GAME-DESIGN.md`.) Internalise ALL of it — every system you build must follow it. Then skim `README.md` + `BALANCE.md` for the current state and `git log --oneline -20` for what's been done.

THE CHANGE IN ONE SENTENCE (see GAME-DESIGN.md §1, §2, §10):
The game currently uses prestige RESETS (release a model → reset to a laptop). The new vision is **realistic, CONTINUOUS growth with NO resets** (your infrastructure persists forever), grounded in how real AI labs (OpenAI/Anthropic) actually grew, paced to take **a month+** of real play. Keep the good parts (tap+generators = compute, buy clarity, progressive unlocks, balance work, ZERO external runtime requests); rewrite the meta around the doc.

WORK PLAN — do in order, commit after each, keep a runnable build at every step:
- **P1 — NO RESETS → MODEL GENERATIONS.** Replace the prestige/RP-reset loop with a forward-only model-generation ladder (v1 → … → AGI). Advancing a generation = a PERMANENT leap (global multiplier + market-share jump + new unlocks) and you KEEP all infrastructure — never reset to laptop. (§4)
- **P2 — REAL-TIME PROCESSES (the month-long engine).** Training a model is a TIMED process (early ~minutes, later hours→days), gated by compute. Add timed datacenter builds and timed research too. Several PARALLEL timers so there's never dead time. Active play + earned boosts speed them up; offline advances them. This is the main reason the game lasts a month. (§2, §7)
- **P3 — RESOURCES.** Money, Compute, Researchers as the 3 core resources; Valuation + Market Share as derived scoreboards. (§3)
- **P4 — MARKET SHARE + RIVALS as the central goal.** 3–4 rival labs grow toward AGI on their own timelines; you compete for market share; goal = become #1, then reach AGI first. Acquisitions: light/optional. (§5, §6)
- **P5 — FINANCE.** Funding rounds (Seed→A→B→C→IPO) + live valuation, replacing the old twitchy market/trading. Realistic amounts (§5, §6).
- **P6 — SYSTEMS ON CONTINUOUS GROWTH.** Re-home research / hiring(talent) / safety(risk+crises) / comms(news+trust) as parts of the growing company, unlocking in order (§5, §6), all feeding continuous growth (no reset).
- **P7 — RETENTION ENGINE.** Earned boost economy (~80% earned, not paid), daily login + daily goal + events (crisis/round/rival move), offline "while you were away" summary, "always a next goal" nudge, forgiving streaks. (§7, §9)
- **P8 — ENDGAME.** AGI-race finale + endings by playstyle (Aligned / Reckless / Nationalized / Beaten); optional NON-forced "Founder's Legacy" replay. (§8)
- **P9 — BALANCE THE MONTH-LONG CURVE.** Tune timers, costs, generation thresholds (use the real anchors in §6) so the arc spans ~a month of engaged play with NO walls, NO dead time, NO exploits. Simulate the full timeline and document it in BALANCE.md.
- **P10 — POLISH.** Layout integrity (NO text/box overlaps or overflow at 360/390/414 + desktop), clarity (every system has a one-line explanation + ⓘ tooltip), mobile feel + haptics, performance ~60fps. Use the `ui-ux-pro-max` skill.

HARD RULES (think of every detail):
1. **Never stop, never ask.** Work continuously P1→P10, then keep going: re-read GAME-DESIGN.md, diff it against the build, and close every gap; then polish/balance/verify forever. Never go idle.
2. **Git + GAME-DESIGN.md are your memory.** Work in SMALL committed increments. If you lose context / restart, re-read GAME-DESIGN.md and `git log` to see what's done, and continue from there. Always leave a clear trail in commit messages.
3. **Safe save migration on EVERY schema change** — bump the save version, convert old progress sensibly, never crash or rob a returning player. (This is a big meta rewrite; old saves WILL change shape.)
4. **RU + EN parity** for ALL text, always.
5. **ZERO external network requests at RUNTIME** (the game must work offline / on Yandex). Dev-time curl of the design doc is fine.
6. **Keep a runnable build at every commit.** `node --check` all JS; zero console errors at mobile + desktop sizes.
7. **Verify your own work by RENDERING** at 360 / 390 / 414 / desktop and inspecting — never trust blindly. Fix EVERY layout overlap/overflow (this has been a recurring failure — be ruthless).
8. **Mobile-first** (target Android / Google Play): touch targets ≥48px, thumb reach, portrait.
9. Commit after every meaningful step with a clear message. Do NOT regenerate the release screenshot set or store zip (those are release-time, not now).
10. After each phase, write one short line: what changed + what's next — then continue immediately.

GOAL: by the time anyone checks in, the game matches GAME-DESIGN.md as closely as possible, runs clean on phone sizes, and is balanced for a realistic month-long arc. Keep working until it's there — and then keep making it better. Start now with STEP 0.
