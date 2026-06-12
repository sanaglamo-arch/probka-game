(function () {
  function createController(deps) {
    let isOpen = false;

    function getIsOpen() {
      return isOpen;
    }

    async function showRewarded(options = {}) {
      if (isOpen) return false;
      if (deps.blockTutorialEscape()) return false;
      const result = await runAdPause(() => {
        const yandex = deps.getYandex();
        return yandex && yandex.showRewarded ? yandex.showRewarded({ title: options.title, text: options.text }) : Promise.resolve({ rewarded: false });
      });
      if (result && result.rewarded) {
        if (options.onRewarded) options.onRewarded();
        return true;
      }
      deps.playSound("bump");
      deps.showToast("Реклама недоступна");
      if (options.onUnavailable) options.onUnavailable(result);
      return false;
    }

    async function showFullscreen(callback) {
      if (isOpen) return;
      if (deps.blockTutorialEscape()) return;
      await runAdPause(() => {
        const yandex = deps.getYandex();
        return yandex && yandex.showFullscreen ? yandex.showFullscreen() : Promise.resolve({ shown: false });
      });
      if (callback) callback();
    }

    async function runAdPause(showAdCallback) {
      isOpen = true;
      deps.setAdOpen(true);
      deps.playSound("button");
      deps.pauseTimer();
      deps.updateGameplayMarker();
      deps.pauseAudio();
      try {
        return await showAdCallback();
      } finally {
        isOpen = false;
        deps.setAdOpen(false);
        if (deps.canResumeAfterAd()) deps.resumeTimer();
        deps.updateGameplayMarker();
        deps.resumeAudio();
      }
    }

    return {
      getIsOpen,
      showRewarded,
      showFullscreen,
      runAdPause
    };
  }

  window.PROBKA_ADS = {
    createController
  };
})();
