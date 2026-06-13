(function () {
  const panelMap = {
    menu: "menuPanel",
    modes: "modeSelectPanel",
    daily: "dailyPanel",
    game: "playArea",
    levels: "levelsPanel",
    garage: "garagePanel",
    missions: "missionsPanel",
    stats: "statsPanel"
  };

  function setVisibleView(els, view) {
    Object.entries(panelMap).forEach(([id, key]) => {
      if (els[key]) els[key].hidden = view !== id;
    });
  }

  function isKnownView(view) {
    return view in panelMap;
  }

  function createController(deps) {
    const getEls = deps.getEls || (() => deps.els || {});
    const getState = deps.getState || (() => deps.state || {});
    const getSelectedModeId = deps.getSelectedModeId || (() => deps.selectedModeId);
    const getModes = deps.getModes || (() => deps.modes || []);
    const getLevels = deps.getLevels || (() => deps.levels || []);
    const getSkins = deps.getSkins || (() => deps.skins || []);
    const getYards = deps.getYards || (() => deps.yards || []);
    const getMissionDefinitions = deps.getMissionDefinitions || (() => deps.missionDefinitions || []);
    const renderer = deps.renderer || (typeof window !== "undefined" ? window.PROBKA_RENDERER : null) || {};
    const initialGarageTab = new URLSearchParams(window.location.search).get("garageTab") === "yards" ? "yards" : "skins";
    let garageTab = initialGarageTab;

    function modeIconMarkup(mode) {
      const byRule = { free: "i-infinity", moves: "i-moves", timed: "i-clock" };
      const symbolId = byRule[mode && mode.rule];
      if (!symbolId) return (mode && mode.icon) || "#";
      return `<svg viewBox="0 0 24 24" aria-hidden="true" style="width:1em;height:1em;fill:none;stroke:currentColor"><use href="#${symbolId}" /></svg>`;
    }

    function renderLevelSelect() {
      const els = getEls();
      const levels = getLevels();
      const mode = deps.getMode(getSelectedModeId());
      const modeLevels = deps.getModeLevels(getSelectedModeId());
      if (!els.levelsGrid || !mode) return;
      els.levelsGrid.innerHTML = "";
      if (els.levelsEyebrow) els.levelsEyebrow.textContent = mode.title;
      if (els.levelsTitle) els.levelsTitle.textContent = `Уровни 1-${modeLevels.length}`;

      for (let start = 0; start < modeLevels.length; start += 20) {
        const groupLevels = modeLevels.slice(start, start + 20);
        const section = document.createElement("section");
        section.className = "level-pack";

        const title = document.createElement("div");
        title.className = "level-pack-title";
        const completedCount = groupLevels.filter((item) => getState().completed[item.id]).length;
        const progress = Math.round((completedCount / groupLevels.length) * 100);
        const from = start + 1;
        const to = Math.min(from + 19, modeLevels.length);
        title.innerHTML = `
          <span class="pack-badge">${modeIconMarkup(mode)}</span>
          <div class="pack-copy">
            <strong>${mode.title}</strong>
            <span>Уровни ${from}-${to} · ${mode.subtitle}</span>
          </div>
          <div class="level-pack-progress" style="--pack-progress: ${progress}%">
            <b>${completedCount}/${groupLevels.length}</b>
            <i><span></span></i>
          </div>
        `;
        section.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "level-pack-grid";
        groupLevels.forEach((item) => grid.appendChild(createLevelButton(item, levels.indexOf(item))));
        section.appendChild(grid);
        els.levelsGrid.appendChild(section);
      }
      requestAnimationFrame(() => {
        const current = els.levelsGrid.querySelector(".level-button.current");
        if (current) current.scrollIntoView({ block: "nearest" });
      });
    }

    function renderModeSelect() {
      const els = getEls();
      if (!els.modeGrid) return;
      els.modeGrid.innerHTML = "";
      getModes().forEach((mode) => {
        const modeLevels = deps.getModeLevels(mode.id);
        const completedCount = modeLevels.filter((item) => getState().completed[item.id]).length;
        const currentOrder = deps.getCurrentModeOrder(mode.id) + 1;
        const progress = Math.round((completedCount / Math.max(1, modeLevels.length)) * 100);
        const card = document.createElement("button");
        card.className = `mode-card${mode.id === getSelectedModeId() ? " current" : ""}`;
        card.innerHTML = `
          <span class="mode-card-icon" aria-hidden="true">${modeIconMarkup(mode)}</span>
          <span class="mode-card-copy">
            <strong>${mode.title}</strong>
            <small>${mode.subtitle}</small>
          </span>
          <span class="mode-card-stats">
            <b>${currentOrder}/100</b>
            <i style="--mode-progress: ${progress}%"><span></span></i>
          </span>
        `;
        card.addEventListener("click", () => {
          if (deps.blockTutorialEscape()) return;
          deps.playSound("button");
          deps.setSelectedModeId(mode.id);
          deps.saveProgress();
          deps.show("levels");
        });
        els.modeGrid.appendChild(card);
      });
    }

    function createLevelButton(item, index) {
      const state = getState();
      const button = document.createElement("button");
      const unlocked = state.unlocked[item.id] || item.modeOrder === 1;
      button.className = "level-button";
      if (!unlocked) button.classList.add("locked");
      if (state.completed[item.id]) button.classList.add("done");
      if (item.modeOrder === deps.getCurrentModeOrder(item.modeId) + 1) button.classList.add("current");

      const completion = state.completed[item.id];
      const marker = completion
        ? `${"★".repeat(completion.stars)}${"☆".repeat(3 - completion.stars)}`
        : item.modeOrder === deps.getCurrentModeOrder(item.modeId) + 1
          ? "сейчас"
          : `сл. ${item.difficulty || 1}`;
      button.innerHTML = unlocked
        ? `<span class="level-number">${item.modeOrder}</span><small>${marker}</small>`
        : `<span class="level-number">${item.modeOrder}</span><small>закрыт</small>`;
      button.title = completion
        ? `${item.title}: ${completion.stars} зв., лучший результат ${completion.bestMoves} ходов`
        : unlocked
          ? `${item.title}: ${item.minMoves} ходов, сложность ${item.difficulty} из 10`
          : "Закрыто";
      button.disabled = !unlocked;
      button.addEventListener("click", () => {
        if (deps.blockTutorialEscape()) return;
        deps.playSound("button");
        deps.startLevel(index);
      });
      return button;
    }

    // Единое состояние кнопки покупки/надевания для скинов и дворов.
    function applyOwnableButtonState(button, { equipped, owned, canBuy }) {
      if (equipped) {
        button.textContent = "Надето";
        button.disabled = true;
      } else if (owned) {
        button.textContent = "Надеть";
      } else if (canBuy) {
        button.textContent = "Купить";
      } else {
        button.textContent = "Не хватает";
        button.disabled = true;
      }
    }

    function renderGarage() {
      const els = getEls();
      if (!els.garageGrid) return;
      const state = getState();
      const skins = getSkins();
      const yards = getYards();
      els.garageGrid.innerHTML = "";
      const ownedSkins = state.garage.ownedSkins || {};
      const ownedYards = state.garage.ownedYards || {};
      const isYardsTab = garageTab === "yards";
      const ownedCount = isYardsTab
        ? yards.filter((yard) => ownedYards[yard.id]).length
        : skins.filter((skin) => ownedSkins[skin.id]).length;
      const totalCount = isYardsTab ? yards.length : skins.length;
      const currentItem = isYardsTab ? deps.getEquippedYard() : deps.getEquippedSkin();

      if (els.garageSummary) {
        const progress = Math.round((ownedCount / Math.max(1, totalCount)) * 100);
        els.garageSummary.innerHTML = `
          <div class="garage-tabs" role="tablist" aria-label="Коллекция гаража">
            <button class="garage-tab${!isYardsTab ? " active" : ""}" type="button" role="tab" aria-selected="${!isYardsTab}">Машины</button>
            <button class="garage-tab${isYardsTab ? " active" : ""}" type="button" role="tab" aria-selected="${isYardsTab}">Дворы</button>
          </div>
          <div class="garage-summary-top">
            <span class="label">${isYardsTab ? "Текущий двор" : "Текущая машина"}</span>
            <div><strong>${currentItem.name}</strong> · ${ownedCount} из ${totalCount} открыто</div>
          </div>
          <div class="garage-meter" style="--garage-progress: ${progress}%"><span></span></div>
        `;
        const tabs = els.garageSummary.querySelectorAll(".garage-tab");
        tabs[0]?.addEventListener("click", () => {
          if (garageTab === "skins") return;
          garageTab = "skins";
          deps.playSound("button");
          renderGarage();
        });
        tabs[1]?.addEventListener("click", () => {
          if (garageTab === "yards") return;
          garageTab = "yards";
          deps.playSound("button");
          renderGarage();
        });
      }

      if (isYardsTab) {
        renderYardCards(yards, ownedYards, state);
        return;
      }

      skins.forEach((skin) => {
        const owned = Boolean(ownedSkins[skin.id]);
        const equipped = state.garage.equippedSkinId === skin.id;
        const canBuy = state.coins >= skin.price;
        const card = document.createElement("article");
        const skinStateClass = equipped ? " equipped owned" : owned ? " owned" : canBuy ? " can-buy" : " locked";
        card.className = `skin-card${skinStateClass}`;

        const hasSpritePreview = skin.sprite && renderer.renderSkinSpritePreview;
        const preview = hasSpritePreview ? document.createElement("canvas") : document.createElement("div");
        if (hasSpritePreview) {
          preview.className = "skin-preview skin-preview-sprite";
          preview.setAttribute("aria-label", `Предпросмотр: ${skin.name}`);
        } else {
          preview.className = `skin-preview skin-preview-${skin.pattern || "rally"}`;
          preview.style.setProperty("--skin-color", skin.color);
          preview.style.setProperty("--skin-accent", skin.accent || "#fff2a8");
          preview.style.setProperty("--skin-trim", skin.trim || "#2d1118");
          preview.innerHTML = `<span class="skin-preview-window"></span><span class="skin-preview-badge">${skin.badge || ""}</span>`;
        }

        const meta = document.createElement("div");
        meta.className = "skin-meta";
        const title = document.createElement("div");
        title.className = "skin-title";
        title.innerHTML = `<strong>${skin.name}</strong><span>${skin.price ? deps.formatCoinAmount(skin.price, { short: true }) : "База"}</span>`;

        const button = document.createElement("button");
        applyOwnableButtonState(button, { equipped, owned, canBuy });
        button.addEventListener("click", () => deps.buyOrEquipSkin(skin));

        meta.appendChild(title);
        meta.appendChild(button);
        card.appendChild(preview);
        card.appendChild(meta);
        els.garageGrid.appendChild(card);
        if (hasSpritePreview) requestAnimationFrame(() => renderer.renderSkinSpritePreview(preview, skin));
      });
    }

    function renderYardCards(yards, ownedYards, state) {
      const els = getEls();
      yards.forEach((yard) => {
        const owned = Boolean(ownedYards[yard.id]);
        const equipped = state.garage.equippedYardId === yard.id;
        const canBuy = state.coins >= yard.price;
        const card = document.createElement("article");
        const yardStateClass = equipped ? " equipped owned" : owned ? " owned" : canBuy ? " can-buy" : " locked";
        card.className = `skin-card yard-card${yardStateClass}`;

        const preview = document.createElement("canvas");
        preview.className = "yard-preview";
        preview.setAttribute("aria-label", `Предпросмотр: ${yard.name}`);

        const meta = document.createElement("div");
        meta.className = "skin-meta";
        const title = document.createElement("div");
        title.className = "skin-title";
        title.innerHTML = `<strong>${yard.name}</strong><span>${yard.price ? deps.formatCoinAmount(yard.price, { short: true }) : "База"}</span>`;

        const rarity = document.createElement("span");
        rarity.className = "yard-rarity";
        rarity.textContent = yard.concept || yard.rarity || "Коллекция";

        const button = document.createElement("button");
        applyOwnableButtonState(button, { equipped, owned, canBuy });
        button.addEventListener("click", () => deps.buyOrEquipYard(yard));

        meta.appendChild(title);
        meta.appendChild(rarity);
        meta.appendChild(button);
        card.appendChild(preview);
        card.appendChild(meta);
        els.garageGrid.appendChild(card);
        if (renderer.renderYardPreview) {
          requestAnimationFrame(() => renderer.renderYardPreview(preview, yard));
        }
      });
    }

    function renderMissions() {
      const els = getEls();
      if (!els.missionsList) return;
      deps.syncDailyMissions();
      const state = getState();
      const missions = getMissionDefinitions();
      els.missionsList.innerHTML = "";
      if (els.missionRefreshLabel) {
        const completedMissions = missions.filter((mission) => state.missions.records[mission.id]?.claimed).length;
        els.missionRefreshLabel.innerHTML = `
          <span>Цели на сегодня · обновляются каждый день</span>
          <div class="mission-refresh-stats">
            <strong>${completedMissions}/${missions.length} выполнено</strong>
            <strong>Награды за задачи</strong>
          </div>
        `;
      }
      missions.forEach((mission) => {
        const record = state.missions.records[mission.id] || deps.createMissionRecord();
        const progress = Math.min(mission.target, record.progress || 0);
        const ready = !record.claimed && progress >= mission.target;
        const card = document.createElement("article");
        card.className = `mission-card${record.claimed ? " claimed" : ready ? " ready" : ""}`;
        const percent = Math.round((progress / mission.target) * 100);
        const iconId = mission.id === "daily_complete" ? "i-calendar" : mission.id === "three_stars" ? "i-star" : "i-undo";
        const icon = `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${iconId}" /></svg>`;
        card.innerHTML = `
          <div class="mission-icon" aria-hidden="true">${icon}</div>
          <div class="mission-meta">
            <div class="mission-title"><strong>${mission.title}</strong><span>+${deps.formatCoinAmount(mission.reward, { short: true })}</span></div>
            <span class="label">${mission.text}</span>
            <div class="mission-progress"><span style="width: ${percent}%"></span></div>
            <button disabled>${record.claimed ? "Получено" : progress >= mission.target ? "Готово" : `${progress} / ${mission.target}`}</button>
          </div>
        `;
        els.missionsList.appendChild(card);
      });
    }

    function renderDailyWeek() {
      const els = getEls();
      if (!els.dailyWeek) return;
      const today = deps.getDailyDateKey();
      const days = [];
      for (let offset = -3; offset <= 3; offset += 1) {
        const dateKey = deps.shiftDateKey(today, offset);
        const completion = deps.getValidDailyCompletion(dateKey);
        days.push({ dateKey, completion, isToday: offset === 0, isFuture: offset > 0 });
      }
      els.dailyWeek.innerHTML = "";
      days.forEach((day) => {
        const item = document.createElement("div");
        item.className = `daily-day${day.completion ? " done" : ""}${day.isToday ? " today" : ""}${day.isFuture ? " future" : ""}`;
        const dateLabel = deps.formatShortDate(day.dateKey);
        const status = day.completion ? "★".repeat(day.completion.stars) : day.isToday ? "•" : "";
        const caption = day.isToday ? "сегодня" : day.completion ? "готово" : "";
        item.innerHTML = `
          <span class="daily-date">${dateLabel}</span>
          <strong>${status}</strong>
          <span class="daily-caption">${caption}</span>
        `;
        els.dailyWeek.appendChild(item);
      });
    }

    function renderStats() {
      const els = getEls();
      if (!els.statsBody) return;
      const state = getState();
      const completed = state.completed || {};
      const ids = Object.keys(completed);
      let totalSolved = 0;
      let threeStars = 0;
      ids.forEach((id) => {
        totalSolved += 1;
        if ((completed[id].stars || 0) >= 3) threeStars += 1;
      });
      const completions = (state.daily && state.daily.completions) || {};
      const dailyDone = Object.keys(completions).filter((key) => completions[key]).length;
      const streak = (state.daily && state.daily.streak) || { current: 0, best: 0 };
      const coins = state.coins || 0;

      const tiles = [
        { icon: "i-grid", value: totalSolved, label: "Уровней пройдено" },
        { icon: "i-star", value: threeStars, label: "На три звезды" },
        { icon: "i-calendar", value: dailyDone, label: "Дней пройдено" },
        { icon: "i-trophy", value: streak.best || 0, label: "Лучшая серия" },
        { icon: "i-clock", value: streak.current || 0, label: "Текущая серия" },
        { icon: "i-coin", value: String(coins), label: "Монеты" }
      ];

      const modeRows = getModes().map((mode) => {
        const modeLevels = deps.getModeLevels(mode.id);
        const total = modeLevels.length;
        const done = modeLevels.filter((lvl) => completed[lvl.id]).length;
        return { title: mode.title || mode.id, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
      });

      els.statsBody.innerHTML = `
        <div class="stats-grid">
          ${tiles.map((tile) => `
            <div class="stat-tile">
              <span class="stat-tile-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><use href="#${tile.icon}" /></svg></span>
              <strong>${tile.value}</strong>
              <span class="stat-tile-label">${tile.label}</span>
            </div>`).join("")}
        </div>
        <p class="stats-section-title">Прогресс по режимам</p>
        <div class="stats-modes">
          ${modeRows.map((mode) => `
            <div class="stats-mode-row">
              <div class="stats-mode-head"><span>${mode.title}</span><strong>${mode.done}/${mode.total}</strong></div>
              <div class="stats-mode-bar"><span style="width: ${mode.pct}%"></span></div>
            </div>`).join("")}
        </div>
      `;
    }

    function renderDailyPanel(options = {}) {
      const els = getEls();
      const dailyApi = deps.dailyApi;
      if (!els.dailyOverview || !els.dailyCalendarGrid || !dailyApi) return;
      const state = getState();
      const today = deps.getDailyDateKey();
      const todayCompletion = deps.getValidDailyCompletion(today);
      const todayLevel = dailyApi.getDailyLevel(today);
      const year = Number(today.slice(0, 4));
      const currentMonth = Number(today.slice(5, 7));
      const rewardPreview = deps.getDailyRewardPreview();
      els.dailyOverview.innerHTML = `
        <div class="daily-overview-copy">
          <span class="label">Сегодня · ${deps.formatShortDate(today)}</span>
          <strong>${todayCompletion ? `Пройдено на ${todayCompletion.stars}★` : "Сложный двор дня"}</strong>
          <small>${todayLevel.minMoves} оптимальных ходов · награда до ${rewardPreview} монет</small>
        </div>
        <button class="primary-button" id="dailyTodayStartButton">${todayCompletion ? "Играть еще" : "Начать"}</button>
      `;
      const todayButton = document.getElementById("dailyTodayStartButton");
      if (todayButton) {
        todayButton.dataset.dateKey = today;
        todayButton.addEventListener("click", () => {
          if (deps.blockTutorialEscape()) return;
          deps.playSound("button");
          deps.startDailyLevel(todayButton.dataset.dateKey || deps.getDailyDateKey());
        });
      }

      const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
      const calendar = dailyApi.getDailyCalendar ? dailyApi.getDailyCalendar(year) : [];
      els.dailyCalendarGrid.innerHTML = "";
      monthNames.forEach((name, monthIndex) => {
        const monthDays = calendar.filter((slot) => slot.month === monthIndex + 1);
        const section = document.createElement("section");
        const monthNumber = monthIndex + 1;
        section.className = `daily-month${monthNumber === currentMonth ? " current" : ""}`;
        section.dataset.dailyMonth = String(monthNumber);
        section.innerHTML = `<div class="daily-month-title"><strong>${name}</strong><span>${monthDays.length} уровней</span></div>`;
        const grid = document.createElement("div");
        grid.className = "daily-month-grid";
        monthDays.forEach((slot) => grid.appendChild(createDailyDayButton(slot, today, state)));
        section.appendChild(grid);
        els.dailyCalendarGrid.appendChild(section);
      });

      if (options.scrollToCurrentMonth) scrollDailyCalendarToCurrentMonth(currentMonth);
    }

    function scrollDailyCalendarToCurrentMonth(monthNumber) {
      const els = getEls();
      if (!els.dailyCalendarGrid || !monthNumber) return;
      const scroll = () => {
        const target = els.dailyCalendarGrid.querySelector(`[data-daily-month="${monthNumber}"]`);
        if (!target) return;
        const containerRect = els.dailyCalendarGrid.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const top = targetRect.top - containerRect.top + els.dailyCalendarGrid.scrollTop - 2;
        els.dailyCalendarGrid.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      };
      requestAnimationFrame(scroll);
      setTimeout(scroll, 60);
      setTimeout(scroll, 180);
    }

    function createDailyDayButton(slot, today, state) {
      const completion = deps.getValidDailyCompletion(slot.dateKey);
      const isToday = slot.dateKey === today;
      const isFuture = slot.dateKey > today;
      const attempted = deps.hasDailyAttempt(slot.dateKey);
      const unlocked = isToday || completion || attempted || state.daily.archiveUnlocks[slot.dateKey];
      const adLocked = !isFuture && !unlocked;
      const status = getDailyCalendarStatus({ completion, isToday, isFuture, unlocked });
      const button = document.createElement("button");
      button.className = `daily-calendar-day${isToday ? " today" : ""}${completion ? " done" : ""}${isFuture ? " future" : ""}${adLocked ? " locked ad-locked" : ""}${attempted && !completion ? " attempted" : ""}`;
      button.innerHTML = `
        <span>${slot.day}</span>
        ${status ? `<small>${status}</small>` : `<small aria-hidden="true"></small>`}
        ${
          adLocked
            ? `<span class="daily-lock-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M7.5 10V8.2a4.5 4.5 0 0 1 9 0V10" />
                  <rect x="5.5" y="10" width="13" height="10" rx="3" />
                  <path d="M12 14.4v2.2" />
                </svg>
              </span>`
            : ""
        }
      `;
      button.disabled = isFuture;
      button.setAttribute(
        "aria-label",
        isFuture
          ? `${deps.formatShortDate(slot.dateKey)}: скоро`
          : unlocked
            ? `${deps.formatShortDate(slot.dateKey)}: открыт`
            : `${deps.formatShortDate(slot.dateKey)}: архив закрыт, откроется за рекламу`
      );
      button.title = isFuture
        ? "Будущий уровень дня пока закрыт"
        : unlocked
          ? `Уровень дня ${deps.formatShortDate(slot.dateKey)} · ${slot.minMoves} ходов`
          : "Архивный уровень дня открывается за рекламу";
      button.addEventListener("click", () => {
        if (deps.blockTutorialEscape()) return;
        deps.playSound("button");
        if (isFuture) return;
        if (unlocked) deps.startDailyLevel(slot.dateKey);
        else deps.showDailyArchivePrompt(slot.dateKey);
      });
      return button;
    }

    function getDailyCalendarStatus({ completion, isToday, isFuture, unlocked }) {
      if (completion) return completion.stars >= 3 ? "★★★" : `${completion.stars}★`;
      if (isToday) return "";
      if (isFuture) return "скоро";
      if (unlocked) return "открыт";
      return "";
    }

    function updateHud() {
      const els = getEls();
      const state = getState();
      const session = deps.getSessionSnapshot();
      const level = session.level;
      const moves = session.moves;
      const activeMode = session.activeMode;
      const timerState = session.timerState;
      const limit = deps.getMoveLimit();
      const rule = deps.getRuleType();
      const remaining = Number.isFinite(limit) ? Math.max(0, limit - moves) : Infinity;
      const timerRemaining = deps.getTimerRemainingSec();
      if (els.coins) els.coins.textContent = state.coins;
      if (els.currentLevelLabel) els.currentLevelLabel.textContent = String(deps.getCurrentModeOrder(getSelectedModeId()) + 1);

      if (els.movesLabel && els.limitLabel) {
        if (rule === "timed") {
          els.movesLabel.textContent = `${moves} ${deps.plural(moves, ["ход", "хода", "ходов"])}`;
          els.limitLabel.textContent = deps.formatTime(timerRemaining);
        } else if (Number.isFinite(limit)) {
          els.movesLabel.textContent = level ? `${moves} / ${limit} ходов` : `${moves} ${deps.plural(moves, ["ход", "хода", "ходов"])}`;
          els.limitLabel.textContent = level ? `Осталось ${remaining}` : "";
        } else {
          els.movesLabel.textContent = `${moves} ${deps.plural(moves, ["ход", "хода", "ходов"])}`;
          els.limitLabel.textContent = level ? "Без лимита" : "";
        }
      }

      const dangerState = rule === "timed" ? level && timerRemaining <= 12 : level && Number.isFinite(remaining) && remaining <= 2;
      if (els.limitLabel) els.limitLabel.classList.toggle("danger", Boolean(dangerState));
      if (els.moveMeter) {
        const moveProgress =
          rule === "timed" && timerState
            ? Math.min(100, Math.round(100 - (timerState.remainingMs / timerState.limitMs) * 100))
            : level && Number.isFinite(limit)
              ? Math.min(100, Math.round((moves / limit) * 100))
              : 0;
        els.moveMeter.style.setProperty("--move-progress", `${moveProgress}%`);
        els.moveMeter.classList.toggle("danger", Boolean(dangerState));
      }
      if (els.playArea) els.playArea.classList.toggle("move-danger", Boolean(dangerState));
      renderActionButtons();

      if (els.dailyButton) els.dailyButton.setAttribute("aria-label", `Уровень дня, награда до ${deps.getDailyRewardPreview()} монет`);
      if (els.skipButton) els.skipButton.disabled = activeMode === "daily";
      if (els.muteButton) {
        const muted = Boolean(state.settings.muted);
        if (els.muteButton.dataset.muted !== String(muted)) {
          els.muteButton.dataset.muted = String(muted);
          els.muteButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-sound-${muted ? "off" : "on"}" /></svg>`;
        }
        els.muteButton.setAttribute("aria-label", muted ? "Включить звук" : "Выключить звук");
        els.muteButton.setAttribute("aria-pressed", String(muted));
      }
      if (els.soundToggleButton) {
        const on = !state.settings.muted;
        els.soundToggleButton.textContent = `Звук: ${on ? "вкл" : "выкл"}`;
        els.soundToggleButton.setAttribute("aria-pressed", String(on));
      }
      if (els.hapticsToggleButton) {
        const on = state.settings.haptics !== false;
        els.hapticsToggleButton.textContent = `Вибрация: ${on ? "вкл" : "выкл"}`;
        els.hapticsToggleButton.setAttribute("aria-pressed", String(on));
      }
      if (level && els.levelTitle) {
        const mode = deps.getLevelMode();
        els.levelTitle.textContent =
          activeMode === "daily" ? `${level.title} · ${deps.formatShortDate(session.activeDailyDateKey)}` : `${level.modeOrder}. ${level.title}`;
      }
      updateMenuStatus();
    }

    function renderActionButtons() {
      const els = getEls();
      const state = getState();
      const session = deps.getSessionSnapshot();
      setToolButton(els.undoButton, toolIcon("i-undo"), "Отмена", "ход назад");
      setToolButton(els.hintButton, toolIcon("i-bulb"), "Подсказка", state.hints > 0 ? `${state.hints} в запасе` : "за рекламу");
      setToolButton(els.skipButton, toolIcon("i-skip"), "Пропуск", session.activeMode === "daily" ? "не для дня" : "за рекламу");
    }

    function toolIcon(symbolId) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${symbolId}" /></svg>`;
    }

    function setToolButton(button, icon, title, subtitle) {
      if (!button) return;
      const signature = `${icon}|${title}|${subtitle}`;
      if (button.dataset.toolSignature === signature) return;
      button.dataset.toolSignature = signature;
      button.innerHTML = `
        <span class="tool-icon" aria-hidden="true">${icon}</span>
        <span class="tool-copy"><strong>${title}</strong><small>${subtitle}</small></span>
      `;
      button.setAttribute("aria-label", `${title}: ${subtitle}`);
    }

    function updateMenuStatus() {
      const els = getEls();
      const state = getState();
      deps.syncDailyMissions();
      const mode = deps.getMode(getSelectedModeId());
      const modeOrder = deps.getCurrentModeOrder(getSelectedModeId()) + 1;
      if (els.currentLevelLabel) els.currentLevelLabel.textContent = String(modeOrder);
      if (els.modeStatusLabel) els.modeStatusLabel.textContent = `${mode.title} · уровень ${modeOrder}`;

      const dateKey = deps.getDailyDateKey();
      const completion = deps.getValidDailyCompletion(dateKey);
      if (els.dailyStatusLabel) {
        els.dailyStatusLabel.textContent = completion
          ? `Пройден · ${"★".repeat(completion.stars)}${"☆".repeat(3 - completion.stars)}`
          : `До ${deps.getDailyRewardPreview()} монет`;
      }

      if (els.streakCount && els.streakBest) {
        const streak = state.daily.streak || { current: 0, best: 0 };
        const current = Math.max(0, streak.current || 0);
        const best = Math.max(current, streak.best || 0);
        els.streakCount.textContent = String(current);
        els.streakBest.textContent = `Рекорд ${best}`;
        if (els.streakPanel) {
          els.streakPanel.classList.toggle("active", current > 0);
          els.streakPanel.setAttribute("aria-label", `Серия ${current}, рекорд ${best}`);
        }
      }

      if (els.missionStatusLabel) {
        const missions = getMissionDefinitions();
        const claimed = missions.filter((mission) => state.missions.records[mission.id] && state.missions.records[mission.id].claimed).length;
        const available = missions.filter((mission) => {
          const record = state.missions.records[mission.id];
          return record && !record.claimed && record.progress >= mission.target;
        }).length;
        els.missionStatusLabel.textContent = available ? `${available} готово · ${claimed}/${missions.length}` : `${claimed}/${missions.length} выполнено`;
      }
      renderDailyWeek();
    }

    function showWinModal(options = {}) {
      const els = getEls();
      if (els.winTitle) els.winTitle.textContent = options.title || "";
      if (els.starsLabel) els.starsLabel.textContent = options.starsLabel || "☆☆☆";
      if (els.rewardLabel) {
        const rewardText = options.rewardText || "";
        els.rewardLabel.textContent = rewardText;
        els.rewardLabel.classList.remove("reward-pop");
        els.rewardLabel.classList.toggle("reward-empty", !rewardText.includes("+"));
      }
      if (els.doubleRewardButton) els.doubleRewardButton.hidden = !options.canDouble;
      if (els.nextLevelButton) els.nextLevelButton.textContent = options.nextText || "Следующий";
      if (els.winMenuButton) els.winMenuButton.hidden = !options.showMenuButton;
      if (els.winModal) {
        els.winModal.hidden = false;
        requestAnimationFrame(() => {
          try {
            if (els.nextLevelButton) els.nextLevelButton.focus();
          } catch {
            // фокус не критичен — безопасно игнорируем
          }
        });
      }
    }

    function setWinStars(label) {
      const els = getEls();
      if (els.starsLabel) els.starsLabel.textContent = label;
    }

    function popRewardLabel() {
      const els = getEls();
      if (els.rewardLabel) els.rewardLabel.classList.add("reward-pop");
    }

    function showFailModal(options = {}) {
      const els = getEls();
      if (els.failEyebrow) els.failEyebrow.textContent = options.eyebrow || "";
      if (els.failTitle) els.failTitle.textContent = options.title || "";
      if (els.failText) els.failText.textContent = options.text || "";
      if (els.failModal) {
        els.failModal.hidden = false;
        requestAnimationFrame(() => {
          try {
            if (els.retryButton) els.retryButton.focus();
          } catch {
            // фокус не критичен — безопасно игнорируем
          }
        });
      }
    }

    return {
      renderLevelSelect,
      renderModeSelect,
      renderGarage,
      renderMissions,
      renderStats,
      renderDailyWeek,
      renderDailyPanel,
      updateHud,
      renderActionButtons,
      updateMenuStatus,
      showWinModal,
      setWinStars,
      popRewardLabel,
      showFailModal
    };
  }

  window.PROBKA_SCREENS = {
    createController,
    setVisibleView,
    isKnownView
  };
})();
