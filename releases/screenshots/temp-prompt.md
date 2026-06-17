# Временный промт (обновляется)

> (Я доставляю это строителю сам — схема B.)

---

P0 MOBILE BUG — COMPUTE GENERATORS UNREACHABLE ON PHONE (Lab tab). Real-device report + my runtime diagnosis below. Fix this FIRST, before anything else. Full autonomy, don't ask, commit when done, verify on real phone viewports.

SYMPTOM (portrait phone, gets WORSE after training model v1): the compute generator cards (Laptop, GPU Rig, …) are squeezed into a tiny strip at the very bottom and you CANNOT scroll to them — after v1 they vanish below the nav bar entirely. This is the kind of layout bug that most enrages the player. Fix it solidly.

ROOT CAUSE (confirmed via runtime inspection at 390x740): `#genList` (`.scroll`, index.html:77) is a nested `overflow-y:auto` flex child inside `#labMain` (flex column, min-height:0). On the portrait single-column Lab, `#tapZone` (the big TRAIN orb, fixed height) + `#modelPanel` consume the column's vertical budget, so `#genList` collapses to **clientHeight≈24px while its scrollHeight is 562px** — a 24px peephole holding ALL generators, positioned at top=845 (below the 740 viewport, below navTop=687). After v1 the model panel grows (funding button + model head appear), squeezing it further. Desktop is fine because the company tab switches to a 2-column row layout (styles.css:903) where `#labMain` gets full height.

FIX (portrait/mobile only — DO NOT touch the desktop >=breakpoint 2-column row layout): make the whole Lab tab ONE natural vertical page-scroll so every generator is reachable:
- The `.tab[data-tab="company"]` (or a wrapper inside it) scrolls vertically on mobile; `#content` keeps its clip (`overflow:hidden`).
- `#tapZone` and `#labMain` flow at natural height (e.g. `flex:0 0 auto`), not fighting over a fixed viewport.
- `#genList` flows at its FULL natural height on mobile — remove the nested collapsed scroll (no `overflow-y:auto` / `flex:1` that collapses it); let it expand and scroll with the page.
- `#buyModeBar` stays usable: make it sticky to the bottom of the scroll viewport (or let it scroll with content), never overlapping the last card; give the list bottom padding to clear BOTH the buyModeBar and the bottom nav bar.
- It is fine and expected that the TRAIN orb scrolls off-screen as you scroll down to the generator shop (standard idle-game pattern).

VERIFY (mandatory, with crops): at 360x640 AND 390x740, EN+RU, in THREE states — (a) fresh start, (b) just after model v1 (the reported case), (c) mid-game (~v4, model panel full + build/funding visible): scroll the Lab top-to-bottom and confirm EVERY generator card is fully reachable and tappable, buyModeBar usable, the last card clears the nav bar, no 24px peephole, no overlap anywhere. Confirm the desktop 2-column Lab and ALL other tabs are unchanged. `node --check` clean on touched JS, safe save migration, commit with a clear message.

(After this P0 ships and I verify, the queued Round A game-feel work follows — do P0 first.)
