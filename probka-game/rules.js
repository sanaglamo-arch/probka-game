(function () {
  function cloneVehicle(vehicle) {
    return { ...vehicle };
  }

  function cloneActor(actor) {
    return {
      mode: "route",
      stepIndex: 0,
      direction: 1,
      startDelay: 0,
      moveEvery: 1,
      turnCounter: 0,
      ...actor,
      path: (actor.path || []).map((point) => ({ ...point })),
      waitTurns: actor.waitTurns || 0,
      needsReroute: Boolean(actor.needsReroute),
      finished: Boolean(actor.finished),
      inactive: Boolean(actor.inactive),
      routeTarget: actor.routeTarget ? { ...actor.routeTarget } : null
    };
  }

  function getMoveLimit(level, rule) {
    return rule === "moves" && level && Number.isInteger(level.moveLimit) ? level.moveLimit : Infinity;
  }

  function isWin(level, vehicles) {
    const target = vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
    if (!target || target.axis !== "horizontal") return false;
    return level.exit.side === "right" && target.y === level.exit.row && target.x + target.length >= level.width;
  }

  function vehicleOccupies(vehicle, cellX, cellY) {
    for (let i = 0; i < vehicle.length; i += 1) {
      const x = vehicle.x + (vehicle.axis === "horizontal" ? i : 0);
      const y = vehicle.y + (vehicle.axis === "vertical" ? i : 0);
      if (x === cellX && y === cellY) return true;
    }
    return false;
  }

  function vehicleAtCell(vehicles, x, y) {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);
    return vehicles.find((vehicle) => vehicleOccupies(vehicle, cellX, cellY));
  }

  function vehicleAtGridCell(vehicles, cellX, cellY, ignoreVehicleId) {
    return vehicles.find((vehicle) => vehicle.id !== ignoreVehicleId && vehicleOccupies(vehicle, cellX, cellY));
  }

  function actorAtGridCell(actors, cellX, cellY, ignoreActorId) {
    return actors.find((actor) => !actor.inactive && actor.id !== ignoreActorId && actor.x === cellX && actor.y === cellY);
  }

  function obstacleAtGridCell(level, cellX, cellY) {
    return (level.obstacles || []).find((obstacle) => obstacle.x === cellX && obstacle.y === cellY);
  }

  function buildOccupied(level, vehicles, actors, ignoreVehicleId) {
    const occupied = new Set((level.obstacles || []).map((obstacle) => `${obstacle.x},${obstacle.y}`));
    vehicles.forEach((vehicle) => {
      if (vehicle.id === ignoreVehicleId) return;
      for (let i = 0; i < vehicle.length; i += 1) {
        const x = vehicle.x + (vehicle.axis === "horizontal" ? i : 0);
        const y = vehicle.y + (vehicle.axis === "vertical" ? i : 0);
        occupied.add(`${x},${y}`);
      }
    });
    actors.forEach((actor) => {
      if (actor.inactive) return;
      occupied.add(`${actor.x},${actor.y}`);
    });
    return occupied;
  }

  function canPlace(level, vehicle, delta, occupied) {
    for (let i = 0; i < vehicle.length; i += 1) {
      const x = vehicle.x + (vehicle.axis === "horizontal" ? i + delta : 0);
      const y = vehicle.y + (vehicle.axis === "vertical" ? i + delta : 0);

      if (x < 0 || y < 0 || x >= level.width || y >= level.height) return false;
      if (occupied.has(`${x},${y}`)) return false;
    }
    return true;
  }

  function getAllowedRange(level, vehicles, actors, vehicle) {
    const occupied = buildOccupied(level, vehicles, actors, vehicle.id);
    let min = 0;
    let max = 0;

    for (let delta = -1; delta > -level.width; delta -= 1) {
      if (canPlace(level, vehicle, delta, occupied)) min = delta;
      else break;
    }

    for (let delta = 1; delta < level.width; delta += 1) {
      if (canPlace(level, vehicle, delta, occupied)) max = delta;
      else break;
    }

    return { min, max };
  }

  function findSmartHint(level, vehicles, actors = []) {
    if (!isSmartHintLevel(level, vehicles, actors)) return null;
    const plannedMove = findStoredPlanHintMove(level, vehicles);
    const result = plannedMove ? { move: plannedMove, states: 0 } : solveSmartHint(level, vehicles);
    if (!result || !result.move) return null;
    const vehicle = vehicles.find((item) => item.id === result.move.id);
    if (!vehicle) return null;
    const delta = result.move.delta;
    return {
      kind: "smart",
      vehicleId: vehicle.id,
      delta,
      targetX: vehicle.x + (vehicle.axis === "horizontal" ? delta : 0),
      targetY: vehicle.y + (vehicle.axis === "vertical" ? delta : 0),
      direction: { axis: vehicle.axis, sign: Math.sign(delta) },
      message: `Подсказка: сдвинь эту машину ${getDirectionText(vehicle, delta)} на ${Math.abs(delta)}`
    };
  }

  function isSmartHintLevel(level, vehicles, actors) {
    if (!level || actors.length || level.width !== 6 || level.height !== 6) return false;
    if (!level.targetVehicleId || !vehicles.some((vehicle) => vehicle.id === level.targetVehicleId)) return false;
    return !level.sourceMeta || /classic_rush_hour/.test(level.sourceMeta.kind || "");
  }

  function findStoredPlanHintMove(level, vehicles) {
    if (!level || !Array.isArray(level.solutionPlan) || !level.solutionPlan.length) return null;
    const planVehicles = level.vehicles.map(cloneVehicle);
    if (sameVehicleState(planVehicles, vehicles)) return getLegalStoredHintMove(level, vehicles, level.solutionPlan[0]);

    for (let index = 0; index < level.solutionPlan.length; index += 1) {
      const move = level.solutionPlan[index];
      const vehicle = planVehicles.find((item) => item.id === move.id);
      if (!vehicle) return null;
      vehicle.x += vehicle.axis === "horizontal" ? move.delta : 0;
      vehicle.y += vehicle.axis === "vertical" ? move.delta : 0;
      if (sameVehicleState(planVehicles, vehicles)) return getLegalStoredHintMove(level, vehicles, level.solutionPlan[index + 1]);
    }
    return null;
  }

  function sameVehicleState(leftVehicles, rightVehicles) {
    if (leftVehicles.length !== rightVehicles.length) return false;
    return leftVehicles.every((left) => {
      const right = rightVehicles.find((item) => item.id === left.id);
      return right && right.x === left.x && right.y === left.y;
    });
  }

  function getLegalStoredHintMove(level, vehicles, move) {
    if (!move) return null;
    const vehicle = vehicles.find((item) => item.id === move.id);
    if (!vehicle) return null;
    const occupied = buildHintOccupied(level, vehicles, vehicles.map((item) => ({ x: item.x, y: item.y })), vehicles.indexOf(vehicle));
    return canHintTravel(level, vehicle, vehicle, move.delta, occupied) ? { id: move.id, delta: move.delta } : null;
  }

  function solveSmartHint(level, vehicles) {
    const targetIndex = vehicles.findIndex((vehicle) => vehicle.id === level.targetVehicleId);
    if (targetIndex < 0) return null;

    const startState = vehicles.map((vehicle) => ({ x: vehicle.x, y: vehicle.y }));
    const startKey = encodeHintState(startState);
    if (isHintSolved(level, vehicles, startState, targetIndex)) return null;

    const queue = [startState];
    const seen = new Set([startKey]);
    const parents = new Map();
    const maxStates = 180000;

    for (let head = 0; head < queue.length; head += 1) {
      const state = queue[head];
      const stateKey = encodeHintState(state);

      for (let index = 0; index < vehicles.length; index += 1) {
        const vehicle = vehicles[index];
        const position = state[index];
        const occupied = buildHintOccupied(level, vehicles, state, index);

        for (const sign of [-1, 1]) {
          for (let delta = sign; Math.abs(delta) < level.width; delta += sign) {
            if (!canHintTravel(level, vehicle, position, delta, occupied)) break;
            const next = state.map((point) => ({ ...point }));
            next[index] = {
              x: position.x + (vehicle.axis === "horizontal" ? delta : 0),
              y: position.y + (vehicle.axis === "vertical" ? delta : 0)
            };
            const nextKey = encodeHintState(next);
            if (seen.has(nextKey)) continue;
            seen.add(nextKey);
            parents.set(nextKey, { previous: stateKey, move: { id: vehicle.id, delta } });
            if (isHintSolved(level, vehicles, next, targetIndex)) {
              return { move: getFirstHintMove(parents, startKey, nextKey), states: seen.size };
            }
            if (seen.size > maxStates) return null;
            queue.push(next);
          }
        }
      }
    }

    return null;
  }

  function getFirstHintMove(parents, startKey, goalKey) {
    let key = goalKey;
    let move = null;
    while (key !== startKey) {
      const record = parents.get(key);
      if (!record) return move;
      move = record.move;
      key = record.previous;
    }
    return move;
  }

  function encodeHintState(state) {
    return state.map((point) => `${point.x},${point.y}`).join("|");
  }

  function isHintSolved(level, vehicles, state, targetIndex) {
    const target = vehicles[targetIndex];
    const position = state[targetIndex];
    return target && target.axis === "horizontal" && position.y === level.exit.row && position.x + target.length >= level.width;
  }

  function buildHintOccupied(level, vehicles, state, skipIndex) {
    const occupied = new Set(level.obstacles.map((obstacle) => `${obstacle.x},${obstacle.y}`));
    vehicles.forEach((vehicle, index) => {
      if (index === skipIndex) return;
      const position = state[index];
      for (let i = 0; i < vehicle.length; i += 1) {
        const x = position.x + (vehicle.axis === "horizontal" ? i : 0);
        const y = position.y + (vehicle.axis === "vertical" ? i : 0);
        occupied.add(`${x},${y}`);
      }
    });
    return occupied;
  }

  function canHintTravel(level, vehicle, position, delta, occupied) {
    const direction = Math.sign(delta);
    for (let step = direction; Math.abs(step) <= Math.abs(delta); step += direction) {
      for (let i = 0; i < vehicle.length; i += 1) {
        const x = position.x + (vehicle.axis === "horizontal" ? i + step : 0);
        const y = position.y + (vehicle.axis === "vertical" ? i + step : 0);
        if (x < 0 || y < 0 || x >= level.width || y >= level.height) return false;
        if (occupied.has(`${x},${y}`)) return false;
      }
    }
    return true;
  }

  function getDirectionText(vehicle, delta) {
    if (vehicle.axis === "horizontal") return delta > 0 ? "вправо" : "влево";
    return delta > 0 ? "вниз" : "вверх";
  }

  window.PROBKA_RULES = {
    cloneVehicle,
    cloneActor,
    getMoveLimit,
    isWin,
    vehicleOccupies,
    vehicleAtCell,
    vehicleAtGridCell,
    actorAtGridCell,
    obstacleAtGridCell,
    buildOccupied,
    canPlace,
    getAllowedRange,
    findSmartHint
  };
})();
