(function () {
  function plural(value, forms) {
    const abs = Math.abs(value) % 100;
    const digit = abs % 10;
    if (abs > 10 && abs < 20) return forms[2];
    if (digit > 1 && digit < 5) return forms[1];
    if (digit === 1) return forms[0];
    return forms[2];
  }

  // formatCoinAmount delegates to the i18n-aware version when available (i18n.js loads after this file
  // and patches window.PROBKA_TEXTS). When called before i18n.js loads, it uses the RU fallback.
  function formatCoinAmount(value, options = {}) {
    const self = window.PROBKA_TEXTS;
    if (self && self.formatCoinAmountI18n) return self.formatCoinAmountI18n(value, options);
    const amount = Math.max(0, Math.round(value || 0));
    const suffix = options.short ? "жет." : plural(amount, ["жетон", "жетона", "жетонов"]);
    return `${amount} ${suffix}`;
  }

  function formatLevelCount(value) {
    const self = window.PROBKA_TEXTS;
    if (self && self.formatLevelCountI18n) return self.formatLevelCountI18n(value);
    const count = Math.max(0, Math.round(value || 0));
    return `${count} ${plural(count, ["уровень", "уровня", "уровней"])}`;
  }

  function formatTime(seconds) {
    const self = window.PROBKA_TEXTS;
    if (self && self.formatTimeI18n) return self.formatTimeI18n(seconds);
    const safe = Math.max(0, Math.ceil(seconds || 0));
    const minutes = Math.floor(safe / 60);
    const rest = String(safe % 60).padStart(2, "0");
    return `${minutes}:${rest}`;
  }

  window.PROBKA_TEXTS = {
    missions: [
      { id: "daily_complete", title: "Уровень дня", text: "Заверши ежедневный вызов", reward: 8, target: 1 },
      { id: "three_stars", title: "Три звезды", text: "Пройди уровень идеально", reward: 10, target: 1 },
      { id: "no_undo", title: "Без отмены", text: "Пройди любой уровень без отката", reward: 8, target: 1 }
    ],
    modes: {
      daily: { id: "daily", title: "Уровень дня", rule: "free", icon: "◆" },
      fallback: { id: "moves", title: "На счет ходов", rule: "moves", icon: "#" }
    },
    toasts: {
      adUnavailable: "Реклама недоступна",
      noUsefulHint: "Сейчас нет полезной подсказки"
    },
    plural,
    formatCoinAmount,
    formatLevelCount,
    formatTime
  };
})();
