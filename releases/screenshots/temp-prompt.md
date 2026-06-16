# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

ROUND 10 — LAYOUT INTEGRITY + EXPLAIN EVERYTHING + mobile flagship polish. Decision is set: flagship targets ANDROID / Google Play, focus is POLISH-TO-A-GEM (not new systems), the game stays DEEP BUT ACCESSIBLE, monetization deferred. Act as a demanding senior game-dev lead. Full autonomy — don't ask, just do. RU+EN parity, working build at every step, verify + rebuild at the end, zero external network requests. Use the `ui-ux-pro-max` skill for all UI/feel work + its accessibility/contrast/touch-target checks.

== P0 — CRITICAL LAYOUT BUG (do this FIRST, be ruthless) ==
A real player reports the MAIN SCREEN is broken: buttons overlap each other and text overflows/spills out of its containers, because too much UI was crammed in over the last rounds. This is unacceptable for a flagship.
SPECIFIC CONFIRMED BUG (independently reproduced at 1280px — fix this exact one): on the WIDE / desktop layout, the "next-goal" nudge ("Growth is slowing — release a model…" / "Доступен апгрейд: …") renders as a GIANT empty oval / stadium (pill) shape filling the CENTER column between the TRAIN orb and the generator list — almost entirely empty except one tiny line of text. It looks broken and pointless. IMPORTANT: this is WIDE-LAYOUT-ONLY — on mobile (≤414px) the SAME nudge already renders correctly as a small banner chip. So the fix is simple and targeted: make the wide layout match the mobile treatment — the nudge must be a small, properly-sized chip/banner, and the wide-screen center column must NOT contain that giant empty oval container (remove/restyle it; if it was a "fill empty desktop space" element, it failed — kill it or replace with something purposeful and correctly sized). Then do the full STRICT layout-integrity pass:
- Audit EVERY screen (main/Lab first, then all tabs and modals) at MULTIPLE phone sizes (360×640, 360×800, 390×844, 414×896) AND desktop. NOTHING may overlap. NO text overflow, clipping, or spill. NO buttons stacking on top of each other. Proper spacing, wrapping, and stacking everywhere.
- Specifically the main/Lab screen: the TRAIN orb, Breakthrough button + its timer, the risk/vector bars, the generator list, the buy-mode bar, and the bottom nav must all have their own space and never collide — at every size, including when new elements appear (insight flash, crisis banner, breakthrough active, news ticker).
- Rebuild the layout with a robust system (fl/grid, min-heights, overflow handling, safe-area insets) so it CAN'T overlap as content changes. Use the skill for spacing/hierarchy.
- VERIFY layout integrity at all the sizes above (render and check that nothing overlaps or overflows) before moving on. Treat any overlap as a blocking bug.

== P1 — EXPLAIN EVERYTHING (lots was added; nothing should be a mystery) ==
So many systems were added (tap/combo, generators, milestones, upgrades, managers, Autopilot, Research/tech tree, artifacts, prestige, Singularity, multi-vector Risk, Alignment, crises, News, Trust, Market, Breakthrough, Insight Flash, events...). A player must ALWAYS understand what each thing is.
- Give every system/stat/button at least a MINIMAL explanation: a one-line label/subtitle, and an info "ⓘ" affordance (tap/long-press → a short tooltip/popover) on anything non-obvious (each Risk vector, Trust, Alignment, Autopilot reserve, artifacts, Cores, market assets, Breakthrough, Insight, etc.).
- First-time-reveal hints when a new system unlocks (one line, skippable, shown once). RU+EN for ALL of it.
- Keep it lightweight and consistent — not walls of text; just enough that nothing is a mystery.

== P2 — MOBILE UX HARDENING (Play is the target) ==
- Portrait-first, locked orientation. One-handed thumb reach for primary actions. Touch targets ≥48px. No hover/desktop-only patterns. Legible fonts. Bottom-nav in the thumb zone. Notch/safe-area correct.
- HAPTICS (Vibration API where available) on tap/buy/milestone/crisis/insight, with a settings toggle.

== P3 — PERFORMANCE (~60fps on mid/low-end Android) ==
- Fix jank: cap/pool particles, throttle DOM writes (odometer, /sec, lists), avoid layout thrash, tighten rAF tick/render, pause offscreen work, lazy-render heavy panels (market sparklines, long lists). Measure frame time; no memory growth over long sessions.

== P4 — FIRST 3 MINUTES + DEEP-BUT-ACCESSIBLE ==
- Make the opening instantly satisfying and clear; first tap great, first buy fast, first "wow" early; onboarding frictionless + skippable. Play the first ~30 min as a casual mobile player — anything overwhelming/unclear/tedious, smooth it. Deep systems must feel optional/rewarding, never mandatory homework early.

== P5 — GAME FEEL / PRODUCTION VALUES ==
- Polish animation timing/easing, sound mix + ambient-music balance, transitions, spectacle moments. Enforce consistent iconography/spacing/typography across every screen (skill). Kill rough edges.

== P6 — ANDROID WRAPPER PREP (monetization deferred — just wrappable) ==
- Set up Capacitor wrapping: config, portrait lock, status-bar/safe-area, Android hardware BACK-button handling, offline local save in a WebView. No ads/IAP. Produce or fully document the APK build steps (if Android SDK absent, prepare so the user can build). Keep plain-web + Yandex builds intact (platform abstracted).

VERIFY:
- `node --check` all JS; headless Chrome at 360×640 / 360×800 / 390×844 / 414×896 with ZERO console errors and zero layout overlaps/overflows; a perf check.
- RU/EN parity for ALL strings (incl. every new tooltip/hint).
- Keep a working, runnable build (dev server). Do NOT regenerate the release screenshot set or rebuild the store zip/bundle — those are final/release-time tasks, not now.
- Commit each phase. Final message: confirmation the overlap bug (incl. the giant oval) is gone and which sizes you verified, the explanation/tooltip coverage, mobile-readiness, perf numbers, and first-3-min verdict.
