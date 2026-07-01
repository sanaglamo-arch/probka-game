# Пробка во дворе

Самодостаточная HTML5/Canvas-игра без внешних зависимостей. Текущая dev-ветка готовится как RC3: 300 уровней в трех режимах, 365 уровней дня, обучение, гараж, миссии, Yandex Games SDK wrapper и модульный IIFE-runtime.

## Beta 1

Рабочая механическая версия сохранена как Beta 1: classic campaign, smart hints, уровень дня, гараж, миссии, монеты, лимит ходов и рекламные точки уже работают. Snapshot лежит в `releases/probka-game-beta-1/`, архив — `releases/probka-game-beta-1.zip`.

## Запуск

Из папки проекта:

```bash
python3 -m http.server 5173
```

Открыть:

```text
http://localhost:5173/probka-game/
```

Если запускать из папки `probka-game`, открыть:

```text
http://localhost:5173/
```

## Проверка уровней

```bash
node probka-game/tools/build-level-bank.js --check
node probka-game/tools/validate-levels.js
node probka-game/tools/analyze-levels.js 50000
node probka-game/tools/validate-daily-levels.js 365
node probka-game/tools/release-yandex.js --syntax-only
node probka-game/tools/release-yandex.js --runtime-only
node probka-game/tools/release-yandex.js --check --quick --yard <yard_id>
node probka-game/tools/release-yandex.js --check --quick
node probka-game/tools/release-yandex.js --check
node probka-game/tools/browser-smoke.js
```

Для самой холодной проверки JS-синтаксиса используйте `node probka-game/tools/release-yandex.js --syntax-only`.
Для проверки только runtime-файлов используйте `node probka-game/tools/release-yandex.js --runtime-only`.
Для проверки одного двора через release-скрипт используйте `node probka-game/tools/release-yandex.js --check --quick --yard <yard_id>`.
Для холодной локальной проверки синтаксиса, ассетов и runtime-файлов без долгого банка уровней используйте `node probka-game/tools/release-yandex.js --check --quick`.
После уже пройденного полного `--check` релиз можно собрать без повторного прогона проверок: `node probka-game/tools/release-yandex.js --skip-checks`.
`browser-smoke.js` запускает headless Chrome, поэтому его лучше оставлять для финальной UI-проверки.
По умолчанию используется путь Chrome для macOS; на Linux/CI задайте бинарь и флаги через переменные окружения:
`PROBKA_SMOKE_CHROME="$(which google-chrome)" PROBKA_SMOKE_CHROME_FLAGS="--no-sandbox --disable-dev-shm-usage" node probka-game/tools/browser-smoke.js`.
`release-yandex.js --check` проверяет релизные файлы и данные, но не открывает браузерный smoke.

## Генерация черновиков уровней

```bash
node probka-game/tools/generate-level-candidates.js 6 27
```

## Генерация ассетов оформлений

```bash
node probka-game/tools/generate-themed-yard-sprites.js --help
node probka-game/tools/generate-themed-yard-sprites.js --yard <yard_id>
node probka-game/tools/generate-themed-yard-sprites.js --all
node probka-game/tools/generate-themed-yard-sprites.js --check-coverage
node probka-game/tools/generate-themed-yard-sprites.js --gallery
python3 probka-game/tools/generate-yard-boards.py
python3 probka-game/tools/render-asset-montage.py --mode yard-boards
node probka-game/tools/validate-yard-assets.js
node probka-game/tools/release-yandex.js --check --quick --yard <yard_id>
```

Галерея для ручного визуального просмотра создается в `probka-game/assets/yards/_guides/themed-sprites-gallery.html`.
Генератор обновляет runtime-спрайты `car-2-*`, `van-3-*` и стандартные препятствия; старые extra-файлы вроде `truck-4-*` в отдельных папках не используются runtime-манифестом.
Генератор `generate-yard-boards.py` рисует финальные `board.png` размером `1024x1024` полностью процедурно в мультяшном стиле игры (AI-исходники `source/board-ai.png` больше не используются) по общему скелету: игровое поле `720x720` в `gridFrame 125..845`, одинаковый широкий визуальный выезд справа `x=845 y=305 w=179 h=403`.

## Что уже есть

- главное меню;
- выбор уровней;
- обязательное первое обучение: мини-уровень, короткие карточки по режимам/серии/гаражу/миссиям и guided-прохождение `free_001`;
- ежедневный календарь на 365 уникальных 6x6 classic Rush Hour-раскладок: сегодня открыт, будущие дни закрыты, архив открывается через rewarded-рекламу, без лимита ходов;
- серия прохождений уровня дня с бонусом;
- гараж с 18 косметическими скинами за монеты;
- скины вынесены в отдельный runtime-файл `skins.js`, чтобы календарь уровня дня не владел гаражом;
- RC3 runtime разделен на IIFE-модули: `config.js`, `texts.js`, `progress.js`, `economy.js`, `rules.js`, `session.js`, `renderer.js`, `screens.js`, `tutorial.js`, `audio.js` и orchestration-слой в `game.js`;
- `screens.js` уже владеет render-функциями режимов, уровней, гаража, миссий, daily-календаря, HUD и меню-статусов;
- `renderer.js` владеет общими Canvas utilities: геометрия, easing, цветовые функции, hash и проверка nonblank canvas;
- `session.js` используется для timer-state и run-state при старте уровней, daily и обучения;
- прогресс мигрирует к `progressVersion: 2`, а миссии вынесены из `daily` в общий `state.missions` с совместимостью старых сохранений;
- скины имеют отдельные паттерны, бейджи и акценты, а не просто перекрашивают обычную машину;
- обычные машины визуально различаются: такси, фургоны, доставки, универсалы и компактные машины;
- ежедневные миссии с наградами;
- подсказки статуса на главном экране: текущий режим, награда уровня дня, серия, готовые миссии;
- 3 основных режима по 100 уровней: `Свободный двор`, `На счет ходов`, `На время`;
- 300 уникальных 6x6 classic Rush Hour-раскладок с отдельным прогрессом по режимам, плюс 365 уровней дня без пересечений с режимами;
- `Свободный двор` играется без ограничений, `На счет ходов` использует лимит ходов, `На время` использует таймер;
- level bank генерируется из hard-раскладок Michael Fogleman и промежуточных shortest-path состояний; источник: `https://www.michaelfogleman.com/rush/`, MIT: `https://github.com/fogleman/rush`;
- сырой multi-MB датасет в репозиторий не кладется, хранится только компактный `level-bank.generated.js`; локальные входные файлы лежат в `probka-game/data/` и игнорируются git;
- drag/swipe машин;
- плавные анимации движения и bump при заблокированном движении;
- столкновения;
- лимит ходов только в режиме `На счет ходов`;
- таймер и fail по времени в режиме `На время`;
- пошаговые actors сохранены в движке и черновиках, но временно убраны из основной кампании и уровня дня до actor-aware shortest solver;
- победный sequence при выезде целевой машины;
- звезды по ходам;
- монеты;
- localStorage прогресс;
- WebAudio-звуки без внешних файлов и mute-state;
- solver-backed подсказки для classic 6x6 уровней: подсветка нужной машины и ghost-позиции следующего полезного хода;
- Yandex Games SDK wrapper с локальным mock-режимом;
- rewarded/interstitial-точки через SDK wrapper: подсказка, пропуск уровня, x2 монеты и пауза между уровнями;
- cloud-save wrapper поверх `ysdk.getPlayer().getData()/setData()` с localStorage fallback;
- яркая arcade-оболочка: игровой главный экран, обновленные карточки уровней, гаража, миссий и модалки;
- фронт-слой под Yandex Games: аккуратный главный экран, readable HUD, tool dock и чистые рекламные состояния;
- процедурный Canvas-двор с асфальтом, парковочной разметкой, бордюрами, подсветкой выезда, улучшенными 1-клеточными препятствиями и warning-состоянием лимита ходов;
- внутренняя оценка сложности уровня: `minMoves`, `difficultyScore`, `difficulty`;
- анализатор показывает не только dependency-ходы, но и `revisits`: сколько раз решение требует возвращаться к уже двигавшимся машинам;
- валидатор уровней ловит простые target-line решения, проверяет source metadata, размеры паков, прогрессию сложности и нелинейность classic-паков;
- валидатор уровней дня проверяет 365 календарных слотов и отсутствие пересечений с основными режимами.
- browser smoke без npm проверяет через Chrome headless: меню, обязательное обучение, календарь уровня дня, список уровней, гараж, миссии, smart hint, gameplay canvas и timed HUD.

## Yandex Games release

Текущая сборка подготовлена под публикацию архивом на сервер Яндекс Игр. SDK подключается через `yandex-sdk.js`: в локальной разработке используется mock-режим, на площадке Яндекса wrapper загружает `/sdk.js`, вызывает `YaGames.init()`, `LoadingAPI.ready()`, Gameplay API, рекламу и cloud-save.

Проверять перед production-архивом:

1. Меню, выбор режимов, уровни, уровень дня, гараж и миссии открываются без ошибок в консоли.
2. На мобильном viewport поле, HUD, нижние кнопки и баннерное место не перекрывают друг друга.
3. Rewarded-точки выдают награду только после `onRewarded`: подсказка, пропуск уровня, x2 монеты.
4. Interstitial-точка между уровнями не ломает переход на следующий уровень.
5. Уровень дня и основные режимы не смешивают прогресс: уровень дня не меняет текущий режим.
6. Cloud-save восстанавливает более свежий прогресс после reload.
7. Все проверки ниже проходят перед упаковкой.

Собрать production-архив с полными проверками:

```bash
node probka-game/tools/release-yandex.js
```

Собрать с легкими проверками:

```bash
node probka-game/tools/release-yandex.js --quick
```

Собрать после уже пройденного полного `--check`, не повторяя проверки:

```bash
node probka-game/tools/release-yandex.js --skip-checks
```

Проверить без сборки:

```bash
node probka-game/tools/release-yandex.js --syntax-only
node probka-game/tools/release-yandex.js --runtime-only
node probka-game/tools/release-yandex.js --check --quick
node probka-game/tools/release-yandex.js --check
```

Подсказка по режимам release-скрипта:

```bash
node probka-game/tools/release-yandex.js --help
node probka-game/tools/release-yandex.js --summary
node probka-game/tools/release-yandex.js --list-files
```

## Следующие задачи

1. Загрузить `releases/probka-yandex-1.0.0.zip` в черновик Консоли Яндекс Игр.
2. Включить РСЯ-монетизацию и нужные форматы рекламы в Консоли.
3. Проверить черновик с `debug-mode=16`: Game Ready, i18n, Gameplay API, rewarded/interstitial, cloud-save.
4. Подготовить и загрузить иконку, maskable icon, обложку, 4-6 скриншотов и описание.
5. Ручно отполировать сложность уровней по данным прохождения.
