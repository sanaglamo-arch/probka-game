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
      dailyBase: 60,
      dailyPerfect: 25,
      dailyStreakStep: 5,
      dailyMaxStreak: 25,
      freeStars: [0, 3, 5, 7],
      limitedStars: [0, 4, 6, 9]
    }
  };
})();
