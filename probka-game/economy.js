(function () {
  const config = window.PROBKA_CONFIG || {};
  const rewards = config.rewards || {};

  function clampStars(stars) {
    return Math.max(0, Math.min(3, Number(stars) || 0));
  }

  function getCampaignStarReward(item, stars, fallbackRule = "moves") {
    if (!stars) return 0;
    const rule = item && item.rule ? item.rule : fallbackRule;
    const table = rule === "free" ? rewards.freeStars : rewards.limitedStars;
    return (table || [0, 4, 6, 9])[clampStars(stars)] || 0;
  }

  function updateDailyStreak(state, dateKey, shiftDateKey) {
    const streak = state.daily.streak || { current: 0, best: 0, lastDateKey: "" };
    if (streak.lastDateKey === dateKey) return 0;
    const previous = shiftDateKey(dateKey, -1);
    const current = streak.lastDateKey === previous ? streak.current + 1 : 1;
    streak.current = current;
    streak.best = Math.max(streak.best || 0, current);
    streak.lastDateKey = dateKey;
    state.daily.streak = streak;
    return Math.min(rewards.dailyMaxStreak || 0, current * (rewards.dailyStreakStep || 0));
  }

  function getDailyRewardPreview(state, dateKey, completion, shiftDateKey) {
    if (completion && completion.rewardClaimed) return completion.perfectClaimed ? 0 : rewards.dailyPerfect;
    const streak = state.daily.streak || { current: 0, lastDateKey: "" };
    const previous = shiftDateKey(dateKey, -1);
    const nextStreak = streak.lastDateKey === previous ? streak.current + 1 : 1;
    return (rewards.dailyBase || 0) + (rewards.dailyPerfect || 0) + Math.min(rewards.dailyMaxStreak || 0, nextStreak * (rewards.dailyStreakStep || 0));
  }

  function refreshStreakForToday(state, today, previous, hasTodayCompletion) {
    const streak = state.daily.streak || { current: 0, best: 0, lastDateKey: "" };
    if (hasTodayCompletion && streak.lastDateKey !== today && streak.current === 0) {
      streak.current = 1;
      streak.best = Math.max(streak.best || 0, 1);
      streak.lastDateKey = today;
      state.daily.streak = streak;
      return true;
    }
    if (streak.lastDateKey && streak.lastDateKey !== today && streak.lastDateKey !== previous && streak.current !== 0) {
      streak.current = 0;
      state.daily.streak = streak;
      return true;
    }
    return false;
  }

  function createMissionRecord() {
    return { progress: 0, claimed: false };
  }

  function ensureDailyProgress(state) {
    if (!state.daily) state.daily = { completions: {}, archiveUnlocks: {}, attempts: {}, streak: { current: 0, best: 0, lastDateKey: "" } };
    if (!state.daily.archiveUnlocks) state.daily.archiveUnlocks = {};
    if (!state.daily.attempts) state.daily.attempts = {};
    if (!state.daily.streak) state.daily.streak = { current: 0, best: 0, lastDateKey: "" };
    if (!state.missions) state.missions = { dateKey: "", records: {} };
    if (!state.missions.records) state.missions.records = {};
  }

  function syncMissionRecords(state, missionDefinitions, dateKey) {
    ensureDailyProgress(state);
    if (state.missions.dateKey !== dateKey) {
      state.missions.dateKey = dateKey;
      state.missions.records = {};
      missionDefinitions.forEach((mission) => {
        state.missions.records[mission.id] = createMissionRecord();
      });
      return true;
    }
    let changed = false;
    missionDefinitions.forEach((mission) => {
      if (!state.missions.records[mission.id]) {
        state.missions.records[mission.id] = createMissionRecord();
        changed = true;
      }
    });
    return changed;
  }

  function advanceMission(state, missionDefinitions, id) {
    const mission = missionDefinitions.find((item) => item.id === id);
    if (!mission) return 0;
    const record = state.missions.records[id] || createMissionRecord();
    state.missions.records[id] = record;
    if (record.claimed) return 0;
    record.progress = Math.min(mission.target, (record.progress || 0) + 1);
    if (record.progress < mission.target) return 0;
    record.claimed = true;
    state.coins += mission.reward;
    return mission.reward;
  }

  function awardMissionsForCompletion(state, missionDefinitions, options) {
    let reward = 0;
    if (options.isDaily) reward += advanceMission(state, missionDefinitions, "daily_complete");
    if (options.stars === 3) reward += advanceMission(state, missionDefinitions, "three_stars");
    if (!options.usedUndo) reward += advanceMission(state, missionDefinitions, "no_undo");
    return reward;
  }

  window.PROBKA_ECONOMY = {
    rewards,
    getCampaignStarReward,
    updateDailyStreak,
    getDailyRewardPreview,
    refreshStreakForToday,
    createMissionRecord,
    ensureDailyProgress,
    syncMissionRecords,
    advanceMission,
    awardMissionsForCompletion
  };
})();
