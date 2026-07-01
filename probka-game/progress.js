(function () {
  function createStore(options) {
    const modes = options.modes || [];
    const getModeLevels = options.getModeLevels;
    const getDefaultModeId = options.getDefaultModeId;
    const storageKey = options.storageKey;
    const progressVersion = options.progressVersion || 2;
    const isAssetShowcase = options.isAssetShowcase;
    const unlockAllYards = options.unlockAllYards;
    const yards = options.yards || [];
    const yandex = options.yandex;

    function defaultOwnedYards() {
      const owned = { quiet_yard: true };
      if (unlockAllYards) yards.forEach((yard) => {
        owned[yard.id] = true;
      });
      return owned;
    }

    function defaultProgress() {
      return {
        progressVersion,
        currentLevelIndex: 0,
        lastModeId: getDefaultModeId(),
        currentLevelByMode: Object.fromEntries(modes.map((mode) => [mode.id, 0])),
        updatedAt: 0,
        coins: 0,
        hints: 3,
        completed: {},
        unlocked: Object.fromEntries(modes.map((mode) => [getModeLevels(mode.id)[0]?.id, true]).filter(([id]) => id)),
        ad: { levelsSinceInterstitial: 0, completedLevels: 0, lastInterstitialAt: 0 },
        garage: {
          ownedSkins: { classic_red: true },
          equippedSkinId: "classic_red",
          ownedYards: defaultOwnedYards(),
          equippedYardId: "quiet_yard"
        },
        daily: {
          completions: {},
          archiveUnlocks: {},
          attempts: {},
          streak: { current: 0, best: 0, lastDateKey: "" }
        },
        missions: { dateKey: "", records: {} },
        tutorial: { completedVersion: 0 },
        settings: { muted: false, haptics: true, lang: null, music: false }
      };
    }

    function normalize(progress = {}) {
      const defaults = defaultProgress();
      const oldDayProgress = progress.daily || {};
      const legacyMissions = progress.missions || {};
      const yardMigrations = (typeof window !== "undefined" && window.PROBKA_YARD_ID_MIGRATIONS) || {};
      const rawGarage = progress.garage || {};
      const ownedYards = { ...defaults.garage.ownedYards, ...(rawGarage.ownedYards || {}) };
      Object.entries(yardMigrations).forEach(([oldId, newId]) => {
        if (ownedYards[oldId]) ownedYards[newId] = true;
        delete ownedYards[oldId];
      });
      if (unlockAllYards) yards.forEach((yard) => {
        ownedYards[yard.id] = true;
      });
      const equippedYardId = yardMigrations[rawGarage.equippedYardId] || rawGarage.equippedYardId || defaults.garage.equippedYardId;
      return {
        ...defaults,
        ...progress,
        progressVersion,
        updatedAt: Number.isFinite(progress.updatedAt) ? progress.updatedAt : defaults.updatedAt,
        completed: progress.completed || defaults.completed,
        unlocked: { ...defaults.unlocked, ...(progress.unlocked || {}) },
        lastModeId: progress.lastModeId && modes.some((mode) => mode.id === progress.lastModeId) ? progress.lastModeId : defaults.lastModeId,
        currentLevelByMode: { ...defaults.currentLevelByMode, ...(progress.currentLevelByMode || {}) },
        ad: { ...defaults.ad, ...(progress.ad || {}) },
        garage: {
          ...defaults.garage,
          ...rawGarage,
          equippedYardId,
          ownedSkins: { ...defaults.garage.ownedSkins, ...(rawGarage.ownedSkins || {}) },
          ownedYards
        },
        daily: {
          ...defaults.daily,
          ...oldDayProgress,
          completions: { ...defaults.daily.completions, ...(oldDayProgress.completions || {}) },
          archiveUnlocks: { ...defaults.daily.archiveUnlocks, ...(oldDayProgress.archiveUnlocks || {}) },
          attempts: { ...defaults.daily.attempts, ...(oldDayProgress.attempts || {}) },
          streak: { ...defaults.daily.streak, ...(oldDayProgress.streak || {}) }
        },
        missions: {
          ...defaults.missions,
          ...legacyMissions,
          dateKey: legacyMissions.dateKey || oldDayProgress.missionDateKey || "",
          records: { ...defaults.missions.records, ...(legacyMissions.records || oldDayProgress.missions || {}) }
        },
        tutorial: { ...defaults.tutorial, ...(progress.tutorial || {}) },
        settings: { ...defaults.settings, ...(progress.settings || {}) }
      };
    }

    function load() {
      try {
        const raw = localStorage.getItem(storageKey);
        return normalize(raw ? JSON.parse(raw) : defaultProgress());
      } catch {
        return defaultProgress();
      }
    }

    function save(state, saveOptions = {}) {
      if (isAssetShowcase) return;
      const { touch = true, syncCloud = true, flush = false } = saveOptions;
      if (touch) state.updatedAt = Date.now();
      localStorage.setItem(storageKey, JSON.stringify(state));
      if (syncCloud && yandex && yandex.saveProgress) yandex.saveProgress(state, { flush });
    }

    return { defaultProgress, normalize, load, save };
  }

  window.PROBKA_PROGRESS = { createStore };
})();
