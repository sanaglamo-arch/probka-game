# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

ROUND 3 — FULL VISUAL OVERHAUL + viral clicker mechanics. Act as a demanding senior game-dev lead with a very high bar: the current look is NOT good enough to ship. You have full autonomy — don't ask, just do. Keep RU+EN parity, keep a working build at every step, re-verify + rebuild at the end. Zero external network requests (all assets local/inline).

USE THE DESIGN SKILL (mandatory):
A `ui-ux-pro-max` skill is installed at `/root/.claude/skills/ui-ux-pro-max/`. If it shows up as an invokable Skill, use it (Skill tool). If it does NOT (it was just installed and may need a session restart), then READ its files directly — `/root/.claude/skills/ui-ux-pro-max/SKILL.md` plus everything in its `data/` and `scripts/` folders — and apply its guidance: pick a cohesive palette + font pairing + style, and run its accessibility/contrast/touch-target/spacing checks on your result. Target a premium dark theme with glassmorphism + neon, fitting an AI/singularity vibe.

HARSH CRITIQUE OF THE CURRENT UI (fix ALL of this — be honest, it's mediocre right now):
- Flat and GENERIC — it reads like a dark admin dashboard, not a premium game. One flat navy bg, a single blue accent, plain rounded cards, zero depth/lighting/texture, no visual identity.
- The TRAIN button — the literal heart of a clicker — is a dull flat circle. Unacceptable. It must be the single most satisfying, tactile, alive element on the screen.
- Big numbers are static text with no weight, roll, or impact. In an idle game the numbers ARE the dopamine — they must feel good.
- Desktop screens (Alignment etc.) are half-empty. No atmosphere for an "AI singularity" theme.
- Generic/emoji icons, inconsistent. Flat progress bars. No coherent motion language.

A) FULL VISUAL REDESIGN (the headline — make it genuinely premium and "tasty"):
- Cohesive identity via the skill: layered dark backgrounds with depth, soft glows, glassmorphism panels, 1–2 signature neon accents, subtle grain/gradient — NOT flat #111.
- Hero TRAIN button: big, glossy, reactive — squash-and-stretch on press, radial glow pulse, ripple + particle burst on tap, charge/heat shimmer. Tapping must feel physical and addictive.
- Numbers: odometer-style rolling counters for balance & /sec; floating number pop-ups on tap/income (rise + scale + fade); weighty formatting with subtle glow on big values.
- Generator cards: real depth (glass + inner shadow), crisp consistent inline-SVG icons (NOT emoji), milestone color-shift + icon glow at 25/50/100, smooth hover/press states.
- Progress/risk bars: rounded, gradient-filled, glow that intensifies toward 100%.
- Motion language everywhere: tab transitions, card reveals, modal spring-in, milestone flashes, screen shake on big events.
- Atmosphere: an evolving ambient backdrop (subtle animated gradient/particles/grid) that intensifies as you scale toward AGI; fill empty desktop space with ambient art / secondary panels (mini-stats, tips).
- Premium typography: strong display + number font pairing (local/bundled, no external fetch), clear hierarchy, generous spacing. Run the skill's contrast + touch-target checks and fix every fail.

B) BORROW VIRAL CLICKER MECHANICS (add these — researched from the top idlers):
1. INSIGHT FLASH (Cookie Clicker "golden cookie"): a glowing object randomly drifts across the screen every ~30–90s; tap it in time for a burst — random buff: "Frenzy" (x7 output 30s), instant cash, or "Click Frenzy" (x100 tap value 15s). Sparkle + chime + particles. This is the signature active-play hook.
2. MILESTONE MULTIPLIERS (AdVenture Capitalist): every 25/50/100/200 owned of a generator → permanent x2 to THAT generator, with a visible breakpoint indicator + celebratory flash. Drives bulk buying.
3. BREAKTHROUGH ABILITY (active, chainable): a button on cooldown that fires a temporary mega-boost (e.g. x10 output 20s); chaining two within a window grants a bonus. Adds active-play skill.
4. TAP COMBO / OVERCLOCK HEAT: rapid tapping builds a temporary multiplier that decays — rewards active bursts and makes the TRAIN button feel alive.
Wire all into the existing economy/config; keep balance sane (document in BALANCE.md + the economy sim); RU+EN for all new copy.

VERIFY + REBUILD (at the end):
- `node --check` every JS; zero console errors in headless Chrome.
- Smoke test incl. the new mechanics (insight flash spawn/claim, milestone x2, breakthrough, tap combo) + save/reload + RU↔EN.
- Skill accessibility pass (contrast, focus states, touch targets) — fix fails.
- RU/EN parity for all new strings.
- Regenerate ALL screenshots (seeded mid-game), mobile + desktop of every screen, showing the NEW look + an Insight Flash moment.
- Rebuild dist/singularity-inc.zip (index.html at root, validated) + dist/store-assets-bundle.zip.
- Commit each phase. Final message: what changed, before/after notes, and the new final numbers.
