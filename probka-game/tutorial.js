(function () {
  // i18n helper — loaded after i18n.js
  const t = (typeof window !== "undefined" && window.PROBKA_TEXTS && window.PROBKA_TEXTS.t) ? window.PROBKA_TEXTS.t.bind(window.PROBKA_TEXTS) : ((k) => k);

  // These are functions rather than constants so they always return the current language strings.
  function getMiniStepsI18n() {
    return [
      {
        label: t("tutorial.mini.0.label"),
        title: t("tutorial.mini.0.title"),
        text: t("tutorial.mini.0.text"),
        button: t("tutorial.mini.0.button")
      },
      {
        label: t("tutorial.mini.1.label"),
        title: t("tutorial.mini.1.title"),
        text: t("tutorial.mini.1.text"),
        expected: { id: "tutorial_blocker", delta: 2 }
      },
      {
        label: t("tutorial.mini.2.label"),
        title: t("tutorial.mini.2.title"),
        text: t("tutorial.mini.2.text"),
        expected: { id: "red", delta: 3 }
      }
    ];
  }

  function getMenuCardsI18n() {
    return [
      {
        title: t("tutorial.card.0.title"),
        text: t("tutorial.card.0.text"),
        focusIds: ["playButton"]
      },
      {
        title: t("tutorial.card.1.title"),
        text: t("tutorial.card.1.text"),
        focusIds: ["dailyButton"]
      },
      {
        title: t("tutorial.card.2.title"),
        text: t("tutorial.card.2.text"),
        focusIds: ["levelSelectButton"]
      },
      {
        title: t("tutorial.card.3.title"),
        text: t("tutorial.card.3.text"),
        focusIds: ["garageButton"]
      },
      {
        title: t("tutorial.card.4.title"),
        text: t("tutorial.card.4.text"),
        focusIds: ["missionsButton"]
      },
      {
        title: t("tutorial.card.5.title"),
        text: t("tutorial.card.5.text"),
        focusIds: ["statsButton"]
      }
    ];
  }

  // Keep static arrays for backward-compat (used by getMiniSteps/getMenuCards exports)
  const miniSteps = [
    {
      label: "Шаг 1 из 3",
      title: "Выведи свою машину",
      text: "Цель простая: освободи путь и выведи свою машину через правый край двора.",
      button: "Понял"
    },
    {
      label: "Шаг 2 из 3",
      title: "Сдвинь блокер",
      text: "Перетащи зеленую машину вниз. Машины ездят только вдоль своего направления.",
      expected: { id: "tutorial_blocker", delta: 2 }
    },
    {
      label: "Шаг 3 из 3",
      title: "Теперь выезжай",
      text: "Перетащи свою машину вправо до выезда.",
      expected: { id: "red", delta: 3 }
    }
  ];

  const menuCards = [
    {
      title: "Три режима",
      text: "Свободный двор — спокойно подумать. На счет ходов — пройти оптимально. На время — решить быстро.",
      focusIds: ["levelSelectButton"]
    },
    {
      title: "Уровень дня и серия",
      text: "Каждый день открыт новый сложный пазл. Проходи сегодняшний уровень, чтобы держать серию.",
      focusIds: ["dailyButton", "streakPanel"]
    },
    {
      title: "Гараж",
      text: "Монеты открывают скины твоей машины. Они не меняют правила, зато дают долгую цель.",
      focusIds: ["garageButton"]
    },
    {
      title: "Миссии",
      text: "Ежедневные задачи дают немного монет за привычные действия: пройти уровень, собрать три звезды, сыграть без отмены.",
      focusIds: ["missionsButton"]
    }
  ];

  function getMiniSteps() {
    return miniSteps;
  }

  function getMenuCards() {
    return menuCards;
  }

  function getExpectedMove(phase, step, guidedMove) {
    if (phase === "mini") {
      if (step === 1) return { id: "tutorial_blocker", delta: 2 };
      if (step === 2) return { id: "red", delta: 3 };
    }
    if (phase === "guided") return guidedMove || null;
    return null;
  }

  function createController(deps) {
    function getCards() {
      return getMenuCardsI18n();
    }

    function updateStep() {
      const state = deps.getTutorialState();
      if (!state || !state.active) return;
      const els = deps.getEls();
      const overlay = els.tutorialOverlay;
      if (!overlay) return;
      overlay.hidden = false;
      deps.syncTutorialLock();

      const currentMiniSteps = getMiniStepsI18n();
      const currentMenuCards = getMenuCardsI18n();

      if (state.phase === "mini") {
        const step = currentMiniSteps[state.step] || currentMiniSteps[0];
        setCard(step);
        if (step.expected) deps.showExpectedHint(step.expected);
        return;
      }

      if (state.phase === "cards") {
        const card = currentMenuCards[state.step];
        if (!card) {
          deps.startGuidedLevel();
          return;
        }
        setCard({
          label: t("tutorial.menu.label", { n: state.step + 1, total: currentMenuCards.length }),
          title: card.title,
          text: card.text,
          button: t("tutorial.btn.next"),
          focusIds: card.focusIds || []
        });
        return;
      }

      if (state.phase === "guided") {
        const move = getGuidedMove();
        setCard({
          label: t("tutorial.guided.label"),
          title: move ? t("tutorial.guided.move.title") : t("tutorial.guided.finish.title"),
          text: move ? t("tutorial.guided.move.text") : t("tutorial.guided.finish.text"),
          expected: move || null
        });
        if (move) deps.showExpectedHint(move);
      }
      deps.syncTutorialLock();
    }

    function positionCardForFocus(ids) {
      const els = deps.getEls();
      const overlay = els.tutorialOverlay;
      if (!overlay) return;
      const id = (ids || [])[0];
      const target = id ? document.getElementById(id) : null;
      if (!target) {
        overlay.classList.remove("at-top");
        overlay.removeAttribute("data-arrow");
        return;
      }
      try {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch (err) {
        /* старые браузеры */
      }
      const place = () => {
        const rect = target.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const lower = mid > window.innerHeight * 0.5;
        // подсвеченный элемент в нижней половине → карточку вверх (стрелка вниз), иначе наоборот
        overlay.classList.toggle("at-top", lower);
        overlay.setAttribute("data-arrow", lower ? "down" : "up");
      };
      requestAnimationFrame(place);
      setTimeout(place, 240);
    }

    function setCard(step) {
      const els = deps.getEls();
      setDomFocus(step.focusIds || []);
      positionCardForFocus(step.focusIds || []);
      if (els.tutorialStepLabel) els.tutorialStepLabel.textContent = step.label || t("tutorial.step.label");
      if (els.tutorialTitle) els.tutorialTitle.textContent = step.title || "";
      if (els.tutorialText) els.tutorialText.textContent = step.text || "";
      if (els.tutorialNextButton) {
        els.tutorialNextButton.hidden = Boolean(step.expected);
        els.tutorialNextButton.textContent = step.button || t("tutorial.btn.next");
      }
      deps.syncTutorialLock();
    }

    function setDomFocus(ids) {
      document.querySelectorAll(".tutorial-focus-target").forEach((element) => {
        element.classList.remove("tutorial-focus-target");
      });
      (ids || []).forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.classList.add("tutorial-focus-target");
      });
    }

    function advanceCard() {
      const state = deps.getTutorialState();
      if (!state || !state.active || deps.isAnimating()) return;
      deps.playSound("button");
      if (state.phase === "mini") {
        const currentMiniSteps = getMiniStepsI18n();
        state.step = Math.min(1, state.step + 1);
        updateStep();
        deps.draw();
        return;
      }
      if (state.phase === "cards") {
        state.step += 1;
        updateStep();
      }
    }

    function getExpectedMoveFromState() {
      const state = deps.getTutorialState();
      if (!state || !state.active) return null;
      const guidedMove = state.phase === "guided" ? getGuidedMove() : null;
      return getExpectedMove(state.phase, state.step, guidedMove);
    }

    function getGuidedMove() {
      const level = deps.getLevel();
      const state = deps.getTutorialState();
      if (!level || !state || !Array.isArray(level.solutionPlan)) return null;
      return level.solutionPlan[state.guidedIndex] || null;
    }

    return {
      getCards,
      updateStep,
      setCard,
      setDomFocus,
      advanceCard,
      getExpectedMove: getExpectedMoveFromState,
      getGuidedMove
    };
  }

  window.PROBKA_TUTORIAL = {
    createController,
    getMiniSteps,
    getMenuCards,
    getMiniStepsI18n,
    getMenuCardsI18n,
    getExpectedMove
  };
})();
