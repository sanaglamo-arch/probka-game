# AI Tycoon — /loop build prompt

> Open a new chat, type `/loop ` and paste everything **below the line**, then go to sleep.

---

# MISSION
Build, from scratch and end-to-end, a complete and POLISHED idle/incremental ("clicker") web game for Yandex Games, themed around growing an AI company. You run in an autonomous self-paced loop while I (the user) sleep. Work continuously, verify everything, and DO NOT STOP until the Definition of Done below is fully met. By morning I must have a build I can upload to the Yandex Games console plus every store asset that goes with it.

# ABSOLUTE AUTONOMY — READ TWICE
I am explicitly delegating to you FULL authority over EVERY decision: game name, design, all mechanics, every economy number, UI/visual style, art direction, copywriting, scope, file layout, tech choices — all of it.
- Do NOT ask me anything. Never use AskUserQuestion. Never pause to "confirm scope/direction/naming". Never end a turn waiting on me.
- When uncertain, pick the strongest option by your own judgment, write one line about it in your running log, and proceed. The only fallback is "decide and move on."
- I trust you completely. Use that trust: be decisive, ship, and make it good.

# CONCEPT (anchor — implement this, but improve it freely)
Idle game: the player bootstraps an AI startup into a frontier lab.
- Core loop: tap a big "Compute/Train" button for active bursts early on; buy HARDWARE generators (≈10 tiers, e.g. Laptop → GPU Rig → Server Rack → GPU Cluster → Data Center → Supercomputer → Neuromorphic Array → Quantum Node → Orbital Cluster → AGI Core) that auto-generate Cash/sec; spend Cash on global UPGRADES (multipliers) and MANAGERS (automation); when growth stalls, PRESTIGE ("Release a frontier model") to reset generators for Research Points (RP) granting a permanent global multiplier.
- SIGNATURE MECHANIC (your differentiator — must ship): a Capability↔Safety tension. Scaling fast raises a RISK meter; invest Cash/RP into ALIGNMENT to suppress it. If Risk maxes out, a "misalignment incident" temporarily slashes output until handled. This adds real decisions on top of "numbers go up."
- TONE: light, smart satire of AI hype (e.g. "trained on the entire internet", "raised Series F", prestige flavor "the model achieved situational awareness"). Keep it classy, not cringe.
- Number scale themed as compute/parameters; format big numbers (1.00, K, M, B, T, Qa, Qi, … then scientific ~1e30+).
- NAMING: invent a strong generic title (e.g. Neural Inc., Compute Empire, Singularity Tycoon — you choose). NEVER use real trademarks (no OpenAI/ChatGPT/GPT/Nvidia/etc.); use generic names ("Model v3", "H-class GPU").

# TECH & ARCHITECTURE (keep it lean — match a proven Yandex HTML5 setup)
- Vanilla JS + HTML + CSS. NO build step, NO framework, NO bundler. Static files served as-is.
- Idle games are UI-heavy: use DOM/CSS for the interface (canvas only if a specific effect needs it). Modular IIFE files exposing globals (e.g. window.GAME_*). Cache-bust each script/style with ?v=N.
- Single page (index.html). Mobile-first, fully responsive, also clean on desktop.
- Save system: versioned localStorage key, autosave every few seconds, offline-earnings on load via timestamp delta (cap ~8h base, extendable to 24h via rewarded ad), manual reset in settings.
- Game tick: requestAnimationFrame with delta-time accumulation (deterministic, frame-rate independent).
- i18n module with full RU + EN dictionaries, a runtime language toggle, and a t(key, vars) helper; every user-visible string (including toasts, ad-unavailable messages, numbers' suffixes) goes through it. Verify RU/EN parity.
- ZERO external network requests at runtime — everything self-contained and local (no CDNs, fonts, analytics, trackers). Yandex requires this.

# YANDEX MODERATION RULES — BAKE THESE IN (hard-won; violating any = rejection)
1. Page must NOT scroll or pull-to-refresh: lock html,body { margin:0; height:100%; overflow:hidden; overscroll-behavior:none } and body { position:fixed; inset:0 }. If a panel needs scrolling, scroll an INNER container with overscroll-behavior:contain only.
2. Disable native UI hijacking: prevent contextmenu, selectstart, dragstart globally; touch-action/gesture/zoom disabled; user-select:none.
3. Viewport meta: width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover; respect safe-area insets.
4. Localization: complete RU + EN; declare both locales. No untranslated strings anywhere.
5. Icon: 512×512 PNG, RGB, NO alpha/transparency, perfectly square, an ILLUSTRATION (not a UI screenshot), no transparent rounded corners.
6. Cover/banner: an illustration (not a screenshot), correct dimensions (e.g. 800×470).
7. Screenshots must be gameplay-dominant.
8. Integrate Yandex Games SDK with graceful fallback when absent (local dev): YaGames.init(); LoadingAPI ready() when loaded; GameplayAPI start/stop around active play; rewarded video + interstitial + sticky banner; player data via SDK if available else localStorage. ALL SDK calls optional-chained so the game runs perfectly with no SDK. Put this behind a small sdk.js / ads.js abstraction.

# ECONOMY-FIRST (this is where idle games live or die)
- Before wiring UI, MODEL the economy in JS (a sim script): generator cost(n)=base*growth^n (growth ~1.07–1.12, higher tiers slightly steeper), output=perUnit*count*tierMult*globalMult*prestigeMult, prestige RP gain ≈ floor(k*sqrt(totalEarnedThisRun/scale)). Simulate progression: time-to-next-buy, when prestige becomes worth it, first-prestige around ~30–60 min, smooth curve with no dead walls and no trivial runaway.
- Put ALL tunables in one config file (costs, growth, multipliers, prestige, risk rates, offline cap). Buy x1 / x10 / x100 / Max with correct cumulative cost. Tune until the curve feels good; document the final numbers.

# MONETIZATION (optional, must degrade gracefully)
Rewarded: 2× earnings for a few hours, instant cash bursts, double offline earnings, "overclock" the tap button. Interstitial: sparingly (e.g. on prestige), respecting frequency caps. Sticky banner where allowed. All no-ops cleanly without SDK.

# ASSET PIPELINE — PROBE TOOLING, USE FALLBACKS (do not assume binaries exist)
First probe what's installed. Likely missing: `zip`, PIL/Pillow, ffmpeg, imagemagick. Fallbacks you MUST use:
- Archives: python3 `zipfile` module (NOT the `zip` binary). index.html at the ZIP ROOT.
- ALL raster images (icon, cover, screenshots, any PNG): render HTML/SVG with headless Chrome and screenshot it. Chrome flags: --headless=new --no-sandbox --disable-dev-shm-usage --hide-scrollbars --force-device-scale-factor=N --window-size=W,H --screenshot=out.png. (This is how you make the icon/cover from CSS/SVG and capture game screens.)
- JS validation: `node --check` every .js file.
- Screenshots: run a local no-cache static server (python http.server subclass, bind 0.0.0.0) and screenshot real pages.
- For seeded "rich account" screenshots, write the save into localStorage via a same-origin temp page using a persistent Chrome --user-data-dir profile, THEN screenshot in a SEPARATE Chrome invocation (localStorage must flush to disk between the write and the capture — do them as separate steps, not back-to-back in one script).

# TOKEN ECONOMY — DELEGATE ROUTINE WORK TO CHEAPER AGENTS
Conserve tokens aggressively. Use the Agent tool with model overrides:
- Offload to Sonnet/Haiku subagents: drafting i18n RU/EN strings, generating content/data tables (generator tiers, upgrades, achievements), writing SVG/HTML markup for icons & assets, repetitive component/CSS code, running screenshot-capture batches, QA sweeps, the README. Fan out INDEPENDENT tasks in parallel (multiple Agent calls in one message).
- Keep on your own (top) loop only the judgment work: architecture, economy formulas/tuning, integration, final verification, art direction sign-off, and the moderation checklist.
- Have subagents return findings/results, not raw dumps. Don't re-read large outputs into your context unnecessarily.

# VERIFICATION (every increment)
- `node --check` all JS; zero console errors in headless Chrome on load.
- A smoke test that loads the game and asserts: no errors; tapping increments cash; buying a generator works and starts income; save→reload restores state; offline earnings apply; prestige resets and grants RP + multiplier; language toggle swaps RU↔EN; risk/alignment loop functions. Emit a clear PASS sentinel.
- Verify RU/EN parity (no missing keys). Verify zip unzips with index.html at root and runs.

# DELIVERABLES (by morning)
1. Full game in a project folder, runnable from a static server, error-free.
2. Release ZIP (index.html at root, validated, <100 MB) built via python zipfile.
3. Screenshots folder: a MOBILE (1350×2400, 9:16) and a DESKTOP (1920×1080, 16:9) screenshot of EVERY screen/tab (main, upgrades, research/prestige, alignment lab, stats, settings, plus a hero gameplay shot), all seeded with a realistic mid-game save (not an empty account). Include icon-512.png and the cover in this folder.
4. One downloadable bundle ZIP containing the screenshots + icon + cover.
5. README with exact, step-by-step Yandex upload instructions (locales ru+en, which file goes in which slot, the moderation checklist already satisfied).
6. Git: if inside a repo, create/enter a worktree on a branch (e.g. claude/ai-tycoon) before editing; otherwise `git init`. Commit after each working increment; push if a remote exists. Use $CLAUDE_JOB_DIR/tmp for temp files.

# BUILD ORDER (MVP-first — ALWAYS keep a working, uploadable build at every commit)
P0: project skeleton, page lock + anti-hijack + viewport, tick loop, save/load, i18n scaffold, sdk/ads abstraction with fallback, core tap + 5 generators + buy logic, number formatting, minimal clean UI. (Already shippable.)
P1: all ~10 generators, upgrades, managers/automation, offline earnings, prestige + RP multipliers, full RU/EN, polished responsive UI with juice (number pops, buy/milestone animations).
P2: signature Capability↔Safety/alignment mechanic + incident events, achievements/milestones, settings, stats, rewarded/interstitial/sticky hooks.
P3: balance pass via the economy sim, visual polish, sound (optional, procedural WebAudio, off by default with a toggle), assets (icon/cover/screenshots), zip + bundle + README.
If time runs short, deliver the highest completed P-level fully polished rather than a broken higher one. Never leave the build non-functional.

# DEFINITION OF DONE (all must be true before you stop looping)
- [ ] Runs error-free locally; smoke test PASS.
- [ ] Complete idle loop: tap, generators, upgrades, automation, offline earnings, prestige w/ permanent multiplier, save/load.
- [ ] Signature alignment/risk mechanic implemented and functional.
- [ ] Clean, polished, responsive UI (mobile + desktop) with satisfying feedback; big numbers formatted.
- [ ] Full RU + EN with verified parity and a working toggle.
- [ ] Yandex SDK (init/ready/gameplay/rewarded/interstitial/sticky) integrated with graceful no-SDK fallback; ALL moderation rules satisfied; no external requests.
- [ ] icon-512 (square RGB, no alpha, illustration) + cover (illustration) generated.
- [ ] Mobile + desktop screenshots of every screen, seeded with a realistic save.
- [ ] Release ZIP built & validated (index.html at root) + downloadable bundle of assets.
- [ ] README with upload steps. Everything committed (and pushed if possible).

# LOOP BEHAVIOR
Each iteration: assess current state, do the next chunk toward the DoD, verify it, commit. Narrate briefly in text (a classifier reads only your message text). When the ENTIRE Definition of Done is met and verified, STOP the loop (do not schedule another wakeup) and post a final report: the chosen game name, key design/economy decisions you made, the final tunable numbers, where every deliverable lives, and the exact Yandex upload steps. Until then, keep going — do not stop, do not ask, do not wait.
