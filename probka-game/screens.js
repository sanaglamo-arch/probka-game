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
    // i18n helper — deps.t is injected by game.js; fall back to window.PROBKA_TEXTS.t
    const t = deps.t || (typeof window !== "undefined" && window.PROBKA_TEXTS && window.PROBKA_TEXTS.t) || ((k) => k);
    const translateLevelTitle = deps.translateLevelTitle || (typeof window !== "undefined" && window.PROBKA_TEXTS && window.PROBKA_TEXTS.translateLevelTitle) || ((s) => s);
    const tSkinName = deps.tSkinName || (typeof window !== "undefined" && window.PROBKA_TEXTS && window.PROBKA_TEXTS.tSkinName) || ((id) => id);
    const tYardName = deps.tYardName || (typeof window !== "undefined" && window.PROBKA_TEXTS && window.PROBKA_TEXTS.tYardName) || ((id) => id);
    const tModeTitle = deps.tModeTitle || (typeof window !== "undefined" && window.PROBKA_TEXTS && window.PROBKA_TEXTS.tModeTitle) || ((id) => id);
    const tModeSubtitle = deps.tModeSubtitle || (typeof window !== "undefined" && window.PROBKA_TEXTS && window.PROBKA_TEXTS.tModeSubtitle) || (() => "");

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
      if (els.levelsEyebrow) els.levelsEyebrow.textContent = tModeTitle(mode.id) || mode.title;
      if (els.levelsTitle) els.levelsTitle.textContent = t("levels.title", { n: modeLevels.length });

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
            <strong>${tModeTitle(mode.id) || mode.title}</strong>
            <span>${t("levels.pack.range", { from, to, subtitle: tModeSubtitle(mode.id) || mode.subtitle || "" })}</span>
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
            <strong>${tModeTitle(mode.id) || mode.title}</strong>
            <small>${tModeSubtitle(mode.id) || mode.subtitle || ""}</small>
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
          ? t("level.now")
          : t("level.next", { d: item.difficulty || 1 });
      button.innerHTML = unlocked
        ? `<span class="level-number">${item.modeOrder}</span><small>${marker}</small>`
        : `<span class="level-number">${item.modeOrder}</span><small>${t("level.locked")}</small>`;
      button.title = completion
        ? t("level.tooltip.done", { title: translateLevelTitle(item.title), stars: completion.stars, moves: completion.bestMoves })
        : unlocked
          ? t("level.tooltip.open", { title: translateLevelTitle(item.title), minMoves: item.minMoves, diff: item.difficulty })
          : t("level.tooltip.locked");
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
        button.textContent = t("garage.equip.btn.equipped");
        button.disabled = true;
      } else if (owned) {
        button.textContent = t("garage.equip.btn.equip");
      } else if (canBuy) {
        button.textContent = t("garage.equip.btn.buy");
      } else {
        button.textContent = t("garage.equip.btn.locked");
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
        const currentItemName = isYardsTab ? tYardName(currentItem.id) : tSkinName(currentItem.id);
        els.garageSummary.innerHTML = `
          <div class="garage-tabs" role="tablist" aria-label="${t("garage.tabs.aria")}">
            <button class="garage-tab${!isYardsTab ? " active" : ""}" type="button" role="tab" aria-selected="${!isYardsTab}">${t("garage.tabs.skins")}</button>
            <button class="garage-tab${isYardsTab ? " active" : ""}" type="button" role="tab" aria-selected="${isYardsTab}">${t("garage.tabs.yards")}</button>
          </div>
          <div class="garage-summary-top">
            <span class="label">${isYardsTab ? t("garage.current.yard") : t("garage.current.skin")}</span>
            <div><strong>${currentItemName}</strong> · ${t("garage.owned", { n: ownedCount, total: totalCount })}</div>
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
        const skinDisplayName = tSkinName(skin.id);
        const preview = hasSpritePreview ? document.createElement("canvas") : document.createElement("div");
        if (hasSpritePreview) {
          preview.className = "skin-preview skin-preview-sprite";
          preview.setAttribute("aria-label", t("garage.preview.aria", { name: skinDisplayName }));
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
        title.innerHTML = `<strong>${skinDisplayName}</strong><span>${skin.price ? deps.formatCoinAmount(skin.price, { short: true }) : t("garage.base")}</span>`;

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

        const yardDisplayName = tYardName(yard.id);
        const preview = document.createElement("canvas");
        preview.className = "yard-preview";
        preview.setAttribute("aria-label", t("garage.preview.aria", { name: yardDisplayName }));

        const meta = document.createElement("div");
        meta.className = "skin-meta";
        const title = document.createElement("div");
        title.className = "skin-title";
        title.innerHTML = `<strong>${yardDisplayName}</strong><span>${yard.price ? deps.formatCoinAmount(yard.price, { short: true }) : t("garage.base")}</span>`;

        const rarity = document.createElement("span");
        rarity.className = "yard-rarity";
        // Map RU concept tags and rarity words to i18n keys
        const RARITY_KEY_MAP = {
          "Стартовый": "starter",
          "Редкий": "rare",
          "Премиум": "premium",
          "Легенда": "legend"
        };
        const CONCEPT_KEY_MAP = {
          "город": "city",
          "фонари": "lights",
          "снег": "snow",
          "листья": "leaves",
          "дождь": "rain",
          "бетон": "concrete",
          "премиум": "premium",
          "трещины": "cracks",
          "неон": "neon",
          "гирлянды": "garlands"
        };
        const conceptShortKey = yard.concept ? (CONCEPT_KEY_MAP[yard.concept] || yard.concept) : null;
        const rarityShortKey = yard.rarity ? (RARITY_KEY_MAP[yard.rarity] || yard.rarity.toLowerCase()) : null;
        const conceptTranslated = conceptShortKey ? t("concept." + conceptShortKey) : null;
        const rarityTranslated = rarityShortKey ? t("rarity." + rarityShortKey) : null;
        const conceptKey2 = "concept." + conceptShortKey;
        const rarityKey2 = "rarity." + rarityShortKey;
        rarity.textContent = (conceptTranslated && conceptTranslated !== conceptKey2) ? conceptTranslated
          : (rarityTranslated && rarityTranslated !== rarityKey2) ? rarityTranslated
          : (yard.concept || yard.rarity || "");

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
          <span>${t("missions.today")}</span>
          <div class="mission-refresh-stats">
            <strong>${t("missions.done", { n: completedMissions, total: missions.length })}</strong>
            <strong>${t("missions.reward")}</strong>
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
        // Mission title and text are also translatable via i18n keys if provided
        const missionTitle = (deps.tMissionTitle && deps.tMissionTitle(mission.id)) || mission.title;
        const missionText = (deps.tMissionText && deps.tMissionText(mission.id)) || mission.text;
        card.innerHTML = `
          <div class="mission-icon" aria-hidden="true">${icon}</div>
          <div class="mission-meta">
            <div class="mission-title"><strong>${missionTitle}</strong><span>+${deps.formatCoinAmount(mission.reward, { short: true })}</span></div>
            <span class="label">${missionText}</span>
            <div class="mission-progress"><span style="width: ${percent}%"></span></div>
            <button disabled>${record.claimed ? t("missions.btn.claimed") : progress >= mission.target ? t("missions.btn.ready") : `${progress} / ${mission.target}`}</button>
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
        const caption = day.isToday ? t("dailyWeek.today") : day.completion ? t("dailyWeek.done") : "";
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
        { icon: "i-grid", value: totalSolved, label: t("stats.tile.solved") },
        { icon: "i-star", value: threeStars, label: t("stats.tile.stars") },
        { icon: "i-calendar", value: dailyDone, label: t("stats.tile.daily") },
        { icon: "i-trophy", value: streak.best || 0, label: t("stats.tile.bestStreak") },
        { icon: "i-clock", value: streak.current || 0, label: t("stats.tile.streak") },
        { icon: "i-coin", value: String(coins), label: t("stats.tile.coins") }
      ];

      const modeRows = getModes().map((mode) => {
        const modeLevels = deps.getModeLevels(mode.id);
        const total = modeLevels.length;
        const done = modeLevels.filter((lvl) => completed[lvl.id]).length;
        return { title: tModeTitle(mode.id) || mode.title || mode.id, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
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
        <p class="stats-section-title">${t("stats.section.modes")}</p>
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
          <span class="label">${t("daily.overview.today", { date: deps.formatShortDate(today) })}</span>
          <strong>${todayCompletion ? t("daily.overview.done", { stars: todayCompletion.stars }) : t("daily.overview.open")}</strong>
          <small>${t("daily.overview.subtitle", { minMoves: todayLevel.minMoves, coins: rewardPreview })}</small>
        </div>
        <button class="primary-button" id="dailyTodayStartButton">${todayCompletion ? t("daily.overview.playAgain") : t("daily.overview.start")}</button>
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

      const monthNames = [1,2,3,4,5,6,7,8,9,10,11,12].map((m) => t("month." + m));
      const calendar = dailyApi.getDailyCalendar ? dailyApi.getDailyCalendar(year) : [];
      els.dailyCalendarGrid.innerHTML = "";
      monthNames.forEach((name, monthIndex) => {
        const monthDays = calendar.filter((slot) => slot.month === monthIndex + 1);
        const section = document.createElement("section");
        const monthNumber = monthIndex + 1;
        section.className = `daily-month${monthNumber === currentMonth ? " current" : ""}`;
        section.dataset.dailyMonth = String(monthNumber);
        section.innerHTML = `<div class="daily-month-title"><strong>${name}</strong><span>${t("daily.month.levels", { n: monthDays.length })}</span></div>`;
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
          ? t("daily.day.aria.future", { date: deps.formatShortDate(slot.dateKey) })
          : unlocked
            ? t("daily.day.aria.unlocked", { date: deps.formatShortDate(slot.dateKey) })
            : t("daily.day.aria.locked", { date: deps.formatShortDate(slot.dateKey) })
      );
      button.title = isFuture
        ? t("daily.day.title.future")
        : unlocked
          ? t("daily.day.title.unlocked", { date: deps.formatShortDate(slot.dateKey), minMoves: slot.minMoves })
          : t("daily.day.title.locked");
      button.addEventListener("click", () => {
        if (deps.blockTutorialEscape()) return;
        deps.playSound("button");
        if (isFuture) return;
        if (unlocked) deps.startDailyLevel(slot.dateKey);
        else deps.showDailyArchivePrompt(slot.dateKey);
      });
      return button;
    }

    function getDailyCalendarStatus({ completion }) {
      // Текстовые метки убраны ради чистоты: состояние читается по стилю/иконке.
      // У пройденных дней — звёзды результата.
      if (completion) return "★".repeat(Math.max(1, completion.stars || 0));
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
        const moveForm = deps.pluralMoves ? deps.pluralMoves(moves) : deps.plural(moves, [t("move.form.1"), t("move.form.2"), t("move.form.3")]);
        if (rule === "timed") {
          els.movesLabel.textContent = `${moves} ${moveForm}`;
          els.limitLabel.textContent = deps.formatTime(timerRemaining);
        } else if (Number.isFinite(limit)) {
          els.movesLabel.textContent = level ? t("hud.moves.limited", { moves, limit }) : `${moves} ${moveForm}`;
          els.limitLabel.textContent = level ? t("hud.remaining", { n: remaining }) : "";
        } else {
          els.movesLabel.textContent = `${moves} ${moveForm}`;
          els.limitLabel.textContent = level ? t("hud.noLimit") : "";
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

      if (els.dailyButton) els.dailyButton.setAttribute("aria-label", t("hud.dailyBtn.aria", { coins: deps.getDailyRewardPreview() }));
      if (els.skipButton) els.skipButton.disabled = activeMode === "daily";
      if (els.muteButton) {
        const muted = Boolean(state.settings.muted);
        if (els.muteButton.dataset.muted !== String(muted)) {
          els.muteButton.dataset.muted = String(muted);
          els.muteButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-sound-${muted ? "off" : "on"}" /></svg>`;
        }
        els.muteButton.setAttribute("aria-label", muted ? t("mute.on") : t("mute.off"));
        els.muteButton.setAttribute("aria-pressed", String(muted));
      }
      if (els.soundToggleButton) {
        const on = !state.settings.muted;
        els.soundToggleButton.textContent = on ? t("settings.sound.on") : t("settings.sound.off");
        els.soundToggleButton.setAttribute("aria-pressed", String(on));
      }
      if (els.hapticsToggleButton) {
        const on = state.settings.haptics !== false;
        els.hapticsToggleButton.textContent = on ? t("settings.haptics.on") : t("settings.haptics.off");
        els.hapticsToggleButton.setAttribute("aria-pressed", String(on));
      }
      if (els.musicToggleButton) {
        const on = Boolean(state.settings.music);
        els.musicToggleButton.textContent = on ? t("settings.music.on") : t("settings.music.off");
        els.musicToggleButton.setAttribute("aria-pressed", String(on));
      }
      if (els.topLangButton) {
        els.topLangButton.textContent = (window.PROBKA_LANG || "ru") === "ru" ? "RU" : "EN";
      }
      if (els.langToggleButton) {
        const lang = window.PROBKA_LANG || "ru";
        els.langToggleButton.textContent = lang === "ru" ? t("settings.lang.ru") : t("settings.lang.en");
      }
      if (level && els.levelTitle) {
        const mode = deps.getLevelMode();
        if (activeMode === "daily") {
          els.levelTitle.textContent = t("hud.levelTitle.daily", { title: translateLevelTitle(level.title), date: deps.formatShortDate(session.activeDailyDateKey) });
        } else {
          els.levelTitle.textContent = t("hud.levelTitle.campaign", { n: level.modeOrder, title: translateLevelTitle(level.title) });
        }
      }
      updateMenuStatus();
    }

    function renderActionButtons() {
      const els = getEls();
      const state = getState();
      const session = deps.getSessionSnapshot();
      setToolButton(els.undoButton, toolIcon("i-undo"), t("tool.undo.title"), t("tool.undo.sub"));
      setToolButton(els.hintButton, toolIcon("i-bulb"), t("tool.hint.title"), state.hints > 0 ? t("tool.hint.stock", { n: state.hints }) : t("tool.hint.ad"));
      setToolButton(els.skipButton, toolIcon("i-skip"), t("tool.skip.title"), session.activeMode === "daily" ? t("tool.skip.daily") : t("tool.skip.ad"));
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
      if (els.modeStatusLabel) els.modeStatusLabel.textContent = t("hud.modeStatus", { modeTitle: tModeTitle(mode.id) || mode.title, n: modeOrder });

      const dateKey = deps.getDailyDateKey();
      const completion = deps.getValidDailyCompletion(dateKey);
      if (els.dailyStatusLabel) {
        els.dailyStatusLabel.textContent = completion
          ? t("dailyCard.statusDone", { stars: "★".repeat(completion.stars) + "☆".repeat(3 - completion.stars) })
          : t("dailyCard.statusOpen", { coins: deps.getDailyRewardPreview() });
      }

      if (els.streakCount && els.streakBest) {
        const streak = state.daily.streak || { current: 0, best: 0 };
        const current = Math.max(0, streak.current || 0);
        const best = Math.max(current, streak.best || 0);
        els.streakCount.textContent = String(current);
        els.streakBest.textContent = t("streak.record", { n: best });
        if (els.streakPanel) {
          els.streakPanel.classList.toggle("active", current > 0);
          els.streakPanel.setAttribute("aria-label", t("streak.panel.aria", { current, best }));
        }
      }

      if (els.missionStatusLabel) {
        const missions = getMissionDefinitions();
        const claimed = missions.filter((mission) => state.missions.records[mission.id] && state.missions.records[mission.id].claimed).length;
        const available = missions.filter((mission) => {
          const record = state.missions.records[mission.id];
          return record && !record.claimed && record.progress >= mission.target;
        }).length;
        els.missionStatusLabel.textContent = available ? t("missions.statusN", { n: available, claimed, total: missions.length }) : t("missions.statusAll", { claimed, total: missions.length });
      }
      renderDailyWeek();
    }

    function showWinModal(options = {}) {
      const els = getEls();
      if (els.winTitle) els.winTitle.textContent = options.packComplete ? t("win.packComplete") : (options.title || "");
      if (els.starsLabel) els.starsLabel.textContent = options.starsLabel || "☆☆☆";
      if (els.rewardLabel) {
        const rewardText = options.rewardText || "";
        els.rewardLabel.textContent = rewardText;
        els.rewardLabel.classList.remove("reward-pop");
        els.rewardLabel.classList.toggle("reward-empty", !rewardText.includes("+"));
      }
      if (els.doubleRewardButton) els.doubleRewardButton.hidden = !options.canDouble;
      if (els.nextLevelButton) els.nextLevelButton.textContent = options.nextText || t("win.next");
      if (els.winMenuButton) els.winMenuButton.hidden = !options.showMenuButton;
      if (els.winModal) {
        els.winModal.classList.toggle("pack-complete", Boolean(options.packComplete));
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
