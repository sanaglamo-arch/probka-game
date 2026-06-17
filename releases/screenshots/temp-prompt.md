# Временный промт (обновляется)

> (Я доставляю это строителю сам — схема B.)

---

GAME-FEEL MASTERING ROUND. Two QA/design analysts found the mechanics are solid but the game "feels flat" in key moments. Fix the feel — these are mostly LOW-effort, HIGH-impact, NO new systems, NO economy changes. Full autonomy — don't ask, don't stop, commit each. RU+EN parity, working build each step, zero external runtime requests, no layout overflow at 360/390/414. Verify by rendering AND (for moments/animation) by code + runtime inspection.

1) FIX THE #1 DOPAMINE MOMENT — MODEL-GENERATION ADVANCE (the climax, ~11×/run, currently half-baked). The summary modal pops INSTANTLY and hides the celebration FX. DEFER the gen-summary modal ~1.2s so the celebratory shockwave + confetti play VISIBLY over the main screen first (the progress bar hits 100% → burst → THEN the modal slides in). Make shipping a model feel like a triumph. (`js/ui.js` showGenSummary path.)
2) LONG-TRAINING FEEDBACK + the v4→v5 MOMENTUM CLIFF (training jumps ~1h→4h around min 50 — players feel stuck). (a) Fire a subtle progress toast at 25% / 50% / 75% of a training run ("Model vN training · 50% · ~Xh left"). (b) The FIRST time a training run exceeds ~1h, show a one-time light, skippable teaching beat: "Models take longer to train now — hire researchers and build datacenters to speed them up. Work in parallel; never just wait." Show the researcher/build CTAs. This keeps "always a next goal" alive. (`js/game.js` finishTraining/tick + `js/ui.js`.)
3) LATE-GAME DRAMA (v7→AGI, 5+ days currently silent). (a) When a rival crosses 50% / 75% / 90% AGI progress, fire a toast: "🚀 Helion hit 75% AGI — they're catching up!". (b) Add a persistent topbar "race status" badge from mid-game: "🏆 #1 market share" when you lead, switching to "⚠️ Helion 78% AGI" when a rival is closing. Make the race feel alive. (`js/game.js` rival update + `js/ui.js` topbar.)
4) PARALLEL-TIMER WINS SHOULDN'T BE SILENT. Datacenter build / research / hire completions currently resolve silently. Give each a distinct subtle audio cue + a haptic pulse + a clear toast ("Datacenter built · +X% compute capacity"). (`js/game.js` finishBuild/finishResearch + `js/audio.js` add build/research tones + `js/ui.js`.)
5) CHEAP JUICE (low effort, real feel):
   - Milestone ×2 toast shows the output DELTA: "×2! +X/sec" (compute the gain). (`js/ui.js` milestone handler.)
   - Generator buy: a small floating "+X/sec" over the card on purchase. (`js/game.js` buyGen delta + `js/ui.js` floatText.)
   - Funding round: a distinct rising jingle + a soft GREEN "good news" screen flash (not the cyan/red used elsewhere). (`js/audio.js` + `js/ui.js` on funding.)
   - Daily streak milestones (day 7 / 14 / 30): a celebratory toast with a 🔥 badge. (`js/game.js` daily + `js/ui.js`.)
6) DISCOVERABILITY: surface the orb cosmetics (cyan/gold/crimson) as a small swatch row on the Lab tab (they're buried in Settings now); and show the current ACT name on the topbar (e.g. "ACT III · FRONTIER") so the narrative arc is visible. (`js/ui.js`.)

CONSTRAINTS: no new gameplay systems, no balance/economy changes (economy passed audit). Keep it tasteful — feedback should feel premium, not spammy (cap toasts, don't flood). VERIFY: node --check clean; render affected screens at 360/390 EN+RU (no overflow, no regressions); confirm the gen-advance celebration is visible before the modal; RU+EN parity; safe save migration; commit each with a clear message.
