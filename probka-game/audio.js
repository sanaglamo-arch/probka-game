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

    // --- Фоновая музыка: лёгкий казуальный луп (marimba-плаки по аккордам) ---
    // Мягкая прогрессия C–G–Am–F (I–V–vi–IV), тёплый бас + арпеджио. Без нарастания.
    let musicOn = false;
    let musicTimer = null;
    let musicBus = null;
    let musicStep = 0;
    const CHORDS = [
      { bass: 130.81, notes: [261.63, 329.63, 392.0, 523.25] }, // C:  C E G C
      { bass: 196.0, notes: [293.66, 392.0, 493.88, 587.33] }, // G:  D G B D
      { bass: 220.0, notes: [329.63, 440.0, 523.25, 659.25] }, // Am: E A C E
      { bass: 174.61, notes: [349.23, 440.0, 523.25, 698.46] } // F:  F A C F
    ];
    const ARP = [0, 1, 2, 3, 2, 1]; // паттерн по нотам аккорда

    function ensureMusicBus(context) {
      if (!musicBus || musicBus.context !== context) {
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 2000;
        filter.Q.value = 0.4;
        const gain = context.createGain();
        gain.gain.value = 0.42;
        filter.connect(gain);
        gain.connect(context.destination);
        musicBus = filter;
      }
      return musicBus;
    }

    // Короткий мягкий плак (marimba-подобный): быстрая атака, плавный спад.
    function pluck(context, bus, freq, when, dur, peak, type) {
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = type || "triangle";
      osc.frequency.setValueAtTime(freq, when);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(peak, when + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      osc.connect(g);
      g.connect(bus);
      osc.start(when);
      osc.stop(when + dur + 0.05);
    }

    function scheduleBar() {
      if (!musicOn) return;
      const context = ensure();
      if (!context) {
        musicTimer = setTimeout(scheduleBar, 1500);
        return;
      }
      const bus = ensureMusicBus(context);
      const now = context.currentTime;
      const barDur = 1.9;
      const chord = CHORDS[musicStep % CHORDS.length];
      // тёплый бас на тонику
      pluck(context, bus, chord.bass, now, 1.5, 0.05, "sine");
      pluck(context, bus, chord.bass * 2, now, 1.2, 0.022, "sine");
      // арпеджио вверх-вниз
      const step = barDur / ARP.length;
      ARP.forEach((idx, i) => {
        pluck(context, bus, chord.notes[idx], now + i * step, 0.55, 0.03);
      });
      musicStep++;
      musicTimer = setTimeout(scheduleBar, barDur * 1000);
    }

    function startMusic() {
      if (musicOn || isMuted()) return;
      musicOn = true;
      musicStep = 0;
      scheduleBar();
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
