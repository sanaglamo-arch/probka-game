(function () {
  const levels = window.PROBKA_LEVELS;
  const modes = window.PROBKA_MODES || [];
  const packs = window.PROBKA_PACKS || [];
  const dailyApi = window.PROBKA_DAILY;
  const skins = window.PROBKA_SKINS || [{ id: "classic_red", name: "Красная классика", price: 0, color: "#ff5c68" }];
  const yards = window.PROBKA_YARDS || [{ id: "quiet_yard", name: "Тихий двор", price: 0, palette: {} }];
  const yandex = window.PROBKA_YANDEX;
  const config = window.PROBKA_CONFIG || {};
  const texts = window.PROBKA_TEXTS || {};
  const economy = window.PROBKA_ECONOMY || {};
  const rules = window.PROBKA_RULES || {};
  const screens = window.PROBKA_SCREENS || {};
  const renderer = window.PROBKA_RENDERER || {};
  const sessionApi = window.PROBKA_SESSION || {};
  const tutorialApi = window.PROBKA_TUTORIAL || {};
  const actorsApi = window.PROBKA_ACTORS || {};
  const inputApi = window.PROBKA_INPUT || {};
  const adsApi = window.PROBKA_ADS || {};
  const moveDuration = config.timings?.moveDuration || 155;
  const actorMoveDuration = config.timings?.actorMoveDuration || 145;
  const bumpDuration = config.timings?.bumpDuration || 135;
  const winDriveDuration = config.timings?.winDriveDuration || 520;
  const hintDuration = config.timings?.hintDuration || 1600;
  const smartHintDuration = config.timings?.smartHintDuration || 4600;
  const dailyBaseReward = economy.rewards?.dailyBase || 60;
  const dailyPerfectReward = economy.rewards?.dailyPerfect || 25;
  const urlParams = config.urlParams || new URLSearchParams(window.location.search);
  const isAssetShowcase = Boolean(config.flags?.isAssetShowcase);
  const isQaMode = Boolean(config.flags?.isQaMode);
  const standardGridFrame = window.PROBKA_YARD_ASSET_STANDARD?.gridFrame || { left: 125, top: 125, right: 845, bottom: 845 };
  const missionDefinitions = texts.missions || [
    { id: "daily_complete", title: "Уровень дня", text: "Заверши ежедневный вызов", reward: 8, target: 1 },
    { id: "three_stars", title: "Три звезды", text: "Пройди уровень идеально", reward: 10, target: 1 },
    { id: "no_undo", title: "Без отмены", text: "Пройди любой уровень без отката", reward: 8, target: 1 }
  ];

  const els = {
    app: document.getElementById("app"),
    coins: document.getElementById("coins"),
    currentLevelLabel: document.getElementById("currentLevelLabel"),
    modeStatusLabel: document.getElementById("modeStatusLabel"),
    dailyStatusLabel: document.getElementById("dailyStatusLabel"),
    streakPanel: document.getElementById("streakPanel"),
    streakCount: document.getElementById("streakCount"),
    streakBest: document.getElementById("streakBest"),
    missionStatusLabel: document.getElementById("missionStatusLabel"),
    menuPanel: document.getElementById("menuPanel"),
    modeSelectPanel: document.getElementById("modeSelectPanel"),
    dailyPanel: document.getElementById("dailyPanel"),
    playArea: document.getElementById("playArea"),
    hud: document.querySelector("#playArea .hud"),
    boardWrap: document.querySelector("#playArea .board-wrap"),
    actions: document.querySelector("#playArea .actions"),
    levelsPanel: document.getElementById("levelsPanel"),
    garagePanel: document.getElementById("garagePanel"),
    missionsPanel: document.getElementById("missionsPanel"),
    levelsGrid: document.getElementById("levelsGrid"),
    modeGrid: document.getElementById("modeGrid"),
    garageGrid: document.getElementById("garageGrid"),
    garageSummary: document.getElementById("garageSummary"),
    missionsList: document.getElementById("missionsList"),
    missionRefreshLabel: document.getElementById("missionRefreshLabel"),
    dailyOverview: document.getElementById("dailyOverview"),
    dailyCalendarGrid: document.getElementById("dailyCalendarGrid"),
    dailyWeek: document.getElementById("dailyWeek"),
    playButton: document.getElementById("playButton"),
    dailyButton: document.getElementById("dailyButton"),
    garageButton: document.getElementById("garageButton"),
    missionsButton: document.getElementById("missionsButton"),
    levelSelectButton: document.getElementById("levelSelectButton"),
    resetButton: document.getElementById("resetButton"),
    tutorialReplayButton: document.getElementById("tutorialReplayButton"),
    backButton: document.getElementById("backButton"),
    modesBackButton: document.getElementById("modesBackButton"),
    dailyBackButton: document.getElementById("dailyBackButton"),
    levelsBackButton: document.getElementById("levelsBackButton"),
    garageBackButton: document.getElementById("garageBackButton"),
    missionsBackButton: document.getElementById("missionsBackButton"),
    restartButton: document.getElementById("restartButton"),
    muteButton: document.getElementById("muteButton"),
    undoButton: document.getElementById("undoButton"),
    hintButton: document.getElementById("hintButton"),
    skipButton: document.getElementById("skipButton"),
    levelTitle: document.getElementById("levelTitle"),
    levelsEyebrow: document.getElementById("levelsEyebrow"),
    levelsTitle: document.getElementById("levelsTitle"),
    movesLabel: document.getElementById("movesLabel"),
    limitLabel: document.getElementById("limitLabel"),
    moveMeter: document.getElementById("moveMeter"),
    winModal: document.getElementById("winModal"),
    winTitle: document.getElementById("winTitle"),
    starsLabel: document.getElementById("starsLabel"),
    rewardLabel: document.getElementById("rewardLabel"),
    doubleRewardButton: document.getElementById("doubleRewardButton"),
    nextLevelButton: document.getElementById("nextLevelButton"),
    winMenuButton: document.getElementById("winMenuButton"),
    failModal: document.getElementById("failModal"),
    failEyebrow: document.getElementById("failEyebrow"),
    failTitle: document.getElementById("failTitle"),
    failText: document.getElementById("failText"),
    retryButton: document.getElementById("retryButton"),
    archiveConfirmModal: document.getElementById("archiveConfirmModal"),
    archiveConfirmTitle: document.getElementById("archiveConfirmTitle"),
    archiveConfirmText: document.getElementById("archiveConfirmText"),
    archiveWatchButton: document.getElementById("archiveWatchButton"),
    archiveCancelButton: document.getElementById("archiveCancelButton"),
    toast: document.getElementById("toast"),
    tutorialOverlay: document.getElementById("tutorialOverlay"),
    tutorialStepLabel: document.getElementById("tutorialStepLabel"),
    tutorialTitle: document.getElementById("tutorialTitle"),
    tutorialText: document.getElementById("tutorialText"),
    tutorialNextButton: document.getElementById("tutorialNextButton"),
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
  let boardPadX = 22;
  let boardPadY = 22;
  let lastReward = 0;
  let winTimers = [];
  let toastTimer = null;
  let activeMode = "campaign";
  let activeDailyDateKey = "";
  let pendingDailyArchiveDateKey = "";
  let usedUndoInRun = false;
  let selectedModeId = getDefaultModeId();
  let timerFrame = null;
  let timerState = null;
  let pendingToolAction = null;
  let isPlatformAdOpen = false;
  let isPlatformPaused = false;
  let gameplayMarkedActive = false;
  let currentView = "menu";
  const audio = window.PROBKA_AUDIO?.createController
    ? window.PROBKA_AUDIO.createController(() => Boolean(state && state.settings && state.settings.muted))
    : null;
  const progressStore = window.PROBKA_PROGRESS?.createStore
    ? window.PROBKA_PROGRESS.createStore({
        modes,
        getModeLevels,
        getDefaultModeId,
        storageKey: config.storageKey || "probka_vo_dvore_progress_v1",
        progressVersion: config.progressVersion || 2,
        isAssetShowcase,
        unlockAllYards: Boolean(config.flags?.unlockAllYards),
        yards,
        yandex
      })
    : null;
  let state = loadProgress();
  const tutorialVersion = config.tutorialVersion || 1;
  let tutorialState = null;
  selectedModeId = state.lastModeId || selectedModeId;
  const screenController = screens.createController
    ? screens.createController({
        getEls: () => els,
        getState: () => state,
        getModes: () => modes,
        getLevels: () => levels,
        getSkins: () => skins,
        getYards: () => yards,
        getMissionDefinitions: () => missionDefinitions,
        renderer,
        getSelectedModeId: () => selectedModeId,
        setSelectedModeId: (modeId) => {
          selectedModeId = modeId;
          state.lastModeId = modeId;
        },
        dailyApi,
        getMode,
        getModeLevels,
        getCurrentModeOrder,
        getEquippedSkin,
        getEquippedYard,
        getDailyDateKey,
        shiftDateKey,
        formatShortDate,
        getDailyRewardPreview,
        getValidDailyCompletion,
        getMoveLimit,
        getRuleType,
        getTimerRemainingSec,
        getLevelMode,
        getSessionSnapshot: () => ({ level, moves, timerState, activeMode, activeDailyDateKey }),
        hasDailyAttempt,
        blockTutorialEscape,
        playSound,
        saveProgress,
        show,
        startLevel,
        startDailyLevel,
        showDailyArchivePrompt,
        buyOrEquipSkin,
        buyOrEquipYard,
        syncDailyMissions,
        createMissionRecord,
        formatCoinAmount,
        formatTime,
        plural
      })
    : null;
  const tutorialController = tutorialApi.createController
    ? tutorialApi.createController({
        getEls: () => els,
        getLevel: () => level,
        getTutorialState: () => tutorialState,
        isAnimating: () => isAnimating,
        syncTutorialLock,
        showExpectedHint: showTutorialExpectedHint,
        startGuidedLevel: startTutorialGuidedLevel,
        playSound,
        draw
      })
    : null;
  const actorsController = actorsApi.createController
    ? actorsApi.createController({
        getLevel: () => level,
        getVehicles: () => vehicles,
        getActors: () => actors,
        rules,
        playSound,
        startAnimation: startVehicleAnimation,
        getActorMoveDuration: () => actorMoveDuration
      })
    : null;
  const inputController = inputApi.createController
    ? inputApi.createController({
        getCanvas: () => els.canvas,
        getLevel: () => level,
        getVehicles: () => vehicles,
        getSelected: () => selected,
        setSelected: (value) => {
          selected = value;
        },
        getBoardMetrics: () => ({ boardPad, boardPadX, boardPadY, cellSize }),
        isAnimating: () => isAnimating,
        isTutorialActive,
        ensureAudio,
        clearHint,
        vehicleAtCell,
        getAllowedRange,
        isTutorialMoveAllowed,
        applyMove,
        startBump,
        draw,
        clamp,
        playSound
      })
    : null;
  const adsController = adsApi.createController
    ? adsApi.createController({
        getYandex: () => yandex,
        setAdOpen: (value) => {
          isPlatformAdOpen = value;
        },
        blockTutorialEscape,
        playSound,
        showToast,
        pauseTimer,
        resumeTimer,
        pauseAudio,
        resumeAudio,
        updateGameplayMarker,
        canResumeAfterAd: () => Boolean(timerState && els.winModal.hidden && els.failModal.hidden && !document.hidden && !isPlatformPaused)
      })
    : null;

  function defaultProgress() {
    if (progressStore) return progressStore.defaultProgress();
    return {
      progressVersion: config.progressVersion || 2,
      currentLevelIndex: 0,
      lastModeId: getDefaultModeId(),
      currentLevelByMode: Object.fromEntries(modes.map((mode) => [mode.id, 0])),
      updatedAt: 0,
      coins: 0,
      hints: 3,
      completed: {},
      unlocked: Object.fromEntries(modes.map((mode) => [getModeLevels(mode.id)[0]?.id, true]).filter(([id]) => id)),
      ad: { levelsSinceInterstitial: 0, completedLevels: 0 },
      garage: { ownedSkins: { classic_red: true }, equippedSkinId: "classic_red", ownedYards: { quiet_yard: true }, equippedYardId: "quiet_yard" },
      daily: { completions: {}, archiveUnlocks: {}, attempts: {}, streak: { current: 0, best: 0, lastDateKey: "" } },
      missions: { dateKey: "", records: {} },
      tutorial: { completedVersion: 0 },
      settings: { muted: false }
    };
  }

  function normalizeProgress(progress) {
    if (progressStore) return progressStore.normalize(progress);
    return { ...defaultProgress(), ...(progress || {}) };
  }

  function loadProgress() {
    if (progressStore) return progressStore.load();
    return defaultProgress();
  }

  function saveProgress(options = {}) {
    if (progressStore) progressStore.save(state, options);
  }

  function getDefaultModeId() {
    return modes.find((mode) => mode.id === "moves")?.id || modes[0]?.id || "moves";
  }

  function getMode(modeId = selectedModeId) {
    return modes.find((mode) => mode.id === modeId) || modes[0] || { id: "moves", title: "На счет ходов", rule: "moves", icon: "#" };
  }

  function getModeLevels(modeId = selectedModeId) {
    return levels.filter((item) => item.modeId === modeId);
  }

  function getLevelIndexForModeOrder(modeId, modeOrder) {
    const index = levels.findIndex((item) => item.modeId === modeId && item.modeOrder === modeOrder);
    return index >= 0 ? index : levels.findIndex((item) => item.modeId === modeId);
  }

  function getCurrentModeOrder(modeId = selectedModeId) {
    const fallback = 0;
    return Math.max(0, Math.min((state.currentLevelByMode && state.currentLevelByMode[modeId]) || fallback, getModeLevels(modeId).length - 1));
  }

  function getCurrentLevelIndex(modeId = selectedModeId) {
    return getLevelIndexForModeOrder(modeId, getCurrentModeOrder(modeId) + 1);
  }

  function getLevelMode(current = level) {
    if (activeMode === "daily") return { id: "daily", title: "Уровень дня", rule: "free", icon: "◆" };
    return getMode(current ? current.modeId : selectedModeId);
  }

  function getRuleType(current = level) {
    return getLevelMode(current).rule || "moves";
  }

  function getNextLevelIndexInMode() {
    if (!level || !level.modeId) return -1;
    return getLevelIndexForModeOrder(level.modeId, level.modeOrder + 1);
  }

  function cloneVehicle(vehicle) {
    return rules.cloneVehicle ? rules.cloneVehicle(vehicle) : { ...vehicle };
  }

  function cloneActor(actor) {
    return rules.cloneActor
      ? rules.cloneActor(actor)
      : { mode: "route", stepIndex: 0, direction: 1, ...actor, path: (actor.path || []).map((point) => ({ ...point })) };
  }

  function isTutorialActive() {
    return Boolean(tutorialState && tutorialState.active);
  }

  function getTutorialAllowedView() {
    if (!isTutorialActive()) return "";
    if (tutorialState.allowedView) return tutorialState.allowedView;
    return tutorialState.phase === "cards" ? "menu" : "game";
  }

  function syncTutorialLock() {
    const active = isTutorialActive();
    document.body.classList.toggle("tutorial-active", active);
    if (!active) {
      document.body.classList.remove("tutorial-can-drag");
      document.body.removeAttribute("data-tutorial-phase");
      return;
    }
    document.body.dataset.tutorialPhase = tutorialState.phase || "";
    document.body.classList.toggle("tutorial-can-drag", Boolean(getTutorialExpectedMove()));
  }

  function setTutorialPhase(phase) {
    if (!tutorialState) return;
    tutorialState.phase = phase;
    tutorialState.allowedView = phase === "cards" ? "menu" : "game";
    syncTutorialLock();
  }

  function blockTutorialEscape(message = "Сначала закончи обучение") {
    if (!isTutorialActive()) return false;
    showToast(message);
    const allowedView = getTutorialAllowedView();
    if (allowedView && currentView !== allowedView) show(allowedView, { fromTutorial: true });
    else updateTutorialStep();
    return true;
  }

  function show(view, options = {}) {
    if (isTutorialActive() && !options.fromTutorial) {
      const allowedView = getTutorialAllowedView();
      if (view !== allowedView) {
        showToast("Сначала закончи обучение");
        view = allowedView;
      }
    }
    currentView = view;
    document.documentElement.classList.toggle("game-active", view === "game");
    document.body.classList.toggle("game-active", view === "game");
    if (view !== "game") pendingToolAction = null;
    if (view !== "daily" && els.archiveConfirmModal) closeDailyArchivePrompt();
    if (!isTutorialActive() && els.tutorialOverlay) {
      els.tutorialOverlay.hidden = true;
    }
    if (screens.setVisibleView) {
      screens.setVisibleView(els, view);
    } else {
      els.menuPanel.hidden = view !== "menu";
      if (els.modeSelectPanel) els.modeSelectPanel.hidden = view !== "modes";
      if (els.dailyPanel) els.dailyPanel.hidden = view !== "daily";
      els.playArea.hidden = view !== "game";
      els.levelsPanel.hidden = view !== "levels";
      els.garagePanel.hidden = view !== "garage";
      els.missionsPanel.hidden = view !== "missions";
    }
    updateHud();
    if (view === "modes") renderModeSelect();
    if (view === "daily") renderDailyPanel({ scrollToCurrentMonth: true });
    if (view === "levels") renderLevelSelect();
    if (view === "garage") renderGarage();
    if (view === "missions") renderMissions();
    applyCaptureMode();
    if (view === "game") resizeCanvas();
    updateGameplayMarker();
    renderDailyWeek();
    syncTutorialLock();
  }

  function applyCaptureMode() {
    const capture = urlParams.get("capture");
    document.body.classList.toggle("capture-mobile", capture === "mobile" || capture === "mobile-wide");
    document.body.classList.toggle("capture-mobile-wide", capture === "mobile-wide");
    document.body.classList.toggle("capture-promo-gameplay", capture === "promo-gameplay");
  }

  function updateHud() {
    if (screenController) screenController.updateHud();
  }

  function renderActionButtons() {
    if (screenController) screenController.renderActionButtons();
  }

  function updateMenuStatus() {
    if (screenController) screenController.updateMenuStatus();
  }

  function getValidDailyCompletion(dateKey) {
    const completion = state.daily.completions[dateKey];
    if (!completion) return null;
    if (!dailyApi || !completion.seed) return completion;
    const dailyLevel = dailyApi.getDailyLevel(dateKey);
    return dailyLevel && completion.seed === dailyLevel.seed ? completion : null;
  }

  function getMoveLimit() {
    return rules.getMoveLimit
      ? rules.getMoveLimit(level, getRuleType())
      : getRuleType() === "moves" && level && Number.isInteger(level.moveLimit) ? level.moveLimit : Infinity;
  }

  function isOutOfMoves() {
    return level && Number.isFinite(getMoveLimit()) && moves >= getMoveLimit();
  }

  function plural(value, forms) {
    return texts.plural ? texts.plural(value, forms) : forms[2];
  }

  function formatCoinAmount(value, options = {}) {
    return texts.formatCoinAmount ? texts.formatCoinAmount(value, options) : `${Math.max(0, Math.round(value || 0))} монет`;
  }

  function formatTime(seconds) {
    return texts.formatTime ? texts.formatTime(seconds) : "0:00";
  }

  function getTimerRemainingSec() {
    return timerState ? Math.ceil(timerState.remainingMs / 1000) : level && level.timeLimitSec ? level.timeLimitSec : 0;
  }

  function startTimerIfNeeded() {
    stopTimer();
    if (!level || getRuleType() !== "timed") return;
    const limitSec = Math.max(1, level.timeLimitSec || 60);
    timerState = sessionApi.createTimerState
      ? sessionApi.createTimerState(limitSec)
      : { limitMs: limitSec * 1000, remainingMs: limitSec * 1000, lastTick: performance.now(), paused: false, finished: false };
    timerFrame = requestAnimationFrame(tickTimer);
  }

  function stopTimer() {
    if (timerFrame) cancelAnimationFrame(timerFrame);
    timerFrame = null;
    timerState = null;
    updateGameplayMarker();
  }

  function pauseTimer() {
    if (!timerState || timerState.finished || timerState.paused) return;
    timerState.paused = true;
  }

  function resumeTimer() {
    if (!timerState || timerState.finished || !timerState.paused) return;
    timerState.paused = false;
    timerState.lastTick = performance.now();
  }

  function updateGameplayMarker() {
    const shouldBeActive =
      !els.playArea.hidden &&
      els.winModal.hidden &&
      els.failModal.hidden &&
      !isPlatformAdOpen &&
      !isPlatformPaused &&
      !document.hidden;
    if (shouldBeActive === gameplayMarkedActive) return;
    gameplayMarkedActive = shouldBeActive;
    if (shouldBeActive) yandex?.gameplayStart?.();
    else yandex?.gameplayStop?.();
  }

  function handlePlatformPause() {
    isPlatformPaused = true;
    pauseTimer();
    pauseAudio();
    updateGameplayMarker();
  }

  function handlePlatformResume() {
    isPlatformPaused = false;
    if (!document.hidden && els.winModal.hidden && els.failModal.hidden && !isPlatformAdOpen) resumeTimer();
    resumeAudio();
    updateGameplayMarker();
  }

  function tickTimer(now) {
    if (!timerState || activeMode === "daily" || getRuleType() !== "timed") return;
    const canTick = !document.hidden && !isPlatformAdOpen && !isPlatformPaused && els.winModal.hidden && els.failModal.hidden;
    const result = sessionApi.tickTimerState
      ? sessionApi.tickTimerState(timerState, now, canTick)
      : { expired: false };
    if (result.expired) {
      updateHud();
      startFailSequence("time");
      return;
    }
    updateHud();
    timerFrame = requestAnimationFrame(tickTimer);
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

  function resetRunState() {
    const run = sessionApi.createRunState
      ? sessionApi.createRunState()
      : { moves: 0, moveHistory: [], selected: null, animation: null, isAnimating: false, usedUndoInRun: false, activeHint: null };
    moves = run.moves;
    moveHistory = run.moveHistory;
    selected = run.selected;
    animation = run.animation;
    isAnimating = run.isAnimating;
    usedUndoInRun = run.usedUndoInRun;
    activeHint = run.activeHint;
    if (hintFrame) cancelAnimationFrame(hintFrame);
    hintFrame = null;
    document.body.classList.remove("is-animating");
  }

  function startLevel(index, options = {}) {
    if (isTutorialActive() && !options.fromTutorial) {
      blockTutorialEscape();
      return;
    }
    clearWinTimers();
    closeDailyArchivePrompt();
    if (!isTutorialActive()) clearHint();
    stopTimer();
    activeDailyDateKey = "";
    resetRunState();
    pendingToolAction = null;
    winFx = null;
    els.winModal.hidden = true;
    els.failModal.hidden = true;
    levelIndex = Math.max(0, Math.min(index, levels.length - 1));
    level = levels[levelIndex];
    applyQaLevelOverrides(level);
    activeMode = level.modeId || getDefaultModeId();
    selectedModeId = activeMode;
    vehicles = level.vehicles.map(cloneVehicle);
    actors = (level.actors || []).map(cloneActor);
    initializeActors();
    state.lastModeId = selectedModeId;
    if (!state.currentLevelByMode) state.currentLevelByMode = {};
    state.currentLevelByMode[selectedModeId] = Math.max(0, (level.modeOrder || 1) - 1);
    state.currentLevelIndex = levelIndex;
    state.unlocked[level.id] = true;
    saveProgress();
    show("game", { fromTutorial: options.fromTutorial });
    startTimerIfNeeded();
    draw();
  }

  function getLaunchLevelIndexFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("level");
    if (!raw) return null;
    const number = Number.parseInt(raw, 10);
    if (!Number.isInteger(number)) return null;
    const modeId = params.get("mode") || getDefaultModeId();
    const modeLevels = getModeLevels(modeId);
    if (modeLevels.length) {
      const order = clamp(number, 1, modeLevels.length);
      selectedModeId = modeId;
      return getLevelIndexForModeOrder(modeId, order);
    }
    return clamp(number - 1, 0, levels.length - 1);
  }

  function startDailyLevel(date = new Date()) {
    if (blockTutorialEscape()) return;
    if (!dailyApi) {
      showToast("Уровень дня пока недоступен");
      return;
    }
    const dateKey = dailyApi.getDateKey(date);
    if (!isDailyDatePlayable(dateKey)) {
      showToast(dateKey > getDailyDateKey() ? "Будущий уровень еще закрыт" : "Сначала открой архивный день");
      show("daily");
      return;
    }
    clearWinTimers();
    closeDailyArchivePrompt();
    if (!isTutorialActive()) clearHint();
    stopTimer();
    activeMode = "daily";
    activeDailyDateKey = dateKey;
    resetRunState();
    pendingToolAction = null;
    winFx = null;
    els.winModal.hidden = true;
    els.failModal.hidden = true;
    level = dailyApi.getDailyLevel(activeDailyDateKey);
    applyQaLevelOverrides(level);
    vehicles = level.vehicles.map(cloneVehicle);
    actors = (level.actors || []).map(cloneActor);
    initializeActors();
    markDailyAttemptIfToday(dateKey);
    saveProgress();
    show("game");
    draw();
  }

  function startTutorialFlow(replay = false) {
    clearWinTimers();
    clearHint();
    stopTimer();
    activeDailyDateKey = "";
    activeMode = "tutorial";
    tutorialState = { active: true, replay, phase: "mini", allowedView: "game", step: 0, guidedIndex: 0 };
    els.winModal.hidden = true;
    els.failModal.hidden = true;
    closeDailyArchivePrompt();
    setTutorialPhase("mini");
    loadTutorialMiniLevel();
    show("game", { fromTutorial: true });
    updateTutorialStep();
    draw();
  }

  function loadTutorialMiniLevel() {
    level = {
      id: "tutorial_mini",
      modeId: "tutorial",
      modeOrder: 1,
      title: "Обучение",
      introText: "Первый двор",
      rule: "free",
      difficulty: 1,
      minMoves: 2,
      width: 6,
      height: 6,
      exit: { side: "right", row: 2 },
      targetVehicleId: "red",
      targetMoves: { threeStars: 2, twoStars: 4 },
      vehicles: [
        { id: "red", x: 1, y: 2, length: 2, axis: "horizontal", color: "#ff5c68", kind: "target" },
        { id: "tutorial_blocker", x: 3, y: 1, length: 2, axis: "vertical", color: "#55d6a8", kind: "sedan" },
        { id: "tutorial_car", x: 0, y: 4, length: 2, axis: "horizontal", color: "#ffd166", kind: "compact" }
      ],
      obstacles: [],
      actors: [],
      solutionPlan: [
        { id: "tutorial_blocker", delta: 2 },
        { id: "red", delta: 3 }
      ]
    };
    levelIndex = -1;
    vehicles = level.vehicles.map(cloneVehicle);
    actors = [];
    resetRunState();
  }

  function updateTutorialStep() {
    if (tutorialController) tutorialController.updateStep();
  }

  function setTutorialDomFocus(ids) {
    if (tutorialController) tutorialController.setDomFocus(ids);
  }

  function advanceTutorialCard() {
    if (tutorialController) tutorialController.advanceCard();
  }

  function getTutorialExpectedMove() {
    return tutorialController ? tutorialController.getExpectedMove() : null;
  }

  function showTutorialExpectedHint(move) {
    if (!move) return;
    const vehicle = vehicles.find((item) => item.id === move.id);
    if (!vehicle) return;
    if (hintFrame) cancelAnimationFrame(hintFrame);
    hintFrame = null;
    activeHint = {
      kind: "tutorial",
      vehicleId: vehicle.id,
      delta: move.delta,
      targetX: vehicle.x + (vehicle.axis === "horizontal" ? move.delta : 0),
      targetY: vehicle.y + (vehicle.axis === "vertical" ? move.delta : 0),
      direction: { axis: vehicle.axis, sign: Math.sign(move.delta) },
      sourceLabel: vehicle.id === level.targetVehicleId ? "Твоя машина" : "Тащи эту",
      targetLabel: "Сюда",
      until: Number.POSITIVE_INFINITY
    };
    draw();
    pulseHint();
  }

  function isTutorialMoveAllowed(vehicle, delta = null) {
    if (!isTutorialActive()) return true;
    const expected = getTutorialExpectedMove();
    if (!expected) {
      showToast("Следуй шагу обучения");
      return false;
    }
    if (!vehicle || vehicle.id !== expected.id) {
      showToast("Сейчас нужна подсвеченная машина");
      return false;
    }
    if (delta !== null && delta !== expected.delta) {
      showToast("Двигай до подсвеченной позиции");
      return false;
    }
    return true;
  }

  function handleTutorialMoveCompleted(vehicleId, delta) {
    if (!isTutorialActive()) return;
    const expected = getTutorialExpectedMove();
    if (!expected || expected.id !== vehicleId || expected.delta !== delta) return;
    if (tutorialState.phase === "mini") {
      tutorialState.step += 1;
      if (tutorialState.step <= 2) updateTutorialStep();
      return;
    }
    if (tutorialState.phase === "guided") {
      tutorialState.guidedIndex += 1;
      updateTutorialStep();
    }
  }

  function completeTutorialMini() {
    if (!tutorialState || tutorialState.phase !== "mini") return;
    clearHint();
    setTutorialDomFocus([]);
    setTutorialPhase("cards");
    tutorialState.step = 0;
    show("menu", { fromTutorial: true });
    updateTutorialStep();
  }

  function startTutorialGuidedLevel() {
    const index = getLevelIndexForModeOrder("free", 1);
    if (index < 0) {
      finishTutorial();
      return;
    }
    setTutorialPhase("guided");
    tutorialState.guidedIndex = 0;
    startLevel(index, { fromTutorial: true });
    tutorialState.active = true;
    tutorialState.allowedView = "game";
    activeMode = "tutorial";
    updateTutorialStep();
  }

  function finishTutorial() {
    if (!isTutorialActive()) return;
    const wasReplay = Boolean(tutorialState.replay);
    if (tutorialState.phase === "guided" && level && level.id === "free_001") {
      const previous = state.completed[level.id];
      if (!previous) {
        state.completed[level.id] = { stars: 3, bestMoves: moves || level.minMoves || 0 };
        const nextIndex = getLevelIndexForModeOrder("free", 2);
        const next = levels[nextIndex];
        if (next) state.unlocked[next.id] = true;
        if (!state.currentLevelByMode) state.currentLevelByMode = {};
        state.currentLevelByMode.free = Math.max(state.currentLevelByMode.free || 0, 1);
        if (!wasReplay) state.coins += getCampaignStarReward({ rule: "free" }, 3);
      }
    }
    clearHint();
    tutorialState = null;
    setTutorialDomFocus([]);
    syncTutorialLock();
    if (els.tutorialOverlay) els.tutorialOverlay.hidden = true;
    state.tutorial.completedVersion = tutorialVersion;
    saveProgress({ flush: true });
    showToast("Обучение пройдено");
    show("menu");
  }

  function restartLevel() {
    if (isAnimating) return;
    if (tutorialState && tutorialState.active) {
      showToast("Сначала закончи обучение");
      return;
    }
    playSound("button");
    if (activeMode === "daily") startDailyLevel(activeDailyDateKey || new Date());
    else startLevel(levelIndex);
  }

  function initializeActors() {
    if (actorsController) actorsController.initializeActors();
  }

  function renderLevelSelect() {
    if (screenController) screenController.renderLevelSelect();
  }

  function renderModeSelect() {
    if (screenController) screenController.renderModeSelect();
  }

  function renderGarage() {
    if (screenController) screenController.renderGarage();
  }

  function buyOrEquipSkin(skin) {
    if (blockTutorialEscape()) return;
    if (state.garage.ownedSkins[skin.id]) {
      state.garage.equippedSkinId = skin.id;
      saveProgress({ flush: true });
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
    saveProgress({ flush: true });
    playSound("coin");
    showToast(`${skin.name}: куплено`);
    updateHud();
    renderGarage();
    draw();
  }

  function buyOrEquipYard(yard) {
    if (blockTutorialEscape()) return;
    if (!state.garage.ownedYards) state.garage.ownedYards = { quiet_yard: true };
    if (state.garage.ownedYards[yard.id]) {
      state.garage.equippedYardId = yard.id;
      saveProgress({ flush: true });
      playSound("button");
      showToast(`${yard.name}: надето`);
      renderGarage();
      resizeCanvas();
      return;
    }
    if (state.coins < yard.price) {
      playSound("bump");
      showToast("Не хватает монет");
      return;
    }
    state.coins -= yard.price;
    state.garage.ownedYards[yard.id] = true;
    state.garage.equippedYardId = yard.id;
    saveProgress({ flush: true });
    playSound("coin");
    showToast(`${yard.name}: куплено`);
    updateHud();
    renderGarage();
    resizeCanvas();
  }

  function renderMissions() {
    if (screenController) screenController.renderMissions();
  }

  function renderDailyWeek() {
    if (screenController) screenController.renderDailyWeek();
  }

  function renderDailyPanel(options = {}) {
    if (screenController) screenController.renderDailyPanel(options);
  }

  function showDailyArchivePrompt(dateKey) {
    if (blockTutorialEscape()) return;
    if (isDailyDatePlayable(dateKey)) {
      startDailyLevel(dateKey);
      return;
    }
    pendingDailyArchiveDateKey = dateKey;
    if (els.archiveConfirmTitle) els.archiveConfirmTitle.textContent = `Открыть ${formatShortDate(dateKey)}?`;
    if (els.archiveConfirmText) els.archiveConfirmText.textContent = "Посмотри рекламу, чтобы сыграть этот архивный уровень дня.";
    if (els.archiveWatchButton) els.archiveWatchButton.disabled = false;
    if (els.archiveConfirmModal) els.archiveConfirmModal.hidden = false;
  }

  function closeDailyArchivePrompt() {
    pendingDailyArchiveDateKey = "";
    if (els.archiveWatchButton) els.archiveWatchButton.disabled = false;
    if (els.archiveConfirmModal) els.archiveConfirmModal.hidden = true;
  }

  async function watchDailyArchiveAd() {
    if (blockTutorialEscape()) return;
    const dateKey = pendingDailyArchiveDateKey;
    if (!dateKey) return;
    if (els.archiveWatchButton) els.archiveWatchButton.disabled = true;
    const opened = await unlockDailyArchive(dateKey);
    if (els.archiveWatchButton) els.archiveWatchButton.disabled = false;
    if (!opened) return;
    closeDailyArchivePrompt();
    startDailyLevel(dateKey);
  }

  function unlockDailyArchive(dateKey) {
    if (state.daily.archiveUnlocks[dateKey]) {
      renderDailyPanel();
      return Promise.resolve(true);
    }
    const unlock = () => {
      state.daily.archiveUnlocks[dateKey] = true;
      saveProgress({ flush: true });
      showToast(`Архив ${formatShortDate(dateKey)} открыт`);
      renderDailyPanel();
    };
    return showRewarded("Архив уровня дня", "После ролика откроется выбранный архивный уровень.", unlock);
  }

  function isDailyDatePlayable(dateKey) {
    const today = getDailyDateKey();
    if (dateKey > today) return false;
    if (dateKey === today) return true;
    return Boolean(getValidDailyCompletion(dateKey) || hasDailyAttempt(dateKey) || state.daily.archiveUnlocks[dateKey]);
  }

  function hasDailyAttempt(dateKey) {
    return Boolean(state.daily && state.daily.attempts && state.daily.attempts[dateKey]);
  }

  function markDailyAttemptIfToday(dateKey) {
    if (dateKey !== getDailyDateKey()) return;
    if (!state.daily.attempts) state.daily.attempts = {};
    if (!state.daily.attempts[dateKey]) state.daily.attempts[dateKey] = true;
  }

  function resizeCanvas() {
    fitBoardToViewport();
    const rect = els.canvas.getBoundingClientRect();
    const size = Math.floor(rect.width * window.devicePixelRatio);
    const gridSize = level ? level.width : 6;
    els.canvas.width = size;
    els.canvas.height = size;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    const frame = gridSize === 6 ? standardGridFrame : null;
    if (frame) {
      boardPadX = Math.round(rect.width * frame.left / 1024);
      boardPadY = Math.round(rect.width * frame.top / 1024);
      boardPad = boardPadX;
      const cellWidth = rect.width * ((frame.right - frame.left) / 1024) / gridSize;
      const cellHeight = rect.width * ((frame.bottom - frame.top) / 1024) / gridSize;
      cellSize = Math.min(cellWidth, cellHeight);
    } else {
      boardPad = gridSize > 10 ? 12 : gridSize > 8 ? 16 : 22;
      boardPadX = boardPad;
      boardPadY = boardPad;
      cellSize = (rect.width - boardPad * 2) / gridSize;
    }
    draw();
  }

  function parseCssPixels(value) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function getViewportHeight() {
    return Math.floor((window.visualViewport && window.visualViewport.height) || window.innerHeight || document.documentElement.clientHeight || 0);
  }

  function fitBoardToViewport() {
    if (!els.playArea || !els.boardWrap || els.playArea.hidden) return;

    const viewportHeight = getViewportHeight();
    const playRect = els.playArea.getBoundingClientRect();
    const styles = getComputedStyle(els.playArea);
    const paddingX = parseCssPixels(styles.paddingLeft) + parseCssPixels(styles.paddingRight);
    const paddingY = parseCssPixels(styles.paddingTop) + parseCssPixels(styles.paddingBottom);
    const rowGap = parseCssPixels(styles.rowGap || styles.gap);
    const isPromoGameplay = document.body.classList.contains("capture-promo-gameplay") && window.innerWidth >= 760;
    const promoSideWidth = parseCssPixels(styles.getPropertyValue("--promo-side-width"));
    const hudHeight = isPromoGameplay ? 0 : els.hud ? els.hud.getBoundingClientRect().height : 0;
    const actionsHeight = isPromoGameplay ? 0 : els.actions ? els.actions.getBoundingClientRect().height : 0;
    const availableWidth = Math.max(
      120,
      els.playArea.clientWidth - paddingX - (isPromoGameplay ? promoSideWidth + rowGap : 0)
    );
    const availableHeight = Math.max(
      120,
      isPromoGameplay
        ? (els.playArea.clientHeight || viewportHeight - playRect.top) - paddingY
        : viewportHeight - playRect.top - paddingY - hudHeight - actionsHeight - rowGap * 2 - 2
    );
    const boardSize = Math.floor(Math.min(availableWidth, availableHeight));

    els.boardWrap.style.setProperty("--board-size", `${boardSize}px`);
  }

  function boardToScreen(x, y) {
    return {
      x: boardPadX + x * cellSize,
      y: boardPadY + y * cellSize
    };
  }

  function pointerToCell(event) {
    return inputController ? inputController.pointerToCell(event) : { x: 0, y: 0 };
  }

  function vehicleAtCell(x, y) {
    return rules.vehicleAtCell ? rules.vehicleAtCell(vehicles, x, y) : null;
  }

  function vehicleOccupies(vehicle, cellX, cellY) {
    return rules.vehicleOccupies ? rules.vehicleOccupies(vehicle, cellX, cellY) : false;
  }

  function vehicleAtGridCell(cellX, cellY, ignoreVehicleId) {
    return rules.vehicleAtGridCell ? rules.vehicleAtGridCell(vehicles, cellX, cellY, ignoreVehicleId) : null;
  }

  function actorAtGridCell(cellX, cellY, ignoreActorId) {
    return rules.actorAtGridCell ? rules.actorAtGridCell(actors, cellX, cellY, ignoreActorId) : null;
  }

  function obstacleAtGridCell(cellX, cellY) {
    return rules.obstacleAtGridCell ? rules.obstacleAtGridCell(level, cellX, cellY) : null;
  }

  function buildOccupied(ignoreVehicleId) {
    return rules.buildOccupied ? rules.buildOccupied(level, vehicles, actors, ignoreVehicleId) : new Set();
  }

  function getAllowedRange(vehicle) {
    return rules.getAllowedRange ? rules.getAllowedRange(level, vehicles, actors, vehicle) : { min: 0, max: 0 };
  }

  function canPlace(vehicle, delta, occupied) {
    return rules.canPlace ? rules.canPlace(level, vehicle, delta, occupied) : false;
  }

  function applyMove(vehicle, delta) {
    if (!delta || isAnimating) return;
    clearHint();
    const fromX = vehicle.x;
    const fromY = vehicle.y;
    const toX = vehicle.x + (vehicle.axis === "horizontal" ? delta : 0);
    const toY = vehicle.y + (vehicle.axis === "vertical" ? delta : 0);
    vibrate(8);

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
        handleTutorialMoveCompleted(vehicle.id, delta);
        if (isWin()) startWinSequence(vehicle);
        else advanceActors(() => {
          if (isWin()) startWinSequence(vehicle);
          else if (isOutOfMoves()) startFailSequence("moves");
          else draw();
        });
      }
    });
  }

  function startBump(vehicle, sign) {
    if (!vehicle || !sign || isAnimating) return;
    if (!isTutorialActive()) clearHint();
    playSound("bump");
    vibrate([14, 8, 10]);
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
    if (actorsController) actorsController.advanceActors(onComplete);
    else onComplete();
  }

  function getNextActorStep(actor) {
    return actorsController ? actorsController.getNextActorStep(actor) : null;
  }

  function isWin() {
    if (rules.isWin) return rules.isWin(level, vehicles);
    const target = vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
    return Boolean(target && target.axis === "horizontal" && level.exit.side === "right" && target.y === level.exit.row && target.x + target.length >= level.width);
  }

  function startWinSequence(target) {
    if (timerState) timerState.finished = true;
    const fromX = target.x;
    const fromY = target.y;
    playSound("win");
    vibrate([12, 40, 30, 40, 60]);
    winFx = { start: performance.now(), duration: 1400 };
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
    if (getRuleType() === "timed" && level.timeTargets && timerState) {
      const elapsed = Math.ceil((timerState.limitMs - timerState.remainingMs) / 1000);
      if (elapsed <= level.timeTargets.threeStars) return 3;
      if (elapsed <= level.timeTargets.twoStars) return 2;
      return 1;
    }
    if (moves <= level.targetMoves.threeStars) return 3;
    if (moves <= level.targetMoves.twoStars) return 2;
    return 1;
  }

  function completeLevel() {
    const stars = calculateStars();
    if (tutorialState && tutorialState.active) {
      if (tutorialState.phase === "mini") completeTutorialMini();
      else finishTutorial();
      return;
    }
    if (activeMode === "daily") completeDailyLevel(stars);
    else completeCampaignLevel(stars);
  }

  function completeCampaignLevel(stars) {
    const previous = state.completed[level.id];
    const previousStars = previous ? previous.stars || 0 : 0;
    const reward = Math.max(0, getCampaignStarReward(level, stars) - getCampaignStarReward(level, previousStars));
    const missionReward = awardMissionsForCompletion(stars, false);
    const totalReward = reward + missionReward;
    lastReward = reward;

    const elapsedMs = timerState ? Math.round(timerState.limitMs - timerState.remainingMs) : null;
    if (!previous || stars > previous.stars || moves < (previous.bestMoves || Infinity) || (elapsedMs && elapsedMs < (previous.bestTimeMs || Infinity))) {
      state.completed[level.id] = {
        stars: Math.max(stars, previous ? previous.stars || 0 : 0),
        bestMoves: previous && previous.bestMoves ? Math.min(previous.bestMoves, moves) : moves,
        bestTimeMs: elapsedMs ? previous && previous.bestTimeMs ? Math.min(previous.bestTimeMs, elapsedMs) : elapsedMs : previous ? previous.bestTimeMs : undefined
      };
    }

    const nextIndex = getNextLevelIndexInMode();
    const next = levels[nextIndex];
    if (next) state.unlocked[next.id] = true;
    if (!state.currentLevelByMode) state.currentLevelByMode = {};
    if (next) state.currentLevelByMode[level.modeId] = Math.max(state.currentLevelByMode[level.modeId] || 0, (next.modeOrder || 1) - 1);
    state.coins += reward;
    state.ad.completedLevels += 1;
    state.ad.levelsSinceInterstitial += 1;
    saveProgress({ flush: true });

    showWinModal({
      title: `${level.title}`,
      rewardText: formatCampaignRewardLabel(reward, missionReward, elapsedMs),
      canDouble: reward > 0,
      nextText: "Следующий",
      showMenuButton: false
    });
    updateHud();
    revealStars(stars);
    updateGameplayMarker();
    if (missionReward) showToast(`Миссии: +${missionReward} монет`);
  }

  function getCampaignStarReward(item, stars) {
    return economy.getCampaignStarReward
      ? economy.getCampaignStarReward(item, stars, getRuleType())
      : (stars ? [0, 4, 6, 9][Math.max(0, Math.min(3, stars))] || 0 : 0);
  }

  function formatCampaignRewardLabel(reward, missionReward, elapsedMs) {
    const parts = [];
    if (reward > 0) {
      parts.push(getRuleType() === "timed" && elapsedMs ? `+${reward} монет · ${formatTime(elapsedMs / 1000)}` : `+${reward} монет`);
    } else {
      parts.push("Монеты уже получены");
    }
    if (missionReward) parts.push(`миссии +${missionReward}`);
    return parts.join(" · ");
  }

  function completeDailyLevel(stars) {
    const dateKey = activeDailyDateKey || getDailyDateKey();
    const isToday = dateKey === getDailyDateKey();
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
    const previousStars = completion.stars || 0;
    const archiveReward = isToday ? 0 : Math.max(0, getCampaignStarReward({ rule: "free" }, stars) - getCampaignStarReward({ rule: "free" }, previousStars));
    const baseReward = isToday && !completion.rewardClaimed ? dailyBaseReward : 0;
    const perfectReward = isToday && stars === 3 && !completion.perfectClaimed ? dailyPerfectReward : 0;
    const streakReward = isToday && !completion.rewardClaimed ? updateDailyStreak(dateKey) : 0;
    const missionReward = awardMissionsForCompletion(stars, isToday);
    const totalReward = baseReward + perfectReward + streakReward + missionReward;

    completion.stars = Math.max(completion.stars || 0, stars);
    completion.bestMoves = completion.bestMoves ? Math.min(completion.bestMoves, moves) : moves;
    completion.seed = level.seed;
    if (baseReward || archiveReward) completion.rewardClaimed = true;
    if (perfectReward || (!isToday && stars === 3)) completion.perfectClaimed = true;
    completion.archive = !isToday;
    state.daily.completions[dateKey] = completion;
    state.coins += baseReward + perfectReward + streakReward + archiveReward;
    saveProgress({ flush: true });

    lastReward = 0;
    showWinModal({
      title: `${level.title}`,
      rewardText: isToday
        ? totalReward
          ? `+${totalReward} монет за сегодня${streakReward ? ` · серия +${streakReward}` : ""}`
          : "Награда дня уже получена"
        : archiveReward
          ? `Архив ${formatShortDate(dateKey)} · +${archiveReward} монет`
          : "Архив уже закрыт на лучший результат",
      canDouble: false,
      nextText: "Календарь",
      showMenuButton: true
    });
    updateHud();
    revealStars(stars);
    updateGameplayMarker();
    if (totalReward || archiveReward) showToast(`${isToday ? "Уровень дня" : "Архив"}: +${totalReward + archiveReward} монет`);
  }

  function showWinModal(options) {
    if (screenController && screenController.showWinModal) {
      screenController.showWinModal(options);
    }
  }

  function revealStars(stars) {
    clearWinTimers();
    for (let i = 1; i <= stars; i += 1) {
      winTimers.push(
        setTimeout(() => {
          if (screenController && screenController.setWinStars) screenController.setWinStars("★".repeat(i) + "☆".repeat(3 - i));
          else els.starsLabel.textContent = "★".repeat(i) + "☆".repeat(3 - i);
          playSound("star");
        }, 140 * i)
      );
    }
    winTimers.push(
      setTimeout(() => {
        if (screenController && screenController.popRewardLabel) screenController.popRewardLabel();
        else els.rewardLabel.classList.add("reward-pop");
        playSound("coin");
      }, 560)
    );
  }

  function startFailSequence(reason = "moves") {
    clearHint();
    if (timerState) timerState.finished = true;
    playSound("bump");
    vibrate([22, 10, 22]);
    let failOptions;
    if (reason === "time") {
      failOptions = {
        eyebrow: "Таймер",
        title: "Время вышло",
        text: "Время вышло. Двор начнется заново."
      };
    } else if (activeMode === "daily" || !Number.isFinite(getMoveLimit())) {
      failOptions = {
        eyebrow: "Без лимита",
        title: "Еще попытка",
        text: "Попробуй еще раз, этот режим не ограничивает ходы."
      };
    } else {
      failOptions = {
        eyebrow: "Лимит ходов",
        title: "Ходы закончились",
        text: `Лимит ${getMoveLimit()} ходов исчерпан. Двор начнется заново.`
      };
    }
    showFailModal(failOptions);
    updateGameplayMarker();
    draw();
  }

  function showFailModal(options) {
    if (screenController && screenController.showFailModal) {
      screenController.showFailModal(options);
    }
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
      const hint = findHint();
      if (!hint) {
        playSound("bump");
        showToast("Сейчас нет полезной подсказки");
        return;
      }
      state.hints -= 1;
      saveProgress();
      updateHud();
      flashHint(hint);
      return;
    }
    showRewarded("Подсказка", "После короткого ролика появится следующий правильный ход.", () => {
      showToast("Ищу лучший ход");
      requestAnimationFrame(() => {
        const hint = findHint();
        if (hint) flashHint(hint);
        else {
          playSound("bump");
          showToast("Сейчас нет полезной подсказки");
        }
      });
    });
  }

  function queueToolAction(action) {
    if (!isAnimating) return false;
    pendingToolAction = action;
    return true;
  }

  function runToolAction(action) {
    if (action === "undo") undo();
    else if (action === "hint") useHint();
    else if (action === "skip") skipLevel();
  }

  function requestToolAction(action) {
    if (tutorialState && tutorialState.active) {
      showToast("В обучении следуй подсветке");
      return;
    }
    if (queueToolAction(action)) return;
    runToolAction(action);
  }

  function flushPendingToolAction() {
    if (!pendingToolAction || isAnimating || animation) return;
    if (els.playArea.hidden || !els.winModal.hidden || !els.failModal.hidden || isPlatformAdOpen) {
      pendingToolAction = null;
      return;
    }
    const action = pendingToolAction;
    pendingToolAction = null;
    runToolAction(action);
  }

  function flashHint(hint = findHint()) {
    if (!hint) {
      showToast("Сейчас нет полезной подсказки");
      return;
    }
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
    return null;
  }

  function findSmartHint() {
    return rules.findSmartHint ? rules.findSmartHint(level, vehicles, actors) : null;
  }

  function skipLevel() {
    if (isAnimating) return;
    if (blockTutorialEscape("В обучении следуй подсветке")) return;
    if (activeMode === "daily") {
      playSound("bump");
      showToast("Уровень дня нельзя пропустить");
      return;
    }
    playSound("button");
    showRewarded("Пропуск уровня", "После короткого ролика следующий двор откроется сразу.", () => {
      const nextIndex = getNextLevelIndexInMode();
      const next = levels[nextIndex];
      if (next) {
        state.unlocked[next.id] = true;
        state.currentLevelIndex = nextIndex;
        if (!state.currentLevelByMode) state.currentLevelByMode = {};
        state.currentLevelByMode[level.modeId] = (next.modeOrder || 1) - 1;
        saveProgress();
        startLevel(nextIndex);
      }
    });
  }

  function showRewarded(title, text, callback) {
    return runRewardedAd(title, text, callback);
  }

  function showInterstitial(callback) {
    return runFullscreenAd(callback);
  }

  async function runRewardedAd(title, text, onRewarded, onUnavailable) {
    if (adsController) return adsController.showRewarded({ title, text, onRewarded, onUnavailable });
    return false;
  }

  async function runFullscreenAd(callback) {
    if (adsController) return adsController.showFullscreen(callback);
  }

  async function runAdPause(showAdCallback) {
    return adsController ? adsController.runAdPause(showAdCallback) : showAdCallback();
  }

  // Минимальный интервал между межстраничными роликами (рекомендация Яндекса —
  // не показывать рекламу слишком часто; счётчик уровней дополняем таймером).
  const MIN_INTERSTITIAL_INTERVAL_MS = 60000;

  function maybeShowInterstitial(callback) {
    const now = Date.now();
    const sinceLast = now - (state.ad.lastInterstitialAt || 0);
    if (state.ad.completedLevels >= 3 && state.ad.levelsSinceInterstitial >= 1 && sinceLast >= MIN_INTERSTITIAL_INTERVAL_MS) {
      state.ad.levelsSinceInterstitial = 0;
      state.ad.lastInterstitialAt = now;
      saveProgress();
      showInterstitial(callback);
      return;
    }
    callback();
  }

  function nextLevel() {
    if (isAnimating) return;
    if (blockTutorialEscape()) return;
    playSound("button");
    els.winModal.hidden = true;
    if (activeMode === "daily") {
      show("daily");
      return;
    }
    maybeShowInterstitial(() => {
      const nextIndex = getNextLevelIndexInMode();
      if (nextIndex >= 0) startLevel(nextIndex);
      else show("levels");
    });
  }

  function closeWinToMenu() {
    if (isAnimating) return;
    if (blockTutorialEscape()) return;
    playSound("button");
    els.winModal.hidden = true;
    stopTimer();
    show("menu");
  }

  function doubleReward() {
    if (isAnimating) return;
    if (blockTutorialEscape()) return;
    if (activeMode === "daily" || lastReward <= 0) {
      playSound("bump");
      showToast(activeMode === "daily" ? "Уровень дня не удваивается" : "Нечего удваивать");
      return;
    }
    playSound("button");
    els.winModal.hidden = true;
    showRewarded("Удвоить награду", "После рекламного ролика монеты за уровень удвоятся.", () => {
      state.coins += lastReward;
      saveProgress({ flush: true });
      updateHud();
      nextLevel();
    }, () => {
      els.winModal.hidden = false;
      updateGameplayMarker();
    });
  }

  function startVehicleAnimation(config) {
    isAnimating = true;
    document.body.classList.add("is-animating");
    animation = sessionApi.createAnimationState ? sessionApi.createAnimationState(config) : { ...config, start: 0, progress: 0 };
    requestAnimationFrame(stepAnimation);
  }

  function stepAnimation(now) {
    if (!animation) return;
    const result = sessionApi.stepAnimationState
      ? sessionApi.stepAnimationState(animation, now, easeOutCubic)
      : { raw: clamp((now - animation.start) / animation.duration, 0, 1), done: false };
    draw();

    if (!result.done) {
      requestAnimationFrame(stepAnimation);
      return;
    }

    const done = animation.onComplete;
    animation = null;
    isAnimating = false;
    document.body.classList.remove("is-animating");
    draw();
    if (done) done();
    flushPendingToolAction();
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
    if (!isTutorialHintActive()) drawHint();
    drawExit();
    level.obstacles.forEach(drawObstacle);
    vehicles.forEach(drawVehicle);
    drawExit(true);
    actors.forEach(drawActor);
    drawTutorialHint();
    drawWinFx();
    drawMoveLimitWarning(width, height);
  }

  function drawYard(width, height) {
    if (renderer.drawYard) renderer.drawYard(ctx, { level, cellSize, boardPad, width, height, yardTheme: getEquippedYard() });
  }

  function drawActorRoutes() {
    if (!renderer.drawActorRoutes) return;
    renderer.drawActorRoutes(ctx, {
      actors,
      boardToScreen,
      getNextActorStep,
      getActorRouteExitPoint
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
    if (!renderer.drawMoveGuide) return;
    renderer.drawMoveGuide(ctx, {
      selected,
      level,
      vehicles,
      cellSize,
      boardToScreen
    });
  }

  function drawHint() {
    if (!activeHint) return;
    const now = performance.now();
    if (now > activeHint.until) {
      activeHint = null;
      return;
    }

    const pulse = 0.5 + Math.sin(now / 95) * 0.5;
    if (renderer.drawHint) renderer.drawHint(ctx, getRendererDrawOptions(pulse));
  }

  function isTutorialHintActive() {
    return isTutorialActive() && activeHint && activeHint.kind === "tutorial";
  }

  function getRendererDrawOptions(pulse = 0) {
    return {
      activeHint,
      actors,
      boardPad,
      boardPadX,
      boardPadY,
      boardToScreen,
      cellSize,
      drawVehicle,
      getActorRouteExitPoint,
      getActorVisual,
      getVehicleColor,
      getVehicleVisual,
      level,
      pulse,
      yardTheme: getEquippedYard(),
      vehicles
    };
  }

  function drawTutorialHint() {
    if (!isTutorialHintActive()) return;
    const now = performance.now();
    const pulse = 0.5 + Math.sin(now / 120) * 0.5;
    if (renderer.drawTutorialHint) renderer.drawTutorialHint(ctx, getRendererDrawOptions(pulse));
  }

  function drawExit(foregroundOnly = false) {
    if (!renderer.drawExit) return;
    renderer.drawExit(ctx, {
      boardPad,
      boardPadX,
      boardPadY,
      cellSize,
      foregroundOnly,
      level,
      yardTheme: getEquippedYard(),
      pulse: animation && animation.type === "win" ? 0.4 + animation.progress * 0.6 : 0
    });
  }

  function drawObstacle(obstacle) {
    if (!renderer.drawObstacle) return;
    renderer.drawObstacle(ctx, obstacle, {
      cellSize,
      levelId: level ? level.id : "level",
      yardTheme: getEquippedYard(),
      position: boardToScreen(obstacle.x, obstacle.y)
    });
  }

  function drawActor(actor) {
    const visual = getActorVisual(actor);
    if (renderer.drawActor) renderer.drawActor(ctx, actor, { cellSize, position: boardToScreen(visual.x, visual.y) });
  }

  function drawVehicle(vehicle) {
    const visual = getVehicleVisual(vehicle);
    const pos = boardToScreen(visual.x, visual.y);
    const width = vehicle.axis === "horizontal" ? vehicle.length * cellSize : cellSize;
    const height = vehicle.axis === "vertical" ? vehicle.length * cellSize : cellSize;
    const isTarget = vehicle.id === level.targetVehicleId;
    const targetSkin = isTarget ? getEquippedSkin() : null;
    const yardTheme = getEquippedYard();
    const usesTrafficSprite = !isTarget && renderer.hasYardTrafficSprite && renderer.hasYardTrafficSprite(yardTheme, vehicle);
    const usesSkinSprite = isTarget && renderer.hasSkinSprite && renderer.hasSkinSprite(targetSkin);
    const pad = usesSkinSprite || usesTrafficSprite ? cellSize * 0.02 : cellSize * 0.12;
    const x = pos.x + pad;
    const y = pos.y + pad;
    const bodyWidth = width - pad * 2;
    const bodyHeight = height - pad * 2;
    const spriteBox = {
      x,
      y,
      width: bodyWidth,
      height: bodyHeight
    };
    const skinSpriteRect = usesSkinSprite && renderer.getSkinSpriteDrawRect
      ? renderer.getSkinSpriteDrawRect(targetSkin, x, y, bodyWidth, bodyHeight, vehicle.axis)
      : null;
    const trafficKind = getTrafficVehicleKind(vehicle);

    ctx.save();
    if (isTarget) {
      const outlineRect = skinSpriteRect || { x, y, width: bodyWidth, height: bodyHeight };
      const outlinePad = usesSkinSprite ? (visual.isSelected ? cellSize * 0.045 : cellSize * 0.025) : 3;
      const outlineRadius = usesSkinSprite ? Math.min(14, outlineRect.height * 0.24) : 15;
      ctx.fillStyle = visual.isSelected ? "rgba(130, 182, 255, 0.045)" : usesSkinSprite ? "rgba(255, 207, 112, 0.032)" : "rgba(238, 123, 135, 0.02)";
      roundedRect(
        ctx,
        outlineRect.x - outlinePad,
        outlineRect.y - outlinePad,
        outlineRect.width + outlinePad * 2,
        outlineRect.height + outlinePad * 2,
        outlineRadius
      );
      ctx.fill();
      ctx.strokeStyle = visual.isSelected ? "rgba(178, 212, 255, 0.78)" : usesSkinSprite ? "rgba(255, 207, 112, 0.34)" : "rgba(238, 123, 135, 0.36)";
      ctx.lineWidth = visual.isSelected ? 2 : usesSkinSprite ? 1 : 2;
      roundedRect(
        ctx,
        outlineRect.x - outlinePad,
        outlineRect.y - outlinePad,
        outlineRect.width + outlinePad * 2,
        outlineRect.height + outlinePad * 2,
        outlineRadius
      );
      ctx.stroke();
    }

    const paintColor = getVehicleColor(vehicle);
    if (!usesSkinSprite && !usesTrafficSprite) {
      const gradient = vehicle.axis === "horizontal" ? ctx.createLinearGradient(x, y, x, y + bodyHeight) : ctx.createLinearGradient(x, y, x + bodyWidth, y);
      gradient.addColorStop(0, lighten(paintColor, 0.22));
      gradient.addColorStop(0.54, paintColor);
      gradient.addColorStop(1, darken(paintColor, 0.22));
      ctx.fillStyle = gradient;
      roundedRect(ctx, x, y, bodyWidth, bodyHeight, isTarget ? 14 : getVehicleBodyRadius(trafficKind, vehicle));
      ctx.fill();
    }
    ctx.restore();

    if (usesSkinSprite) renderer.drawSkinSprite(ctx, targetSkin, x, y, bodyWidth, bodyHeight, vehicle.axis);
    else if (isTarget) drawTargetVehicleDetails(x, y, bodyWidth, bodyHeight, vehicle.axis, targetSkin);
    else if (usesTrafficSprite) {
      renderer.drawYardTrafficSprite(ctx, {
        vehicle,
        x: spriteBox.x,
        y: spriteBox.y,
        width: spriteBox.width,
        height: spriteBox.height,
        axis: vehicle.axis,
        cellSize,
        yardTheme,
        paintColor
      });
    }
    else drawTrafficVehicleDetails(vehicle, trafficKind, x, y, bodyWidth, bodyHeight, vehicle.axis, paintColor);

    if (!usesTrafficSprite && renderer.drawVehicleThemeOverlay) {
      renderer.drawVehicleThemeOverlay(ctx, {
        vehicle,
        x,
        y,
        width: bodyWidth,
        height: bodyHeight,
        axis: vehicle.axis,
        cellSize,
        yardTheme,
        paintColor,
        isTarget
      });
    }

    if (visual.isSelected) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.48)";
      ctx.lineWidth = usesSkinSprite ? 1 : 1.5;
      const selectedRect = skinSpriteRect || { x: x + 5, y: y + 5, width: bodyWidth - 10, height: bodyHeight - 10 };
      const selectedPad = usesSkinSprite ? cellSize * 0.02 : 0;
      roundedRect(
        ctx,
        selectedRect.x - selectedPad,
        selectedRect.y - selectedPad,
        selectedRect.width + selectedPad * 2,
        selectedRect.height + selectedPad * 2,
        usesSkinSprite ? Math.min(12, selectedRect.height * 0.22) : 10
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  function getTrafficVehicleKind(vehicle) {
    return renderer.getVehicleKind ? renderer.getVehicleKind(vehicle) : vehicle.kind || "sedan";
  }

  function getVehicleBodyRadius(kind, vehicle) {
    return renderer.getVehicleBodyRadius ? renderer.getVehicleBodyRadius(kind, vehicle) : 11;
  }

  function drawTrafficVehicleDetails(vehicle, kind, x, y, width, height, axis, color) {
    if (renderer.drawTrafficVehicleDetails) renderer.drawTrafficVehicleDetails(ctx, vehicle, kind, x, y, width, height, axis, color);
  }

  function drawTargetVehicleDetails(x, y, width, height, axis, skin) {
    if (renderer.drawTargetVehicleDetails) renderer.drawTargetVehicleDetails(ctx, x, y, width, height, axis, skin);
  }

  function hashVehicleId(value) {
    if (renderer.hashStable) return renderer.hashStable(value);
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
    return hash;
  }

  function drawWinFx() {
    if (!winFx || !renderer.drawWinFx) return;
    if (renderer.drawWinFx(ctx, { boardPad, boardPadX, boardPadY, cellSize, level, now: performance.now(), winFx, yardTheme: getEquippedYard() })) winFx = null;
  }

  function drawMoveLimitWarning(width, height) {
    if (!level) return;
    if (renderer.drawMoveLimitWarning) renderer.drawMoveLimitWarning(ctx, { boardPad, boardPadX, boardPadY, width, height, remaining: getMoveLimit() - moves });
  }

  function roundedRect(context, x, y, width, height, radius) {
    if (renderer.roundedRect) renderer.roundedRect(context, x, y, width, height, radius);
  }

  function onPointerDown(event) {
    if (inputController) inputController.onPointerDown(event);
  }

  function onPointerMove(event) {
    if (inputController) inputController.onPointerMove(event);
  }

  function onPointerUp(event) {
    if (inputController) inputController.onPointerUp(event);
  }

  function ensureAudio() {
    return null;
  }

  function pauseAudio() {
    if (audio) audio.pause();
  }

  function resumeAudio() {
    if (audio) audio.resume();
  }

  function playSound(name) {
    if (audio) audio.play(name);
  }

  // Тактильная отдача на мобильных. navigator.vibrate тихо игнорируется
  // на iOS/десктопе; гейтится отдельной настройкой haptics.
  function vibrate(pattern) {
    if (typeof navigator !== "undefined" && navigator.vibrate && state.settings && state.settings.haptics !== false) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Некоторые встроенные браузеры бросают на vibrate — безопасно игнорируем.
      }
    }
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

  function getEquippedYard() {
    const owned = state.garage.ownedYards || { quiet_yard: true };
    const migrations = window.PROBKA_YARD_ID_MIGRATIONS || {};
    const selectedId = migrations[state.garage.equippedYardId] || state.garage.equippedYardId;
    const selectedYard = yards.find((yard) => yard.id === selectedId && owned[yard.id]);
    return selectedYard || yards[0];
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
    if (economy.updateDailyStreak) return economy.updateDailyStreak(state, dateKey, shiftDateKey);
    return 0;
  }

  function getDailyRewardPreview() {
    const dateKey = getDailyDateKey();
    const completion = getValidDailyCompletion(dateKey);
    if (economy.getDailyRewardPreview) return economy.getDailyRewardPreview(state, dateKey, completion, shiftDateKey);
    return completion && completion.rewardClaimed ? 0 : dailyBaseReward + dailyPerfectReward;
  }

  function refreshStreakForToday() {
    const today = getDailyDateKey();
    const previous = shiftDateKey(today, -1);
    const changed = economy.refreshStreakForToday
      ? economy.refreshStreakForToday(state, today, previous, Boolean(getValidDailyCompletion(today)))
      : false;
    if (changed) saveProgress();
  }

  function createMissionRecord() {
    return economy.createMissionRecord ? economy.createMissionRecord() : { progress: 0, claimed: false };
  }

  function syncDailyMissions() {
    if (economy.ensureDailyProgress) economy.ensureDailyProgress(state);
    refreshStreakForToday();
    const dateKey = getDailyDateKey();
    const changed = economy.syncMissionRecords ? economy.syncMissionRecords(state, missionDefinitions, dateKey) : false;
    if (changed) saveProgress();
  }

  function awardMissionsForCompletion(stars, isDaily) {
    syncDailyMissions();
    const reward = economy.awardMissionsForCompletion
      ? economy.awardMissionsForCompletion(state, missionDefinitions, { stars, isDaily, usedUndo: usedUndoInRun })
      : 0;
    if (reward) {
      saveProgress();
      renderMissions();
    }
    return reward;
  }

  function advanceMission(id) {
    return economy.advanceMission ? economy.advanceMission(state, missionDefinitions, id) : 0;
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
    if (blockTutorialEscape()) return;
    state.settings.muted = !state.settings.muted;
    saveProgress();
    updateHud();
    if (!state.settings.muted) playSound("button");
  }

  async function initializePlatform() {
    if (!yandex || !yandex.init) return;
    await yandex.init({
      onPause: handlePlatformPause,
      onResume: handlePlatformResume
    });
    applyPlatformLanguage();
    await restoreCloudProgress();
  }

  function applyPlatformLanguage() {
    // Игра локализована только на русский; язык платформы не меняет контент.
    document.documentElement.lang = "ru";
  }

  async function restoreCloudProgress() {
    if (!yandex || !yandex.loadProgress) return;
    const cloudProgress = await yandex.loadProgress();
    if (!cloudProgress) return;
    const normalizedCloud = normalizeProgress(cloudProgress);
    if ((normalizedCloud.updatedAt || 0) <= (state.updatedAt || 0)) return;
    state = normalizedCloud;
    selectedModeId = state.lastModeId || getDefaultModeId();
    saveProgress({ touch: false, syncCloud: false });
  }

  function markLoadingReady() {
    requestAnimationFrame(() => {
      yandex?.ready?.();
    });
  }

  function loadGeneratedSkinPack() {
    const assetVersion = "rc16-wall-yard-exit";
    const refresh = () => {
      renderGarage();
      draw();
    };
    if (renderer.loadSkinSprites) renderer.loadSkinSprites(skins, assetVersion, refresh);
    if (renderer.loadYardAssets) renderer.loadYardAssets(yards, assetVersion, refresh);
  }

  async function initializeGame() {
    loadGeneratedSkinPack();
    bindEvents();
    await initializePlatform();
    syncDailyMissions();
    saveProgress({ touch: false });
    applyAssetShowcaseState();
    const launchScreen = getLaunchScreenFromUrl();
    const launchLevelIndex = getLaunchLevelIndexFromUrl();
    const forceTutorial = urlParams.get("tutorial") === "1" || urlParams.get("onboarding") === "1";
    const tutorialIncomplete = (state.tutorial?.completedVersion || 0) < tutorialVersion;
    if (forceTutorial) startTutorialFlow(true);
    else if (!isAssetShowcase && tutorialIncomplete) startTutorialFlow(false);
    else if (launchScreen) show(launchScreen);
    else if (launchLevelIndex === null) show("menu");
    else startLevel(launchLevelIndex);
    markLoadingReady();
    installQaApi();
  }

  function getLaunchScreenFromUrl() {
    const screen = urlParams.get("screen");
    if (!screen) return "";
    const modeId = urlParams.get("mode");
    if (modeId && getModeLevels(modeId).length) selectedModeId = modeId;
    if (["menu", "modes", "daily", "levels", "garage", "missions"].includes(screen)) return screen;
    return "";
  }

  function applyAssetShowcaseState() {
    if (urlParams.get("showcase") !== "1") return;
    const modeId = urlParams.get("mode") || selectedModeId || getDefaultModeId();
    const modeLevels = getModeLevels(modeId);
    state.coins = Math.max(state.coins || 0, 999999);
    state.hints = Math.max(state.hints || 0, 3);
    if (!state.currentLevelByMode) state.currentLevelByMode = {};
    state.currentLevelByMode[modeId] = Math.max(state.currentLevelByMode[modeId] || 0, 28);
    modeLevels.forEach((item, index) => {
      if (index <= 36) state.unlocked[item.id] = true;
      if (index < 28) {
        state.completed[item.id] = {
          stars: index % 7 === 0 ? 2 : 3,
          bestMoves: item.minMoves + (index % 7 === 0 ? 3 : 0),
          bestTimeMs: item.timeTargets ? item.timeTargets.threeStars * 1000 : (item.timeLimitSec || 0) * 1000,
          rewardClaimed: true
        };
      }
    });
    skins.slice(0, 7).forEach((skin) => {
      state.garage.ownedSkins[skin.id] = true;
    });
    if (skins[4]) state.garage.equippedSkinId = skins[4].id;
    const showcaseSkinId = urlParams.get("skin");
    const showcaseSkin = skins.find((skin) => skin.id === showcaseSkinId);
    if (showcaseSkin) {
      state.garage.ownedSkins[showcaseSkin.id] = true;
      state.garage.equippedSkinId = showcaseSkin.id;
    }
    if (!state.garage.ownedYards) state.garage.ownedYards = { quiet_yard: true };
    yards.forEach((yard) => {
      state.garage.ownedYards[yard.id] = true;
    });
    const showcaseYardId = urlParams.get("yard");
    const showcaseYard = yards.find((yard) => yard.id === showcaseYardId);
    if (showcaseYard) {
      state.garage.ownedYards[showcaseYard.id] = true;
      state.garage.equippedYardId = showcaseYard.id;
    } else if (yards[1]) state.garage.equippedYardId = yards[1].id;
  }

  function applyQaLevelOverrides(currentLevel) {
    if (!isQaMode || !currentLevel) return;
    const moveLimit = Number.parseInt(urlParams.get("qaMoveLimit") || "", 10);
    if (Number.isInteger(moveLimit) && moveLimit >= 0) currentLevel.moveLimit = moveLimit;
    const timeLimit = Number.parseInt(urlParams.get("qaTimeLimit") || "", 10);
    if (Number.isInteger(timeLimit) && timeLimit > 0) {
      currentLevel.timeLimitSec = timeLimit;
      currentLevel.timeTargets = {
        threeStars: Math.max(1, timeLimit),
        twoStars: Math.max(1, timeLimit + 1)
      };
    }
  }

  function installQaApi() {
    if (!isQaMode) return;
    window.PROBKA_QA = {
      getSnapshot: getQaSnapshot,
      moveVehicle: qaMoveVehicle,
      replaySolution: qaReplaySolution,
      expireTimer: qaExpireTimer,
      waitUntilIdle: qaWaitUntilIdle
    };
  }

  function getQaSnapshot() {
    return {
      activeMode,
      levelId: level ? level.id : "",
      yardId: getEquippedYard().id,
      boardPadX,
      boardPadY,
      cellSize,
      gridFrame: standardGridFrame,
      moves,
      isAnimating,
      winOpen: Boolean(els.winModal && !els.winModal.hidden),
      failOpen: Boolean(els.failModal && !els.failModal.hidden),
      view: document.body.dataset.view || ""
    };
  }

  function qaWaitUntilIdle(timeout = 3600) {
    return new Promise((resolve) => {
      const startedAt = performance.now();
      const tick = () => {
        if (!isAnimating && !animation) {
          resolve(true);
          return;
        }
        if (performance.now() - startedAt > timeout) {
          resolve(false);
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  async function qaMoveVehicle(vehicleId, delta) {
    if (!isQaMode || !level) return false;
    await qaWaitUntilIdle();
    if (!els.winModal.hidden || !els.failModal.hidden) return false;
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    if (!vehicle || !Number.isFinite(delta) || !delta) return false;
    if (urlParams.get("qaInstant") === "1") return qaMoveVehicleInstant(vehicle, delta);
    applyMove(vehicle, delta);
    return qaWaitUntilIdle();
  }

  function qaMoveVehicleInstant(vehicle, delta) {
    const range = getAllowedRange(vehicle);
    if (delta < range.min || delta > range.max) return false;
    moveHistory.push({
      vehicles: vehicles.map(cloneVehicle),
      actors: actors.map(cloneActor)
    });
    vehicle.x += vehicle.axis === "horizontal" ? delta : 0;
    vehicle.y += vehicle.axis === "vertical" ? delta : 0;
    moves += 1;
    updateHud();
    if (isWin()) {
      if (timerState) timerState.finished = true;
      completeLevel();
    } else if (isOutOfMoves()) {
      startFailSequence("moves");
    } else {
      draw();
    }
    return true;
  }

  function qaExpireTimer() {
    if (!isQaMode || !timerState || getRuleType() !== "timed") return getQaSnapshot();
    timerState.remainingMs = 0;
    timerState.finished = true;
    startFailSequence("time");
    return getQaSnapshot();
  }

  async function qaReplaySolution(count = Infinity) {
    if (!isQaMode || !level || !Array.isArray(level.solutionPlan)) return getQaSnapshot();
    const limit = Number.isFinite(count) ? Math.max(0, count) : level.solutionPlan.length;
    const plan = level.solutionPlan.slice(0, limit);
    for (const move of plan) {
      const moved = await qaMoveVehicle(move.id, move.delta);
      if (!moved) break;
      if (!els.winModal.hidden || !els.failModal.hidden) break;
    }
    await qaWaitUntilIdle();
    return getQaSnapshot();
  }

  function bindEvents() {
    els.playButton.addEventListener("click", () => {
      if (blockTutorialEscape()) return;
      playSound("button");
      startLevel(getCurrentLevelIndex(selectedModeId));
    });
    els.dailyButton.addEventListener("click", () => {
      if (blockTutorialEscape()) return;
      playSound("button");
      show("daily");
    });
    els.garageButton.addEventListener("click", () => {
      if (blockTutorialEscape()) return;
      playSound("button");
      show("garage");
    });
    els.missionsButton.addEventListener("click", () => {
      if (blockTutorialEscape()) return;
      playSound("button");
      show("missions");
    });
    els.levelSelectButton.addEventListener("click", () => {
      if (blockTutorialEscape()) return;
      playSound("button");
      show("modes");
    });
    els.resetButton.addEventListener("click", () => {
      if (blockTutorialEscape()) return;
      playSound("button");
      localStorage.removeItem(config.storageKey || "probka_vo_dvore_progress_v1");
      state = defaultProgress();
      selectedModeId = state.lastModeId;
      syncDailyMissions();
      saveProgress();
      startTutorialFlow(false);
    });
    if (els.tutorialReplayButton) {
      els.tutorialReplayButton.addEventListener("click", () => {
        playSound("button");
        startTutorialFlow(true);
      });
    }
    els.backButton.addEventListener("click", () => {
      if (isAnimating) return;
      if (blockTutorialEscape()) return;
      playSound("button");
      stopTimer();
      show("menu");
    });
    els.modesBackButton.addEventListener("click", () => {
      if (blockTutorialEscape()) return;
      playSound("button");
      show("menu");
    });
    if (els.dailyBackButton) {
      els.dailyBackButton.addEventListener("click", () => {
        if (blockTutorialEscape()) return;
        playSound("button");
        show("menu");
      });
    }
    els.levelsBackButton.addEventListener("click", () => {
      if (blockTutorialEscape()) return;
      playSound("button");
      show("modes");
    });
    els.garageBackButton.addEventListener("click", () => {
      if (blockTutorialEscape()) return;
      playSound("button");
      show("menu");
    });
    els.missionsBackButton.addEventListener("click", () => {
      if (blockTutorialEscape()) return;
      playSound("button");
      show("menu");
    });
    els.restartButton.addEventListener("click", restartLevel);
    els.muteButton.addEventListener("click", toggleMute);
    els.undoButton.addEventListener("click", () => requestToolAction("undo"));
    els.hintButton.addEventListener("click", () => requestToolAction("hint"));
    els.skipButton.addEventListener("click", () => requestToolAction("skip"));
    els.nextLevelButton.addEventListener("click", nextLevel);
    if (els.winMenuButton) els.winMenuButton.addEventListener("click", closeWinToMenu);
    els.doubleRewardButton.addEventListener("click", doubleReward);
    els.retryButton.addEventListener("click", restartLevel);
    if (els.archiveWatchButton) els.archiveWatchButton.addEventListener("click", watchDailyArchiveAd);
    if (els.archiveCancelButton) {
      els.archiveCancelButton.addEventListener("click", () => {
        if (blockTutorialEscape()) return;
        playSound("button");
        closeDailyArchivePrompt();
      });
    }
    if (els.tutorialNextButton) els.tutorialNextButton.addEventListener("click", advanceTutorialCard);
    bindGameplayNativeGestureBlockers();
    els.canvas.addEventListener("pointerdown", onPointerDown);
    els.canvas.addEventListener("pointermove", onPointerMove);
    els.canvas.addEventListener("pointerup", onPointerUp);
    els.canvas.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", resizeCanvas);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", resizeCanvas);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        pauseTimer();
        pauseAudio();
      } else if (!isPlatformPaused && !isPlatformAdOpen && els.winModal.hidden && els.failModal.hidden) {
        resumeTimer();
        resumeAudio();
      }
      updateGameplayMarker();
    });

    // Некоторые мобильные браузеры и WebView Яндекса не всегда шлют
    // visibilitychange при сворачивании — дублируем паузу по blur/focus окна.
    window.addEventListener("blur", () => {
      pauseTimer();
      pauseAudio();
      updateGameplayMarker();
    });
    window.addEventListener("focus", () => {
      if (!document.hidden && !isPlatformPaused && !isPlatformAdOpen && els.winModal.hidden && els.failModal.hidden) {
        resumeTimer();
        resumeAudio();
      }
      updateGameplayMarker();
    });
  }

  function preventNativeMenuDefault(event) {
    if (event.cancelable) event.preventDefault();
  }

  function preventGameViewportGesture(event) {
    if (currentView !== "game" || !event.cancelable) return;
    event.preventDefault();
  }

  function bindGameplayNativeGestureBlockers() {
    // Контекстное меню, выделение и перетаскивание игре не нужны нигде —
    // блокируем по всему документу (требования платформы 1.6.1.8 / 1.6.2.7).
    ["contextmenu", "selectstart", "dragstart"].forEach((type) => {
      document.addEventListener(type, preventNativeMenuDefault, { capture: true });
    });
    document.addEventListener("touchmove", preventGameViewportGesture, { passive: false });
    document.addEventListener("gesturestart", preventGameViewportGesture, { passive: false });
  }

  function clamp(value, min, max) {
    return renderer.clamp ? renderer.clamp(value, min, max) : Math.max(min, Math.min(max, value));
  }

  function isBoardEdge(point) {
    return actorsController ? actorsController.isBoardEdge(point) : false;
  }

  function lerp(from, to, progress) {
    return renderer.lerp ? renderer.lerp(from, to, progress) : from + (to - from) * progress;
  }

  function easeOutCubic(progress) {
    return renderer.easeOutCubic ? renderer.easeOutCubic(progress) : 1 - Math.pow(1 - progress, 3);
  }

  function lighten(hex, amount) {
    return renderer.lighten ? renderer.lighten(hex, amount) : hex;
  }

  function darken(hex, amount) {
    return renderer.darken ? renderer.darken(hex, amount) : hex;
  }

  initializeGame();
})();
