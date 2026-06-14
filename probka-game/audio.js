(function () {
  function createController(isMuted) {
    let audioCtx = null;

    function ensure() {
      if (isMuted()) return null;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      if (!audioCtx) audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    }

    function pause() {
      if (audioCtx && audioCtx.state === "running") audioCtx.suspend().catch(() => {});
    }

    function resume() {
      if (!isMuted() && audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    }

    function play(name) {
      if (isMuted()) return;
      const context = ensure();
      if (!context) return;
      const sounds = {
        button: [[420, 0.035, "sine", 0.035]],
        move: [[190, 0.055, "triangle", 0.05], [260, 0.045, "triangle", 0.035, 0.035]],
        actor: [[310, 0.045, "triangle", 0.035]],
        bump: [[115, 0.07, "sawtooth", 0.035]],
        select: [[300, 0.022, "sine", 0.03]],
        win: [
          [300, 0.09, "sine", 0.045, 0],
          [450, 0.09, "sine", 0.06, 0.08],
          [600, 0.1, "sine", 0.07, 0.17],
          [750, 0.1, "sine", 0.065, 0.27],
          [900, 0.14, "sine", 0.055, 0.38]
        ],
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

    // --- Фоновая музыка: мягкий генеративный эмбиент на пентатонике ---
    // Пентатоника + тихий sine + медленные ноты практически не дают диссонанса.
    let musicOn = false;
    let musicTimer = null;
    let musicBus = null;
    const PENTA = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0]; // A-minor pentatonic

    function ensureMusicBus(context) {
      if (!musicBus || musicBus.context !== context) {
        musicBus = context.createGain();
        musicBus.gain.value = 0.6;
        musicBus.connect(context.destination);
      }
      return musicBus;
    }

    function voice(context, bus, freq, now, dur, peak) {
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(peak, now + 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(g);
      g.connect(bus);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    }

    function scheduleNote() {
      if (!musicOn) return;
      const context = ensure();
      if (!context) {
        musicTimer = setTimeout(scheduleNote, 1500);
        return;
      }
      const bus = ensureMusicBus(context);
      const now = context.currentTime;
      const freq = PENTA[Math.floor(Math.random() * PENTA.length)] * (Math.random() < 0.25 ? 0.5 : 1);
      const dur = 2.6 + Math.random() * 2.2;
      voice(context, bus, freq, now, dur, 0.05);
      if (Math.random() < 0.4) voice(context, bus, freq * 1.5, now, dur, 0.03); // тихая квинта
      musicTimer = setTimeout(scheduleNote, 1600 + Math.random() * 1800);
    }

    function startMusic() {
      if (musicOn || isMuted()) return;
      musicOn = true;
      scheduleNote();
    }

    function stopMusic() {
      musicOn = false;
      if (musicTimer) {
        clearTimeout(musicTimer);
        musicTimer = null;
      }
    }

    return { play, pause, resume, startMusic, stopMusic, isMusicOn: () => musicOn };
  }

  window.PROBKA_AUDIO = { createController };
})();
