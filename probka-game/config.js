(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", ""]);
  const isLocal = localHosts.has(window.location.hostname);

  window.PROBKA_CONFIG = {
    progressVersion: 2,
    tutorialVersion: 1,
    storageKey: "probka_vo_dvore_progress_v1",
    urlParams,
    flags: {
      isAssetShowcase: urlParams.get("showcase") === "1",
      isQaMode: isLocal && (Boolean(urlParams.get("qa")) || urlParams.get("mockAds") === "1"),
      unlockAllYards: isLocal && urlParams.get("lockYards") !== "1"
    },
    timings: {
      moveDuration: 155,
      actorMoveDuration: 145,
      bumpDuration: 135,
      winDriveDuration: 520,
      hintDuration: 1600,
      smartHintDuration: 4600
    },
    rewards: {
      dailyBase: 70,
      dailyPerfect: 35,
      dailyStreakStep: 7,
      dailyMaxStreak: 70,
      freeStars: [0, 5, 8, 12],
      limitedStars: [0, 7, 11, 16]
    }
  };
})();
