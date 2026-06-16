# Временный промт (обновляется)

> Это «рабочий» файл: я каждый раз перезаписываю текст ниже свежим промтом для окна 1.
> Открой на GitHub → «Copy raw» → вставь в нужный чат.

---

ROUND 2 — turn the game from "good" into a sticky Yandex idle game. You have full autonomy — don't ask, just do. Keep a working build at every step, keep RU+EN parity, and re-verify + rebuild assets at the end. All features must degrade gracefully when the Yandex SDK is absent (local dev) and make ZERO external requests beyond the Yandex SDK itself.

1) YANDEX LEADERBOARDS (native social retention)
- Use the Yandex SDK leaderboards API to submit a score (lifetime Research Points; optionally also peak compute/sec). Add a "Leaderboard" view/tab that fetches and shows top players + the player's rank.
- Graceful fallback when no SDK / not logged in: show a friendly "available on Yandex Games" placeholder, no errors. RU+EN.

2) YANDEX CLOUD SAVE (cross-device progress)
- Use the Yandex Player data API (setData/getData) to sync the save when logged in; keep localStorage as the offline fallback. On load, merge/choose the newer save (by lastSeen). Debounce cloud writes (don't spam). No data loss, no crash when SDK absent.

3) DAILY REWARD / LOGIN STREAK (return loop)
- Escalating daily bonus (cash and/or RP and/or a timed x2 boost), with a visible streak counter that resets if a day is missed. Persist via cloud+local. Offer a rewarded-ad "double today's reward". RU+EN copy. Show a small "welcome back / day N" modal once per day.

4) SECOND PRESTIGE LAYER — "The Singularity" (end-game goal + narrative climax)
- A deeper reset that unlocks late (e.g. after N total RP or first AGI-tier generator). Resets generators AND Research Points in exchange for a permanent meta-currency ("Singularity Cores" or similar) that grants strong global modifiers and unlocks a small meta-upgrade tree. Give it a short narrative beat when triggered. Keep the math sane (no runaway); document in BALANCE.md + the economy sim.

5) AMBIENT BACKGROUND MUSIC (procedural, optional)
- A subtle generative ambient pad/arp via WebAudio (no external files), OFF by default, with its own toggle in Settings (separate from SFX). Calm, non-intrusive, loops cleanly. Pause when tab hidden.

6) AI-SATIRE NEWS TICKER (cheap flavor, high charm)
- A small headline ticker/banner that fires milestone-tied satirical headlines as you scale (e.g. "Your model passed the bar exam", "Regulators are asking questions", "Series F closed at an absurd valuation"). RU+EN, ~12–16 headlines, non-spammy.

7) SMALL FIX
- Desktop Alignment (and any other single-card screen) still looks empty — vertically center the card or add a complementary panel (e.g. a mini risk history / tips) so wide screens aren't half-empty.

VERIFY + REBUILD (at the end)
- `node --check` every JS; load in headless Chrome with zero console errors.
- Smoke test: tap, buy, prestige, the new Singularity reset, daily reward, save/reload (incl. cloud path mocked), RU↔EN, incident, leaderboard fallback.
- Confirm RU/EN parity for ALL new strings (leaderboard, daily, singularity, news headlines, music toggle).
- Regenerate ALL screenshots (seeded mid-game save), mobile + desktop of every screen, plus new ones: leaderboard, daily-reward modal, the Singularity screen.
- Rebuild dist/singularity-inc.zip (index.html at root, validated) and dist/store-assets-bundle.zip.
- Commit each phase. Final message: what changed + the new final numbers.
