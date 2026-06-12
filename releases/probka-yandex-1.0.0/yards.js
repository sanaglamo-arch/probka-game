(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  const GRID_FRAME = { left: 120, top: 120, right: 904, bottom: 904 };

  const ID_MIGRATIONS = {
    old_district: "old_block_yard",
    forest_reference: "forest_yard"
  };

  const themeData = [
    {
      id: "quiet_yard",
      name: "Тихий городской двор",
      price: 0,
      rarity: "Стартовый",
      concept: "город",
      environment: "quiet_city",
      description: "Чистый асфальт, аккуратный бордюр и спокойная разметка.",
      palette: { accent: "#78adff", line: "#d9b766", exit: "#77d7a6", base: "#151b24" },
      assetVersion: "quiet-v2",
      gridFrame: { left: 125, top: 125, right: 845, bottom: 845 }
    },
    {
      id: "night_yard",
      name: "Ночной двор",
      price: 1500,
      rarity: "Редкий",
      concept: "фонари",
      environment: "night_city",
      description: "Темный асфальт, теплые фонари и мягкие блики на машинах.",
      palette: { accent: "#ffb86b", line: "#c88b45", exit: "#57c995", base: "#090c14" },
      assetVersion: "night-v2",
      gridFrame: { left: 132, top: 174, right: 824, bottom: 866 }
    },
    {
      id: "winter_yard",
      name: "Зимний двор",
      price: 3000,
      rarity: "Редкий",
      concept: "снег",
      environment: "winter_premium",
      description: "Снег по краям, следы шин, ледяной бордюр и зимние машины.",
      palette: { accent: "#8fd4ff", line: "#e7edf5", exit: "#65cba1", base: "#d5e8f4" },
      assetVersion: "winter-v5",
      gridFrame: { left: 145, top: 145, right: 840, bottom: 840 }
    },
    {
      id: "forest_yard",
      name: "Лесная парковка",
      price: 4200,
      rarity: "Редкий",
      concept: "листья",
      environment: "forest_parking",
      description: "Каменная плитка, мох, листья, лесной бордюр и природный выезд.",
      palette: { accent: "#8aa265", line: "#d0b34c", exit: "#d0b34c", base: "#11190f" },
      assetVersion: "forest-v5",
      gridFrame: { left: 165, top: 165, right: 825, bottom: 825 }
    },
    {
      id: "rainy_yard",
      name: "Дождливый двор",
      price: 5600,
      rarity: "Премиум",
      concept: "дождь",
      environment: "rainy_yard",
      description: "Мокрый асфальт, лужи, отражения разметки и блеск на кузове.",
      palette: { accent: "#7dbbff", line: "#9dc9d3", exit: "#6ee5b2", base: "#0a1218" },
      assetVersion: "rainy-v2",
      gridFrame: { left: 132, top: 132, right: 817, bottom: 817 }
    },
    {
      id: "underground_parking",
      name: "Подземная парковка",
      price: 7000,
      rarity: "Премиум",
      concept: "бетон",
      environment: "underground_parking",
      description: "Бетон, колонны, строгая разметка и холодный свет ламп.",
      palette: { accent: "#b9c6d8", line: "#e1be55", exit: "#58c98f", base: "#191c22" },
      assetVersion: "underground-v2",
      gridFrame: { left: 155, top: 155, right: 816, bottom: 816 }
    },
    {
      id: "business_center",
      name: "Бизнес-центр",
      price: 9000,
      rarity: "Премиум",
      concept: "премиум",
      environment: "business_center",
      description: "Чистая парковка, ровные линии, стеклянный холодный свет.",
      palette: { accent: "#78adff", line: "#b8c6d8", exit: "#5fd0a0", base: "#101824" },
      assetVersion: "business-v2",
      gridFrame: { left: 160, top: 160, right: 832, bottom: 832 }
    },
    {
      id: "old_block_yard",
      name: "Старый район",
      price: 11000,
      rarity: "Премиум",
      concept: "трещины",
      environment: "old_block",
      description: "Потертый асфальт, трещины, ржавые детали и выцветшая разметка.",
      palette: { accent: "#7fac72", line: "#b7a05a", exit: "#64bd86", base: "#1e211a" },
      assetVersion: "oldblock-v2",
      gridFrame: { left: 150, top: 150, right: 820, bottom: 820 }
    },
    {
      id: "neon_yard",
      name: "Неоновая парковка",
      price: 13500,
      rarity: "Легенда",
      concept: "неон",
      environment: "neon_yard",
      description: "Темная база, cyan/purple линии и сдержанные неоновые отражения.",
      palette: { accent: "#b889ff", line: "#5ff2ff", exit: "#66f2b6", base: "#090a18" },
      assetVersion: "neon-v2",
      gridFrame: { left: 150, top: 150, right: 835, bottom: 835 }
    },
    {
      id: "holiday_yard",
      name: "Праздничный двор",
      price: 16000,
      rarity: "Легенда",
      concept: "гирлянды",
      environment: "holiday_yard",
      description: "Теплый свет, гирлянды по краям и праздничные детали без шума.",
      palette: { accent: "#ff7a86", line: "#ffd166", exit: "#70d59c", base: "#251615" },
      assetVersion: "holiday-v1",
      gridFrame: { left: 140, top: 140, right: 829, bottom: 829 }
    }
  ];

  function withVersion(source, version) {
    return version ? `${source}?v=${version}` : source;
  }

  function assetManifest(id, version) {
    const base = `./assets/yards/${id}`;
    return {
      board: withVersion(`${base}/board.png`, version),
      traffic: {
        car2Horizontal: withVersion(`${base}/traffic/car-2-h.png`, version),
        car2Vertical: withVersion(`${base}/traffic/car-2-v.png`, version),
        van3Horizontal: withVersion(`${base}/traffic/van-3-h.png`, version),
        van3Vertical: withVersion(`${base}/traffic/van-3-v.png`, version)
      },
      obstacles: {
        bin: withVersion(`${base}/obstacles/bin.png`, version),
        cone: withVersion(`${base}/obstacles/cone.png`, version),
        gate: withVersion(`${base}/obstacles/gate.png`, version),
        themeBlock: withVersion(`${base}/obstacles/theme-block.png`, version),
        snow: withVersion(`${base}/obstacles/theme-block.png`, version)
      }
    };
  }

  function normalizeGridFrame(frame) {
    return { ...GRID_FRAME, ...(frame || {}) };
  }

  function makeExitFrame(frame) {
    const cell = (frame.bottom - frame.top) / 6;
    return {
      row: 2,
      x: frame.right,
      y: frame.top + cell * 2,
      width: 1024 - frame.right,
      height: cell
    };
  }

  const YARDS = themeData.map((yard) => {
    const frame = normalizeGridFrame(yard.gridFrame);
    return {
      ...yard,
      preview: {
        base: yard.palette.base,
        asphalt: yard.palette.base,
        line: yard.palette.line,
        accent: yard.palette.accent,
        exit: yard.palette.exit
      },
      fullArtBoard: true,
      boardStyle: yard.environment,
      obstacleStyle: yard.environment,
      winFx: yard.environment,
      gridFrame: frame,
      exitFrame: makeExitFrame(frame),
      assets: assetManifest(yard.id, yard.assetVersion)
    };
  });

  root.PROBKA_YARDS = YARDS;
  root.PROBKA_YARD_ID_MIGRATIONS = ID_MIGRATIONS;
  root.PROBKA_YARD_ASSET_STANDARD = {
    board: { width: 1024, height: 1024 },
    gridFrame: GRID_FRAME,
    exitFrame: makeExitFrame(GRID_FRAME),
    vehicles: {
      car2Horizontal: { width: 768, height: 384 },
      car2Vertical: { width: 384, height: 768 },
      van3Horizontal: { width: 1152, height: 384 },
      van3Vertical: { width: 384, height: 1152 }
    },
    obstacles: {
      bin: { width: 512, height: 512 },
      cone: { width: 512, height: 512 },
      gate: { width: 512, height: 512 },
      themeBlock: { width: 512, height: 512 }
    }
  };
})();
