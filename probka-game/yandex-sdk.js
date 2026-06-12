(function () {
  const defaultLanguage = "ru";
  const cloudKey = "progress";
  const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", ""]);
  const isLocal = localHosts.has(window.location.hostname);
  const configuredSdkSrc = window.PROBKA_YANDEX_SDK_SRC || (isLocal ? "" : "/sdk.js");

  let initPromise = null;
  let ysdk = null;
  let player = null;
  let environment = { i18n: { lang: defaultLanguage }, app: { id: "" } };
  let saveTimer = null;
  let pendingProgress = null;
  let lastError = "";
  let pauseHandler = null;
  let resumeHandler = null;

  function snapshot() {
    return {
      available: Boolean(ysdk),
      cloudAvailable: Boolean(player && player.setData && player.getData),
      environment,
      language: getLanguage(),
      lastError
    };
  }

  function getLanguage() {
    return environment && environment.i18n && environment.i18n.lang ? environment.i18n.lang : defaultLanguage;
  }

  function shouldUseLocalMockAds() {
    const params = new URLSearchParams(window.location.search);
    return isLocal && params.get("mockAds") !== "0";
  }

  function loadSdkScript() {
    if (!configuredSdkSrc || window.YaGames) return Promise.resolve();
    return new Promise((resolve) => {
      const existing = document.querySelector(`script[src="${configuredSdkSrc}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", resolve, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = configuredSdkSrc;
      script.async = true;
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });
  }

  async function init(options = {}) {
    pauseHandler = options.onPause || pauseHandler;
    resumeHandler = options.onResume || resumeHandler;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      await loadSdkScript();
      if (!window.YaGames || !window.YaGames.init) return snapshot();

      try {
        ysdk = await window.YaGames.init();
        environment = ysdk.environment || environment;
        bindPlatformEvents();
        try {
          player = await ysdk.getPlayer({ scopes: false });
        } catch (error) {
          lastError = getErrorMessage(error);
          player = null;
        }
      } catch (error) {
        lastError = getErrorMessage(error);
        ysdk = null;
      }
      return snapshot();
    })();

    return initPromise;
  }

  function bindPlatformEvents() {
    if (!ysdk || !ysdk.on) return;
    ysdk.on("game_api_pause", () => {
      if (pauseHandler) pauseHandler();
    });
    ysdk.on("game_api_resume", () => {
      if (resumeHandler) resumeHandler();
    });
  }

  function ready() {
    try {
      ysdk?.features?.LoadingAPI?.ready?.();
    } catch (error) {
      lastError = getErrorMessage(error);
    }
  }

  function gameplayStart() {
    try {
      ysdk?.features?.GameplayAPI?.start?.();
    } catch (error) {
      lastError = getErrorMessage(error);
    }
  }

  function gameplayStop() {
    try {
      ysdk?.features?.GameplayAPI?.stop?.();
    } catch (error) {
      lastError = getErrorMessage(error);
    }
  }

  async function loadProgress() {
    if (!player || !player.getData) return null;
    try {
      const data = await player.getData([cloudKey]);
      return data && data[cloudKey] ? data[cloudKey] : null;
    } catch (error) {
      lastError = getErrorMessage(error);
      return null;
    }
  }

  function saveProgress(progress, options = {}) {
    if (!player || !player.setData) return Promise.resolve(false);
    pendingProgress = sanitizeProgress(progress);
    if (options.flush) return flushProgress();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushProgress, 2500);
    return Promise.resolve(true);
  }

  async function flushProgress() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!player || !player.setData || !pendingProgress) return false;
    const payload = pendingProgress;
    pendingProgress = null;
    try {
      await player.setData({ [cloudKey]: payload }, true);
      return true;
    } catch (error) {
      lastError = getErrorMessage(error);
      return false;
    }
  }

  function sanitizeProgress(progress) {
    return JSON.parse(JSON.stringify(progress || {}));
  }

  function showRewarded() {
    if (shouldUseLocalMockAds()) return delayMockAd({ rewarded: true, shown: true, mock: true });
    if (!ysdk || !ysdk.adv || !ysdk.adv.showRewardedVideo) return Promise.resolve({ rewarded: false, shown: false, error: "ad_unavailable" });

    return new Promise((resolve) => {
      let rewarded = false;
      let resolved = false;
      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };
      try {
        ysdk.adv.showRewardedVideo({
          callbacks: {
            onRewarded: () => {
              rewarded = true;
            },
            onClose: (wasShown) => finish({ rewarded, shown: Boolean(wasShown) }),
            onError: (error) => {
              lastError = getErrorMessage(error);
              finish({ rewarded: false, shown: false, error: lastError });
            }
          }
        });
      } catch (error) {
        lastError = getErrorMessage(error);
        finish({ rewarded: false, shown: false, error: lastError });
      }
    });
  }

  function showFullscreen() {
    if (shouldUseLocalMockAds()) return delayMockAd({ rewarded: false, shown: false, mock: true });
    if (!ysdk || !ysdk.adv || !ysdk.adv.showFullscreenAdv) return Promise.resolve({ shown: false, error: "ad_unavailable" });

    return new Promise((resolve) => {
      let resolved = false;
      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };
      try {
        ysdk.adv.showFullscreenAdv({
          callbacks: {
            onClose: (wasShown) => finish({ shown: Boolean(wasShown) }),
            onError: (error) => {
              lastError = getErrorMessage(error);
              finish({ shown: false, error: lastError });
            }
          }
        });
      } catch (error) {
        lastError = getErrorMessage(error);
        finish({ shown: false, error: lastError });
      }
    });
  }

  function delayMockAd(result) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(result), 280);
    });
  }

  async function showBanner() {
    try {
      return ysdk?.adv?.showBannerAdv ? await ysdk.adv.showBannerAdv() : { stickyAdvIsShowing: false };
    } catch (error) {
      lastError = getErrorMessage(error);
      return { stickyAdvIsShowing: false };
    }
  }

  async function hideBanner() {
    try {
      return ysdk?.adv?.hideBannerAdv ? await ysdk.adv.hideBannerAdv() : { stickyAdvIsShowing: false };
    } catch (error) {
      lastError = getErrorMessage(error);
      return { stickyAdvIsShowing: false };
    }
  }

  function getErrorMessage(error) {
    return error && error.message ? error.message : String(error || "");
  }

  window.PROBKA_YANDEX = {
    init,
    ready,
    gameplayStart,
    gameplayStop,
    loadProgress,
    saveProgress,
    flushProgress,
    showRewarded,
    showFullscreen,
    showBanner,
    hideBanner,
    getLanguage,
    getStatus: snapshot
  };
})();
