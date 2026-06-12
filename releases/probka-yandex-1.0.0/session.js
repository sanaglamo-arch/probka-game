(function () {
  function createTimerState(limitSec) {
    return {
      limitMs: limitSec * 1000,
      remainingMs: limitSec * 1000,
      lastTick: performance.now(),
      paused: false,
      finished: false
    };
  }

  function createRunState() {
    return {
      moves: 0,
      moveHistory: [],
      selected: null,
      animation: null,
      isAnimating: false,
      usedUndoInRun: false,
      activeHint: null
    };
  }

  function tickTimerState(timerState, now, canTick) {
    if (!timerState) return { expired: false };
    if (!timerState.paused && canTick) {
      const delta = Math.max(0, now - timerState.lastTick);
      timerState.remainingMs = Math.max(0, timerState.remainingMs - delta);
      if (timerState.remainingMs <= 0 && !timerState.finished) {
        timerState.finished = true;
        timerState.lastTick = now;
        return { expired: true };
      }
    }
    timerState.lastTick = now;
    return { expired: false };
  }

  function createAnimationState(config) {
    return { ...config, start: 0, progress: 0 };
  }

  function stepAnimationState(animation, now, easeOutCubic) {
    if (!animation.start) animation.start = now;
    const raw = Math.max(0, Math.min(1, (now - animation.start) / animation.duration));
    animation.progress = animation.type === "bump" ? raw : easeOutCubic(raw);
    return { raw, done: raw >= 1 };
  }

  window.PROBKA_SESSION = {
    createTimerState,
    createRunState,
    tickTimerState,
    createAnimationState,
    stepAnimationState
  };
})();
