(function () {
  const levels = window.PROBKA_LEVELS;
  const packs = window.PROBKA_PACKS || [];
  const dailyApi = window.PROBKA_DAILY;
  const skins = window.PROBKA_SKINS || [{ id: "classic_red", name: "Красная классика", price: 0, color: "#ff5c68" }];
  const storageKey = "probka_vo_dvore_progress_v1";
  const moveDuration = 155;
  const actorMoveDuration = 145;
  const bumpDuration = 135;
  const winDriveDuration = 520;
  const hintDuration = 1600;
  const smartHintDuration = 4600;
  const missionDefinitions = [
    { id: "daily_complete", title: "Двор дня", text: "Пройти уровень дня", reward: 20, target: 1 },
    { id: "three_stars", title: "Чистый выезд", text: "Получить 3 звезды", reward: 30, target: 1 },
    { id: "no_undo", title: "Без отката", text: "Пройти любой уровень без отмены", reward: 40, target: 1 }
  ];

  const els = {
    coins: document.getElementById("coins"),
    currentLevelLabel: document.getElementById("currentLevelLabel"),
    dailyStatusLabel: document.getElementById("dailyStatusLabel"),
    missionStatusLabel: document.getElementById("missionStatusLabel"),
    menuPanel: document.getElementById("menuPanel"),
    playArea: document.getElementById("playArea"),
    levelsPanel: document.getElementById("levelsPanel"),
    garagePanel: document.getElementById("garagePanel"),
    missionsPanel: document.getElementById("missionsPanel"),
    levelsGrid: document.getElementById("levelsGrid"),
    garageGrid: document.getElementById("garageGrid"),
    garageSummary: document.getElementById("garageSummary"),
    missionsList: document.getElementById("missionsList"),
    missionRefreshLabel: document.getElementById("missionRefreshLabel"),
    dailyWeek: document.getElementById("dailyWeek"),
    playButton: document.getElementById("playButton"),
    dailyButton: document.getElementById("dailyButton"),
    garageButton: document.getElementById("garageButton"),
    missionsButton: document.getElementById("missionsButton"),
    levelSelectButton: document.getElementById("levelSelectButton"),
    resetButton: document.getElementById("resetButton"),
    backButton: document.getElementById("backButton"),
    levelsBackButton: document.getElementById("levelsBackButton"),
    garageBackButton: document.getElementById("garageBackButton"),
    missionsBackButton: document.getElementById("missionsBackButton"),
    restartButton: document.getElementById("restartButton"),
    muteButton: document.getElementById("muteButton"),
    undoButton: document.getElementById("undoButton"),
    hintButton: document.getElementById("hintButton"),
    skipButton: document.getElementById("skipButton"),
    levelTitle: document.getElementById("levelTitle"),
    movesLabel: document.getElementById("movesLabel"),
    limitLabel: document.getElementById("limitLabel"),
    moveMeter: document.getElementById("moveMeter"),
    winModal: document.getElementById("winModal"),
    winTitle: document.getElementById("winTitle"),
    starsLabel: document.getElementById("starsLabel"),
    rewardLabel: document.getElementById("rewardLabel"),
    doubleRewardButton: document.getElementById("doubleRewardButton"),
    nextLevelButton: document.getElementById("nextLevelButton"),
    failModal: document.getElementById("failModal"),
    failText: document.getElementById("failText"),
    retryButton: document.getElementById("retryButton"),
    adModal: document.getElementById("adModal"),
    adTitle: document.getElementById("adTitle"),
    adText: document.getElementById("adText"),
    closeAdButton: document.getElementById("closeAdButton"),
    stickyAd: document.getElementById("stickyAd"),
    toast: document.getElementById("toast"),
    canvas: document.getElementById("gameCanvas")
  };

  const ctx = els.canvas.getContext("2d");
  let levelIndex = 0;
  let level = null;
  let vehicles = [];
  let actors = [];
  let moves = 0;
  let moveHistory = [];
  let selected = null;
  let activeHint = null;
  let hintFrame = null;
  let animation = null;
  let isAnimating = false;
  let winFx = null;
  let cellSize = 0;
  let boardPad = 22;
  let pendingAdClose = null;
  let lastReward = 0;
  let winTimers = [];
  let toastTimer = null;
  let activeMode = "campaign";
  let activeDailyDateKey = "";
  let usedUndoInRun = false;
  let audioCtx = null;
  let state = loadProgress();

  function defaultProgress() {
    return {
      currentLevelIndex: 0,
      coins: 0,
      hints: 3,
      completed: {},
      unlocked: { yard_001: true },
      ad: { levelsSinceInterstitial: 0, completedLevels: 0 },
      garage: {
        ownedSkins: { classic_red: true },
        equippedSkinId: "classic_red"
      },
      daily: {
        completions: {},
        missionDateKey: "",
        missions: {},
        streak: { current: 0, best: 0, lastDateKey: "" }
      },
      settings: { muted: false }
    };
  }

  function normalizeProgress(progress) {
    const defaults = defaultProgress();
    return {
      ...defaults,
      ...progress,
      completed: progress.completed || defaults.completed,
      unlocked: { ...defaults.unlocked, ...(progress.unlocked || {}) },
      ad: { ...defaults.ad, ...(progress.ad || {}) },
      garage: {
        ...defaults.garage,
        ...(progress.garage || {}),
        ownedSkins: { ...defaults.garage.ownedSkins, ...((progress.garage && progress.garage.ownedSkins) || {}) }
      },
      daily: {
        ...defaults.daily,
        ...(progress.daily || {}),
        completions: { ...defaults.daily.completions, ...((progress.daily && progress.daily.completions) || {}) },
        missions: { ...defaults.daily.missions, ...((progress.daily && progress.daily.missions) || {}) },
        streak: { ...defaults.daily.streak, ...((progress.daily && progress.daily.streak) || {}) }
      },
      settings: { ...defaults.settings, ...(progress.settings || {}) }
    };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(storageKey);
      return normalizeProgress(raw ? JSON.parse(raw) : defaultProgress());
    } catch {
      return defaultProgress();
    }
  }

  function saveProgress() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function cloneVehicle(vehicle) {
    return { ...vehicle };
  }

  function cloneActor(actor) {
    return {
      mode: "route",
      stepIndex: 0,
      direction: 1,
      startDelay: 0,
      moveEvery: 1,
      turnCounter: 0,
      waitTurns: 0,
      needsReroute: false,
      finished: false,
      inactive: false,
      ...actor,
      path: (actor.path || []).map((point) => ({ ...point }))
    };
  }

  function show(view) {
    els.menuPanel.hidden = view !== "menu";
    els.playArea.hidden = view !== "game";
    els.levelsPanel.hidden = view !== "levels";
    els.garagePanel.hidden = view !== "garage";
    els.missionsPanel.hidden = view !== "missions";
    els.stickyAd.hidden = view !== "menu";
    updateHud();
    if (view === "levels") renderLevelSelect();
    if (view === "garage") renderGarage();
    if (view === "missions") renderMissions();
    if (view === "game") resizeCanvas();
    renderDailyWeek();
  }

  function updateHud() {
    syncDailyMissions();
    const limit = getMoveLimit();
    const remaining = Math.max(0, limit - moves);
    els.coins.textContent = state.coins;
    els.currentLevelLabel.textContent = String(state.currentLevelIndex + 1);
    els.movesLabel.textContent = level ? `${moves} / ${limit} ходов` : `${moves} ${plural(moves, ["ход", "хода", "ходов"])}`;
    els.limitLabel.textContent = level ? `Осталось ${remaining}` : "";
    els.limitLabel.classList.toggle("danger", level && remaining <= 2);
    if (els.moveMeter) {
      const moveProgress = level && limit ? Math.min(100, Math.round((moves / limit) * 100)) : 0;
      els.moveMeter.style.setProperty("--move-progress", `${moveProgress}%`);
      els.moveMeter.classList.toggle("danger", level && remaining <= 2);
    }
    els.playArea.classList.toggle("move-danger", level && remaining <= 2);
    renderActionButtons();
    els.dailyButton.setAttribute("aria-label", `Уровень дня, награда до ${getDailyRewardPreview()} монет`);
    els.skipButton.disabled = activeMode === "daily";
    els.muteButton.textContent = state.settings.muted ? "Тихо" : "Звук";
    els.muteButton.setAttribute("aria-pressed", String(state.settings.muted));
    if (level) els.levelTitle.textContent = activeMode === "daily" ? `${level.title} · ${formatShortDate(activeDailyDateKey)}` : `${levelIndex + 1}. ${level.title}`;
    updateMenuStatus();
  }

  function renderActionButtons() {
    setToolButton(els.undoButton, "↶", "Отмена", "ход назад");
    setToolButton(els.hintButton, "?", "Подсказка", state.hints > 0 ? `${state.hints} в запасе` : "за видео");
    setToolButton(els.skipButton, ">>", "Пропуск", activeMode === "daily" ? "недоступен" : "за видео");
  }

  function setToolButton(button, icon, title, subtitle) {
    button.innerHTML = `
      <span class="tool-icon" aria-hidden="true">${icon}</span>
      <span class="tool-copy"><strong>${title}</strong><small>${subtitle}</small></span>
    `;
    button.setAttribute("aria-label", `${title}: ${subtitle}`);
  }

  function updateMenuStatus() {
    const dateKey = getDailyDateKey();
    const completion = getValidDailyCompletion(dateKey);
    if (els.dailyStatusLabel) {
      els.dailyStatusLabel.textContent = completion
        ? `Пройден: ${"★".repeat(completion.stars)}${"☆".repeat(3 - completion.stars)} · серия ${state.daily.streak.current}`
        : `Сложный двор · до ${getDailyRewardPreview()} монет`;
    }
    if (els.missionStatusLabel) {
      const claimed = missionDefinitions.filter((mission) => state.daily.missions[mission.id] && state.daily.missions[mission.id].claimed).length;
      const available = missionDefinitions.filter((mission) => {
        const record = state.daily.missions[mission.id];
        return record && !record.claimed && record.progress >= mission.target;
      }).length;
      els.missionStatusLabel.textContent = available
        ? `${claimed} / ${missionDefinitions.length} · ${available} готово`
        : `${claimed} / ${missionDefinitions.length}`;
    }
    renderDailyWeek();
  }

  function getValidDailyCompletion(dateKey) {
    const completion = state.daily.completions[dateKey];
    if (!completion) return null;
    if (!dailyApi || !completion.seed) return completion;
    const dailyLevel = dailyApi.getDailyLevel(dateKey);
    return dailyLevel && completion.seed === dailyLevel.seed ? completion : null;
  }

  function getMoveLimit() {
    return level && Number.isInteger(level.moveLimit) ? level.moveLimit : 5;
  }

  function isOutOfMoves() {
    return level && moves >= getMoveLimit();
  }

  function plural(value, forms) {
    const abs = Math.abs(value) % 100;
    const digit = abs % 10;
    if (abs > 10 && abs < 20) return forms[2];
    if (digit > 1 && digit < 5) return forms[1];
    if (digit === 1) return forms[0];
    return forms[2];
  }

  function clearWinTimers() {
    winTimers.forEach((timer) => clearTimeout(timer));
    winTimers = [];
  }

  function clearHint() {
    activeHint = null;
    if (hintFrame) cancelAnimationFrame(hintFrame);
    hintFrame = null;
  }

  function startLevel(index) {
    clearWinTimers();
    clearHint();
    activeMode = "campaign";
    activeDailyDateKey = "";
    usedUndoInRun = false;
    animation = null;
    isAnimating = false;
    winFx = null;
    els.winModal.hidden = true;
    els.failModal.hidden = true;
    levelIndex = Math.max(0, Math.min(index, levels.length - 1));
    level = levels[levelIndex];
    vehicles = level.vehicles.map(cloneVehicle);
    actors = (level.actors || []).map(cloneActor);
    initializeActors();
    moves = 0;
    moveHistory = [];
    selected = null;
    state.currentLevelIndex = levelIndex;
    state.unlocked[level.id] = true;
    saveProgress();
    show("game");
    draw();
  }

  function getLaunchLevelIndexFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("level");
    if (!raw) return null;
    const number = Number.parseInt(raw, 10);
    if (!Number.isInteger(number)) return null;
    return clamp(number - 1, 0, levels.length - 1);
  }

  function startDailyLevel(date = new Date()) {
    if (!dailyApi) {
      showToast("Уровень дня пока недоступен");
      return;
    }
    clearWinTimers();
    clearHint();
    activeMode = "daily";
    activeDailyDateKey = dailyApi.getDateKey(date);
    usedUndoInRun = false;
    animation = null;
    isAnimating = false;
    winFx = null;
    els.winModal.hidden = true;
    els.failModal.hidden = true;
    level = dailyApi.getDailyLevel(activeDailyDateKey);
    vehicles = level.vehicles.map(cloneVehicle);
    actors = (level.actors || []).map(cloneActor);
    initializeActors();
    moves = 0;
    moveHistory = [];
    selected = null;
    saveProgress();
    show("game");
    draw();
  }

  function restartLevel() {
    if (isAnimating) return;
    playSound("button");
    if (activeMode === "daily") startDailyLevel(activeDailyDateKey || new Date());
    else startLevel(levelIndex);
  }

  function initializeActors() {
    actors.forEach((actor) => {
      if (isWanderingActor(actor)) initializeWanderingActor(actor);
    });
  }

  function isWanderingActor(actor) {
    return actor.mode === "wander";
  }

  function initializeWanderingActor(actor) {
    const spawn = chooseRandomActorSpawn(actor);
    if (spawn) {
      actor.x = spawn.x;
      actor.y = spawn.y;
    }
    actor.mode = "wander";
    actor.stepIndex = 0;
    actor.direction = 1;
    actor.turnCounter = 0;
    actor.waitTurns = 0;
    actor.needsReroute = false;
    actor.finished = false;
    actor.inactive = false;
    assignRandomActorRoute(actor);
  }

  function chooseRandomActorSpawn(actor) {
    const cells = getFreeActorCells(actor).filter((point) => buildRandomActorRoute(actor, point));
    const innerCells = cells.filter((point) => !isBoardEdge(point));
    return randomItem(innerCells.length ? innerCells : cells);
  }

  function getFreeActorCells(actor) {
    const cells = [];
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        if (isActorRouteCellFree(actor, { x, y }, new Set())) cells.push({ x, y });
      }
    }
    return cells;
  }

  function assignRandomActorRoute(actor) {
    const path = buildRandomActorRoute(actor);
    if (!path) {
      actor.path = [{ x: actor.x, y: actor.y }];
      actor.stepIndex = 0;
      actor.needsReroute = true;
      return false;
    }

    actor.path = path;
    actor.stepIndex = 0;
    actor.direction = 1;
    actor.waitTurns = 0;
    actor.needsReroute = false;
    actor.finished = false;
    actor.inactive = false;
    return true;
  }

  function buildRandomActorRoute(actor, start = { x: actor.x, y: actor.y }) {
    const startKey = gridKey(start);
    const parents = new Map([[startKey, null]]);
    const points = new Map([[startKey, start]]);
    const queue = [start];

    while (queue.length) {
      const current = queue.shift();
      getActorNeighbors(current).forEach((point) => {
        const key = gridKey(point);
        if (parents.has(key)) return;
        if (!isActorRouteCellFree(actor, point, null)) return;
        parents.set(key, gridKey(current));
        points.set(key, point);
        queue.push(point);
      });
    }

    const edgeTargets = Array.from(points.entries())
      .filter(([key, point]) => key !== startKey && isBoardEdge(point))
      .map(([, point]) => point);
    const distantTargets = edgeTargets.filter((point) => manhattanDistance(start, point) >= 2);
    const target = randomItem(distantTargets.length ? distantTargets : edgeTargets);
    if (!target) return null;

    return reconstructActorPath(startKey, gridKey(target), parents, points);
  }

  function renderLevelSelect() {
    els.levelsGrid.innerHTML = "";
    const groups = packs.length
      ? packs.map((pack) => ({ pack, levels: levels.filter((item) => item.packId === pack.id) }))
      : [{ pack: null, levels }];

    groups.forEach((group) => {
      const section = document.createElement("section");
      section.className = "level-pack";

      if (group.pack) {
        const title = document.createElement("div");
        title.className = "level-pack-title";
        const completedCount = group.levels.filter((item) => state.completed[item.id]).length;
        const progress = Math.round((completedCount / group.levels.length) * 100);
        title.innerHTML = `
          <div>
            <strong>${group.pack.title}</strong>
            <span>${group.pack.subtitle}</span>
          </div>
          <div class="level-pack-progress" style="--pack-progress: ${progress}%">
            <b>${completedCount}/${group.levels.length}</b>
            <i><span></span></i>
          </div>
        `;
        section.appendChild(title);
      }

      const grid = document.createElement("div");
      grid.className = "level-pack-grid";
      group.levels.forEach((item) => {
        const index = levels.indexOf(item);
        grid.appendChild(createLevelButton(item, index));
      });
      section.appendChild(grid);
      els.levelsGrid.appendChild(section);
    });
  }

  function createLevelButton(item, index) {
      const button = document.createElement("button");
      const unlocked = state.unlocked[item.id] || index === 0;
      button.className = "level-button";
      if (!unlocked) button.classList.add("locked");
      if (state.completed[item.id]) button.classList.add("done");
      if (index === state.currentLevelIndex) button.classList.add("current");
      const completion = state.completed[item.id];
      const marker = completion ? `${"★".repeat(completion.stars)}${"☆".repeat(3 - completion.stars)}` : `сл.${item.difficulty || 1}`;
      button.innerHTML = unlocked
        ? `<span class="level-number">${index + 1}</span><small>${marker}</small>`
        : `<span class="level-number">${index + 1}</span><small>закр.</small>`;
      button.title = completion
        ? `${item.title}: ${completion.stars} зв., лучший результат ${completion.bestMoves} ходов`
        : unlocked
          ? `${item.title}: сложность ${item.difficulty}/10`
          : "Закрыто";
      button.disabled = !unlocked;
      button.addEventListener("click", () => {
        playSound("button");
        startLevel(index);
      });
      return button;
  }

  function renderGarage() {
    els.garageGrid.innerHTML = "";
    const ownedCount = skins.filter((skin) => state.garage.ownedSkins[skin.id]).length;
    const equipped = getEquippedSkin();
    if (els.garageSummary) {
      const progress = Math.round((ownedCount / skins.length) * 100);
      els.garageSummary.innerHTML = `
        <div><strong>${ownedCount} / ${skins.length}</strong> скинов открыто · надето: <strong>${equipped.name}</strong></div>
        <div class="garage-meter" style="--garage-progress: ${progress}%"><span></span></div>
      `;
    }
    skins.forEach((skin) => {
      const owned = Boolean(state.garage.ownedSkins[skin.id]);
      const equipped = state.garage.equippedSkinId === skin.id;
      const canBuy = state.coins >= skin.price;
      const card = document.createElement("article");
      const skinStateClass = equipped ? " equipped owned" : owned ? " owned" : canBuy ? " can-buy" : " locked";
      card.className = `skin-card${skinStateClass}`;

      const preview = document.createElement("div");
      preview.className = `skin-preview skin-preview-${skin.pattern || "rally"}`;
      preview.style.setProperty("--skin-color", skin.color);
      preview.style.setProperty("--skin-accent", skin.accent || "#fff2a8");
      preview.style.setProperty("--skin-trim", skin.trim || "#2d1118");
      preview.innerHTML = `<span class="skin-preview-window"></span><span class="skin-preview-badge">${skin.badge || ""}</span>`;

      const meta = document.createElement("div");
      meta.className = "skin-meta";
      const title = document.createElement("div");
      title.className = "skin-title";
      title.innerHTML = `<strong>${skin.name}</strong><span>${skin.price ? `${skin.price} ₽` : "База"}</span>`;

      const button = document.createElement("button");
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
      button.addEventListener("click", () => buyOrEquipSkin(skin));

      meta.appendChild(title);
      meta.appendChild(button);
      card.appendChild(preview);
      card.appendChild(meta);
      els.garageGrid.appendChild(card);
    });
  }

  function buyOrEquipSkin(skin) {
    if (state.garage.ownedSkins[skin.id]) {
      state.garage.equippedSkinId = skin.id;
      saveProgress();
      playSound("button");
      showToast(`${skin.name}: надето`);
      renderGarage();
      draw();
      return;
    }
    if (state.coins < skin.price) {
      playSound("bump");
      showToast("Не хватает монет");
      return;
    }
    state.coins -= skin.price;
    state.garage.ownedSkins[skin.id] = true;
    state.garage.equippedSkinId = skin.id;
    saveProgress();
    playSound("coin");
    showToast(`${skin.name}: куплено`);
    updateHud();
    renderGarage();
    draw();
  }

  function renderMissions() {
    syncDailyMissions();
    els.missionsList.innerHTML = "";
    if (els.missionRefreshLabel) {
      els.missionRefreshLabel.innerHTML = `
        <span>Обновятся завтра по Москве</span>
        <div class="mission-refresh-stats">
          <strong>Серия ${state.daily.streak.current}</strong>
          <strong>Рекорд ${state.daily.streak.best}</strong>
        </div>
      `;
    }
    missionDefinitions.forEach((mission) => {
      const record = state.daily.missions[mission.id] || createMissionRecord();
      const progress = Math.min(mission.target, record.progress || 0);
      const ready = !record.claimed && progress >= mission.target;
      const card = document.createElement("article");
      card.className = `mission-card${record.claimed ? " claimed" : ready ? " ready" : ""}`;
      const percent = Math.round((progress / mission.target) * 100);
      const icon = mission.id === "daily_complete" ? "Д" : mission.id === "three_stars" ? "★" : "↶";
      card.innerHTML = `
        <div class="mission-icon" aria-hidden="true">${icon}</div>
        <div class="mission-meta">
          <div class="mission-title"><strong>${mission.title}</strong><span>+${mission.reward} ₽</span></div>
          <span class="label">${mission.text}</span>
          <div class="mission-progress"><span style="width: ${percent}%"></span></div>
          <button disabled>${record.claimed ? "Получено" : progress >= mission.target ? "Готово" : `${progress} / ${mission.target}`}</button>
        </div>
      `;
      els.missionsList.appendChild(card);
    });
  }

  function renderDailyWeek() {
    if (!els.dailyWeek) return;
    const today = getDailyDateKey();
    const days = [];
    for (let offset = -3; offset <= 3; offset += 1) {
      const dateKey = shiftDateKey(today, offset);
      const completion = getValidDailyCompletion(dateKey);
      days.push({ dateKey, completion, isToday: offset === 0, isFuture: offset > 0 });
    }
    els.dailyWeek.innerHTML = "";
    days.forEach((day) => {
      const item = document.createElement("div");
      item.className = `daily-day${day.completion ? " done" : ""}${day.isToday ? " today" : ""}${day.isFuture ? " future" : ""}`;
      const dateLabel = formatShortDate(day.dateKey);
      const status = day.completion ? "★".repeat(day.completion.stars) : day.isFuture ? "..." : "—";
      const caption = day.isToday ? "сегодня" : day.completion ? "готово" : day.isFuture ? "скоро" : "мимо";
      item.innerHTML = `<span class="daily-date">${dateLabel}</span><strong>${status}</strong><span class="daily-caption">${caption}</span>`;
      els.dailyWeek.appendChild(item);
    });
  }

  function resizeCanvas() {
    const rect = els.canvas.getBoundingClientRect();
    const size = Math.floor(rect.width * window.devicePixelRatio);
    const gridSize = level ? level.width : 6;
    els.canvas.width = size;
    els.canvas.height = size;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    boardPad = gridSize > 10 ? 12 : gridSize > 8 ? 16 : 22;
    cellSize = (rect.width - boardPad * 2) / gridSize;
    draw();
  }

  function boardToScreen(x, y) {
    return {
      x: boardPad + x * cellSize,
      y: boardPad + y * cellSize
    };
  }

  function pointerToCell(event) {
    const rect = els.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - boardPad) / cellSize,
      y: (event.clientY - rect.top - boardPad) / cellSize
    };
  }

  function vehicleAtCell(x, y) {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    return vehicles.find((vehicle) => vehicleOccupies(vehicle, cx, cy));
  }

  function vehicleOccupies(vehicle, cellX, cellY) {
    for (let i = 0; i < vehicle.length; i += 1) {
      const x = vehicle.x + (vehicle.axis === "horizontal" ? i : 0);
      const y = vehicle.y + (vehicle.axis === "vertical" ? i : 0);
      if (x === cellX && y === cellY) return true;
    }
    return false;
  }

  function vehicleAtGridCell(cellX, cellY, ignoreVehicleId) {
    return vehicles.find((vehicle) => vehicle.id !== ignoreVehicleId && vehicleOccupies(vehicle, cellX, cellY));
  }

  function actorAtGridCell(cellX, cellY, ignoreActorId) {
    return actors.find((actor) => !actor.inactive && actor.id !== ignoreActorId && actor.x === cellX && actor.y === cellY);
  }

  function obstacleAtGridCell(cellX, cellY) {
    return level.obstacles.find((obstacle) => obstacle.x === cellX && obstacle.y === cellY);
  }

  function isActorRouteCellFree(actor, point, visited) {
    if (!point || point.x < 0 || point.y < 0 || point.x >= level.width || point.y >= level.height) return false;
    if (visited && visited.has(`${point.x},${point.y}`)) return false;
    if (obstacleAtGridCell(point.x, point.y)) return false;
    if (vehicleAtGridCell(point.x, point.y)) return false;
    if (actorAtGridCell(point.x, point.y, actor.id)) return false;
    return true;
  }

  function buildOccupied(ignoreVehicleId) {
    const occupied = new Set();
    level.obstacles.forEach((obstacle) => occupied.add(`${obstacle.x},${obstacle.y}`));
    vehicles.forEach((vehicle) => {
      if (vehicle.id === ignoreVehicleId) return;
      for (let i = 0; i < vehicle.length; i += 1) {
        const x = vehicle.x + (vehicle.axis === "horizontal" ? i : 0);
        const y = vehicle.y + (vehicle.axis === "vertical" ? i : 0);
        occupied.add(`${x},${y}`);
      }
    });
    actors.forEach((actor) => {
      if (actor.inactive) return;
      occupied.add(`${actor.x},${actor.y}`);
    });
    return occupied;
  }

  function getAllowedRange(vehicle) {
    const occupied = buildOccupied(vehicle.id);
    let min = 0;
    let max = 0;

    for (let delta = -1; delta > -level.width; delta -= 1) {
      if (canPlace(vehicle, delta, occupied)) min = delta;
      else break;
    }

    for (let delta = 1; delta < level.width; delta += 1) {
      if (canPlace(vehicle, delta, occupied)) max = delta;
      else break;
    }

    return { min, max };
  }

  function canPlace(vehicle, delta, occupied) {
    for (let i = 0; i < vehicle.length; i += 1) {
      const x = vehicle.x + (vehicle.axis === "horizontal" ? i + delta : 0);
      const y = vehicle.y + (vehicle.axis === "vertical" ? i + delta : 0);

      if (x < 0 || y < 0 || x >= level.width || y >= level.height) return false;
      if (occupied.has(`${x},${y}`)) return false;
    }
    return true;
  }

  function applyMove(vehicle, delta) {
    if (!delta || isAnimating) return;
    clearHint();
    const fromX = vehicle.x;
    const fromY = vehicle.y;
    const toX = vehicle.x + (vehicle.axis === "horizontal" ? delta : 0);
    const toY = vehicle.y + (vehicle.axis === "vertical" ? delta : 0);

    moveHistory.push({
      vehicles: vehicles.map(cloneVehicle),
      actors: actors.map(cloneActor)
    });
    playSound("move");
    startVehicleAnimation({
      type: "move",
      vehicleId: vehicle.id,
      fromX,
      fromY,
      toX,
      toY,
      duration: moveDuration,
      onComplete: () => {
        vehicle.x = toX;
        vehicle.y = toY;
        moves += 1;
        updateHud();
        if (isWin()) startWinSequence(vehicle);
        else advanceActors(() => {
          if (isWin()) startWinSequence(vehicle);
          else if (isOutOfMoves()) startFailSequence();
          else draw();
        });
      }
    });
  }

  function startBump(vehicle, sign) {
    if (!vehicle || !sign || isAnimating) return;
    clearHint();
    playSound("bump");
    startVehicleAnimation({
      type: "bump",
      vehicleId: vehicle.id,
      fromX: vehicle.x,
      fromY: vehicle.y,
      toX: vehicle.x,
      toY: vehicle.y,
      axis: vehicle.axis,
      sign,
      duration: bumpDuration,
      onComplete: draw
    });
  }

  function advanceActors(onComplete) {
    const actorMoves = [];
    if (!actors.length) {
      onComplete();
      return;
    }

    actors.forEach((actor) => {
      if (actor.inactive) return;
      const reserved = new Set(actorMoves.map((move) => `${move.toX},${move.toY}`));
      if (!isActorReadyForTurn(actor)) return;

      if (actor.waitTurns > 0) {
        actor.waitTurns -= 1;
        if (actor.waitTurns > 0) return;
        if (actor.needsReroute) {
          const oldStep = getNextActorStep(actor);
          const oldRouteIsOpen =
            oldStep && isActorDestinationFree(actor, oldStep.point) && !reserved.has(`${oldStep.point.x},${oldStep.point.y}`);
          if (oldRouteIsOpen) actor.needsReroute = false;
          else if (!assignRandomActorRoute(actor)) return;
        }
      }

      if (isWanderingActor(actor) && (actor.needsReroute || !getNextActorStep(actor))) {
        assignRandomActorRoute(actor);
      }

      const nextStep = getNextActorStep(actor);
      if (!nextStep) return;
      if (!isActorDestinationFree(actor, nextStep.point)) {
        markActorBlocked(actor);
        return;
      }
      if (reserved.has(`${nextStep.point.x},${nextStep.point.y}`)) {
        markActorBlocked(actor);
        return;
      }
      actorMoves.push({
        actorId: actor.id,
        fromX: actor.x,
        fromY: actor.y,
        toX: nextStep.point.x,
        toY: nextStep.point.y,
        nextStepIndex: nextStep.index,
        nextDirection: nextStep.direction
      });
    });

    if (!actorMoves.length) {
      onComplete();
      return;
    }

    playSound("actor");
    startVehicleAnimation({
      type: "actors",
      actorMoves,
      duration: actorMoveDuration,
      onComplete: () => {
        actorMoves.forEach((move) => {
          const actor = actors.find((item) => item.id === move.actorId);
          if (!actor) return;
          actor.x = move.toX;
          actor.y = move.toY;
          actor.stepIndex = move.nextStepIndex;
          actor.direction = move.nextDirection;
          if (isWanderingActor(actor) && actor.stepIndex >= actor.path.length - 1) {
            deactivateActor(actor);
          } else {
            actor.finished = actor.mode === "route" && actor.stepIndex >= actor.path.length - 1;
          }
        });
        onComplete();
      }
    });
  }

  function isActorReadyForTurn(actor) {
    if (actor.inactive) return false;
    if (actor.finished && !isWanderingActor(actor)) return false;
    actor.turnCounter = (actor.turnCounter || 0) + 1;
    const startDelay = Math.max(0, actor.startDelay || 0);
    const moveEvery = Math.max(1, actor.moveEvery || 1);
    if (actor.turnCounter <= startDelay) return false;
    return (actor.turnCounter - startDelay) % moveEvery === 0;
  }

  function markActorBlocked(actor) {
    if (!isWanderingActor(actor)) return;
    actor.waitTurns = 1;
    actor.needsReroute = true;
    actor.finished = false;
  }

  function deactivateActor(actor) {
    actor.inactive = true;
    actor.finished = true;
    actor.waitTurns = 0;
    actor.needsReroute = false;
    actor.path = [];
  }

  function getNextActorStep(actor) {
    if (!actor.path || actor.path.length < 2) return null;
    const currentIndex = Number.isInteger(actor.stepIndex) ? actor.stepIndex : findActorPathIndex(actor);
    const direction = actor.direction || 1;

    if (actor.mode === "route" || actor.mode === "wander") {
      const index = currentIndex + 1;
      if (index >= actor.path.length) return null;
      return { point: actor.path[index], index, direction: 1 };
    }

    if (actor.mode === "loop") {
      const index = (currentIndex + 1) % actor.path.length;
      return { point: actor.path[index], index, direction: 1 };
    }

    let nextIndex = currentIndex + direction;
    let nextDirection = direction;
    if (nextIndex < 0 || nextIndex >= actor.path.length) {
      nextDirection = -direction;
      nextIndex = currentIndex + nextDirection;
    }

    if (nextIndex < 0 || nextIndex >= actor.path.length) return null;
    return { point: actor.path[nextIndex], index: nextIndex, direction: nextDirection };
  }

  function findActorPathIndex(actor) {
    const index = (actor.path || []).findIndex((point) => point.x === actor.x && point.y === actor.y);
    return index >= 0 ? index : 0;
  }

  function isActorDestinationFree(actor, point) {
    if (!point || point.x < 0 || point.y < 0 || point.x >= level.width || point.y >= level.height) return false;
    if (obstacleAtGridCell(point.x, point.y)) return false;
    if (vehicleAtGridCell(point.x, point.y)) return false;
    if (actorAtGridCell(point.x, point.y, actor.id)) return false;
    return true;
  }

  function isWin() {
    const target = vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
    if (!target || target.axis !== "horizontal") return false;
    return level.exit.side === "right" && target.y === level.exit.row && target.x + target.length >= level.width;
  }

  function startWinSequence(target) {
    const fromX = target.x;
    const fromY = target.y;
    playSound("win");
    winFx = { start: performance.now(), duration: 900 };
    startVehicleAnimation({
      type: "win",
      vehicleId: target.id,
      fromX,
      fromY,
      toX: level.width + 0.35,
      toY: fromY,
      duration: winDriveDuration,
      onComplete: completeLevel
    });
  }

  function calculateStars() {
    if (moves <= level.targetMoves.threeStars) return 3;
    if (moves <= level.targetMoves.twoStars) return 2;
    return 1;
  }

  function completeLevel() {
    const stars = calculateStars();
    if (activeMode === "daily") completeDailyLevel(stars);
    else completeCampaignLevel(stars);
  }

  function completeCampaignLevel(stars) {
    const reward = stars === 3 ? 25 : stars === 2 ? 15 : 10;
    const missionReward = awardMissionsForCompletion(stars, false);
    const totalReward = reward + missionReward;
    lastReward = reward;

    const previous = state.completed[level.id];
    if (!previous || stars > previous.stars) {
      state.completed[level.id] = { stars, bestMoves: moves };
    }

    const next = levels[levelIndex + 1];
    if (next) state.unlocked[next.id] = true;
    state.coins += reward;
    state.ad.completedLevels += 1;
    state.ad.levelsSinceInterstitial += 1;
    saveProgress();

    els.winTitle.textContent = `${level.title}`;
    els.starsLabel.textContent = "☆☆☆";
    els.rewardLabel.textContent = missionReward ? `+${totalReward} монет · миссии включены` : `+${reward} монет`;
    els.rewardLabel.classList.remove("reward-pop");
    els.doubleRewardButton.hidden = false;
    els.nextLevelButton.textContent = "Следующий";
    els.winModal.hidden = false;
    updateHud();
    revealStars(stars);
    if (missionReward) showToast(`Миссии: +${missionReward} монет`);
  }

  function completeDailyLevel(stars) {
    const dateKey = activeDailyDateKey || getDailyDateKey();
    let completion = state.daily.completions[dateKey];
    if (!completion || completion.seed !== level.seed) {
      completion = {
        stars: 0,
        bestMoves: 0,
        rewardClaimed: false,
        perfectClaimed: false,
        seed: level.seed
      };
    }
    const baseReward = completion.rewardClaimed ? 0 : 50;
    const perfectReward = stars === 3 && !completion.perfectClaimed ? 25 : 0;
    const streakReward = completion.rewardClaimed ? 0 : updateDailyStreak(dateKey);
    const missionReward = awardMissionsForCompletion(stars, true);
    const totalReward = baseReward + perfectReward + streakReward + missionReward;

    completion.stars = Math.max(completion.stars || 0, stars);
    completion.bestMoves = completion.bestMoves ? Math.min(completion.bestMoves, moves) : moves;
    completion.seed = level.seed;
    if (baseReward) completion.rewardClaimed = true;
    if (perfectReward) completion.perfectClaimed = true;
    state.daily.completions[dateKey] = completion;
    state.coins += baseReward + perfectReward + streakReward;
    saveProgress();

    lastReward = 0;
    els.winTitle.textContent = `${level.title}`;
    els.starsLabel.textContent = "☆☆☆";
    els.rewardLabel.textContent = totalReward
      ? `+${totalReward} монет за сегодня${streakReward ? ` · серия +${streakReward}` : ""}`
      : "Награда дня уже получена";
    els.rewardLabel.classList.remove("reward-pop");
    els.doubleRewardButton.hidden = true;
    els.nextLevelButton.textContent = "В меню";
    els.winModal.hidden = false;
    updateHud();
    revealStars(stars);
    if (totalReward) showToast(`Уровень дня: +${totalReward} монет`);
  }

  function revealStars(stars) {
    clearWinTimers();
    for (let i = 1; i <= stars; i += 1) {
      winTimers.push(
        setTimeout(() => {
          els.starsLabel.textContent = "★".repeat(i) + "☆".repeat(3 - i);
          playSound("star");
        }, 140 * i)
      );
    }
    winTimers.push(
      setTimeout(() => {
        els.rewardLabel.classList.add("reward-pop");
        playSound("coin");
      }, 560)
    );
  }

  function startFailSequence() {
    clearHint();
    playSound("bump");
    els.failText.textContent =
      activeMode === "daily"
        ? `Лимит ${getMoveLimit()} ходов исчерпан. Сегодняшний двор можно попробовать еще раз.`
        : `Лимит ${getMoveLimit()} ходов исчерпан. Двор начнется заново.`;
    els.failModal.hidden = false;
    draw();
  }

  function undo() {
    if (isAnimating) return;
    const previous = moveHistory.pop();
    if (!previous) {
      playSound("bump");
      return;
    }
    clearHint();
    usedUndoInRun = true;
    playSound("button");
    if (Array.isArray(previous)) {
      vehicles = previous.map(cloneVehicle);
      actors = (level.actors || []).map(cloneActor);
    } else {
      vehicles = previous.vehicles.map(cloneVehicle);
      actors = (previous.actors || []).map(cloneActor);
    }
    moves = Math.max(0, moves - 1);
    updateHud();
    draw();
  }

  function useHint() {
    if (isAnimating) return;
    playSound("button");
    if (state.hints > 0) {
      state.hints -= 1;
      saveProgress();
      updateHud();
      flashHint();
      return;
    }
    showRewarded("Подсказка", "Рекламное видео в Яндекс Играх покажет следующий правильный ход.", () => {
      state.hints += 1;
      saveProgress();
      updateHud();
      flashHint();
    });
  }

  function flashHint() {
    const hint = findHint();
    activeHint = {
      ...hint,
      until: performance.now() + (hint.kind === "smart" ? smartHintDuration : hintDuration)
    };
    playSound("hint");
    if (activeHint.message) showToast(activeHint.message);
    draw();
    pulseHint();
  }

  function pulseHint() {
    if (!activeHint) return;
    if (performance.now() > activeHint.until) {
      clearHint();
      draw();
      return;
    }
    draw();
    hintFrame = requestAnimationFrame(pulseHint);
  }

  function findHint() {
    const smartHint = findSmartHint();
    if (smartHint) return smartHint;
    return findLineHint();
  }

  function findSmartHint() {
    if (!level || activeMode !== "campaign" || actors.length || level.width > 6 || level.height > 6) return null;
    const result = solveSmartHint();
    if (!result || !result.move) return null;
    const vehicle = vehicles.find((item) => item.id === result.move.id);
    if (!vehicle) return null;
    const delta = result.move.delta;
    const targetX = vehicle.x + (vehicle.axis === "horizontal" ? delta : 0);
    const targetY = vehicle.y + (vehicle.axis === "vertical" ? delta : 0);
    return {
      kind: "smart",
      vehicleId: vehicle.id,
      delta,
      targetX,
      targetY,
      direction: { axis: vehicle.axis, sign: Math.sign(delta) },
      message: `Подсказка: сдвинь эту машину ${getDirectionText(vehicle, delta)} на ${Math.abs(delta)}`
    };
  }

  function solveSmartHint() {
    const targetIndex = vehicles.findIndex((vehicle) => vehicle.id === level.targetVehicleId);
    if (targetIndex < 0) return null;

    const startState = vehicles.map((vehicle) => ({ x: vehicle.x, y: vehicle.y }));
    const startKey = encodeHintState(startState);
    if (isHintSolved(startState, targetIndex)) return null;

    const queue = [startState];
    const seen = new Set([startKey]);
    const parents = new Map();
    const maxStates = 180000;

    for (let head = 0; head < queue.length; head += 1) {
      const state = queue[head];
      const stateKey = encodeHintState(state);

      for (let index = 0; index < vehicles.length; index += 1) {
        const vehicle = vehicles[index];
        const position = state[index];
        const occupied = buildHintOccupied(state, index);

        for (const sign of [-1, 1]) {
          for (let delta = sign; Math.abs(delta) < level.width; delta += sign) {
            if (!canHintTravel(vehicle, position, delta, occupied)) break;
            const next = state.map((point) => ({ ...point }));
            next[index] = {
              x: position.x + (vehicle.axis === "horizontal" ? delta : 0),
              y: position.y + (vehicle.axis === "vertical" ? delta : 0)
            };
            const nextKey = encodeHintState(next);
            if (seen.has(nextKey)) continue;
            seen.add(nextKey);
            parents.set(nextKey, { previous: stateKey, move: { id: vehicle.id, delta } });
            if (isHintSolved(next, targetIndex)) {
              return { move: getFirstHintMove(parents, startKey, nextKey), states: seen.size };
            }
            if (seen.size > maxStates) return null;
            queue.push(next);
          }
        }
      }
    }

    return null;
  }

  function getFirstHintMove(parents, startKey, goalKey) {
    let key = goalKey;
    let move = null;
    while (key !== startKey) {
      const record = parents.get(key);
      if (!record) return move;
      move = record.move;
      key = record.previous;
    }
    return move;
  }

  function encodeHintState(state) {
    return state.map((point) => `${point.x},${point.y}`).join("|");
  }

  function isHintSolved(state, targetIndex) {
    const target = vehicles[targetIndex];
    const position = state[targetIndex];
    return target && target.axis === "horizontal" && position.y === level.exit.row && position.x + target.length >= level.width;
  }

  function buildHintOccupied(state, skipIndex) {
    const occupied = new Set(level.obstacles.map((obstacle) => `${obstacle.x},${obstacle.y}`));
    vehicles.forEach((vehicle, index) => {
      if (index === skipIndex) return;
      const position = state[index];
      for (let i = 0; i < vehicle.length; i += 1) {
        const x = position.x + (vehicle.axis === "horizontal" ? i : 0);
        const y = position.y + (vehicle.axis === "vertical" ? i : 0);
        occupied.add(`${x},${y}`);
      }
    });
    return occupied;
  }

  function canHintTravel(vehicle, position, delta, occupied) {
    const direction = Math.sign(delta);
    for (let step = direction; Math.abs(step) <= Math.abs(delta); step += direction) {
      for (let i = 0; i < vehicle.length; i += 1) {
        const x = position.x + (vehicle.axis === "horizontal" ? i + step : 0);
        const y = position.y + (vehicle.axis === "vertical" ? i + step : 0);
        if (x < 0 || y < 0 || x >= level.width || y >= level.height) return false;
        if (occupied.has(`${x},${y}`)) return false;
      }
    }
    return true;
  }

  function getDirectionText(vehicle, delta) {
    if (vehicle.axis === "horizontal") return delta > 0 ? "вправо" : "влево";
    return delta > 0 ? "вниз" : "вверх";
  }

  function findLineHint() {
    const target = vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
    if (!target || target.axis !== "horizontal" || target.y !== level.exit.row) {
      return { kind: "target", vehicleId: level.targetVehicleId, lineOnly: true };
    }

    const startX = target.x + target.length;
    for (let x = startX; x < level.width; x += 1) {
      const blocker = vehicleAtGridCell(x, target.y, target.id);
      if (blocker) {
        return {
          kind: "blocker",
          vehicleId: blocker.id,
          line: { fromX: startX, toX: x + 1, y: target.y },
          direction: chooseHintDirection(blocker)
        };
      }

      const actor = actorAtGridCell(x, target.y);
      if (actor) {
        return {
          kind: "actor",
          actorId: actor.id,
          line: { fromX: startX, toX: x + 1, y: target.y },
          actorStep: getNextActorStep(actor)
        };
      }

      const obstacle = obstacleAtGridCell(x, target.y);
      if (obstacle) {
        return {
          kind: "line",
          line: { fromX: startX, toX: x + 1, y: target.y },
          obstacleId: obstacle.id
        };
      }
    }

    return {
      kind: "target",
      vehicleId: target.id,
      line: { fromX: startX, toX: level.width, y: target.y },
      direction: { axis: "horizontal", sign: 1 }
    };
  }

  function chooseHintDirection(vehicle) {
    const range = getAllowedRange(vehicle);
    if (vehicle.axis === "vertical") {
      if (range.min < 0) return { axis: "vertical", sign: -1 };
      if (range.max > 0) return { axis: "vertical", sign: 1 };
    } else {
      if (range.min < 0) return { axis: "horizontal", sign: -1 };
      if (range.max > 0) return { axis: "horizontal", sign: 1 };
    }
    return null;
  }

  function skipLevel() {
    if (isAnimating) return;
    if (activeMode === "daily") {
      playSound("bump");
      showToast("Уровень дня нельзя пропустить");
      return;
    }
    playSound("button");
    showRewarded("Пропуск уровня", "После рекламного видео следующий двор откроется сразу.", () => {
      const next = levels[levelIndex + 1];
      if (next) {
        state.unlocked[next.id] = true;
        state.currentLevelIndex = levelIndex + 1;
        saveProgress();
        startLevel(levelIndex + 1);
      }
    });
  }

  function showRewarded(title, text, callback) {
    showAd({
      title,
      text,
      buttonText: "Получить награду",
      onClose: callback
    });
  }

  function showInterstitial(callback) {
    showAd({
      title: "Рекламная пауза",
      text: "Полноэкранная пауза появится здесь между уровнями после подключения Yandex Games SDK.",
      buttonText: "Продолжить",
      onClose: callback
    });
  }

  function showAd({ title, text, buttonText, onClose }) {
    pendingAdClose = onClose;
    els.adTitle.textContent = title;
    els.adText.textContent = text;
    els.closeAdButton.textContent = buttonText;
    els.adModal.hidden = false;
    playSound("button");
  }

  function maybeShowInterstitial(callback) {
    if (state.ad.completedLevels >= 3 && state.ad.levelsSinceInterstitial >= 1) {
      state.ad.levelsSinceInterstitial = 0;
      saveProgress();
      showInterstitial(callback);
      return;
    }
    callback();
  }

  function nextLevel() {
    if (isAnimating) return;
    playSound("button");
    els.winModal.hidden = true;
    if (activeMode === "daily") {
      show("menu");
      return;
    }
    maybeShowInterstitial(() => {
      if (levelIndex + 1 < levels.length) startLevel(levelIndex + 1);
      else show("levels");
    });
  }

  function doubleReward() {
    if (isAnimating) return;
    if (activeMode === "daily") {
      playSound("bump");
      return;
    }
    playSound("button");
    els.winModal.hidden = true;
    showRewarded("Удвоить награду", "Рекламное видео удвоит монеты за этот уровень.", () => {
      state.coins += lastReward;
      saveProgress();
      updateHud();
      nextLevel();
    });
  }

  function startVehicleAnimation(config) {
    isAnimating = true;
    document.body.classList.add("is-animating");
    animation = { ...config, start: 0, progress: 0 };
    requestAnimationFrame(stepAnimation);
  }

  function stepAnimation(now) {
    if (!animation) return;
    if (!animation.start) animation.start = now;
    const raw = clamp((now - animation.start) / animation.duration, 0, 1);
    animation.progress = animation.type === "bump" ? raw : easeOutCubic(raw);
    draw();

    if (raw < 1) {
      requestAnimationFrame(stepAnimation);
      return;
    }

    const done = animation.onComplete;
    animation = null;
    isAnimating = false;
    document.body.classList.remove("is-animating");
    draw();
    if (done) done();
  }

  function getVehicleVisual(vehicle) {
    let x = vehicle.x;
    let y = vehicle.y;
    const isSelected = selected && selected.vehicleId === vehicle.id;

    if (isSelected) {
      x += vehicle.axis === "horizontal" ? selected.previewDelta : 0;
      y += vehicle.axis === "vertical" ? selected.previewDelta : 0;
    }

    if (animation && animation.vehicleId === vehicle.id) {
      if (animation.type === "bump") {
        const offset = Math.sin(animation.progress * Math.PI) * 0.14 * animation.sign;
        x += animation.axis === "horizontal" ? offset : 0;
        y += animation.axis === "vertical" ? offset : 0;
      } else {
        x = lerp(animation.fromX, animation.toX, animation.progress);
        y = lerp(animation.fromY, animation.toY, animation.progress);
      }
    }

    return { x, y, isSelected };
  }

  function getActorVisual(actor) {
    let x = actor.x;
    let y = actor.y;

    if (animation && animation.type === "actors") {
      const move = animation.actorMoves.find((item) => item.actorId === actor.id);
      if (move) {
        x = lerp(move.fromX, move.toX, animation.progress);
        y = lerp(move.fromY, move.toY, animation.progress);
      }
    }

    return { x, y };
  }

  function draw() {
    if (!level) return;
    const rect = els.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    drawYard(width, height);
    drawActorRoutes();
    drawMoveGuide();
    drawHint();
    drawExit();
    level.obstacles.forEach(drawObstacle);
    vehicles.forEach(drawVehicle);
    actors.forEach(drawActor);
    drawWinFx();
    drawMoveLimitWarning(width, height);
  }

  function drawYard(width, height) {
    const boardWidth = level.width * cellSize;
    const boardHeight = level.height * cellSize;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#eef9ff");
    gradient.addColorStop(0.42, "#dbe8f1");
    gradient.addColorStop(1, "#c7d2dc");
    ctx.fillStyle = gradient;
    roundedRect(ctx, 0, 0, width, height, 8);
    ctx.fill();

    ctx.save();
    ctx.fillStyle = "#b7c4cf";
    ctx.fillRect(0, 0, width, boardPad * 0.72);
    ctx.fillRect(0, height - boardPad * 0.72, width, boardPad * 0.72);
    ctx.fillStyle = "#f5c84b";
    ctx.fillRect(boardPad - 5, boardPad - 7, boardWidth + 10, 5);
    ctx.fillRect(boardPad - 5, boardPad + boardHeight + 2, boardWidth + 10, 5);
    ctx.fillStyle = "#263343";
    ctx.globalAlpha = 0.22;
    ctx.fillRect(boardPad - 8, boardPad - 2, 5, boardHeight + 4);
    ctx.fillRect(boardPad + boardWidth + 3, boardPad - 2, 5, boardHeight + 4);
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.save();
    ctx.translate(boardPad, boardPad);

    const asphalt = ctx.createLinearGradient(0, 0, boardWidth, boardHeight);
    asphalt.addColorStop(0, "#5d6876");
    asphalt.addColorStop(0.46, "#46515f");
    asphalt.addColorStop(1, "#303a47");
    ctx.fillStyle = asphalt;
    roundedRect(ctx, 0, 0, boardWidth, boardHeight, 7);
    ctx.fill();

    const exitLaneY = level.exit.row * cellSize;
    ctx.fillStyle = "rgba(25, 191, 130, 0.11)";
    ctx.fillRect(cellSize * 0.08, exitLaneY + cellSize * 0.2, boardWidth - cellSize * 0.08, cellSize * 0.6);

    const lineWidth = Math.max(1, Math.min(2, cellSize * 0.04));
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.025)";
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }

        ctx.strokeStyle = "rgba(255, 216, 90, 0.25)";
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x * cellSize + cellSize * 0.18, y * cellSize + cellSize * 0.16);
        ctx.lineTo(x * cellSize + cellSize * 0.82, y * cellSize + cellSize * 0.16);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = "rgba(255,255,255,0.11)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= level.width; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, boardHeight);
      ctx.stroke();
    }
    for (let i = 0; i <= level.height; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(boardWidth, i * cellSize);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.lineWidth = Math.max(1, cellSize * 0.035);
    ctx.setLineDash([cellSize * 0.26, cellSize * 0.2]);
    for (let row = 1; row < level.height; row += 2) {
      ctx.beginPath();
      ctx.moveTo(cellSize * 0.18, row * cellSize + cellSize * 0.5);
      ctx.lineTo(boardWidth - cellSize * 0.18, row * cellSize + cellSize * 0.5);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(255,255,255,0.1)";
    const specks = Math.min(56, 20 + level.width * level.height * 0.24);
    for (let i = 0; i < specks; i += 1) {
      const x = ((i * 37) % 100) / 100 * boardWidth;
      const y = ((i * 53) % 100) / 100 * boardHeight;
      const size = i % 5 === 0 ? 3 : 2;
      ctx.fillRect(x, y, size, size);
    }

    ctx.strokeStyle = "rgba(255, 200, 61, 0.78)";
    ctx.lineWidth = Math.max(2, cellSize * 0.05);
    roundedRect(ctx, 1, 1, boardWidth - 2, boardHeight - 2, 7);
    ctx.stroke();

    ctx.restore();
  }

  function drawActorRoutes() {
    actors.forEach((actor) => {
      if (actor.inactive || !actor.path || actor.path.length < 2) return;
      const nextStep = getNextActorStep(actor);
      const visiblePath = actor.path.slice(Math.max(0, actor.stepIndex));
      const exitPoint = getActorRouteExitPoint(actor);
      const routeBlocked = actor.waitTurns > 0 || actor.needsReroute;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = routeBlocked ? "rgba(239, 64, 86, 0.18)" : "rgba(25, 191, 130, 0.18)";
      ctx.lineWidth = 10;
      ctx.beginPath();
      visiblePath.forEach((point, index) => {
        const pos = boardToScreen(point.x + 0.5, point.y + 0.5);
        if (index === 0) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
      });
      if (exitPoint) ctx.lineTo(exitPoint.x, exitPoint.y);
      ctx.stroke();

      ctx.strokeStyle = routeBlocked ? "rgba(239, 64, 86, 0.72)" : "rgba(25, 191, 130, 0.78)";
      ctx.fillStyle = routeBlocked ? "rgba(239, 64, 86, 0.95)" : "rgba(255, 200, 61, 0.96)";
      ctx.lineWidth = 4;
      ctx.setLineDash([6, 7]);
      ctx.beginPath();
      visiblePath.forEach((point, index) => {
        const pos = boardToScreen(point.x + 0.5, point.y + 0.5);
        if (index === 0) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
      });
      if (exitPoint) ctx.lineTo(exitPoint.x, exitPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);

      visiblePath.forEach((point, index) => {
        if (index % 2 !== 0 && index !== visiblePath.length - 1) return;
        const pos = boardToScreen(point.x + 0.5, point.y + 0.5);
        ctx.globalAlpha = index === 0 ? 0.9 : 0.55;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, index === 0 ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      if (nextStep) {
        const isFinalStep = nextStep.index === actor.path.length - 1;
        const pos = isFinalStep && exitPoint ? exitPoint : boardToScreen(nextStep.point.x + 0.5, nextStep.point.y + 0.5);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function getActorRouteExitPoint(actor) {
    const target = actor.path && actor.path[actor.path.length - 1];
    if (!target || !isBoardEdge(target)) return null;
    if (target.x === 0) return boardToScreen(0, target.y + 0.5);
    if (target.x === level.width - 1) return boardToScreen(level.width, target.y + 0.5);
    if (target.y === 0) return boardToScreen(target.x + 0.5, 0);
    if (target.y === level.height - 1) return boardToScreen(target.x + 0.5, level.height);
    return null;
  }

  function drawMoveGuide() {
    if (!selected || !level) return;
    const vehicle = vehicles.find((item) => item.id === selected.vehicleId);
    if (!vehicle) return;

    const from = selected.range.min;
    const to = selected.range.max;
    ctx.save();
    ctx.fillStyle = "rgba(255, 200, 61, 0.2)";
    ctx.strokeStyle = "rgba(255, 138, 31, 0.72)";
    ctx.lineWidth = 2;

    const x = vehicle.axis === "horizontal" ? vehicle.x + from : vehicle.x;
    const y = vehicle.axis === "vertical" ? vehicle.y + from : vehicle.y;
    const width = vehicle.axis === "horizontal" ? (vehicle.length + to - from) * cellSize : cellSize;
    const height = vehicle.axis === "vertical" ? (vehicle.length + to - from) * cellSize : cellSize;
    const pos = boardToScreen(x, y);
    roundedRect(ctx, pos.x + 5, pos.y + 5, width - 10, height - 10, 12);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  function drawHint() {
    if (!activeHint) return;
    const now = performance.now();
    if (now > activeHint.until) {
      activeHint = null;
      return;
    }

    const pulse = 0.5 + Math.sin(now / 95) * 0.5;
    if (activeHint.kind === "smart") drawSmartHintMove(activeHint, pulse);
    if (activeHint.line) drawHintLine(activeHint.line, pulse);
    if (activeHint.lineOnly) {
      const target = vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
      if (target) {
        drawHintLine({ fromX: target.x + target.length, toX: level.width, y: target.y }, pulse);
      }
    }

    if (activeHint.vehicleId) {
      const vehicle = vehicles.find((item) => item.id === activeHint.vehicleId);
      if (vehicle) {
        const visual = getVehicleVisual(vehicle);
        const pos = boardToScreen(visual.x, visual.y);
        const width = vehicle.axis === "horizontal" ? vehicle.length * cellSize : cellSize;
        const height = vehicle.axis === "vertical" ? vehicle.length * cellSize : cellSize;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 204, 77, ${0.55 + pulse * 0.35})`;
        ctx.lineWidth = 4;
        roundedRect(ctx, pos.x + 4, pos.y + 4, width - 8, height - 8, 12);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (activeHint.actorId) {
      const actor = actors.find((item) => item.id === activeHint.actorId);
      if (actor && !actor.inactive) {
        drawActorPath(actor, pulse);
        const visual = getActorVisual(actor);
        const pos = boardToScreen(visual.x, visual.y);
        ctx.save();
        ctx.strokeStyle = `rgba(255, 204, 77, ${0.62 + pulse * 0.32})`;
        ctx.lineWidth = 4;
        roundedRect(ctx, pos.x + cellSize * 0.14, pos.y + cellSize * 0.14, cellSize * 0.72, cellSize * 0.72, 14);
        ctx.stroke();
        ctx.restore();
        if (activeHint.actorStep) drawActorStepDot(actor, activeHint.actorStep.point, pulse);
      }
    }
  }

  function drawSmartHintMove(hint, pulse) {
    const vehicle = vehicles.find((item) => item.id === hint.vehicleId);
    if (!vehicle) return;
    const width = vehicle.axis === "horizontal" ? vehicle.length * cellSize : cellSize;
    const height = vehicle.axis === "vertical" ? vehicle.length * cellSize : cellSize;
    const from = boardToScreen(vehicle.x, vehicle.y);
    const to = boardToScreen(hint.targetX, hint.targetY);
    const fromCenter = { x: from.x + width / 2, y: from.y + height / 2 };
    const toCenter = { x: to.x + width / 2, y: to.y + height / 2 };

    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(25, 191, 130, ${0.28 + pulse * 0.18})`;
    ctx.lineWidth = Math.max(8, cellSize * 0.22);
    ctx.beginPath();
    ctx.moveTo(fromCenter.x, fromCenter.y);
    ctx.lineTo(toCenter.x, toCenter.y);
    ctx.stroke();

    const pad = cellSize * 0.1;
    const color = getVehicleColor(vehicle);
    ctx.globalAlpha = 0.36 + pulse * 0.18;
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.86)";
    ctx.lineWidth = 3;
    roundedRect(ctx, to.x + pad, to.y + pad, width - pad * 2, height - pad * 2, vehicle.id === level.targetVehicleId ? 14 : 11);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = `rgba(255, 204, 77, ${0.5 + pulse * 0.35})`;
    ctx.lineWidth = 4;
    roundedRect(ctx, to.x + pad * 0.65, to.y + pad * 0.65, width - pad * 1.3, height - pad * 1.3, vehicle.id === level.targetVehicleId ? 16 : 13);
    ctx.stroke();
    ctx.restore();
  }

  function drawHintLine(line, pulse) {
    const x = boardPad + line.fromX * cellSize;
    const y = boardPad + line.y * cellSize + cellSize * 0.22;
    const width = Math.max(cellSize * 0.5, (line.toX - line.fromX) * cellSize);
    ctx.save();
    ctx.fillStyle = `rgba(25, 191, 130, ${0.18 + pulse * 0.14})`;
    roundedRect(ctx, x + 5, y, width - 10, cellSize * 0.56, 12);
    ctx.fill();
    ctx.restore();
  }

  function drawActorPath(actor, pulse) {
    if (actor.inactive || !actor.path || actor.path.length < 2) return;
    const exitPoint = getActorRouteExitPoint(actor);
    ctx.save();
    ctx.strokeStyle = `rgba(255, 138, 31, ${0.28 + pulse * 0.18})`;
    ctx.lineWidth = 5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    actor.path.forEach((point, index) => {
      const pos = boardToScreen(point.x + 0.5, point.y + 0.5);
      if (index === 0) ctx.moveTo(pos.x, pos.y);
      else ctx.lineTo(pos.x, pos.y);
    });
    if (exitPoint) ctx.lineTo(exitPoint.x, exitPoint.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawActorStepDot(actor, point, pulse) {
    const from = boardToScreen(actor.x + 0.5, actor.y + 0.5);
    const to = boardToScreen(point.x + 0.5, point.y + 0.5);
    const x = lerp(from.x, to.x, 0.55 + pulse * 0.2);
    const y = lerp(from.y, to.y, 0.55 + pulse * 0.2);
    ctx.save();
    ctx.fillStyle = "#ffcc4d";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawExit() {
    const y = boardPad + level.exit.row * cellSize;
    const pulse = animation && animation.type === "win" ? 0.4 + animation.progress * 0.6 : 0;
    const x = boardPad + level.width * cellSize;
    const gateHeight = cellSize * 0.74;
    const gateY = y + (cellSize - gateHeight) / 2;
    const gateWidth = Math.max(16, cellSize * 0.24);
    ctx.save();
    ctx.shadowColor = `rgba(25, 191, 130, ${0.22 + pulse * 0.3})`;
    ctx.shadowBlur = 16 + pulse * 18;
    ctx.fillStyle = `rgba(25, 191, 130, ${0.22 + pulse * 0.36})`;
    roundedRect(ctx, x - cellSize * 0.48, gateY, cellSize * 0.62, gateHeight, 8);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0f7f5f";
    roundedRect(ctx, x - gateWidth * 0.25, gateY - 3, gateWidth * 0.38, gateHeight + 6, 5);
    ctx.fill();

    ctx.fillStyle = "#19bf82";
    roundedRect(ctx, x - gateWidth * 0.78, gateY, gateWidth, gateHeight, 7);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(x - gateWidth * 0.72, gateY + gateHeight * (0.16 + i * 0.2), gateWidth * 0.7, 3);
    }

    ctx.restore();
  }

  function drawObstacle(obstacle) {
    const pos = boardToScreen(obstacle.x, obstacle.y);
    const pad = cellSize * 0.18;
    const x = pos.x + pad;
    const y = pos.y + pad;
    const size = cellSize - pad * 2;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.22)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = "rgba(17, 21, 28, 0.16)";
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size * 0.86, size * 0.45, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    if (obstacle.kind === "cone") {
      ctx.fillStyle = "#ff9f43";
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + size * 0.1);
      ctx.lineTo(x + size * 0.86, y + size * 0.82);
      ctx.lineTo(x + size * 0.14, y + size * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#7d3d00";
      roundedRect(ctx, x + size * 0.16, y + size * 0.78, size * 0.68, size * 0.1, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(x + size * 0.32, y + size * 0.52, size * 0.36, 3);
    } else if (obstacle.kind === "snow") {
      ctx.fillStyle = "#dff5ff";
      roundedRect(ctx, x, y + size * 0.2, size, size * 0.58, 14);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(x + size * 0.3, y + size * 0.28, size * 0.18, 0, Math.PI * 2);
      ctx.arc(x + size * 0.62, y + size * 0.28, size * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (obstacle.kind === "gate") {
      ctx.fillStyle = "#ef4056";
      roundedRect(ctx, x, y + size * 0.35, size, size * 0.3, 5);
      ctx.fill();
      ctx.fillStyle = "#fff2a8";
      for (let i = 0; i < 3; i += 1) {
        ctx.fillRect(x + size * (0.16 + i * 0.28), y + size * 0.38, size * 0.12, size * 0.24);
      }
    } else {
      ctx.fillStyle = "#269763";
      roundedRect(ctx, x, y + size * 0.16, size, size * 0.74, 8);
      ctx.fill();
      ctx.fillStyle = "#155f45";
      roundedRect(ctx, x + size * 0.12, y, size * 0.76, size * 0.18, 5);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(x + size * 0.2, y + size * 0.3, size * 0.12, size * 0.45);
      ctx.fillRect(x + size * 0.68, y + size * 0.3, size * 0.12, size * 0.45);
    }

    ctx.restore();
  }

  function drawActor(actor) {
    if (actor.inactive) return;
    const visual = getActorVisual(actor);
    const pos = boardToScreen(visual.x, visual.y);
    const centerX = pos.x + cellSize / 2;
    const centerY = pos.y + cellSize / 2;
    const radius = cellSize * 0.26;
    const colors = {
      courier: { body: "#19bf82", accent: "#ffc83d", dark: "#0d6f54" },
      janitor: { body: "#ff8a1f", accent: "#d9f0ff", dark: "#8c4700" },
      pedestrian: { body: "#d7dde8", accent: "#6f7e8d", dark: "#4c5968" }
    };
    const palette = colors[actor.kind] || colors.pedestrian;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + radius * 1.05, radius * 0.92, radius * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.body;
    roundedRect(ctx, centerX - radius * 0.62, centerY - radius * 0.1, radius * 1.24, radius * 1.18, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundedRect(ctx, centerX - radius * 0.42, centerY + radius * 0.08, radius * 0.34, radius * 0.68, 4);
    ctx.fill();

    ctx.fillStyle = palette.accent;
    if (actor.kind === "courier") {
      roundedRect(ctx, centerX + radius * 0.18, centerY + radius * 0.02, radius * 0.68, radius * 0.82, 5);
      ctx.fill();
      ctx.fillStyle = palette.dark;
      ctx.fillRect(centerX + radius * 0.34, centerY + radius * 0.18, radius * 0.36, 3);
    } else if (actor.kind === "janitor") {
      ctx.fillRect(centerX + radius * 0.62, centerY - radius * 0.4, 4, radius * 1.65);
      ctx.fillRect(centerX + radius * 0.42, centerY + radius * 1.1, radius * 0.52, 4);
    } else {
      ctx.beginPath();
      ctx.arc(centerX, centerY + radius * 0.38, radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#f4d7b7";
    ctx.beginPath();
    ctx.arc(centerX, centerY - radius * 0.55, radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.dark;
    ctx.beginPath();
    ctx.arc(centerX, centerY - radius * 0.78, radius * 0.3, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawVehicle(vehicle) {
    const visual = getVehicleVisual(vehicle);
    const pos = boardToScreen(visual.x, visual.y);
    const width = vehicle.axis === "horizontal" ? vehicle.length * cellSize : cellSize;
    const height = vehicle.axis === "vertical" ? vehicle.length * cellSize : cellSize;
    const pad = cellSize * 0.1;
    const x = pos.x + pad;
    const y = pos.y + pad;
    const bodyWidth = width - pad * 2;
    const bodyHeight = height - pad * 2;
    const isTarget = vehicle.id === level.targetVehicleId;
    const trafficKind = getTrafficVehicleKind(vehicle);

    ctx.save();
    ctx.fillStyle = "rgba(17, 21, 28, 0.16)";
    roundedRect(ctx, x + bodyWidth * 0.06, y + bodyHeight * 0.78, bodyWidth * 0.88, bodyHeight * 0.2, 8);
    ctx.fill();

    if (isTarget) {
      ctx.strokeStyle = visual.isSelected ? "rgba(255, 200, 61, 0.95)" : "rgba(239, 64, 86, 0.42)";
      ctx.lineWidth = visual.isSelected ? 5 : 3;
      roundedRect(ctx, x - 4, y - 4, bodyWidth + 8, bodyHeight + 8, 16);
      ctx.stroke();
    }

    ctx.shadowColor = visual.isSelected ? "rgba(255, 204, 77, 0.9)" : "rgba(0,0,0,0.28)";
    ctx.shadowBlur = visual.isSelected ? 20 : 10;
    ctx.shadowOffsetY = visual.isSelected ? 0 : 5;

    const paintColor = getVehicleColor(vehicle);
    const gradient = vehicle.axis === "horizontal" ? ctx.createLinearGradient(x, y, x, y + bodyHeight) : ctx.createLinearGradient(x, y, x + bodyWidth, y);
    gradient.addColorStop(0, lighten(paintColor, 0.22));
    gradient.addColorStop(0.54, paintColor);
    gradient.addColorStop(1, darken(paintColor, 0.22));
    ctx.fillStyle = gradient;
    roundedRect(ctx, x, y, bodyWidth, bodyHeight, isTarget ? 14 : getVehicleBodyRadius(trafficKind, vehicle));
    ctx.fill();
    ctx.restore();

    if (isTarget) drawTargetVehicleDetails(x, y, bodyWidth, bodyHeight, vehicle.axis, getEquippedSkin());
    else drawTrafficVehicleDetails(vehicle, trafficKind, x, y, bodyWidth, bodyHeight, vehicle.axis, paintColor);

    if (visual.isSelected) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
      ctx.lineWidth = 2;
      roundedRect(ctx, x + 4, y + 4, bodyWidth - 8, bodyHeight - 8, 10);
      ctx.stroke();
      ctx.restore();
    }
  }

  function getTrafficVehicleKind(vehicle) {
    if (vehicle.kind) return vehicle.kind;
    if (vehicle.length === 3) return vehicle.axis === "horizontal" ? "wagon" : "van";
    if (vehicle.id && vehicle.id.startsWith("block")) return "taxi";
    const colorsByKind = ["sedan", "delivery", "compact", "wagon"];
    return colorsByKind[Math.abs(hashVehicleId(vehicle.id || `${vehicle.x},${vehicle.y}`)) % colorsByKind.length];
  }

  function getVehicleBodyRadius(kind, vehicle) {
    if (kind === "van" || kind === "delivery") return 7;
    if (kind === "compact") return 15;
    if (kind === "wagon" || vehicle.length === 3) return 9;
    return 11;
  }

  function drawTrafficVehicleDetails(vehicle, kind, x, y, width, height, axis, color) {
    ctx.save();
    const glass = "rgba(255,255,255,0.58)";
    const dark = "rgba(12,15,20,0.78)";
    const panel = "rgba(255,255,255,0.2)";
    const stripe = lighten(color, 0.34);

    if (axis === "horizontal") {
      ctx.fillStyle = glass;
      if (kind === "van" || kind === "delivery") {
        roundedRect(ctx, x + width * 0.12, y + height * 0.17, width * 0.22, height * 0.3, 5);
        ctx.fill();
        ctx.fillStyle = panel;
        roundedRect(ctx, x + width * 0.42, y + height * 0.2, width * 0.34, height * 0.42, 5);
        ctx.fill();
        ctx.fillStyle = dark;
        ctx.fillRect(x + width * 0.78, y + height * 0.22, 2, height * 0.48);
      } else if (kind === "compact") {
        roundedRect(ctx, x + width * 0.22, y + height * 0.16, width * 0.42, height * 0.3, 9);
        ctx.fill();
      } else {
        roundedRect(ctx, x + width * 0.18, y + height * 0.18, width * 0.24, height * 0.28, 5);
        ctx.fill();
        roundedRect(ctx, x + width * 0.58, y + height * 0.18, width * 0.24, height * 0.28, 5);
        ctx.fill();
      }

      if (kind === "taxi") drawTaxiMarks(x, y, width, height, axis);
      if (kind === "delivery") drawDeliveryMarks(x, y, width, height, axis, stripe);
      if (kind === "wagon") drawWagonMarks(x, y, width, height, axis, stripe);

      drawWheel(x + width * 0.18, y + height * 0.88, width * 0.11, height * 0.09);
      drawWheel(x + width * 0.78, y + height * 0.88, width * 0.11, height * 0.09);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(x + width - 7, y + height * 0.28, 4, height * 0.18);
      ctx.fillRect(x + width - 7, y + height * 0.56, 4, height * 0.18);
    } else {
      ctx.fillStyle = glass;
      if (kind === "van" || kind === "delivery") {
        roundedRect(ctx, x + width * 0.18, y + height * 0.12, width * 0.34, height * 0.22, 5);
        ctx.fill();
        ctx.fillStyle = panel;
        roundedRect(ctx, x + width * 0.22, y + height * 0.42, width * 0.56, height * 0.32, 5);
        ctx.fill();
      } else {
        roundedRect(ctx, x + width * 0.2, y + height * 0.16, width * 0.28, height * 0.24, 5);
        ctx.fill();
        roundedRect(ctx, x + width * 0.52, y + height * 0.58, width * 0.28, height * 0.24, 5);
        ctx.fill();
      }
      if (kind === "taxi") drawTaxiMarks(x, y, width, height, axis);
      if (kind === "delivery") drawDeliveryMarks(x, y, width, height, axis, stripe);
      if (kind === "wagon") drawWagonMarks(x, y, width, height, axis, stripe);
      drawWheel(x + width * 0.05, y + height * 0.18, width * 0.09, height * 0.1);
      drawWheel(x + width * 0.86, y + height * 0.72, width * 0.09, height * 0.1);
    }
    ctx.restore();
  }

  function drawTargetVehicleDetails(x, y, width, height, axis, skin) {
    ctx.save();
    const accent = skin.accent || "#fff2a8";
    const trim = skin.trim || "#2d1118";

    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    roundedRect(ctx, x + 3, y + 3, width - 6, height - 6, 12);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundedRect(ctx, x + width * 0.08, y + height * 0.1, width * 0.22, height * 0.1, 5);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    if (axis === "horizontal") {
      roundedRect(ctx, x + width * 0.17, y + height * 0.16, width * 0.23, height * 0.28, 6);
      ctx.fill();
      roundedRect(ctx, x + width * 0.58, y + height * 0.16, width * 0.23, height * 0.28, 6);
      ctx.fill();
      drawSkinPattern(skin, x, y, width, height, axis);
      drawWheel(x + width * 0.18, y + height * 0.88, width * 0.12, height * 0.1, accent);
      drawWheel(x + width * 0.78, y + height * 0.88, width * 0.12, height * 0.1, accent);
      ctx.fillStyle = accent;
      ctx.fillRect(x + width - 7, y + height * 0.24, 4, height * 0.2);
      ctx.fillRect(x + width - 7, y + height * 0.56, 4, height * 0.2);
      drawSkinBadge(skin, x + width * 0.43, y + height * 0.55, width * 0.18, height * 0.25, trim, accent);
    } else {
      roundedRect(ctx, x + width * 0.18, y + height * 0.17, width * 0.3, height * 0.22, 6);
      ctx.fill();
      roundedRect(ctx, x + width * 0.52, y + height * 0.6, width * 0.3, height * 0.22, 6);
      ctx.fill();
      drawSkinPattern(skin, x, y, width, height, axis);
      drawWheel(x + width * 0.05, y + height * 0.18, width * 0.1, height * 0.1, accent);
      drawWheel(x + width * 0.86, y + height * 0.72, width * 0.1, height * 0.1, accent);
    }
    ctx.restore();
  }

  function drawTaxiMarks(x, y, width, height, axis) {
    ctx.save();
    ctx.fillStyle = "rgba(12,15,20,0.76)";
    if (axis === "horizontal") {
      for (let i = 0; i < 5; i += 1) ctx.fillRect(x + width * (0.22 + i * 0.07), y + height * 0.6, width * 0.035, height * 0.12);
      ctx.fillStyle = "#fff2a8";
      roundedRect(ctx, x + width * 0.42, y - height * 0.05, width * 0.16, height * 0.12, 4);
      ctx.fill();
    } else {
      for (let i = 0; i < 5; i += 1) ctx.fillRect(x + width * 0.22, y + height * (0.25 + i * 0.07), width * 0.14, height * 0.035);
    }
    ctx.restore();
  }

  function drawDeliveryMarks(x, y, width, height, axis, stripe) {
    ctx.save();
    ctx.fillStyle = stripe;
    if (axis === "horizontal") {
      roundedRect(ctx, x + width * 0.48, y + height * 0.66, width * 0.22, height * 0.1, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(12,15,20,0.35)";
      ctx.fillRect(x + width * 0.55, y + height * 0.26, 2, height * 0.36);
    } else {
      roundedRect(ctx, x + width * 0.18, y + height * 0.48, width * 0.18, height * 0.22, 4);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWagonMarks(x, y, width, height, axis, stripe) {
    ctx.save();
    ctx.strokeStyle = stripe;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (axis === "horizontal") {
      ctx.moveTo(x + width * 0.16, y + height * 0.68);
      ctx.lineTo(x + width * 0.84, y + height * 0.68);
    } else {
      ctx.moveTo(x + width * 0.68, y + height * 0.16);
      ctx.lineTo(x + width * 0.68, y + height * 0.84);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawSkinPattern(skin, x, y, width, height, axis) {
    ctx.save();
    const accent = skin.accent || "#fff2a8";
    const trim = skin.trim || "#2d1118";
    ctx.fillStyle = accent;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;

    if (skin.pattern === "checker") {
      const size = Math.max(4, height * 0.12);
      for (let i = 0; i < 8; i += 1) {
        ctx.fillStyle = i % 2 ? accent : trim;
        ctx.fillRect(x + width * 0.18 + i * size, y + height * 0.62, size, size);
      }
    } else if (skin.pattern === "parcel") {
      ctx.beginPath();
      ctx.moveTo(x + width * 0.2, y + height * 0.75);
      ctx.lineTo(x + width * 0.78, y + height * 0.22);
      ctx.stroke();
      roundedRect(ctx, x + width * 0.7, y + height * 0.52, width * 0.13, height * 0.2, 4);
      ctx.fill();
    } else if (skin.pattern === "neon") {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(x + width * 0.12, y + height * 0.7);
      ctx.lineTo(x + width * 0.88, y + height * 0.7);
      ctx.stroke();
    } else if (skin.pattern === "comet") {
      ctx.beginPath();
      ctx.arc(x + width * 0.72, y + height * 0.56, height * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + width * 0.22, y + height * 0.72);
      ctx.lineTo(x + width * 0.67, y + height * 0.55);
      ctx.stroke();
    } else if (skin.pattern === "crown") {
      ctx.beginPath();
      ctx.moveTo(x + width * 0.35, y + height * 0.68);
      ctx.lineTo(x + width * 0.42, y + height * 0.5);
      ctx.lineTo(x + width * 0.5, y + height * 0.66);
      ctx.lineTo(x + width * 0.58, y + height * 0.5);
      ctx.lineTo(x + width * 0.66, y + height * 0.68);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(x + width * 0.45, y + height * 0.13, width * 0.08, height * 0.74);
    }
    ctx.restore();
  }

  function drawSkinBadge(skin, x, y, width, height, textColor, background) {
    ctx.save();
    ctx.fillStyle = background;
    roundedRect(ctx, x, y, width, height, 5);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = `${Math.max(8, Math.floor(height * 0.58))}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(skin.badge || "", x + width / 2, y + height / 2 + 0.5);
    ctx.restore();
  }

  function drawWheel(x, y, width, height, accent) {
    ctx.fillStyle = "rgba(12,15,20,0.78)";
    roundedRect(ctx, x, y, width, height, 4);
    ctx.fill();
    if (accent) {
      ctx.fillStyle = accent;
      roundedRect(ctx, x + width * 0.25, y + height * 0.22, width * 0.5, height * 0.56, 3);
      ctx.fill();
    }
  }

  function hashVehicleId(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
    return hash;
  }

  function drawWinFx() {
    if (!winFx) return;
    const elapsed = performance.now() - winFx.start;
    const progress = clamp(elapsed / winFx.duration, 0, 1);
    if (progress >= 1) {
      winFx = null;
      return;
    }

    const y = boardPad + level.exit.row * cellSize + cellSize / 2;
    const x = boardPad + level.width * cellSize;
    ctx.save();
    ctx.strokeStyle = `rgba(25, 191, 130, ${1 - progress})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, cellSize * (0.4 + progress * 1.25), 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 200, 61, ${0.85 - progress * 0.55})`;
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8 + progress * 1.4;
      const distance = cellSize * (0.35 + progress * 1.15);
      const coinX = x + Math.cos(angle) * distance;
      const coinY = y + Math.sin(angle) * distance;
      ctx.beginPath();
      ctx.arc(coinX, coinY, Math.max(3, cellSize * 0.06), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMoveLimitWarning(width, height) {
    if (!level) return;
    const remaining = getMoveLimit() - moves;
    if (remaining > 2 || remaining < 0) return;
    const intensity = remaining === 0 ? 0.22 : remaining === 1 ? 0.15 : 0.09;
    ctx.save();
    ctx.strokeStyle = `rgba(239, 64, 86, ${0.42 + intensity})`;
    ctx.lineWidth = remaining === 0 ? 8 : 5;
    roundedRect(ctx, 4, 4, width - 8, height - 8, 8);
    ctx.stroke();
    ctx.fillStyle = `rgba(239, 64, 86, ${intensity})`;
    ctx.fillRect(0, 0, width, boardPad * 0.8);
    ctx.fillRect(0, height - boardPad * 0.8, width, boardPad * 0.8);
    ctx.restore();
  }

  function roundedRect(context, x, y, width, height, radius) {
    const safeWidth = Math.max(0, width);
    const safeHeight = Math.max(0, height);
    if (!safeWidth || !safeHeight) return;
    const r = Math.max(0, Math.min(radius, safeWidth / 2, safeHeight / 2));
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + safeWidth, y, x + safeWidth, y + safeHeight, r);
    context.arcTo(x + safeWidth, y + safeHeight, x, y + safeHeight, r);
    context.arcTo(x, y + safeHeight, x, y, r);
    context.arcTo(x, y, x + safeWidth, y, r);
    context.closePath();
  }

  function onPointerDown(event) {
    if (!level || isAnimating) return;
    ensureAudio();
    const cell = pointerToCell(event);
    const vehicle = vehicleAtCell(cell.x, cell.y);
    if (!vehicle) return;
    clearHint();
    selected = {
      vehicleId: vehicle.id,
      startPointer: { x: event.clientX, y: event.clientY },
      original: { x: vehicle.x, y: vehicle.y },
      previewDelta: 0,
      commitDelta: 0,
      rawDelta: 0,
      intentSign: 0,
      range: getAllowedRange(vehicle)
    };
    els.canvas.setPointerCapture(event.pointerId);
    draw();
  }

  function onPointerMove(event) {
    if (!selected || isAnimating) return;
    const vehicle = vehicles.find((item) => item.id === selected.vehicleId);
    if (!vehicle) return;

    const rawDelta =
      vehicle.axis === "horizontal"
        ? (event.clientX - selected.startPointer.x) / cellSize
        : (event.clientY - selected.startPointer.y) / cellSize;
    const clamped = clamp(rawDelta, selected.range.min, selected.range.max);
    const rubber =
      rawDelta > selected.range.max
        ? selected.range.max + Math.min(0.16, (rawDelta - selected.range.max) * 0.12)
        : rawDelta < selected.range.min
          ? selected.range.min - Math.min(0.16, (selected.range.min - rawDelta) * 0.12)
          : clamped;

    selected.rawDelta = rawDelta;
    selected.intentSign = Math.sign(rawDelta);
    selected.previewDelta = rubber;
    selected.commitDelta = clamp(Math.round(clamped), selected.range.min, selected.range.max);
    draw();
  }

  function onPointerUp(event) {
    if (!selected) return;
    const pointer = selected;
    const vehicle = vehicles.find((item) => item.id === pointer.vehicleId);
    selected = null;
    try {
      els.canvas.releasePointerCapture(event.pointerId);
    } catch {
      // Some browsers release the pointer automatically.
    }

    if (!vehicle || isAnimating) return;
    if (pointer.commitDelta) {
      applyMove(vehicle, pointer.commitDelta);
    } else if (Math.abs(pointer.rawDelta) > 0.18) {
      startBump(vehicle, pointer.intentSign);
    } else {
      draw();
    }
  }

  function ensureAudio() {
    if (state.settings.muted) return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function playSound(name) {
    if (state.settings.muted) return;
    const context = ensureAudio();
    if (!context) return;

    const sounds = {
      button: [[420, 0.035, "sine", 0.035]],
      move: [[190, 0.055, "triangle", 0.05], [260, 0.045, "triangle", 0.035, 0.035]],
      actor: [[310, 0.045, "triangle", 0.035]],
      bump: [[115, 0.07, "sawtooth", 0.035]],
      win: [[420, 0.08, "sine", 0.05], [640, 0.12, "sine", 0.045, 0.08]],
      star: [[780, 0.065, "sine", 0.04]],
      coin: [[520, 0.06, "triangle", 0.04], [820, 0.08, "sine", 0.035, 0.055]],
      hint: [[680, 0.05, "sine", 0.035], [920, 0.06, "sine", 0.03, 0.045]]
    };

    (sounds[name] || sounds.button).forEach(([frequency, duration, type, volume, delay = 0]) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + delay;
      const end = start + duration;
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    });
  }

  function getVehicleColor(vehicle) {
    if (level && vehicle.id === level.targetVehicleId) return getEquippedSkin().color;
    return vehicle.color;
  }

  function getEquippedSkin() {
    const owned = state.garage.ownedSkins || {};
    const selectedSkin = skins.find((skin) => skin.id === state.garage.equippedSkinId && owned[skin.id]);
    return selectedSkin || skins[0];
  }

  function getDailyDateKey(date = new Date()) {
    if (dailyApi) return dailyApi.getDateKey(date);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = {};
    parts.forEach((part) => {
      if (part.type !== "literal") values[part.type] = part.value;
    });
    return `${values.year}-${values.month}-${values.day}`;
  }

  function shiftDateKey(dateKey, offset) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + offset, 12, 0, 0));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }

  function formatShortDate(dateKey) {
    const [, month, day] = dateKey.split("-");
    return `${day}.${month}`;
  }

  function updateDailyStreak(dateKey) {
    const streak = state.daily.streak || { current: 0, best: 0, lastDateKey: "" };
    if (streak.lastDateKey === dateKey) return 0;
    const previous = shiftDateKey(dateKey, -1);
    const current = streak.lastDateKey === previous ? streak.current + 1 : 1;
    streak.current = current;
    streak.best = Math.max(streak.best || 0, current);
    streak.lastDateKey = dateKey;
    state.daily.streak = streak;
    return Math.min(25, current * 5);
  }

  function getDailyRewardPreview() {
    const dateKey = getDailyDateKey();
    const completion = getValidDailyCompletion(dateKey);
    if (completion && completion.rewardClaimed) return 0;
    const streak = state.daily.streak || { current: 0, lastDateKey: "" };
    const previous = shiftDateKey(dateKey, -1);
    const nextStreak = streak.lastDateKey === previous ? streak.current + 1 : 1;
    return 50 + Math.min(25, nextStreak * 5);
  }

  function refreshStreakForToday() {
    const streak = state.daily.streak || { current: 0, best: 0, lastDateKey: "" };
    const today = getDailyDateKey();
    const previous = shiftDateKey(today, -1);
    if (getValidDailyCompletion(today) && streak.lastDateKey !== today && streak.current === 0) {
      streak.current = 1;
      streak.best = Math.max(streak.best || 0, 1);
      streak.lastDateKey = today;
      state.daily.streak = streak;
      saveProgress();
      return;
    }
    if (streak.lastDateKey && streak.lastDateKey !== today && streak.lastDateKey !== previous && streak.current !== 0) {
      streak.current = 0;
      state.daily.streak = streak;
      saveProgress();
    }
  }

  function createMissionRecord() {
    return { progress: 0, claimed: false };
  }

  function syncDailyMissions() {
    if (!state.daily) state.daily = { completions: {}, missionDateKey: "", missions: {}, streak: { current: 0, best: 0, lastDateKey: "" } };
    if (!state.daily.streak) state.daily.streak = { current: 0, best: 0, lastDateKey: "" };
    refreshStreakForToday();
    const dateKey = getDailyDateKey();
    if (state.daily.missionDateKey !== dateKey) {
      state.daily.missionDateKey = dateKey;
      state.daily.missions = {};
      missionDefinitions.forEach((mission) => {
        state.daily.missions[mission.id] = createMissionRecord();
      });
      saveProgress();
      return;
    }
    missionDefinitions.forEach((mission) => {
      if (!state.daily.missions[mission.id]) state.daily.missions[mission.id] = createMissionRecord();
    });
  }

  function awardMissionsForCompletion(stars, isDaily) {
    syncDailyMissions();
    let reward = 0;
    if (isDaily) reward += advanceMission("daily_complete");
    if (stars === 3) reward += advanceMission("three_stars");
    if (!usedUndoInRun) reward += advanceMission("no_undo");
    if (reward) {
      saveProgress();
      renderMissions();
    }
    return reward;
  }

  function advanceMission(id) {
    const mission = missionDefinitions.find((item) => item.id === id);
    if (!mission) return 0;
    const record = state.daily.missions[id] || createMissionRecord();
    state.daily.missions[id] = record;
    if (record.claimed) return 0;
    record.progress = Math.min(mission.target, (record.progress || 0) + 1);
    if (record.progress < mission.target) return 0;
    record.claimed = true;
    state.coins += mission.reward;
    return mission.reward;
  }

  function showToast(text) {
    if (!els.toast) return;
    if (toastTimer) clearTimeout(toastTimer);
    els.toast.textContent = text;
    els.toast.hidden = false;
    toastTimer = setTimeout(() => {
      els.toast.hidden = true;
      toastTimer = null;
    }, 1900);
  }

  function toggleMute() {
    state.settings.muted = !state.settings.muted;
    saveProgress();
    updateHud();
    if (!state.settings.muted) playSound("button");
  }

  function bindEvents() {
    els.playButton.addEventListener("click", () => {
      playSound("button");
      startLevel(state.currentLevelIndex);
    });
    els.dailyButton.addEventListener("click", () => {
      playSound("button");
      startDailyLevel();
    });
    els.garageButton.addEventListener("click", () => {
      playSound("button");
      show("garage");
    });
    els.missionsButton.addEventListener("click", () => {
      playSound("button");
      show("missions");
    });
    els.levelSelectButton.addEventListener("click", () => {
      playSound("button");
      show("levels");
    });
    els.resetButton.addEventListener("click", () => {
      playSound("button");
      localStorage.removeItem(storageKey);
      state = defaultProgress();
      syncDailyMissions();
      saveProgress();
      show("menu");
    });
    els.backButton.addEventListener("click", () => {
      if (isAnimating) return;
      playSound("button");
      show("menu");
    });
    els.levelsBackButton.addEventListener("click", () => {
      playSound("button");
      show("menu");
    });
    els.garageBackButton.addEventListener("click", () => {
      playSound("button");
      show("menu");
    });
    els.missionsBackButton.addEventListener("click", () => {
      playSound("button");
      show("menu");
    });
    els.restartButton.addEventListener("click", restartLevel);
    els.muteButton.addEventListener("click", toggleMute);
    els.undoButton.addEventListener("click", undo);
    els.hintButton.addEventListener("click", useHint);
    els.skipButton.addEventListener("click", skipLevel);
    els.nextLevelButton.addEventListener("click", nextLevel);
    els.doubleRewardButton.addEventListener("click", doubleReward);
    els.retryButton.addEventListener("click", restartLevel);
    els.closeAdButton.addEventListener("click", () => {
      els.adModal.hidden = true;
      const close = pendingAdClose;
      pendingAdClose = null;
      playSound("button");
      if (close) close();
    });
    els.canvas.addEventListener("pointerdown", onPointerDown);
    els.canvas.addEventListener("pointermove", onPointerMove);
    els.canvas.addEventListener("pointerup", onPointerUp);
    els.canvas.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", resizeCanvas);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomItem(items) {
    if (!items.length) return null;
    return items[Math.floor(Math.random() * items.length)];
  }

  function getActorNeighbors(point) {
    return shuffle([
      { x: point.x + 1, y: point.y },
      { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y + 1 },
      { x: point.x, y: point.y - 1 }
    ]);
  }

  function reconstructActorPath(startKey, targetKey, parents, points) {
    const path = [];
    let key = targetKey;
    while (key) {
      path.push(points.get(key));
      key = parents.get(key);
    }
    path.reverse();
    return path[0] && gridKey(path[0]) === startKey ? path : null;
  }

  function isBoardEdge(point) {
    return point.x === 0 || point.y === 0 || point.x === level.width - 1 || point.y === level.height - 1;
  }

  function manhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function gridKey(point) {
    return `${point.x},${point.y}`;
  }

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const item = result[i];
      result[i] = result[j];
      result[j] = item;
    }
    return result;
  }

  function lerp(from, to, progress) {
    return from + (to - from) * progress;
  }

  function easeOutCubic(progress) {
    return 1 - Math.pow(1 - progress, 3);
  }

  function hexToRgb(hex) {
    const normalized = hex.replace("#", "");
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16)
    };
  }

  function rgbToHex({ r, g, b }) {
    return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
  }

  function lighten(hex, amount) {
    const rgb = hexToRgb(hex);
    return rgbToHex({
      r: rgb.r + (255 - rgb.r) * amount,
      g: rgb.g + (255 - rgb.g) * amount,
      b: rgb.b + (255 - rgb.b) * amount
    });
  }

  function darken(hex, amount) {
    const rgb = hexToRgb(hex);
    return rgbToHex({
      r: rgb.r * (1 - amount),
      g: rgb.g * (1 - amount),
      b: rgb.b * (1 - amount)
    });
  }

  syncDailyMissions();
  saveProgress();
  bindEvents();
  const launchLevelIndex = getLaunchLevelIndexFromUrl();
  if (launchLevelIndex === null) show("menu");
  else startLevel(launchLevelIndex);
})();
