(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const TIME_ZONE = "Europe/Moscow";
  const DAILY_SIZE = 14;
  const DAILY_ROW = 7;
  const DAILY_BLOCKER_COLUMNS = [2, 5, 8, 11];
  const DAILY_TOP_LOCKS = [
    { id: "top_lock_2", x: 1, pocketX: 0, blockerX: 2 },
    { id: "top_lock_5", x: 4, pocketX: 3, blockerX: 5 },
    { id: "top_lock_8", x: 7, pocketX: 6, blockerX: 8 },
    { id: "top_lock_11", x: 10, pocketX: 9, blockerX: 11 }
  ];
  const DAILY_COLORS = ["#4aa3ff", "#55d6a8", "#ffd166", "#e8edf2", "#b889ff", "#ff9f43", "#9ba6b2"];
  const OBSTACLE_KINDS = ["bin", "cone", "snow", "gate"];

  const SKINS = [
    { id: "classic_red", name: "Красная классика", price: 0, color: "#ff5c68", accent: "#fff2a8", trim: "#2d1118", pattern: "rally", badge: "01" },
    { id: "taxi_yellow", name: "Шашечный рывок", price: 120, color: "#ffd166", accent: "#2d2100", trim: "#fff2a8", pattern: "checker", badge: "T" },
    { id: "mint_courier", name: "Курьерский болид", price: 180, color: "#55d6a8", accent: "#ffcc4d", trim: "#113d34", pattern: "parcel", badge: "GO" },
    { id: "night_blue", name: "Ночной неон", price: 260, color: "#4aa3ff", accent: "#8ff7ff", trim: "#101a35", pattern: "neon", badge: "N" },
    { id: "violet_share", name: "Комета каршеринга", price: 360, color: "#b889ff", accent: "#ff7ad9", trim: "#24143d", pattern: "comet", badge: "77" },
    { id: "gold_yard", name: "Золотая легенда", price: 500, color: "#ff9f43", accent: "#fff2a8", trim: "#4a2600", pattern: "crown", badge: "VIP" }
  ];

  root.PROBKA_SKINS = SKINS;
  root.PROBKA_DAILY = {
    getDateKey,
    getDailyLevel,
    solveLevel
  };

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
    const seed = hashString(`probka-hard-daily-v3:${dateKey}`);

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const level = makeDailyCandidate(dateKey, seed + attempt * 7919, attempt);
      const solved = solveLevel(level, level.moveLimit, 120000);
      if (!solved.solved || solved.minMoves < 12 || solved.minMoves > 22) continue;
      return finalizeDailyLevel(level, solved, seed, attempt);
    }

    const fallback = makeFallbackLevel(dateKey, seed);
    const solved = solveLevel(fallback, fallback.moveLimit, 120000);
    return finalizeDailyLevel(fallback, solved, seed, -1);
  }

  function makeDailyCandidate(dateKey, seed, attempt) {
    const rng = createRng(seed);
    const row = DAILY_ROW;
    const occupied = new Set();
    const level = createBaseLevel(dateKey, seed, row);

    addVehicle(level, occupied, {
      id: "red",
      x: 0,
      y: row,
      length: 2,
      axis: "horizontal",
      color: "#ff5c68"
    });

    DAILY_TOP_LOCKS.forEach((lock, index) => {
      addVehicle(level, occupied, {
        id: `pocket_${lock.blockerX}`,
        kind: index % 2 ? "compact" : "sedan",
        x: lock.pocketX,
        y: row - 3,
        length: 2,
        axis: "vertical",
        color: DAILY_COLORS[(seed + index * 5 + 2) % DAILY_COLORS.length]
      });
    });

    DAILY_TOP_LOCKS.forEach((lock, index) => {
      addVehicle(level, occupied, {
        id: lock.id,
        kind: "delivery",
        x: lock.x,
        y: row - 2,
        length: 2,
        axis: "horizontal",
        color: DAILY_COLORS[(seed + index * 2) % DAILY_COLORS.length]
      });
    });

    DAILY_BLOCKER_COLUMNS.forEach((x, index) => {
      addVehicle(level, occupied, {
        id: `block_${x}`,
        kind: index === 0 ? "taxi" : "van",
        x,
        y: row - 1,
        length: 2,
        axis: "vertical",
        color: DAILY_COLORS[(seed + index * 3 + 1) % DAILY_COLORS.length]
      });
    });

    DAILY_BLOCKER_COLUMNS.forEach((x, index) => {
      addObstacleIfFree(level, occupied, {
        id: `bottom_stop_${x}`,
        kind: index % 2 ? "gate" : "cone",
        x,
        y: row + 1
      });
    });

    [{ x: DAILY_SIZE - 1, y: row - 2 }, { x: 0, y: row + 1 }].forEach((point, index) => {
      addObstacleIfFree(level, occupied, {
        id: `chain_stop_${index + 1}`,
        kind: index ? "gate" : "bin",
        ...point
      });
    });

    shuffle(makeHardFillerCandidates(), rng).forEach((candidate) => {
      if (level.vehicles.length >= 26 + (attempt % 3)) return;
      addVehicleIfFree(level, occupied, {
        id: `daily_car_${level.vehicles.length}`,
        ...candidate,
        color: DAILY_COLORS[(seed + level.vehicles.length * 5) % DAILY_COLORS.length]
      });
    });

    shuffle(makeHardObstacleCandidates(), rng).forEach((point) => {
      if (level.obstacles.length >= 12) return;
      addObstacleIfFree(level, occupied, {
        id: `obstacle_${level.obstacles.length + 1}`,
        kind: OBSTACLE_KINDS[(seed + level.obstacles.length) % OBSTACLE_KINDS.length],
        ...point
      });
    });

    level.dailyPlan = buildDailyPlan(level);
    return level;
  }

  function makeFallbackLevel(dateKey, seed) {
    const occupied = new Set();
    const level = createBaseLevel(dateKey, seed, DAILY_ROW);
    addVehicle(level, occupied, { id: "red", x: 0, y: DAILY_ROW, length: 2, axis: "horizontal", color: "#ff5c68" });
    DAILY_TOP_LOCKS.forEach((lock, index) => {
      addVehicle(level, occupied, {
        id: `pocket_${lock.blockerX}`,
        kind: index % 2 ? "compact" : "sedan",
        x: lock.pocketX,
        y: DAILY_ROW - 3,
        length: 2,
        axis: "vertical",
        color: DAILY_COLORS[(index + 1) % DAILY_COLORS.length]
      });
    });
    DAILY_TOP_LOCKS.forEach((lock, index) => {
      addVehicle(level, occupied, {
        id: lock.id,
        kind: "delivery",
        x: lock.x,
        y: DAILY_ROW - 2,
        length: 2,
        axis: "horizontal",
        color: DAILY_COLORS[index % DAILY_COLORS.length]
      });
    });
    DAILY_BLOCKER_COLUMNS.forEach((x, index) => {
      addVehicle(level, occupied, {
        id: `block_${x}`,
        kind: index === 0 ? "taxi" : "van",
        x,
        y: DAILY_ROW - 1,
        length: 2,
        axis: "vertical",
        color: DAILY_COLORS[(index + 2) % DAILY_COLORS.length]
      });
    });
    DAILY_BLOCKER_COLUMNS.forEach((x, index) => {
      addObstacleIfFree(level, occupied, {
        id: `bottom_stop_${x}`,
        kind: index % 2 ? "gate" : "cone",
        x,
        y: DAILY_ROW + 1
      });
    });
    [{ x: DAILY_SIZE - 1, y: DAILY_ROW - 2 }, { x: 0, y: DAILY_ROW + 1 }].forEach((point, index) => {
      addObstacleIfFree(level, occupied, {
        id: `chain_stop_${index + 1}`,
        kind: "gate",
        ...point
      });
    });
    makeHardFillerCandidates().slice(0, 10).forEach((vehicle, index) => {
      addVehicleIfFree(level, occupied, { id: `daily_car_${index + 1}`, ...vehicle, color: DAILY_COLORS[(index + 4) % DAILY_COLORS.length] });
    });
    makeHardObstacleCandidates().forEach((point, index) => {
      if (level.obstacles.length >= 12) return;
      addObstacleIfFree(level, occupied, {
        id: `obstacle_${index + 1}`,
        kind: OBSTACLE_KINDS[index % OBSTACLE_KINDS.length],
        ...point
      });
    });
    level.dailyPlan = buildDailyPlan(level);
    return level;
  }

  function createBaseLevel(dateKey, seed, row) {
    return {
      id: `daily_${dateKey.replace(/-/g, "_")}`,
      packId: "daily",
      title: "Уровень дня",
      introText: `Двор дня: ${dateKey}`,
      difficulty: 5,
      difficultyScore: 0,
      minMoves: 0,
      searchStates: 0,
      seed,
      width: DAILY_SIZE,
      height: DAILY_SIZE,
      exit: { side: "right", row },
      targetVehicleId: "red",
      targetMoves: { threeStars: 18, twoStars: 24 },
      moveLimit: 32,
      vehicles: [],
      obstacles: [],
      actors: []
    };
  }

  function finalizeDailyLevel(level, solved, seed, attempt) {
    const minMoves = Number.isFinite(solved.minMoves) ? solved.minMoves : 3;
    level.seed = seed;
    level.dailyAttempt = attempt;
    level.minMoves = minMoves;
    level.searchStates = solved.explored || 0;
    level.moveLimit = Math.max(28, minMoves + 12);
    level.targetMoves = {
      threeStars: Math.min(level.moveLimit, minMoves + 3),
      twoStars: Math.min(level.moveLimit, minMoves + 8)
    };
    level.difficultyScore = Math.round(
      minMoves * 12 + level.vehicles.length * 3 + level.obstacles.length * 4 + level.actors.length * 7 + (attempt < 0 ? 0 : attempt)
    );
    level.difficulty = clamp(Math.ceil((level.difficultyScore - 20) / 10), 1, 10);
    return level;
  }

  function buildDailyPlan(level) {
    const target = level.vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
    const moves = [];
    [...DAILY_TOP_LOCKS].reverse().forEach((lock) => {
      moves.push({ id: `pocket_${lock.blockerX}`, delta: -2 });
      moves.push({ id: lock.id, delta: -1 });
      moves.push({ id: `block_${lock.blockerX}`, delta: -1 });
    });
    if (target) moves.push({ id: target.id, delta: level.width - target.length - target.x });
    return moves;
  }

  function makeHardFillerCandidates() {
    return [
      { x: 0, y: 0, length: 3, axis: "horizontal", kind: "wagon" },
      { x: 3, y: 0, length: 2, axis: "horizontal", kind: "compact" },
      { x: 5, y: 0, length: 2, axis: "horizontal", kind: "delivery" },
      { x: 7, y: 0, length: 3, axis: "horizontal", kind: "wagon" },
      { x: 10, y: 0, length: 3, axis: "horizontal", kind: "delivery" },
      { x: 1, y: 1, length: 2, axis: "horizontal", kind: "compact" },
      { x: 4, y: 1, length: 3, axis: "horizontal", kind: "delivery" },
      { x: 8, y: 1, length: 3, axis: "horizontal", kind: "wagon" },
      { x: 11, y: 1, length: 2, axis: "horizontal", kind: "sedan" },
      { x: 1, y: 2, length: 2, axis: "horizontal", kind: "taxi" },
      { x: 4, y: 2, length: 2, axis: "horizontal", kind: "compact" },
      { x: 7, y: 2, length: 2, axis: "horizontal", kind: "sedan" },
      { x: 10, y: 2, length: 3, axis: "horizontal", kind: "wagon" },
      { x: 1, y: 3, length: 2, axis: "horizontal", kind: "compact" },
      { x: 4, y: 3, length: 2, axis: "horizontal", kind: "taxi" },
      { x: 7, y: 3, length: 2, axis: "horizontal", kind: "compact" },
      { x: 10, y: 3, length: 3, axis: "horizontal", kind: "delivery" },
      { x: 1, y: 9, length: 3, axis: "horizontal", kind: "wagon" },
      { x: 5, y: 9, length: 2, axis: "horizontal", kind: "compact" },
      { x: 8, y: 9, length: 3, axis: "horizontal", kind: "delivery" },
      { x: 0, y: 10, length: 2, axis: "horizontal", kind: "sedan" },
      { x: 3, y: 10, length: 3, axis: "horizontal", kind: "wagon" },
      { x: 7, y: 10, length: 2, axis: "horizontal", kind: "compact" },
      { x: 10, y: 10, length: 3, axis: "horizontal", kind: "taxi" },
      { x: 0, y: 11, length: 3, axis: "horizontal", kind: "delivery" },
      { x: 4, y: 11, length: 2, axis: "horizontal", kind: "sedan" },
      { x: 7, y: 11, length: 3, axis: "horizontal", kind: "wagon" },
      { x: 11, y: 11, length: 2, axis: "horizontal", kind: "compact" },
      { x: 0, y: 12, length: 2, axis: "horizontal", kind: "taxi" },
      { x: 3, y: 12, length: 3, axis: "horizontal", kind: "wagon" },
      { x: 7, y: 12, length: 2, axis: "horizontal", kind: "compact" },
      { x: 10, y: 12, length: 3, axis: "horizontal", kind: "delivery" },
      { x: 0, y: 13, length: 3, axis: "horizontal", kind: "sedan" },
      { x: 4, y: 13, length: 2, axis: "horizontal", kind: "compact" },
      { x: 7, y: 13, length: 3, axis: "horizontal", kind: "wagon" },
      { x: 11, y: 13, length: 2, axis: "horizontal", kind: "taxi" }
    ];
  }

  function makeHardObstacleCandidates() {
    return [
      { x: 13, y: 1 },
      { x: 13, y: 2 },
      { x: 12, y: 4 },
      { x: 13, y: 4 },
      { x: 1, y: 6 },
      { x: 4, y: 6 },
      { x: 7, y: 6 },
      { x: 10, y: 6 },
      { x: 1, y: 8 },
      { x: 4, y: 8 },
      { x: 7, y: 8 },
      { x: 10, y: 8 },
      { x: 12, y: 8 },
      { x: 13, y: 8 }
    ];
  }

  function makeFillerCandidates(row) {
    return [
      { x: 0, y: 0, length: 2, axis: "horizontal" },
      { x: 0, y: 5, length: 2, axis: "horizontal" },
      { x: 1, y: row <= 2 ? 4 : 1, length: 2, axis: "horizontal" },
      { x: 2, y: 0, length: 2, axis: "horizontal" },
      { x: 2, y: 5, length: 2, axis: "horizontal" },
      { x: 0, y: row <= 2 ? 3 : 1, length: 2, axis: "vertical" },
      { x: 5, y: row <= 2 ? 3 : 0, length: 2, axis: "vertical" }
    ];
  }

  function makeObstacleCandidates(level, occupied) {
    const target = level.vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
    const result = [];
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const point = { x, y };
        if (occupied.has(cellKey(x, y))) continue;
        if (target && point.y === target.y && point.x >= target.x + target.length) continue;
        if (pointTouchesProtectedLane(level, point)) continue;
        result.push(point);
      }
    }
    return result;
  }

  function chooseVerticalY(row, length, rng) {
    const candidates = [];
    for (let y = 0; y <= 6 - length; y += 1) {
      if (row >= y && row < y + length) candidates.push(y);
    }
    return candidates[Math.floor(rng() * candidates.length)] || Math.max(0, Math.min(6 - length, row - 1));
  }

  function addVehicle(level, occupied, vehicle) {
    if (!addVehicleIfFree(level, occupied, vehicle)) {
      throw new Error(`${level.id}: cannot place ${vehicle.id}`);
    }
  }

  function addVehicleIfFree(level, occupied, vehicle) {
    for (let i = 0; i < vehicle.length; i += 1) {
      const x = vehicle.x + (vehicle.axis === "horizontal" ? i : 0);
      const y = vehicle.y + (vehicle.axis === "vertical" ? i : 0);
      if (!inside(level, x, y) || occupied.has(cellKey(x, y))) return false;
    }
    for (let i = 0; i < vehicle.length; i += 1) {
      const x = vehicle.x + (vehicle.axis === "horizontal" ? i : 0);
      const y = vehicle.y + (vehicle.axis === "vertical" ? i : 0);
      occupied.add(cellKey(x, y));
    }
    level.vehicles.push(vehicle);
    return true;
  }

  function addObstacleIfFree(level, occupied, obstacle) {
    const key = cellKey(obstacle.x, obstacle.y);
    if (!inside(level, obstacle.x, obstacle.y) || occupied.has(key)) return false;
    occupied.add(key);
    level.obstacles.push(obstacle);
    return true;
  }

  function vehicleTouchesProtectedLane(level, vehicle) {
    for (let i = 0; i < vehicle.length; i += 1) {
      const x = vehicle.x + (vehicle.axis === "horizontal" ? i : 0);
      const y = vehicle.y + (vehicle.axis === "vertical" ? i : 0);
      if (pointTouchesProtectedLane(level, { x, y })) return true;
    }
    return false;
  }

  function pointTouchesProtectedLane(level, point) {
    const target = level.vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
    if (!target) return false;
    return level.vehicles.some((vehicle) => {
      if (vehicle.id === target.id || vehicle.axis !== "vertical") return false;
      if (!vehicleOccupiesRow(vehicle, target.y, target.x + target.length)) return false;
      return point.x === vehicle.x && !vehicleOccupiesCell(vehicle, point.x, point.y);
    });
  }

  function solveLevel(level, cap, maxStates) {
    const plannedDaily = solveDailyPlannedLevel(level);
    if (plannedDaily && plannedDaily.moves <= cap) {
      return { solved: true, minMoves: plannedDaily.moves, explored: 0, method: "daily-plan" };
    }

    const constructive = solveByClearingTargetLine(level);
    if (constructive && constructive.moves <= cap) return { solved: true, minMoves: constructive.moves, explored: 0, method: "target-line" };

    const hardDaily = solveByClearingTargetLineWithHelpers(level);
    if (hardDaily && hardDaily.moves <= cap) return { solved: true, minMoves: hardDaily.moves, explored: 0, method: "target-line-helpers" };

    if (level.packId === "daily" && level.width >= 10) {
      return { solved: false, minMoves: Infinity, explored: 0, aborted: true, method: "daily-constructive" };
    }

    const start = level.vehicles.map((vehicle) => ({ ...vehicle }));
    const queue = [{ vehicles: start, depth: 0 }];
    const seen = new Set([stateKey(start)]);
    let cursor = 0;
    let aborted = false;

    while (cursor < queue.length && !aborted) {
      const item = queue[cursor];
      cursor += 1;
      if (isSolved(level, item.vehicles)) return { solved: true, minMoves: item.depth, explored: seen.size, method: "bfs" };
      if (item.depth >= cap) continue;

      item.vehicles.forEach((vehicle, index) => {
        if (aborted) return;
        const occupied = occupiedCells(level, item.vehicles, index);
        [-1, 1].forEach((direction) => {
          if (aborted) return;
          for (let delta = direction; Math.abs(delta) < level.width; delta += direction) {
            if (!canPlace(level, vehicle, delta, occupied)) break;
            const next = item.vehicles.map((itemVehicle) => ({ ...itemVehicle }));
            next[index].x += vehicle.axis === "horizontal" ? delta : 0;
            next[index].y += vehicle.axis === "vertical" ? delta : 0;
            const key = stateKey(next);
            if (seen.has(key)) continue;
            seen.add(key);
            if (seen.size > maxStates) {
              aborted = true;
              return;
            }
            queue.push({ vehicles: next, depth: item.depth + 1 });
          }
        });
      });
    }

    return { solved: false, minMoves: Infinity, explored: seen.size, aborted };
  }

  function solveDailyPlannedLevel(level) {
    if (!Array.isArray(level.dailyPlan) || !level.dailyPlan.length) return null;

    const vehicles = level.vehicles.map((vehicle) => ({ ...vehicle }));
    let moves = 0;
    for (const move of level.dailyPlan) {
      const index = vehicles.findIndex((vehicle) => vehicle.id === move.id);
      if (index < 0 || !Number.isInteger(move.delta) || move.delta === 0) return null;
      const vehicle = vehicles[index];
      const occupied = occupiedCells(level, vehicles, index);
      if (!canTravel(level, vehicle, move.delta, occupied)) return null;
      vehicle.x += vehicle.axis === "horizontal" ? move.delta : 0;
      vehicle.y += vehicle.axis === "vertical" ? move.delta : 0;
      moves += 1;
    }

    return isSolved(level, vehicles) ? { moves } : null;
  }

  function solveByClearingTargetLineWithHelpers(level) {
    const vehicles = level.vehicles.map((vehicle) => ({ ...vehicle }));
    const targetIndex = vehicles.findIndex((vehicle) => vehicle.id === level.targetVehicleId);
    if (targetIndex < 0) return null;
    const target = vehicles[targetIndex];
    let moves = 0;

    for (let guard = 0; guard < level.width * 2; guard += 1) {
      const blockingIndexes = vehicles
        .map((vehicle, index) => ({ vehicle, index }))
        .filter((item) => item.index !== targetIndex && vehicleOccupiesRow(item.vehicle, target.y, target.x + target.length))
        .map((item) => item.index);
      if (!blockingIndexes.length) break;

      const planned = findNextClearingMove(level, vehicles, blockingIndexes, target.y);
      if (!planned) return null;

      if (planned.helperIndex !== undefined) {
        const helper = vehicles[planned.helperIndex];
        helper.x += helper.axis === "horizontal" ? planned.helperDelta : 0;
        helper.y += helper.axis === "vertical" ? planned.helperDelta : 0;
        moves += 1;
      }

      const blocker = vehicles[planned.blockerIndex];
      const updatedOccupied = occupiedCells(level, vehicles, planned.blockerIndex);
      if (!canTravel(level, blocker, planned.blockerDelta, updatedOccupied)) return null;
      blocker.y += planned.blockerDelta;
      moves += 1;
    }

    const occupied = occupiedCells(level, vehicles, targetIndex);
    const delta = level.width - target.length - target.x;
    if (delta < 0 || !canTravel(level, target, delta, occupied)) return null;
    return { moves: moves + 1 };
  }

  function findNextClearingMove(level, vehicles, blockingIndexes, targetRow) {
    for (const blockerIndex of [...blockingIndexes].sort((a, b) => vehicles[b].x - vehicles[a].x)) {
      const blocker = vehicles[blockerIndex];
      if (blocker.axis !== "vertical") continue;

      const occupied = occupiedCells(level, vehicles, blockerIndex);
      const directDelta = findClearingDelta(level, blocker, targetRow, occupied);
      if (directDelta) return { blockerIndex, blockerDelta: directDelta };

      const helperMove = findHelperClearingMove(level, vehicles, blockerIndex, targetRow);
      if (helperMove) return { blockerIndex, ...helperMove };
    }
    return null;
  }

  function findHelperClearingMove(level, vehicles, blockerIndex, targetRow) {
    const blocker = vehicles[blockerIndex];
    const blockerDeltas = [];
    for (let delta = -1; delta > -level.height; delta -= 1) blockerDeltas.push(delta);
    for (let delta = 1; delta < level.height; delta += 1) blockerDeltas.push(delta);

    for (const blockerDelta of blockerDeltas) {
      const travelCells = getTravelCells(blocker, blockerDelta);
      const movedBlocker = { ...blocker, y: blocker.y + blockerDelta };
      if (vehicleOccupiesRow(movedBlocker, targetRow, blocker.x)) continue;
      if (!travelCells.every((cell) => inside(level, cell.x, cell.y))) continue;
      if (travelCells.some((cell) => (level.obstacles || []).some((obstacle) => obstacle.x === cell.x && obstacle.y === cell.y))) continue;

      const helperIndexes = new Set();
      travelCells.forEach((cell) => {
        vehicles.forEach((vehicle, index) => {
          if (index !== blockerIndex && vehicleOccupiesCell(vehicle, cell.x, cell.y)) helperIndexes.add(index);
        });
      });
      if (helperIndexes.size !== 1) continue;

      const helperIndex = Array.from(helperIndexes)[0];
      const helperDelta = findHelperDelta(level, vehicles, helperIndex, travelCells);
      if (!helperDelta) continue;
      return { blockerDelta, helperIndex, helperDelta };
    }

    return null;
  }

  function findHelperDelta(level, vehicles, helperIndex, blockedCells) {
    const helper = vehicles[helperIndex];
    const occupied = occupiedCells(level, vehicles, helperIndex);
    for (const direction of [-1, 1]) {
      for (let delta = direction; Math.abs(delta) < level.width; delta += direction) {
        if (!canPlace(level, helper, delta, occupied)) break;
        const moved = {
          ...helper,
          x: helper.x + (helper.axis === "horizontal" ? delta : 0),
          y: helper.y + (helper.axis === "vertical" ? delta : 0)
        };
        if (!blockedCells.some((cell) => vehicleOccupiesCell(moved, cell.x, cell.y))) return delta;
      }
    }
    return 0;
  }

  function solveByClearingTargetLine(level) {
    const vehicles = level.vehicles.map((vehicle) => ({ ...vehicle }));
    const targetIndex = vehicles.findIndex((vehicle) => vehicle.id === level.targetVehicleId);
    if (targetIndex < 0) return null;
    const target = vehicles[targetIndex];
    let moves = 0;

    for (let guard = 0; guard < level.width; guard += 1) {
      const blockerIndex = vehicles.findIndex(
        (vehicle, index) => index !== targetIndex && vehicleOccupiesRow(vehicle, target.y, target.x + target.length)
      );
      if (blockerIndex < 0) break;
      const blocker = vehicles[blockerIndex];
      if (blocker.axis !== "vertical") return null;
      const occupied = occupiedCells(level, vehicles, blockerIndex);
      const delta = findClearingDelta(level, blocker, target.y, occupied);
      if (!delta) return null;
      blocker.y += delta;
      moves += 1;
    }

    const occupied = occupiedCells(level, vehicles, targetIndex);
    const delta = level.width - target.length - target.x;
    if (delta < 0 || !canTravel(level, target, delta, occupied)) return null;
    return { moves: moves + 1 };
  }

  function findClearingDelta(level, vehicle, targetRow, occupied) {
    const deltas = [];
    for (let delta = -1; delta > -level.height; delta -= 1) deltas.push(delta);
    for (let delta = 1; delta < level.height; delta += 1) deltas.push(delta);
    return deltas.find((delta) => {
      if (!canTravel(level, vehicle, delta, occupied)) return false;
      const moved = { ...vehicle, y: vehicle.y + delta };
      return !vehicleOccupiesRow(moved, targetRow, vehicle.x);
    });
  }

  function occupiedCells(level, vehicles, skipIndex) {
    const occupied = new Set((level.obstacles || []).map((obstacle) => cellKey(obstacle.x, obstacle.y)));
    vehicles.forEach((vehicle, index) => {
      if (index === skipIndex) return;
      for (let i = 0; i < vehicle.length; i += 1) {
        const x = vehicle.x + (vehicle.axis === "horizontal" ? i : 0);
        const y = vehicle.y + (vehicle.axis === "vertical" ? i : 0);
        occupied.add(cellKey(x, y));
      }
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

  function canTravel(level, vehicle, delta, occupied) {
    if (!delta) return false;
    const direction = Math.sign(delta);
    for (let step = direction; Math.abs(step) <= Math.abs(delta); step += direction) {
      if (!canPlace(level, vehicle, step, occupied)) return false;
    }
    return true;
  }

  function isSolved(level, vehicles) {
    const target = vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
    return target && target.y === level.exit.row && target.x + target.length >= level.width;
  }

  function vehicleOccupiesRow(vehicle, row, afterX) {
    for (let i = 0; i < vehicle.length; i += 1) {
      const x = vehicle.x + (vehicle.axis === "horizontal" ? i : 0);
      const y = vehicle.y + (vehicle.axis === "vertical" ? i : 0);
      if (y === row && x >= afterX) return true;
    }
    return false;
  }

  function vehicleOccupiesCell(vehicle, cellX, cellY) {
    for (let i = 0; i < vehicle.length; i += 1) {
      const x = vehicle.x + (vehicle.axis === "horizontal" ? i : 0);
      const y = vehicle.y + (vehicle.axis === "vertical" ? i : 0);
      if (x === cellX && y === cellY) return true;
    }
    return false;
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

  function getTravelCells(vehicle, delta) {
    const cells = [];
    const direction = Math.sign(delta);
    for (let step = direction; Math.abs(step) <= Math.abs(delta); step += direction) {
      for (let i = 0; i < vehicle.length; i += 1) {
        cells.push({
          x: vehicle.x + (vehicle.axis === "horizontal" ? i + step : 0),
          y: vehicle.y + (vehicle.axis === "vertical" ? i + step : 0)
        });
      }
    }
    return cells;
  }

  function insideVehicle(level, vehicle) {
    return vehicleCells(vehicle).every((cell) => inside(level, cell.x, cell.y));
  }

  function stateKey(vehicles) {
    return vehicles.map((vehicle) => `${vehicle.x},${vehicle.y}`).join("|");
  }

  function inside(level, x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < level.width && y < level.height;
  }

  function cellKey(x, y) {
    return `${x},${y}`;
  }

  function shuffle(items, rng) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const item = result[i];
      result[i] = result[j];
      result[j] = item;
    }
    return result;
  }

  function createRng(seed) {
    let value = seed >>> 0;
    return function next() {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
})();
