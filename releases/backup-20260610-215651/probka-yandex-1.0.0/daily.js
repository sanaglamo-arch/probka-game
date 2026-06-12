(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const TIME_ZONE = "Europe/Moscow";
  const DAILY_SIZE = 6;
  const CAR_COLORS = ["#4aa3ff", "#55d6a8", "#ffd166", "#e8edf2", "#b889ff", "#ff9f43", "#9ba6b2"];
  const OBSTACLE_KINDS = ["bin", "cone", "snow", "gate"];
  const DAILY_CLASSIC_LAYOUTS = [
    layout(52, "oxCCMNDDDKMNAAJKooooJEEoIFFLooIGGLox", "fogleman/rush", 1),
    layout(53, "ooBBoxDDDKooAAJKoMooJEEMIFFLooIGGLox", "fogleman/rush", 2),
    layout(53, "ooBBoxDDDKooAAJKoMooJEEMIFFLooIGGLHH", "fogleman/rush", 3),
    layout(53, "BBBCCNDDoxMNJAAoMOJoKFFOGGKLooxIILoo", "fogleman/rush", 4),
    layout(54, "BBBKCCDDoKoLIAAKoLIoJEEMFFJooMooxoHH", "fogleman/rush", 5),
    layout(54, "oooJxoCCCJLoHAAKLoHoIKDDooIEEMoFFoxM", "fogleman/rush", 6),
    layout(54, "oooJLxCCCJLoHAAKooHoIKDDooIEEMoFFoxM", "fogleman/rush", 7),
    layout(54, "oxCCMoDDDKMoAAJKooooJLEEIFFLoNIGGoxN", "fogleman/rush", 8),
    layout(55, "ooBBMxDDDKMoAAJKoNooJEENIFFLooIGGLHH", "fogleman/rush", 9),
    layout(55, "ooBBMxDDDKMoAAJKoNooJEENIFFLooIGGLox", "fogleman/rush", 10),
    layout(58, "BBoKMxDDDKMoIAALooIoJLEEooJFFNoGGoxN", "fogleman/rush", 11),
    layout(60, "IBBxooIooLDDJAALooJoKEEMFFKooMGGHHHM", "fogleman/rush", 12)
  ];

  const SKINS = [
    { id: "classic_red", name: "Красная классика", price: 0, color: "#ff5c68", accent: "#fff2a8", trim: "#2d1118", pattern: "rally", badge: "01" },
    { id: "taxi_yellow", name: "Шашечный рывок", price: 180, color: "#ffd166", accent: "#2d2100", trim: "#fff2a8", pattern: "checker", badge: "T" },
    { id: "mint_courier", name: "Курьерский болид", price: 320, color: "#55d6a8", accent: "#ffcc4d", trim: "#113d34", pattern: "parcel", badge: "GO" },
    { id: "pizza_mobile", name: "Пицца-мобиль", price: 520, color: "#f05d3b", accent: "#ffe066", trim: "#3d1711", pattern: "pizza", badge: "PZ" },
    { id: "night_blue", name: "Ночной неон", price: 780, color: "#4aa3ff", accent: "#8ff7ff", trim: "#101a35", pattern: "neon", badge: "N" },
    { id: "yard_police", name: "Дворовая полиция", price: 1100, color: "#e8edf2", accent: "#4aa3ff", trim: "#10223d", pattern: "siren", badge: "02" },
    { id: "yard_ambulance", name: "Скорая во дворе", price: 1480, color: "#f7fbff", accent: "#f0707c", trim: "#1c2a36", pattern: "medical", badge: "03" },
    { id: "fire_lane", name: "Пожарный проезд", price: 1900, color: "#e94343", accent: "#ffd166", trim: "#3d1010", pattern: "hazard", badge: "01" },
    { id: "retro_volga", name: "Ретро-Волга", price: 2380, color: "#7fd1c7", accent: "#f5e4bc", trim: "#123d3a", pattern: "retro", badge: "21" },
    { id: "business_taxi", name: "Такси бизнес", price: 2920, color: "#181f2c", accent: "#ffd166", trim: "#0a0f18", pattern: "business", badge: "B" },
    { id: "sticker_drifter", name: "Дрифтер с наклейками", price: 3520, color: "#b889ff", accent: "#ff7ad9", trim: "#24143d", pattern: "stickers", badge: "DR" },
    { id: "violet_share", name: "Каршеринг 77", price: 4200, color: "#7c8cff", accent: "#66d6a6", trim: "#171d44", pattern: "comet", badge: "77" },
    { id: "ice_chrome", name: "Ледяной хром", price: 4960, color: "#bfe8ff", accent: "#ffffff", trim: "#2d5f75", pattern: "chrome", badge: "ICE" },
    { id: "graffiti_coupe", name: "Граффити-купе", price: 5800, color: "#55d6a8", accent: "#ff7ad9", trim: "#113d34", pattern: "graffiti", badge: "ART" },
    { id: "cyber_yard", name: "Кибер-двор", price: 6720, color: "#121a2d", accent: "#66f2ff", trim: "#5d6bff", pattern: "cyber", badge: "AI" },
    { id: "gold_yard", name: "Золотая легенда", price: 7720, color: "#ff9f43", accent: "#fff2a8", trim: "#4a2600", pattern: "crown", badge: "VIP" },
    { id: "black_vip", name: "Черный VIP", price: 8800, color: "#0d111a", accent: "#d8b56d", trim: "#020409", pattern: "vip", badge: "VIP" },
    { id: "tow_final", name: "Финальный эвакуатор", price: 10000, color: "#ffb84d", accent: "#1c2433", trim: "#5f3300", pattern: "tow", badge: "TOW" }
  ];

  root.PROBKA_SKINS = SKINS;
  root.PROBKA_DAILY = {
    getDateKey,
    getDailyLevel,
    solveLevel
  };

  function layout(moves, board, source, sourceIndex) {
    return { moves, board, source, sourceIndex };
  }

  function getDateKey(date = new Date()) {
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = {};
    parts.forEach((part) => {
      if (part.type !== "literal") values[part.type] = part.value;
    });
    return `${values.year}-${values.month}-${values.day}`;
  }

  function getDailyLevel(date = new Date()) {
    const dateKey = getDateKey(date);
    const seed = hashString(`probka-classic-daily-v1:${dateKey}`);
    const source = DAILY_CLASSIC_LAYOUTS[seed % DAILY_CLASSIC_LAYOUTS.length];
    const flipVertical = Math.floor(seed / DAILY_CLASSIC_LAYOUTS.length) % 2 === 1;
    const board = flipVertical ? flipBoardVertical(source.board) : source.board;
    const level = parseClassicBoard(board, {
      id: `daily_${dateKey.replace(/-/g, "_")}`,
      packId: "daily",
      title: "Уровень дня",
      introText: `Двор дня: ${dateKey}`,
      seed,
      sourceMeta: {
        kind: "classic_rush_hour_daily",
        source: source.source,
        sourceIndex: source.sourceIndex,
        sourceBoard: source.board,
        board,
        sourceMoves: source.moves,
        variant: flipVertical ? "vertical_flip" : "base"
      }
    });

    if (typeof document !== "undefined") {
      return finalizeDailyLevel(level, { solved: true, minMoves: source.moves, explored: 0, method: "classic-meta" });
    }

    const solved = solveLevel(level, source.moves + 14, 500000);
    if (!solved.solved) {
      throw new Error(`${level.id}: daily classic source is unsolved`);
    }
    return finalizeDailyLevel(level, solved);
  }

  function parseClassicBoard(board, metadata) {
    if (board.length !== DAILY_SIZE * DAILY_SIZE) throw new Error(`${metadata.id}: classic board must be 36 cells`);
    const groups = new Map();
    const obstacles = [];

    for (let index = 0; index < board.length; index += 1) {
      const mark = board[index];
      const x = index % DAILY_SIZE;
      const y = Math.floor(index / DAILY_SIZE);
      if (mark === "o" || mark === ".") continue;
      if (mark === "x") {
        obstacles.push({ id: `obstacle_${obstacles.length + 1}`, kind: OBSTACLE_KINDS[obstacles.length % OBSTACLE_KINDS.length], x, y });
        continue;
      }
      if (!groups.has(mark)) groups.set(mark, []);
      groups.get(mark).push({ x, y });
    }

    const vehicles = Array.from(groups.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([mark, cells], index) => makeClassicVehicle(mark, cells, index));
    const target = vehicles.find((vehicle) => vehicle.id === "red");
    if (!target) throw new Error(`${metadata.id}: missing target car`);

    return {
      ...metadata,
      difficulty: 10,
      difficultyScore: 0,
      minMoves: 0,
      searchStates: 0,
      width: DAILY_SIZE,
      height: DAILY_SIZE,
      exit: { side: "right", row: target.y },
      targetVehicleId: "red",
      targetMoves: { threeStars: 3, twoStars: 5 },
      moveLimit: null,
      vehicles,
      obstacles,
      actors: []
    };
  }

  function makeClassicVehicle(mark, cells, index) {
    const xs = Array.from(new Set(cells.map((cell) => cell.x)));
    const ys = Array.from(new Set(cells.map((cell) => cell.y)));
    const axis = xs.length === 1 ? "vertical" : "horizontal";
    const x = Math.min(...cells.map((cell) => cell.x));
    const y = Math.min(...cells.map((cell) => cell.y));
    const length = cells.length;
    if (length < 2 || length > 3) throw new Error(`classic vehicle ${mark} has invalid length ${length}`);
    if (axis === "horizontal") {
      if (ys.length !== 1 || !isContiguous(xs)) throw new Error(`classic vehicle ${mark} is not contiguous`);
    } else if (xs.length !== 1 || !isContiguous(ys)) {
      throw new Error(`classic vehicle ${mark} is not contiguous`);
    }

    return {
      id: mark === "A" ? "red" : `classic_${mark.toLowerCase()}`,
      x,
      y,
      length,
      axis,
      color: mark === "A" ? "#ff5c68" : CAR_COLORS[Math.abs(index + mark.charCodeAt(0)) % CAR_COLORS.length],
      kind: mark === "A" ? "target" : getClassicVehicleKind(axis, length)
    };
  }

  function finalizeDailyLevel(level, solved) {
    const minMoves = Number.isFinite(solved.minMoves) ? solved.minMoves : level.sourceMeta.sourceMoves;
    level.minMoves = minMoves;
    level.searchStates = solved.explored || 0;
    delete level.moveLimit;
    level.targetMoves = {
      threeStars: minMoves + 2,
      twoStars: minMoves + 6
    };
    level.difficultyScore = Math.round(minMoves * 16 + level.vehicles.length * 4 + level.obstacles.length * 8);
    level.difficulty = 10;
    return level;
  }

  function solveLevel(level, cap = 80, maxStates = 500000) {
    const start = level.vehicles.map((vehicle) => ({ x: vehicle.x, y: vehicle.y }));
    const startKey = stateKey(start);
    const queue = [{ state: start, depth: 0 }];
    const seen = new Set([startKey]);
    let cursor = 0;

    while (cursor < queue.length) {
      const item = queue[cursor];
      cursor += 1;
      if (isSolved(level, item.state)) return { solved: true, minMoves: item.depth, explored: seen.size, method: "bfs" };
      if (item.depth >= cap) continue;

      for (let index = 0; index < level.vehicles.length; index += 1) {
        const vehicle = { ...level.vehicles[index], ...item.state[index] };
        const occupied = occupiedCells(level, item.state, index);
        for (const direction of [-1, 1]) {
          for (let delta = direction; Math.abs(delta) < level.width; delta += direction) {
            if (!canPlace(level, vehicle, delta, occupied)) break;
            const next = item.state.map((position) => ({ ...position }));
            next[index] = {
              x: item.state[index].x + (vehicle.axis === "horizontal" ? delta : 0),
              y: item.state[index].y + (vehicle.axis === "vertical" ? delta : 0)
            };
            const key = stateKey(next);
            if (seen.has(key)) continue;
            seen.add(key);
            if (seen.size > maxStates) {
              return { solved: false, minMoves: Infinity, explored: seen.size, aborted: true, method: "bfs" };
            }
            queue.push({ state: next, depth: item.depth + 1 });
          }
        }
      }
    }

    return { solved: false, minMoves: Infinity, explored: seen.size, method: "bfs" };
  }

  function occupiedCells(level, state, skipIndex) {
    const occupied = new Set((level.obstacles || []).map((obstacle) => cellKey(obstacle.x, obstacle.y)));
    level.vehicles.forEach((vehicle, index) => {
      if (index === skipIndex) return;
      const positioned = { ...vehicle, ...state[index] };
      vehicleCells(positioned).forEach((cell) => occupied.add(cellKey(cell.x, cell.y)));
    });
    return occupied;
  }

  function canPlace(level, vehicle, delta, occupied) {
    for (let i = 0; i < vehicle.length; i += 1) {
      const x = vehicle.x + (vehicle.axis === "horizontal" ? i + delta : 0);
      const y = vehicle.y + (vehicle.axis === "vertical" ? i + delta : 0);
      if (!inside(level, x, y) || occupied.has(cellKey(x, y))) return false;
    }
    return true;
  }

  function isSolved(level, state) {
    const targetIndex = level.vehicles.findIndex((vehicle) => vehicle.id === level.targetVehicleId);
    if (targetIndex < 0) return false;
    const target = level.vehicles[targetIndex];
    return target.axis === "horizontal" && state[targetIndex].x + target.length >= level.width;
  }

  function vehicleCells(vehicle) {
    const cells = [];
    for (let i = 0; i < vehicle.length; i += 1) {
      cells.push({
        x: vehicle.x + (vehicle.axis === "horizontal" ? i : 0),
        y: vehicle.y + (vehicle.axis === "vertical" ? i : 0)
      });
    }
    return cells;
  }

  function flipBoardVertical(board) {
    const result = Array(board.length).fill("o");
    for (let y = 0; y < DAILY_SIZE; y += 1) {
      for (let x = 0; x < DAILY_SIZE; x += 1) {
        result[(DAILY_SIZE - 1 - y) * DAILY_SIZE + x] = board[y * DAILY_SIZE + x];
      }
    }
    return result.join("");
  }

  function getClassicVehicleKind(axis, length) {
    if (length === 3) return axis === "horizontal" ? "delivery" : "van";
    return axis === "horizontal" ? "compact" : "sedan";
  }

  function isContiguous(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.every((value, index) => index === 0 || value === sorted[index - 1] + 1);
  }

  function inside(level, x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < level.width && y < level.height;
  }

  function stateKey(state) {
    return state.map((position) => `${position.x},${position.y}`).join("|");
  }

  function cellKey(x, y) {
    return `${x},${y}`;
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
})();
