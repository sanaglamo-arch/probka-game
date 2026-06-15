(function () {
  // ── Language state ──────────────────────────────────────────────────────────
  window.PROBKA_LANG = "ru";

  // ── Translation dictionary ──────────────────────────────────────────────────
  var PROBKA_I18N = {
    ru: {
      // Document / head
      "doc.title": "Пробка во дворе",

      // Topbar / brand
      "brand.eyebrow": "Головоломка",
      "brand.title": "Пробка во дворе",
      "wallet.aria": "Монеты",

      // Hub hero
      "hub.levelPrefix": "Уровень",
      "hub.continue": "Продолжить",
      "hub.nav.aria": "Разделы игры",
      "hub.tagline": "Разбери затор за минимум ходов и выведи свою машину из двора.",
      "streak.label": "Серия",
      "streak.best": "Рекорд ${n}",

      // Play button
      "play.button": "Играть",

      // Daily week strip
      "dailyWeek.aria": "Неделя ежедневных уровней",
      "dailyWeek.today": "сегодня",
      "dailyWeek.done": "готово",

      // Daily card on hub
      "dailyCard.label": "Уровень дня",
      "dailyCard.subtitle": "Один сложный пазл",
      "dailyCard.badge": "сложно",
      "dailyCard.statusDone": "Пройден · ${stars}",
      "dailyCard.statusOpen": "До ${coins} монет",

      // Hub nav
      "nav.levels.title": "Уровни",
      "nav.levels.sub": "3 режима · 300 уровней",
      "nav.garage.title": "Гараж",
      "nav.garage.sub": "Машины и дворы",
      "nav.missions.title": "Миссии",
      "nav.stats.title": "Статистика",
      "nav.stats.sub": "Прогресс и рекорды",

      // Mission status
      "missions.statusN": "${n} готово · ${claimed}/${total}",
      "missions.statusAll": "${claimed}/${total} выполнено",

      // Settings
      "settings.summary": "Настройки",
      "settings.sound.on": "Звук: вкл",
      "settings.sound.off": "Звук: выкл",
      "settings.haptics.on": "Вибрация: вкл",
      "settings.haptics.off": "Вибрация: выкл",
      "settings.music.on": "Музыка: вкл",
      "settings.music.off": "Музыка: выкл",
      "settings.lang.ru": "Язык: Рус",
      "settings.lang.en": "Язык: Eng",
      "settings.tutorial": "Повторить обучение",
      "settings.reset": "Сбросить прогресс",
      "settings.eyebrow": "Игра",
      "settings.title": "Настройки",
      "settings.row.sound": "Звук",
      "settings.row.haptics": "Вибрация",
      "settings.row.music": "Музыка",
      "settings.row.lang": "Язык",
      "settings.state.on": "Вкл",
      "settings.state.off": "Выкл",
      "settings.lang.value": "Русский",
      "nav.settings.title": "Настройки",
      "nav.settings.sub": "Звук, язык и сброс",

      // In-game mute button aria
      "mute.on": "Включить звук",
      "mute.off": "Выключить звук",

      // Restart aria
      "restart.aria": "Заново",

      // Back aria
      "back.aria": "Назад",

      // Mode select panel
      "modes.eyebrow": "Режимы",
      "modes.title": "Выбери режим",

      // Daily panel
      "daily.eyebrow": "365 вызовов",
      "daily.title": "Уровень дня",

      // Daily overview
      "daily.overview.today": "Сегодня · ${date}",
      "daily.overview.done": "Пройдено на ${stars}★",
      "daily.overview.open": "Двор дня",
      "daily.overview.subtitle": "${minMoves} оптимальных ходов · награда до ${coins} монет",
      "daily.overview.playAgain": "Играть еще",
      "daily.overview.start": "Начать",

      // Daily calendar month
      "daily.month.levels": "${n} уровней",

      // Daily calendar day aria
      "daily.day.aria.future": "${date}: скоро",
      "daily.day.aria.unlocked": "${date}: открыт",
      "daily.day.aria.locked": "${date}: архив закрыт, откроется за рекламу",

      // Daily calendar day title
      "daily.day.title.future": "Будущий уровень дня пока закрыт",
      "daily.day.title.unlocked": "Уровень дня ${date} · ${minMoves} ходов",
      "daily.day.title.locked": "Архивный уровень дня открывается за рекламу",

      // Daily calendar status text
      "daily.day.status.future": "скоро",
      "daily.day.status.unlocked": "открыт",

      // Month names
      "month.1": "Январь",
      "month.2": "Февраль",
      "month.3": "Март",
      "month.4": "Апрель",
      "month.5": "Май",
      "month.6": "Июнь",
      "month.7": "Июль",
      "month.8": "Август",
      "month.9": "Сентябрь",
      "month.10": "Октябрь",
      "month.11": "Ноябрь",
      "month.12": "Декабрь",

      // Level select panel
      "levels.eyebrow": "Режим",
      "levels.title": "Уровни 1-${n}",
      "levels.pack.range": "Уровни ${from}-${to} · ${subtitle}",

      // Level button states
      "level.now": "сейчас",
      "level.next": "сл. ${d}",
      "level.locked": "закрыт",

      // Level button tooltip
      "level.tooltip.done": "${title}: ${stars} зв., лучший результат ${moves} ходов",
      "level.tooltip.open": "${title}: ${minMoves} ходов, сложность ${diff} из 10",
      "level.tooltip.locked": "Закрыт",

      // Garage panel
      "garage.eyebrow": "Косметика",
      "garage.title": "Гараж",
      "garage.tabs.aria": "Коллекция гаража",
      "garage.tabs.skins": "Машины",
      "garage.tabs.yards": "Дворы",
      "garage.current.skin": "Текущая машина",
      "garage.current.yard": "Текущий двор",
      "garage.owned": "${n} из ${total} открыто",
      "garage.base": "База",
      "garage.equip.btn.equipped": "Надето",
      "garage.equip.btn.equip": "Надеть",
      "garage.equip.btn.buy": "Купить",
      "garage.equip.btn.locked": "Не хватает монет",
      "garage.preview.aria": "Предпросмотр: ${name}",

      // Garage rarity
      "rarity.starter": "Стартовый",
      "rarity.rare": "Редкий",
      "rarity.premium": "Премиум",
      "rarity.legend": "Легенда",

      // Garage concepts
      "concept.city": "город",
      "concept.lights": "фонари",
      "concept.snow": "снег",
      "concept.leaves": "листья",
      "concept.rain": "дождь",
      "concept.concrete": "бетон",
      "concept.premium": "премиум",
      "concept.cracks": "трещины",
      "concept.neon": "неон",
      "concept.garlands": "гирлянды",

      // Missions panel
      "missions.eyebrow": "Награды",
      "missions.title": "Миссии",
      "missions.today": "Цели дня · каждый день новые",
      "missions.done": "${n}/${total} выполнено",
      "missions.reward": "Награды",
      "missions.btn.claimed": "Получено",
      "missions.btn.ready": "Готово",

      // Stats panel
      "stats.eyebrow": "Прогресс",
      "stats.title": "Статистика",
      "stats.tile.solved": "Уровней пройдено",
      "stats.tile.stars": "На три звезды",
      "stats.tile.daily": "Дней пройдено",
      "stats.tile.bestStreak": "Лучшая серия",
      "stats.tile.streak": "Текущая серия",
      "stats.tile.coins": "Монеты",
      "stats.section.modes": "Прогресс по режимам",

      // HUD
      "hud.moves.timed": "${moves} ${form}",
      "hud.moves.limited": "${moves} / ${limit} ходов",
      "hud.moves.free": "${moves} ${form}",
      "hud.remaining": "Осталось ${n}",
      "hud.noLimit": "Без лимита",
      "hud.canvas.aria": "Игровое поле",
      "hud.levelTitle.daily": "${title} · ${date}",
      "hud.levelTitle.campaign": "${title}",
      "hud.modeStatus": "${modeTitle} · уровень ${n}",
      "hud.dailyBtn.aria": "Уровень дня, награда до ${coins} монет",

      // HUD tools
      "tool.undo.title": "Отмена",
      "tool.undo.sub": "ход назад",
      "tool.hint.title": "Подсказка",
      "tool.hint.stock": "${n} в запасе",
      "tool.hint.ad": "за рекламу",
      "tool.skip.title": "Пропуск",
      "tool.skip.daily": "не для дня",
      "tool.skip.ad": "за рекламу",

      // Actions bar
      "actions.undo": "Отмена",
      "actions.hint": "Подсказка",
      "actions.skip": "Пропуск",

      // Mode-select card stats
      "mode.card.order": "${n}/100",

      // Win modal
      "win.eyebrow": "Свободно!",
      "win.title": "Уровень пройден",
      "win.packComplete": "Набор пройден!",
      "win.double": "Удвоить",
      "win.next": "Следующий",
      "win.menu": "Меню",
      "win.nextDaily": "Календарь",

      // Fail modal
      "fail.eyebrow.time": "Время вышло",
      "fail.title.time": "Время вышло",
      "fail.text.time": "Время вышло — соберём двор заново.",
      "fail.eyebrow.free": "Без лимита",
      "fail.title.free": "Еще попытка",
      "fail.text.free": "Без лимита ходов — пробуй ещё!",
      "fail.eyebrow.moves": "Ходы кончились",
      "fail.title.moves": "Ходы закончились",
      "fail.text.moves": "Лимит ${n} ходов исчерпан. Ещё раз!",
      "fail.retry": "Ещё раз",

      // Archive confirm modal
      "archive.eyebrow": "Архив уровня дня",
      "archive.title": "Открыть архивный уровень?",
      "archive.title.date": "Открыть ${date}?",
      "archive.text": "Посмотри рекламу, чтобы сыграть этот архивный уровень дня.",
      "archive.watch": "Смотреть",
      "archive.cancel": "Назад",

      // Tutorial overlay
      "tutorial.step.label": "Обучение",
      "tutorial.btn.next": "Дальше",
      "tutorial.btn.ok": "Понял",
      "tutorial.menu.label": "Меню · ${n}/${total}",
      "tutorial.guided.label": "Первый уровень",

      // Tutorial mini steps
      "tutorial.mini.0.label": "Как играть",
      "tutorial.mini.0.title": "Выкати красную машину",
      "tutorial.mini.0.text": "Освободи дорогу и выведи красную машину к выезду справа.",
      "tutorial.mini.0.button": "Поехали",
      "tutorial.mini.1.label": "Шаг 1 из 2",
      "tutorial.mini.1.title": "Освободи путь",
      "tutorial.mini.1.text": "Сдвинь машину вниз — за подсветкой на поле. Машины едут только вдоль корпуса.",
      "tutorial.mini.2.label": "Шаг 2 из 2",
      "tutorial.mini.2.title": "Газуй!",
      "tutorial.mini.2.text": "Теперь выкати красную машину вправо к выезду.",

      // Tutorial menu cards
      "tutorial.card.0.title": "Продолжить игру",
      "tutorial.card.0.text": "Жми «Играть» — продолжишь с того уровня, где остановился.",
      "tutorial.card.1.title": "Уровень дня",
      "tutorial.card.1.text": "Каждый день новый пазл. Проходи его, чтобы растить серию 🔥",
      "tutorial.card.2.title": "Уровни",
      "tutorial.card.2.text": "Три режима и сотни уровней — от лёгких до хитрых.",
      "tutorial.card.3.title": "Гараж",
      "tutorial.card.3.text": "Открывай новые машины и дворы за монеты.",
      "tutorial.card.4.title": "Миссии",
      "tutorial.card.4.text": "Выполняй ежедневные задания и получай монеты.",
      "tutorial.card.5.title": "Статистика",
      "tutorial.card.5.text": "Здесь твой прогресс, рекорды и серии.",

      // Tutorial guided
      "tutorial.guided.move.title": "Твой ход",
      "tutorial.guided.move.text": "Следуй за стрелкой-подсказкой.",
      "tutorial.guided.finish.title": "Последний штрих",
      "tutorial.guided.finish.text": "Выкати красную машину к выезду!",

      // Canvas tutorial hints
      "hint.source.target": "Твоя машина",
      "hint.source.other": "Тащи эту",
      "hint.target": "Сюда",

      // Toasts
      "toast.adUnavailable": "Реклама недоступна",
      "toast.noHint": "Нет подходящей подсказки",
      "toast.tutorialBlock": "Сначала закончи обучение",
      "toast.tutorialInGame": "В обучении следуй подсветке",
      "toast.tutorialHighlighted": "Сейчас нужна подсвеченная машина",
      "toast.tutorialPosition": "Двигай до подсвеченной позиции",
      "toast.tutorialStep": "Следуй шагу обучения",
      "toast.tutorialDone": "Обучение пройдено",
      "toast.dailyUnavailable": "Уровень дня пока недоступен",
      "toast.dailyFuture": "Будущий уровень еще закрыт",
      "toast.dailyNeedUnlock": "Сначала открой архивный день",
      "toast.dailyNoSkip": "Уровень дня нельзя пропустить",
      "toast.dailyNoDouble": "Уровень дня не удваивается",
      "toast.nothingToDouble": "Нечего удваивать",
      "toast.notEnoughCoins": "Не хватает монет",
      "toast.searching": "Ищу лучший ход",
      "toast.skinEquipped": "${name}: надето",
      "toast.skinBought": "${name}: куплено",
      "toast.archiveUnlocked": "Архив ${date} открыт",
      "toast.missionsReward": "Миссии: +${coins} монет",
      "toast.dailyReward.today": "Уровень дня: +${coins} монет",
      "toast.dailyReward.archive": "Архив: +${coins} монет",

      // Rewarded ad dialog
      "rewarded.hint.title": "Подсказка",
      "rewarded.hint.text": "После короткого ролика появится следующий правильный ход.",
      "rewarded.skip.title": "Пропуск уровня",
      "rewarded.skip.text": "После короткого ролика следующий двор откроется сразу.",
      "rewarded.double.title": "Удвоить награду",
      "rewarded.double.text": "После рекламного ролика монеты за уровень удвоятся.",
      "rewarded.archive.title": "Архив уровня дня",
      "rewarded.archive.text": "После ролика откроется выбранный архивный уровень.",

      // Campaign reward labels
      "reward.coins": "+${n} монет",
      "reward.coinsTimed": "+${n} монет · ${time}",
      "reward.alreadyClaimed": "Монеты уже получены",
      "reward.missionSuffix": "миссии +${n}",
      "reward.daily.earned": "+${total} монет за сегодня",
      "reward.daily.streak": "серия +${n}",
      "reward.daily.claimed": "Награда дня уже получена",
      "reward.archive.earned": "Архив ${date} · +${coins} монет",
      "reward.archive.done": "Архив уже закрыт на лучший результат",

      // Coin amount formatting
      "coin.form.1": "монета",
      "coin.form.2": "монеты",
      "coin.form.3": "монет",
      "coin.short": "мон.",

      // Move plural forms
      "move.form.1": "ход",
      "move.form.2": "хода",
      "move.form.3": "ходов",
      "level.form.1": "уровень",
      "level.form.2": "уровня",
      "level.form.3": "уровней",

      // Streak
      "streak.record": "Рекорд ${n}",
      "streak.panel.aria": "Серия ${current}, рекорд ${best}",

      // Mission definitions
      "mission.daily_complete.title": "Уровень дня",
      "mission.daily_complete.text": "Заверши ежедневный вызов",
      "mission.three_stars.title": "Три звезды",
      "mission.three_stars.text": "Пройди уровень идеально",
      "mission.no_undo.title": "Без отмены",
      "mission.no_undo.text": "Пройди уровень без отмены",

      // Modes in texts.js
      "mode.daily.title": "Уровень дня",
      "mode.fallback.title": "На счёт ходов",

      // Mode titles and subtitles (from config/levels)
      "mode.free.title": "Свободный двор",
      "mode.free.subtitle": "без правил",
      "mode.moves.title": "На счёт ходов",
      "mode.moves.subtitle": "на рекорд",
      "mode.timed.title": "На время",
      "mode.timed.subtitle": "на скорость",

      // Skin names (keyed by skin.id)
      "skin.classic_red.name": "Красная классика",
      "skin.taxi_yellow.name": "Шашечный рывок",
      "skin.mint_courier.name": "Курьерский болид",
      "skin.pizza_mobile.name": "Пицца-мобиль",
      "skin.night_blue.name": "Ночной неон",
      "skin.yard_police.name": "Дворовая полиция",
      "skin.yard_ambulance.name": "Скорая во дворе",
      "skin.fire_lane.name": "Пожарный проезд",
      "skin.retro_volga.name": "Ретро-Волга",
      "skin.business_taxi.name": "Такси бизнес",
      "skin.sticker_drifter.name": "Дрифтер с наклейками",
      "skin.violet_share.name": "Каршеринг 77",
      "skin.ice_chrome.name": "Ледяной хром",
      "skin.graffiti_coupe.name": "Граффити-купе",
      "skin.cyber_yard.name": "Кибер-двор",
      "skin.gold_yard.name": "Золотая легенда",
      "skin.black_vip.name": "Черный VIP",
      "skin.tow_final.name": "Финальный эвакуатор",

      // Yard names (keyed by yard.id)
      "yard.quiet_yard.name": "Тихий городской двор",
      "yard.night_yard.name": "Ночной двор",
      "yard.winter_yard.name": "Зимний двор",
      "yard.forest_yard.name": "Лесная парковка",
      "yard.rainy_yard.name": "Дождливый двор",
      "yard.underground_parking.name": "Подземная парковка",
      "yard.business_center.name": "Бизнес-центр",
      "yard.old_block_yard.name": "Старый район",
      "yard.neon_yard.name": "Неоновая парковка",
      "yard.holiday_yard.name": "Праздничный двор"
    },

    en: {
      // Document / head
      "doc.title": "Yard Traffic Jam",

      // Topbar / brand
      "brand.eyebrow": "Puzzle",
      "brand.title": "Yard Traffic Jam",
      "wallet.aria": "Coins",

      // Hub hero
      "hub.levelPrefix": "Level",
      "hub.continue": "Continue",
      "hub.nav.aria": "Game sections",
      "hub.tagline": "Clear the jam in minimum moves and drive your car out of the yard.",
      "streak.label": "Streak",
      "streak.best": "Best ${n}",

      // Play button
      "play.button": "Play",

      // Daily week strip
      "dailyWeek.aria": "Daily level week",
      "dailyWeek.today": "today",
      "dailyWeek.done": "done",

      // Daily card on hub
      "dailyCard.label": "Daily Level",
      "dailyCard.subtitle": "One tough puzzle",
      "dailyCard.badge": "hard",
      "dailyCard.statusDone": "Solved · ${stars}",
      "dailyCard.statusOpen": "Up to ${coins} coins",

      // Hub nav
      "nav.levels.title": "Levels",
      "nav.levels.sub": "3 modes · 300 levels",
      "nav.garage.title": "Garage",
      "nav.garage.sub": "Cars and yards",
      "nav.missions.title": "Missions",
      "nav.stats.title": "Stats",
      "nav.stats.sub": "Progress and records",

      // Mission status
      "missions.statusN": "${n} ready · ${claimed}/${total}",
      "missions.statusAll": "${claimed}/${total} completed",

      // Settings
      "settings.summary": "Settings",
      "settings.sound.on": "Sound: on",
      "settings.sound.off": "Sound: off",
      "settings.haptics.on": "Haptics: on",
      "settings.haptics.off": "Haptics: off",
      "settings.music.on": "Music: on",
      "settings.music.off": "Music: off",
      "settings.lang.ru": "Язык: Рус",
      "settings.lang.en": "Language: Eng",
      "settings.tutorial": "Replay tutorial",
      "settings.reset": "Reset progress",
      "settings.eyebrow": "Game",
      "settings.title": "Settings",
      "settings.row.sound": "Sound",
      "settings.row.haptics": "Haptics",
      "settings.row.music": "Music",
      "settings.row.lang": "Language",
      "settings.state.on": "On",
      "settings.state.off": "Off",
      "settings.lang.value": "English",
      "nav.settings.title": "Settings",
      "nav.settings.sub": "Sound, language, reset",

      // In-game mute button aria
      "mute.on": "Enable sound",
      "mute.off": "Disable sound",

      // Restart aria
      "restart.aria": "Restart",

      // Back aria
      "back.aria": "Back",

      // Mode select panel
      "modes.eyebrow": "Modes",
      "modes.title": "Choose a mode",

      // Daily panel
      "daily.eyebrow": "365 challenges",
      "daily.title": "Daily Level",

      // Daily overview
      "daily.overview.today": "Today · ${date}",
      "daily.overview.done": "Solved with ${stars}★",
      "daily.overview.open": "Today's yard",
      "daily.overview.subtitle": "${minMoves} optimal moves · reward up to ${coins} coins",
      "daily.overview.playAgain": "Play again",
      "daily.overview.start": "Start",

      // Daily calendar month
      "daily.month.levels": "${n} levels",

      // Daily calendar day aria
      "daily.day.aria.future": "${date}: coming soon",
      "daily.day.aria.unlocked": "${date}: unlocked",
      "daily.day.aria.locked": "${date}: archive locked, watch an ad to unlock",

      // Daily calendar day title
      "daily.day.title.future": "This future daily level is not yet available",
      "daily.day.title.unlocked": "Daily level ${date} · ${minMoves} moves",
      "daily.day.title.locked": "Archive daily level unlocks after watching an ad",

      // Daily calendar status text
      "daily.day.status.future": "soon",
      "daily.day.status.unlocked": "open",

      // Month names
      "month.1": "January",
      "month.2": "February",
      "month.3": "March",
      "month.4": "April",
      "month.5": "May",
      "month.6": "June",
      "month.7": "July",
      "month.8": "August",
      "month.9": "September",
      "month.10": "October",
      "month.11": "November",
      "month.12": "December",

      // Level select panel
      "levels.eyebrow": "Mode",
      "levels.title": "Levels 1-${n}",
      "levels.pack.range": "Levels ${from}-${to} · ${subtitle}",

      // Level button states
      "level.now": "now",
      "level.next": "next ${d}",
      "level.locked": "locked",

      // Level button tooltip
      "level.tooltip.done": "${title}: ${stars} stars, best ${moves} moves",
      "level.tooltip.open": "${title}: ${minMoves} moves, difficulty ${diff} of 10",
      "level.tooltip.locked": "Locked",

      // Garage panel
      "garage.eyebrow": "Cosmetics",
      "garage.title": "Garage",
      "garage.tabs.aria": "Garage collection",
      "garage.tabs.skins": "Cars",
      "garage.tabs.yards": "Yards",
      "garage.current.skin": "Current car",
      "garage.current.yard": "Current yard",
      "garage.owned": "${n} of ${total} unlocked",
      "garage.base": "Base",
      "garage.equip.btn.equipped": "Equipped",
      "garage.equip.btn.equip": "Equip",
      "garage.equip.btn.buy": "Buy",
      "garage.equip.btn.locked": "Not enough coins",
      "garage.preview.aria": "Preview: ${name}",

      // Garage rarity
      "rarity.starter": "Starter",
      "rarity.rare": "Rare",
      "rarity.premium": "Premium",
      "rarity.legend": "Legend",

      // Garage concepts
      "concept.city": "city",
      "concept.lights": "lights",
      "concept.snow": "snow",
      "concept.leaves": "leaves",
      "concept.rain": "rain",
      "concept.concrete": "concrete",
      "concept.premium": "premium",
      "concept.cracks": "cracks",
      "concept.neon": "neon",
      "concept.garlands": "lights",

      // Missions panel
      "missions.eyebrow": "Rewards",
      "missions.title": "Missions",
      "missions.today": "Today's goals · resets daily",
      "missions.done": "${n}/${total} completed",
      "missions.reward": "Rewards",
      "missions.btn.claimed": "Claimed",
      "missions.btn.ready": "Claim",

      // Stats panel
      "stats.eyebrow": "Progress",
      "stats.title": "Stats",
      "stats.tile.solved": "Levels solved",
      "stats.tile.stars": "Three-star clears",
      "stats.tile.daily": "Daily levels done",
      "stats.tile.bestStreak": "Best streak",
      "stats.tile.streak": "Current streak",
      "stats.tile.coins": "Coins",
      "stats.section.modes": "Mode progress",

      // HUD
      "hud.moves.timed": "${moves} ${form}",
      "hud.moves.limited": "${moves} / ${limit} moves",
      "hud.moves.free": "${moves} ${form}",
      "hud.remaining": "${n} left",
      "hud.noLimit": "No limit",
      "hud.canvas.aria": "Game board",
      "hud.levelTitle.daily": "${title} · ${date}",
      "hud.levelTitle.campaign": "${title}",
      "hud.modeStatus": "${modeTitle} · level ${n}",
      "hud.dailyBtn.aria": "Daily level, reward up to ${coins} coins",

      // HUD tools
      "tool.undo.title": "Undo",
      "tool.undo.sub": "go back",
      "tool.hint.title": "Hint",
      "tool.hint.stock": "${n} left",
      "tool.hint.ad": "watch ad",
      "tool.skip.title": "Skip",
      "tool.skip.daily": "not for daily",
      "tool.skip.ad": "watch ad",

      // Actions bar
      "actions.undo": "Undo",
      "actions.hint": "Hint",
      "actions.skip": "Skip",

      // Mode-select card stats
      "mode.card.order": "${n}/100",

      // Win modal
      "win.eyebrow": "Cleared!",
      "win.title": "Level complete",
      "win.packComplete": "Pack complete!",
      "win.double": "Double",
      "win.next": "Next",
      "win.menu": "Menu",
      "win.nextDaily": "Calendar",

      // Fail modal
      "fail.eyebrow.time": "Time's up!",
      "fail.title.time": "Time's up",
      "fail.text.time": "Out of time — let's try again!",
      "fail.eyebrow.free": "No limit",
      "fail.title.free": "One more try",
      "fail.text.free": "No move limit here — give it another go!",
      "fail.eyebrow.moves": "Out of moves!",
      "fail.title.moves": "Out of moves",
      "fail.text.moves": "Out of ${n} moves — try again!",
      "fail.retry": "Try again",

      // Archive confirm modal
      "archive.eyebrow": "Daily level archive",
      "archive.title": "Open archive level?",
      "archive.title.date": "Open ${date}?",
      "archive.text": "Watch an ad to play this archive daily level.",
      "archive.watch": "Watch",
      "archive.cancel": "Back",

      // Tutorial overlay
      "tutorial.step.label": "Tutorial",
      "tutorial.btn.next": "Next",
      "tutorial.btn.ok": "Got it",
      "tutorial.menu.label": "Menu · ${n}/${total}",
      "tutorial.guided.label": "First level",

      // Tutorial mini steps
      "tutorial.mini.0.label": "How to play",
      "tutorial.mini.0.title": "Get the red car out",
      "tutorial.mini.0.text": "Clear the path and roll the red car to the exit on the right.",
      "tutorial.mini.0.button": "Let's go",
      "tutorial.mini.1.label": "Step 1 of 2",
      "tutorial.mini.1.title": "Clear the path",
      "tutorial.mini.1.text": "Slide the highlighted car down. Cars only move along their body.",
      "tutorial.mini.2.label": "Step 2 of 2",
      "tutorial.mini.2.title": "Drive!",
      "tutorial.mini.2.text": "Now roll the red car right to the exit.",

      // Tutorial menu cards
      "tutorial.card.0.title": "Continue",
      "tutorial.card.0.text": "Hit Play to jump back into the level where you left off.",
      "tutorial.card.1.title": "Daily level",
      "tutorial.card.1.text": "A fresh puzzle every day. Clear it to grow your streak 🔥",
      "tutorial.card.2.title": "Levels",
      "tutorial.card.2.text": "Three modes and hundreds of levels, from easy to tricky.",
      "tutorial.card.3.title": "Garage",
      "tutorial.card.3.text": "Unlock new cars and yards with coins.",
      "tutorial.card.4.title": "Missions",
      "tutorial.card.4.text": "Complete daily tasks and earn coins.",
      "tutorial.card.5.title": "Stats",
      "tutorial.card.5.text": "Your progress, records and streaks live here.",

      // Tutorial guided
      "tutorial.guided.move.title": "Your move",
      "tutorial.guided.move.text": "Just follow the arrow hint.",
      "tutorial.guided.finish.title": "Final touch",
      "tutorial.guided.finish.text": "Roll the red car to the exit!",

      // Canvas tutorial hints
      "hint.source.target": "Your car",
      "hint.source.other": "Drag this",
      "hint.target": "Here",

      // Toasts
      "toast.adUnavailable": "Ad not available",
      "toast.noHint": "No hint available",
      "toast.tutorialBlock": "Finish the tutorial first",
      "toast.tutorialInGame": "Follow the highlight in the tutorial",
      "toast.tutorialHighlighted": "Move the highlighted car",
      "toast.tutorialPosition": "Drag to the highlighted position",
      "toast.tutorialStep": "Follow the tutorial step",
      "toast.tutorialDone": "Tutorial complete",
      "toast.dailyUnavailable": "Daily level not available yet",
      "toast.dailyFuture": "This future level is not yet open",
      "toast.dailyNeedUnlock": "Unlock the archive day first",
      "toast.dailyNoSkip": "Daily level cannot be skipped",
      "toast.dailyNoDouble": "Daily level cannot be doubled",
      "toast.nothingToDouble": "Nothing to double",
      "toast.notEnoughCoins": "Not enough coins",
      "toast.searching": "Finding best move",
      "toast.skinEquipped": "${name}: equipped",
      "toast.skinBought": "${name}: purchased",
      "toast.archiveUnlocked": "Archive ${date} unlocked",
      "toast.missionsReward": "Missions: +${coins} coins",
      "toast.dailyReward.today": "Daily level: +${coins} coins",
      "toast.dailyReward.archive": "Archive: +${coins} coins",

      // Rewarded ad dialog
      "rewarded.hint.title": "Hint",
      "rewarded.hint.text": "After a short ad the next best move will be shown.",
      "rewarded.skip.title": "Skip level",
      "rewarded.skip.text": "After a short ad the next yard will open immediately.",
      "rewarded.double.title": "Double reward",
      "rewarded.double.text": "After the ad your level coins will be doubled.",
      "rewarded.archive.title": "Daily level archive",
      "rewarded.archive.text": "After the ad the selected archive level will open.",

      // Campaign reward labels
      "reward.coins": "+${n} coins",
      "reward.coinsTimed": "+${n} coins · ${time}",
      "reward.alreadyClaimed": "Coins already claimed",
      "reward.missionSuffix": "missions +${n}",
      "reward.daily.earned": "+${total} coins for today",
      "reward.daily.streak": "streak +${n}",
      "reward.daily.claimed": "Daily reward already claimed",
      "reward.archive.earned": "Archive ${date} · +${coins} coins",
      "reward.archive.done": "Archive already at best result",

      // Coin amount formatting
      "coin.form.1": "coin",
      "coin.form.2": "coins",
      "coin.form.3": "coins",
      "coin.short": "c.",

      // Move plural forms
      "move.form.1": "move",
      "move.form.2": "moves",
      "move.form.3": "moves",
      "level.form.1": "level",
      "level.form.2": "levels",
      "level.form.3": "levels",

      // Streak
      "streak.record": "Best ${n}",
      "streak.panel.aria": "Streak ${current}, best ${best}",

      // Mission definitions
      "mission.daily_complete.title": "Daily Level",
      "mission.daily_complete.text": "Complete the daily challenge",
      "mission.three_stars.title": "Three Stars",
      "mission.three_stars.text": "Beat a level perfectly",
      "mission.no_undo.title": "No Undo",
      "mission.no_undo.text": "Beat any level without undoing",

      // Modes in texts.js
      "mode.daily.title": "Daily Level",
      "mode.fallback.title": "Move Count",

      // Mode titles and subtitles
      "mode.free.title": "Free Yard",
      "mode.free.subtitle": "free play",
      "mode.moves.title": "Move Count",
      "mode.moves.subtitle": "best score",
      "mode.timed.title": "Timed",
      "mode.timed.subtitle": "beat the clock",

      // Skin names
      "skin.classic_red.name": "Classic Red",
      "skin.taxi_yellow.name": "Checker Rush",
      "skin.mint_courier.name": "Courier Bolide",
      "skin.pizza_mobile.name": "Pizza Mobile",
      "skin.night_blue.name": "Night Neon",
      "skin.yard_police.name": "Yard Police",
      "skin.yard_ambulance.name": "Yard Ambulance",
      "skin.fire_lane.name": "Fire Lane",
      "skin.retro_volga.name": "Retro Sedan",
      "skin.business_taxi.name": "Business Taxi",
      "skin.sticker_drifter.name": "Sticker Drifter",
      "skin.violet_share.name": "Carshare 77",
      "skin.ice_chrome.name": "Ice Chrome",
      "skin.graffiti_coupe.name": "Graffiti Coupe",
      "skin.cyber_yard.name": "Cyber Yard",
      "skin.gold_yard.name": "Gold Legend",
      "skin.black_vip.name": "Black VIP",
      "skin.tow_final.name": "Final Tow Truck",

      // Yard names
      "yard.quiet_yard.name": "Quiet City Yard",
      "yard.night_yard.name": "Night Yard",
      "yard.winter_yard.name": "Winter Yard",
      "yard.forest_yard.name": "Forest Parking",
      "yard.rainy_yard.name": "Rainy Yard",
      "yard.underground_parking.name": "Underground Parking",
      "yard.business_center.name": "Business Center",
      "yard.old_block_yard.name": "Old Block",
      "yard.neon_yard.name": "Neon Parking",
      "yard.holiday_yard.name": "Holiday Yard"
    }
  };

  // ── Translation prefixes for level titles ───────────────────────────────────
  var LEVEL_PREFIX_MAP = {
    ru: {
      "Обучение": "Tutorial",
      "Тихий двор": "Quiet yard",
      "Свободный проезд": "Free drive",
      "Без спешки": "No rush",
      "Дворовая пауза": "Yard pause",
      "Быстрый двор": "Fast yard",
      "Горящий выезд": "Hot exit",
      "Лимитный двор": "Limited yard",
      "Ход в ход": "Move for move",
      "Точный выезд": "Precise exit",
      "Счетчик двора": "Yard counter",
      "Пробка на время": "Timed jam",
      "Секундомер": "Stopwatch",
      "Уровень дня": "Daily level"
    }
  };

  // ── Core helpers ────────────────────────────────────────────────────────────

  function t(key, vars) {
    var lang = window.PROBKA_LANG || "ru";
    var dict = PROBKA_I18N[lang] || PROBKA_I18N.ru;
    var fallback = PROBKA_I18N.ru;
    var value = (dict && dict[key] !== undefined) ? dict[key] : (fallback[key] !== undefined ? fallback[key] : key);
    if (vars && typeof value === "string") {
      value = value.replace(/\$\{([^}]+)\}/g, function (_, name) {
        return vars[name] !== undefined ? vars[name] : "";
      });
    }
    return value;
  }

  // ── Plural helpers ──────────────────────────────────────────────────────────

  function pluralRu(value, forms) {
    var abs = Math.abs(value) % 100;
    var digit = abs % 10;
    if (abs > 10 && abs < 20) return forms[2];
    if (digit > 1 && digit < 5) return forms[1];
    if (digit === 1) return forms[0];
    return forms[2];
  }

  function pluralEn(value, singularPlural) {
    return Math.abs(value) === 1 ? singularPlural[0] : singularPlural[1];
  }

  function pluralMoves(value) {
    var lang = window.PROBKA_LANG || "ru";
    if (lang === "ru") {
      return pluralRu(value, [t("move.form.1"), t("move.form.2"), t("move.form.3")]);
    }
    return pluralEn(value, [t("move.form.1"), t("move.form.2")]);
  }

  function formatLevelCountI18n(value) {
    var count = Math.max(0, Math.round(value || 0));
    var lang = window.PROBKA_LANG || "ru";
    var suffix = lang === "ru"
      ? pluralRu(count, [t("level.form.1"), t("level.form.2"), t("level.form.3")])
      : pluralEn(count, [t("level.form.1"), t("level.form.2")]);
    return count + " " + suffix;
  }

  function formatCoinAmountI18n(value, options) {
    options = options || {};
    var lang = window.PROBKA_LANG || "ru";
    var amount = Math.max(0, Math.round(value || 0));
    var suffix;
    if (options.short) {
      suffix = t("coin.short");
    } else if (lang === "ru") {
      suffix = pluralRu(amount, [t("coin.form.1"), t("coin.form.2"), t("coin.form.3")]);
    } else {
      suffix = pluralEn(amount, [t("coin.form.1"), t("coin.form.2")]);
    }
    return amount + " " + suffix;
  }

  function formatTimeI18n(seconds) {
    var safe = Math.max(0, Math.ceil(seconds || 0));
    var minutes = Math.floor(safe / 60);
    var rest = String(safe % 60).padStart(2, "0");
    return minutes + ":" + rest;
  }

  // ── Level title translation ─────────────────────────────────────────────────

  function translateLevelTitle(ruTitle) {
    var lang = window.PROBKA_LANG || "ru";
    if (lang === "ru") return ruTitle;
    if (!ruTitle) return ruTitle;
    var map = LEVEL_PREFIX_MAP.ru;
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
      var prefix = keys[i];
      if (ruTitle === prefix) return map[prefix];
      if (ruTitle.startsWith(prefix + " ")) {
        var rest = ruTitle.slice(prefix.length + 1);
        return map[prefix] + " " + rest;
      }
    }
    return ruTitle;
  }

  // ── Item name helpers ───────────────────────────────────────────────────────

  function tSkinName(id) {
    var key = "skin." + id + ".name";
    var lang = window.PROBKA_LANG || "ru";
    var dict = PROBKA_I18N[lang] || PROBKA_I18N.ru;
    if (dict[key]) return dict[key];
    if (PROBKA_I18N.ru[key]) return PROBKA_I18N.ru[key];
    return id;
  }

  function tYardName(id) {
    var key = "yard." + id + ".name";
    var lang = window.PROBKA_LANG || "ru";
    var dict = PROBKA_I18N[lang] || PROBKA_I18N.ru;
    if (dict[key]) return dict[key];
    if (PROBKA_I18N.ru[key]) return PROBKA_I18N.ru[key];
    return id;
  }

  function tModeTitle(id) {
    var key = "mode." + id + ".title";
    var lang = window.PROBKA_LANG || "ru";
    var dict = PROBKA_I18N[lang] || PROBKA_I18N.ru;
    if (dict[key]) return dict[key];
    if (PROBKA_I18N.ru[key]) return PROBKA_I18N.ru[key];
    return id;
  }

  function tModeSubtitle(id) {
    var key = "mode." + id + ".subtitle";
    var lang = window.PROBKA_LANG || "ru";
    var dict = PROBKA_I18N[lang] || PROBKA_I18N.ru;
    if (dict[key]) return dict[key];
    if (PROBKA_I18N.ru[key]) return PROBKA_I18N.ru[key];
    return "";
  }

  // ── DOM application ─────────────────────────────────────────────────────────

  function applyI18n(root) {
    var lang = window.PROBKA_LANG || "ru";
    if (root && root.documentElement) {
      root.documentElement.lang = lang;
      root.title = t("doc.title");
    }
    var scope = (root && root.documentElement) ? root.documentElement : root;
    if (!scope || !scope.querySelectorAll) return;

    scope.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
    scope.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      el.setAttribute("aria-label", t(key));
    });
  }

  // ── Language setter ─────────────────────────────────────────────────────────

  function setLang(lang) {
    window.PROBKA_LANG = lang;
    applyI18n(document);
  }

  // ── Expose on window ────────────────────────────────────────────────────────

  window.PROBKA_I18N = PROBKA_I18N;

  // Extend PROBKA_TEXTS if already loaded (texts.js loads before i18n.js,
  // so we just add helpers; or we initialise a partial object now)
  var texts = window.PROBKA_TEXTS || {};
  function tMissionTitle(id) {
    return t("mission." + id + ".title");
  }

  function tMissionText(id) {
    return t("mission." + id + ".text");
  }

  texts.t = t;
  texts.pluralMoves = pluralMoves;
  texts.pluralEn = pluralEn;
  texts.formatCoinAmountI18n = formatCoinAmountI18n;
  texts.formatLevelCountI18n = formatLevelCountI18n;
  texts.formatTimeI18n = formatTimeI18n;
  texts.applyI18n = applyI18n;
  texts.setLang = setLang;
  texts.translateLevelTitle = translateLevelTitle;
  texts.tSkinName = tSkinName;
  texts.tYardName = tYardName;
  texts.tModeTitle = tModeTitle;
  texts.tModeSubtitle = tModeSubtitle;
  texts.tMissionTitle = tMissionTitle;
  texts.tMissionText = tMissionText;
  window.PROBKA_TEXTS = texts;
})();
