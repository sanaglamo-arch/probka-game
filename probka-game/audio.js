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

    // Общая мягкая шина эффектов: lowpass убирает резкие верхи, мастер-гейн
    // держит общую громкость ровной — звуки звучат тепло и цельно.
    let sfxBus = null;
    function ensureSfxBus(context) {
      if (!sfxBus || sfxBus.context !== context) {
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 2400;
        filter.Q.value = 0.5;
        const master = context.createGain();
        master.gain.value = 0.85;
        filter.connect(master);
        master.connect(context.destination);
        sfxBus = filter;
      }
      return sfxBus;
    }

    function play(name) {
      if (isMuted()) return;
      const context = ensure();
      if (!context) return;
      const bus = ensureSfxBus(context);
      // [частота, длительность, форма, громкость, задержка, атака]
      const sounds = {
        button: [[470, 0.05, "sine", 0.05, 0, 0.008]],
        move: [[208, 0.07, "triangle", 0.045, 0, 0.006], [330, 0.06, "sine", 0.03, 0.025, 0.006]],
        actor: [[300, 0.06, "sine", 0.032, 0, 0.006]],
        bump: [[124, 0.11, "sine", 0.06, 0, 0.004], [82, 0.14, "sine", 0.04, 0, 0.004]],
        select: [[360, 0.03, "sine", 0.035, 0, 0.005]],
        win: [
          [523.25, 0.16, "sine", 0.05, 0, 0.012],
          [659.25, 0.16, "sine", 0.05, 0.1, 0.012],
          [783.99, 0.16, "sine", 0.055, 0.2, 0.012],
          [1046.5, 0.36, "sine", 0.05, 0.32, 0.014]
        ],
        star: [[880, 0.09, "sine", 0.04, 0, 0.006], [1318.5, 0.12, "sine", 0.03, 0.05, 0.006]],
        coin: [[698.46, 0.06, "sine", 0.045, 0, 0.005], [1046.5, 0.1, "sine", 0.035, 0.05, 0.006]],
        hint: [[740, 0.07, "sine", 0.035, 0, 0.008], [988, 0.09, "sine", 0.03, 0.055, 0.008]]
      };
      (sounds[name] || sounds.button).forEach(([frequency, duration, type, volume, delay = 0, attack = 0.012]) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + delay;
        const end = start + duration;
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(gain);
        gain.connect(bus);
        osc.start(start);
        osc.stop(end + 0.03);
      });
    }

    // --- Фоновая музыка: мягкий генеративный эмбиент на пентатонике ---
    // Пентатоника + тихий sine + медленные ноты практически не дают диссонанса.
    let musicOn = false;
    let musicTimer = null;
    let musicBus = null;
    const PENTA = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0]; // A-minor pentatonic

    let droneNodes = null;
    function ensureMusicBus(context) {
      if (!musicBus || musicBus.context !== context) {
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1300;
        filter.Q.value = 0.4;
        const gain = context.createGain();
        gain.gain.value = 0.5;
        filter.connect(gain);
        gain.connect(context.destination);
        musicBus = filter;
      }
      return musicBus;
    }

    // Спокойный дрон (тоника A + квинта E) — тёплая подложка без нарастания.
    function startDrone(context, bus) {
      if (droneNodes) return;
      const now = context.currentTime;
      const g = context.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.022, now + 3.5);
      const a = context.createOscillator();
      a.type = "sine";
      a.frequency.value = 110.0;
      const e = context.createOscillator();
      e.type = "sine";
      e.frequency.value = 164.81;
      a.connect(g);
      e.connect(g);
      g.connect(bus);
      a.start(now);
      e.start(now);
      droneNodes = { a, e, g };
    }

    function stopDrone() {
      if (!droneNodes || !audioCtx) {
        droneNodes = null;
        return;
      }
      const now = audioCtx.currentTime;
      const { a, e, g } = droneNodes;
      try {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
        a.stop(now + 1.7);
        e.stop(now + 1.7);
      } catch (err) {
        /* узлы уже остановлены */
      }
      droneNodes = null;
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
      startDrone(context, bus);
      const now = context.currentTime;
      const freq = PENTA[Math.floor(Math.random() * PENTA.length)] * (Math.random() < 0.25 ? 0.5 : 1);
      const dur = 2.8 + Math.random() * 2.4;
      voice(context, bus, freq, now, dur, 0.045);
      if (Math.random() < 0.4) voice(context, bus, freq * 1.5, now, dur, 0.026); // тихая квинта
      musicTimer = setTimeout(scheduleNote, 1800 + Math.random() * 2000);
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
      stopDrone();
    }

    return { play, pause, resume, startMusic, stopMusic, isMusicOn: () => musicOn };
  }

  window.PROBKA_AUDIO = { createController };
})();
