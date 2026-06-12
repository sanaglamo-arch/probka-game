(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const bank = root.PROBKA_LEVEL_BANK;
  if (!bank || !Array.isArray(bank.levels)) throw new Error("PROBKA_LEVEL_BANK is missing");

  const CAR_COLORS = ["#4aa3ff", "#55d6a8", "#ffd166", "#e8edf2", "#b889ff", "#ff9f43", "#9ba6b2"];
  const OBSTACLE_KINDS = ["bin", "cone", "snow", "gate"];

  const modes = bank.modes.map((mode, index) => ({ ...mode, order: index + 1 }));
  const levels = bank.levels.map(toRuntimeLevel);

  root.PROBKA_MODES = modes;
  root.PROBKA_PACKS = modes;
  root.PROBKA_LEVELS = levels;
  root.PROBKA_LEVEL_SOURCE = bank.source;
  root.PROBKA_LEVEL_TOOLS = {
    solveSolutionPlan,
    solveSimpleTargetLine,
    makeBlockerSignature,
    countDependencyMoves,
    simulateActorsAfterMove,
    solveShortestPlan
  };

  function toRuntimeLevel(item) {
    const parsed = parseClassicBoard(item.board, item);
    const mode = modes.find((entry) => entry.id === item.modeId);
    return {
      ...parsed,
      rule: mode ? mode.rule : "moves",
      modeTitle: mode ? mode.title : "Кампания"
    };
  }

  function parseClassicBoard(board, metadata) {
    const size = 6;
    if (board.length !== size * size) throw new Error(`${metadata.id}: classic board must be 36 cells`);
    const groups = new Map();
    const obstacles = [];
    for (let index = 0; index < board.length; index += 1) {
      const mark = board[index];
      const x = index % size;
      const y = Math.floor(index / size);
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
    if (!target) throw new Error(`${metadata.id}: classic board is missing target car`);

    return {
      id: metadata.id,
      modeId: metadata.modeId,
      modeOrder: metadata.modeOrder,
      packId: metadata.modeId,
      title: metadata.title,
      introText: metadata.introText,
      sourceMeta: metadata.sourceMeta,
      difficulty: metadata.difficulty,
      difficultyScore: metadata.difficultyScore,
      minMoves: metadata.minMoves,
      searchStates: metadata.searchStates || metadata.sourceMeta.clusterSize || 0,
      width: size,
      height: size,
      board,
      exit: { side: "right", row: target.y },
      targetVehicleId: "red",
      targetMoves: metadata.targetMoves,
      moveLimit: metadata.moveLimit,
      timeLimitSec: metadata.timeLimitSec,
      timeTargets: metadata.timeTargets,
      vehicles,
      obstacles,
      actors: [],
      solutionPlan: (metadata.solutionPlan || []).map((move) => ({ ...move }))
    };
  }

  function makeClassicVehicle(mark, cells, index) {
    const xs = Array.from(new Set(cells.map((cell) => cell.x)));
    const ys = Array.from(new Set(cells.map((cell) => cell.y)));
    const axis = xs.length === 1 ? "vertical" : "horizontal";
    const x = Math.min(...cells.map((cell) => cell.x));
    const y = Math.min(...cells.map((cell) => cell.y));
    const length = cells.length;
    if (axis === "horizontal" && ys.length !== 1) throw new Error(`classic vehicle ${mark} is not contiguous`);
    if (axis === "vertical" && xs.length !== 1) throw new Error(`classic vehicle ${mark} is not contiguous`);
    if (length < 2 || length > 3) throw new Error(`classic vehicle ${mark} has invalid length ${length}`);
    return {
      id: mark === "A" ? "red" : `classic_${mark.toLowerCase()}`,
      x,
      y,
      length,
      axis,
      color: mark === "A" ? "#ff5c68" : pickColor(index + mark.charCodeAt(0)),
      kind: mark === "A" ? "target" : getClassicVehicleKind(axis, length)
    };
  }

  function getClassicVehicleKind(axis, length) {
    if (length === 3) return axis === "horizontal" ? "delivery" : "van";
    return axis === "horizontal" ? "compact" : "sedan";
  }

  function solveSolutionPlan(level) {
    const vehicles = level.vehicles.map((vehicle) => ({ ...vehicle }));
    const actors = (level.actors || []).map((actor) => ({ ...actor, path: (actor.path || []).map((point) => ({ ...point })) }));
    for (let index = 0; index < (level.solutionPlan || []).length; index += 1) {
      const move = level.solutionPlan[index];
      const vehicle = vehicles.find((item) => item.id === move.id);
      if (!vehicle) return { solved: false, moves: index, reason: `missing vehicle ${move.id}` };
      const occupied = buildOccupied(level, vehicles, actors, vehicle.id);
      if (!canTravel(level, vehicle, move.delta, occupied)) {
        return { solved: false, moves: index, reason: `${vehicle.id} cannot move ${move.delta}` };
      }
      vehicle.x += vehicle.axis === "horizontal" ? move.delta : 0;
      vehicle.y += vehicle.axis === "vertical" ? move.delta : 0;
      simulateActorsAfterMove(level, vehicles, actors);
    }
    const solved = isSolved(level, vehicles);
    return { solved, moves: (level.solutionPlan || []).length, reason: solved ? "" : "target not solved" };
  }

  function solveShortestPlan(level, maxStates = 500000) {
    const start = level.vehicles.map((vehicle) => ({ x: vehicle.x, y: vehicle.y }));
    const startKey = encodeState(start);
    const queue = [start];
    const parents = new Map();
    const seen = new Set([startKey]);
    for (let cursor = 0; cursor < queue.length && seen.size <= maxStates; cursor += 1) {
      const state = queue[cursor];
      const key = encodeState(state);
      if (isStateSolved(level, state)) {
        const plan = reconstructPlan(parents, startKey, key);
        return { solved: true, moves: plan.length, states: seen.size, plan };
      }
      for (let index = 0; index < level.vehicles.length; index += 1) {
        const vehicle = { ...level.vehicles[index], ...state[index] };
        const occupied = buildStateOccupied(level, state, index);
        [-1, 1].forEach((sign) => {
          for (let delta = sign; Math.abs(delta) < level.width; delta += sign) {
            if (!canTravel(level, vehicle, delta, occupied)) break;
            const next = state.map((position) => ({ ...position }));
            next[index] = {
              x: state[index].x + (vehicle.axis === "horizontal" ? delta : 0),
              y: state[index].y + (vehicle.axis === "vertical" ? delta : 0)
            };
            const nextKey = encodeState(next);
            if (seen.has(nextKey)) continue;
            seen.add(nextKey);
            parents.set(nextKey, { previous: key, move: { id: vehicle.id, delta } });
            queue.push(next);
          }
        });
      }
    }
    return { solved: false, moves: 0, states: seen.size, plan: [] };
  }

  function solveSimpleTargetLine(level) {
    const vehicles = level.vehicles.map((vehicle) => ({ ...vehicle }));
    const target = vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
    if (!target) return { solved: false, moves: 0 };
    let moves = 0;
    for (let x = target.x + target.length; x < level.width; x += 1) {
      const blocker = vehicles.find((vehicle) => vehicle.id !== target.id && vehicleCovers(vehicle, x, target.y));
      if (!blocker) continue;
      if (blocker.axis !== "vertical") return { solved: false, moves };
      const up = -1;
      const down = 1;
      const occupied = buildOccupied(level, vehicles, [], blocker.id);
      const delta = canTravel(level, blocker, up, occupied) ? up : canTravel(level, blocker, down, occupied) ? down : 0;
      if (!delta) return { solved: false, moves };
      blocker.y += delta;
      moves += 1;
    }
    const occupied = buildOccupied(level, vehicles, [], target.id);
    const exitDelta = level.width - target.x - target.length;
    if (!canTravel(level, target, exitDelta, occupied)) return { solved: false, moves };
    return { solved: true, moves: moves + 1 };
  }

  function makeBlockerSignature(level) {
    const target = level.vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
    if (!target) return "missing-target";
    const blockers = [];
    for (let x = target.x + target.length; x < level.width; x += 1) {
      const blocker = level.vehicles.find((vehicle) => vehicle.id !== target.id && vehicleCovers(vehicle, x, target.y));
      if (blocker) blockers.push(`${blocker.axis[0]}${blocker.length}@${x}:${blocker.y}`);
      const obstacle = (level.obstacles || []).find((item) => item.x === x && item.y === target.y);
      if (obstacle) blockers.push(`x@${x}:${target.y}`);
    }
    return blockers.join("|") || "open";
  }

  function countDependencyMoves(level) {
    return (level.solutionPlan || []).filter((move) => move.id !== level.targetVehicleId).length;
  }

  function simulateActorsAfterMove() {
    return [];
  }

  function buildOccupied(level, vehicles, actors = [], skipId = "") {
    const occupied = new Set((level.obstacles || []).map((obstacle) => `${obstacle.x},${obstacle.y}`));
    vehicles.forEach((vehicle) => {
      if (vehicle.id === skipId) return;
      for (let step = 0; step < vehicle.length; step += 1) {
        const x = vehicle.x + (vehicle.axis === "horizontal" ? step : 0);
        const y = vehicle.y + (vehicle.axis === "vertical" ? step : 0);
        occupied.add(`${x},${y}`);
      }
    });
    actors.forEach((actor) => occupied.add(`${actor.x},${actor.y}`));
    return occupied;
  }

  function buildStateOccupied(level, state, skipIndex = -1) {
    const occupied = new Set((level.obstacles || []).map((obstacle) => `${obstacle.x},${obstacle.y}`));
    level.vehicles.forEach((vehicle, index) => {
      if (index === skipIndex) return;
      const position = state[index];
      for (let step = 0; step < vehicle.length; step += 1) {
        const x = position.x + (vehicle.axis === "horizontal" ? step : 0);
        const y = position.y + (vehicle.axis === "vertical" ? step : 0);
        occupied.add(`${x},${y}`);
      }
    });
    return occupied;
  }

  function canTravel(level, vehicle, delta, occupied) {
    if (!delta) return true;
    const sign = Math.sign(delta);
    for (let step = 1; step <= Math.abs(delta); step += 1) {
      const x = vehicle.x + (vehicle.axis === "horizontal" ? (sign > 0 ? vehicle.length - 1 + step : -step) : 0);
      const y = vehicle.y + (vehicle.axis === "vertical" ? (sign > 0 ? vehicle.length - 1 + step : -step) : 0);
      if (x < 0 || y < 0 || x >= level.width || y >= level.height) return false;
      if (occupied.has(`${x},${y}`)) return false;
    }
    return true;
  }

  function isSolved(level, vehicles) {
    const target = vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
    return target && target.axis === "horizontal" && target.y === level.exit.row && target.x + target.length >= level.width;
  }

  function isStateSolved(level, state) {
    const index = level.vehicles.findIndex((vehicle) => vehicle.id === level.targetVehicleId);
    const target = level.vehicles[index];
    return target && state[index].x + target.length >= level.width;
  }

  function reconstructPlan(parents, startKey, goalKey) {
    const plan = [];
    let key = goalKey;
    while (key !== startKey) {
      const record = parents.get(key);
      if (!record) break;
      plan.push(record.move);
      key = record.previous;
    }
    return plan.reverse();
  }

  function encodeState(state) {
    return state.map((position) => `${position.x},${position.y}`).join("|");
  }

  function vehicleCovers(vehicle, x, y) {
    for (let step = 0; step < vehicle.length; step += 1) {
      const cx = vehicle.x + (vehicle.axis === "horizontal" ? step : 0);
      const cy = vehicle.y + (vehicle.axis === "vertical" ? step : 0);
      if (cx === x && cy === y) return true;
    }
    return false;
  }

  function pickColor(seed) {
    return CAR_COLORS[Math.abs(seed) % CAR_COLORS.length];
  }
})();
