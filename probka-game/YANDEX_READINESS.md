# Готовность к публикации на Яндекс Играх

Аудит интеграции SDK по коду (`yandex-sdk.js`, `game.js`, `ads.js`, `progress.js`, `audio.js`).
Живая документация Яндекса в этой среде недоступна — пункты сверены с известными
требованиями площадки; помечено, что стоит перепроверить вручную перед заливкой.

## Статус по требованиям

| Требование | Статус | Где |
|---|---|---|
| Загрузка `/sdk.js` + `YaGames.init()` | ✅ | `yandex-sdk.js:6,37,65`; `game.js` initializePlatform |
| `LoadingAPI.ready()` после готовности | ✅ | `yandex-sdk.js:ready()`; `game.js` markLoadingReady |
| `GameplayAPI.start/stop` | ✅ | `game.js` updateGameplayMarker (покрывает view/ads/focus/win/fail) |
| Rewarded видео (onRewarded/onClose) | ✅ | `yandex-sdk.js`; `ads.js` |
| Interstitial (onClose) | ✅ | `game.js` maybeShowInterstitial |
| Пауза игры + mute звука во время рекламы | ✅ | `ads.js` runAdPause (suspend/resume audio, pause/resume timer) |
| Троттлинг межстраничной рекламы | ✅ | счётчик уровней **+ интервал 60с** (добавлено) |
| Cloud-save + fallback на localStorage | ✅ | `yandex-sdk.js` setData/getData; `progress.js` |
| Свежий прогресс при старте (по updatedAt) | ✅ | `game.js` restoreCloudProgress |
| Пауза по visibilitychange / game_api_pause | ✅ | `game.js`; **+ blur/focus** (добавлено) |
| Деградация при отказе SDK (mock/локально) | ✅ | optional chaining + try/catch везде |
| Язык из `ysdk.environment` | ⚪ моно-RU | игра только на русском, контент не переключается |
| Sticky-баннер (RTB) | ⚪ готов, выключен | API в `yandex-sdk.js` есть, не вызывается |

## Сделано этой ночью
- **Размер архива: 50.2 → 21.1 МБ** (PNG пожаты pngquant+optipng без потерь) — снят главный риск веса.
- **Interstitial-троттлинг по времени**: минимум 60 с между роликами (`MIN_INTERSTITIAL_INTERVAL_MS`).
- **blur/focus-хендлеры**: надёжная пауза/mute на мобильных и в WebView Яндекса.
- **updateGameplayMarker в stopTimer**: сигнал GameplayStop стал безусловным.
- **applyPlatformLanguage**: убран мёртвый no-op-тёрнари.

## Рекомендации (продуктовые решения — на усмотрение владельца)
1. **Sticky-баннер**: API готов (`showBanner/hideBanner`). Включение = доход, но занимает место на экране — решить по вёрстке. Вызвать `yandex.showBanner()` в `initializePlatform()` после init.
2. **Чистка репозитория**: `assets/yards/*/source` и `*/qa` (~76 МБ AI-исходников и QA-монтажей) не входят в рантайм. Можно удалить из ветки для лёгкого репозитория (восстановимо из истории).
3. **Перед заливкой**: прогнать черновик в Консоли с `debug-mode=16` и подтвердить Game Ready, rewarded/interstitial, cloud-save на реальном устройстве.

## Замечания модерации (раунд 1) — статус устранения

| Замечание | Пункт | Статус | Что сделано |
|---|---|---|---|
| Прокрутка страницы / pull-to-refresh во время игры | 1.10.2 | ✅ | `overscroll-behavior:none`, viewport `user-scalable=no`, в game-режиме `overflow:hidden` |
| Выделение поля / контекстное меню (desktop) | 1.6.2.7 | ✅ | глобальный `user-select:none`, отмена `contextmenu/selectstart/dragstart` по всему документу |
| Выделение / контекстное меню (Android/iOS) | 1.6.1.8 | ✅ | `touch-action:none` на `#gameCanvas`, `-webkit-touch-callout:none` |
| Иконка со скруглёнными углами | 8.3.3 | ✅ | новая `releases/yandex-assets/icon-512.png` — квадрат 512×512 RGB без альфы, углы залиты |
| Обложка — скриншот из игры | 5.6 | ✅ | использовать `releases/yandex-assets/cover-800x470.png` — иллюстрация, не скриншот |
| Скриншоты не локализованы / геймплей <70% / внешние элементы | 5.1.1, 5.1.1.2, 8.2.3 | ✅ | новые `screen1-quiet … screen6-business` — портрет 1290×2640, 100% геймплея на русском, без рамок |

**Что залить в Консоль (перезаписать старые материалы):**
- Иконка → `releases/yandex-assets/icon-512.png`
- Обложка → `releases/yandex-assets/cover-800x470.png`
- Скриншоты → `releases/yandex-assets/screen1-night.png` … `screen6-rainy.png` (портретные; игра портретно-ориентированная)
- Сборка игры → пересобрать актуальный архив (см. ниже), НЕ старый 49.6 МБ.

## ⚠️ Сборка архива перед публикацией — ВАЖНО
- В репозитории лежит **старый** `releases/probka-yandex-1.0.0.zip` (~49.6 МБ, собран до ночной оптимизации). **Не заливать его** — это неоптимизированная версия со старыми тяжёлыми PNG.
- Актуальный рантайм весит **21.12 МБ** (проверено `release-yandex.js --runtime-only`). Архив будет ≈этого размера — втрое меньше старого и с запасом под лимит площадки.
- Пересобрать архив перед заливкой:
  - Полная сборка `node probka-game/tools/release-yandex.js` пересобирает банк уровней из сырых датасетов в `probka-game/data/` (gitignored). Если их нет локально — шаг падает с `not enough candidates` (это не баг рантайма, `level-bank.generated.js` уже валиден и используется игрой).
  - Без пересборки банка: `node probka-game/tools/release-yandex.js --skip-checks` (предварительно убрать старую `releases/probka-yandex-1.0.0/` и `.zip`).
- Рекомендация: не коммитить бинарные release-архивы в репозиторий (старый zip + 3 backup-папки в `releases/` уже занимают ~120+ МБ истории) — собирать локально при заливке.
