# Временный промт (обновляется)

> Открой на GitHub → «Copy raw» → вставь в окно сборки.

---

QA-SQUAD CONSOLIDATED FIXES. A 4-auditor QA sweep (economy / layout / early-game UX / systems) ran over the current build. Economy is CLEAN (valuation/funding/market/offline all sane — do NOT touch balance). Fix the prioritized list below, then re-verify by rendering (`__view.html`) AND by runtime inspection for anything number/state-related. Full autonomy — don't ask, don't stop, commit each fix. RU+EN parity, working build at every step, zero external runtime requests, safe save migration, no layout overflow at 360/390/414.

== P1 — EARLY-GAME CLARITY (highest impact; this is where new players get confused) ==
1. ONBOARDING FRAME IS WRONG. Step 1 copy says "Tap the big TRAIN button to earn your first **cash**", but the first TRAIN tap produces **COMPUTE**, not cash (cash comes from generators). Rewrite the onboarding so the model is correct and clear: tapping TRAIN earns COMPUTE → compute powers model training → generators (hardware) earn money automatically. (`js/i18n.js` ob_1_* and the whole tour.)
2. "NEED 50 COMPUTE" lacks context. A fresh player sees a disabled Train button + "Need 50 compute" with no idea what compute is or how to get it. Expand the hint, e.g. "Need 50 compute — buy hardware (generators) to produce it; tapping helps." (`js/ui.js` train_need / `js/i18n.js`.)
3. FUNDING "WHERE DID THIS MONEY COME FROM" — the explanation (`fund_explain`) is hidden/conditional. Make it ALWAYS visible the moment a round becomes available, clearly stating the source: "Shipping model vN unlocked your Seed round — investors fund you for a slice of equity." Verify it reads on the button/panel at the moment it appears. (`js/ui.js` funding panel + `js/i18n.js`.)
4. ONBOARDING STEP 3 references the Alignment lab, but Alignment unlocks only at modelGen ≥ 3 — at fresh start that tab doesn't exist, so the instruction can't be followed. Fix: gate that step to fire only when Alignment is unlocked, OR reorder the tour to the actual early actions (tap → buy hardware → ship v1) and introduce Alignment later. (`js/ui.js` tour + `js/game.js` riskUnlocked.)
5. GENERATION-ADVANCE SUMMARY — emphasize PERMANENCE. After shipping a model the summary shows the gains, but the "you keep everything / permanent" line is small. Make it prominent (bold / a "✓ KEPT FOREVER" badge) so players don't fear a reset (leftover prestige anxiety). (`js/ui.js` showGenSummary + `js/i18n.js` gen_summary_*.)
6. Verify the Act 2 intro fires AFTER the v1-ship summary (order), and its goal text points to the NEXT milestone, not one already done.

== P2 — RUSSIAN LAYOUT OVERFLOW (mobile 360–390px; RU text is ~1.3× longer) ==
7. ACTION BUTTONS overflow in RU: train / build / funding / research / boost / hire buttons have no word-break, so long RU strings (e.g. "Построить датацентр · $500000 (+15% компьюта)") exceed the button width at 360–390px. Add `overflow-wrap:break-word; word-break:break-word;` and allow wrapping (`white-space:normal`) on these buttons. (`js/styles.css` button rules ~346–416.)
8. MODAL ROW BUTTONS (`.modal .row button`, ~line 794) can overflow with long RU text — same fix.
9. STANDINGS rival-name column is a fixed `flex:0 0 84px` with ellipsis — at 360px long names truncate. Give names more room / handle gracefully. (`.standrow .sname`.)
   (Leave the intentional single-line ellipsis on the news ticker / event badge as-is unless it loses meaning.)
VERIFY P2 by rendering each affected screen at 360 AND 390 in RU and confirming no button text spills out.

== P3 — SYSTEMS (small) ==
10. `js/game.js:~1127` — the rival-reaches-AGI backup calls the dead `doSingularity('beaten')` (no-op since the no-reset rewrite). Replace with `triggerFinale('beaten', false)`. (The primary path at ~line 1348 already works; this is correctness cleanup.)
11. (Consider) Buy-mode x100 silently fails when you can't afford 100 units. Either fall back to max-affordable (like 'max' mode) for consistency, or keep it fixed-quantity by design — your call; if you keep it, that's fine.

VERIFY: render affected screens at 360/390/414 + desktop, EN + RU; confirm no button overflow and the early-game flow (onboarding → compute → first model → funding) reads clearly to a newcomer; node --check clean; safe save migration; commit each fix with a clear message. Do NOT touch the economy balance (it passed audit).
