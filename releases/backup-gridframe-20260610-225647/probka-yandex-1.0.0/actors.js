(function () {
  function createController(deps) {
    const rules = deps.rules || {};

    function initializeActors() {
      deps.getActors().forEach((actor) => {
        if (isWanderingActor(actor)) initializeWanderingActor(actor);
      });
    }

    function isWanderingActor(actor) {
      return actor.mode === "wander";
    }

    function initializeWanderingActor(actor) {
      const spawn = chooseRandomActorSpawn(actor);
      if (spawn) {
        actor.x = spawn.x;
        actor.y = spawn.y;
      }
      actor.mode = "wander";
      actor.stepIndex = 0;
      actor.direction = 1;
      actor.turnCounter = 0;
      actor.waitTurns = 0;
      actor.needsReroute = false;
      actor.finished = false;
      actor.inactive = false;
      assignRandomActorRoute(actor);
    }

    function chooseRandomActorSpawn(actor) {
      const cells = getFreeActorCells(actor).filter((point) => buildRandomActorRoute(actor, point));
      const innerCells = cells.filter((point) => !isBoardEdge(point));
      return randomItem(innerCells.length ? innerCells : cells);
    }

    function getFreeActorCells(actor) {
      const level = deps.getLevel();
      const cells = [];
      for (let y = 0; y < level.height; y += 1) {
        for (let x = 0; x < level.width; x += 1) {
          if (isActorRouteCellFree(actor, { x, y }, new Set())) cells.push({ x, y });
        }
      }
      return cells;
    }

    function assignRandomActorRoute(actor) {
      const path = buildRandomActorRoute(actor);
      if (!path) {
        actor.path = [{ x: actor.x, y: actor.y }];
        actor.stepIndex = 0;
        actor.needsReroute = true;
        return false;
      }

      actor.path = path;
      actor.stepIndex = 0;
      actor.direction = 1;
      actor.waitTurns = 0;
      actor.needsReroute = false;
      actor.finished = false;
      actor.inactive = false;
      return true;
    }

    function buildRandomActorRoute(actor, start = { x: actor.x, y: actor.y }) {
      const startKey = gridKey(start);
      const parents = new Map([[startKey, null]]);
      const points = new Map([[startKey, start]]);
      const queue = [start];

      while (queue.length) {
        const current = queue.shift();
        getActorNeighbors(current).forEach((point) => {
          const key = gridKey(point);
          if (parents.has(key)) return;
          if (!isActorRouteCellFree(actor, point, null)) return;
          parents.set(key, gridKey(current));
          points.set(key, point);
          queue.push(point);
        });
      }

      const edgeTargets = Array.from(points.entries())
        .filter(([key, point]) => key !== startKey && isBoardEdge(point))
        .map(([, point]) => point);
      const distantTargets = edgeTargets.filter((point) => manhattanDistance(start, point) >= 2);
      const target = randomItem(distantTargets.length ? distantTargets : edgeTargets);
      if (!target) return null;

      return reconstructActorPath(startKey, gridKey(target), parents, points);
    }

    function isActorRouteCellFree(actor, point, visited) {
      const level = deps.getLevel();
      if (!point || point.x < 0 || point.y < 0 || point.x >= level.width || point.y >= level.height) return false;
      if (visited && visited.has(`${point.x},${point.y}`)) return false;
      if (obstacleAtGridCell(point.x, point.y)) return false;
      if (vehicleAtGridCell(point.x, point.y)) return false;
      if (actorAtGridCell(point.x, point.y, actor.id)) return false;
      return true;
    }

    function advanceActors(onComplete) {
      const actors = deps.getActors();
      const actorMoves = [];
      if (!actors.length) {
        onComplete();
        return;
      }

      actors.forEach((actor) => {
        if (actor.inactive) return;
        const reserved = new Set(actorMoves.map((move) => `${move.toX},${move.toY}`));
        if (!isActorReadyForTurn(actor)) return;

        if (actor.waitTurns > 0) {
          actor.waitTurns -= 1;
          if (actor.waitTurns > 0) return;
          if (actor.needsReroute) {
            const oldStep = getNextActorStep(actor);
            const oldRouteIsOpen =
              oldStep && isActorDestinationFree(actor, oldStep.point) && !reserved.has(`${oldStep.point.x},${oldStep.point.y}`);
            if (oldRouteIsOpen) actor.needsReroute = false;
            else if (!assignRandomActorRoute(actor)) return;
          }
        }

        if (isWanderingActor(actor) && (actor.needsReroute || !getNextActorStep(actor))) {
          assignRandomActorRoute(actor);
        }

        const nextStep = getNextActorStep(actor);
        if (!nextStep) return;
        if (!isActorDestinationFree(actor, nextStep.point)) {
          markActorBlocked(actor);
          return;
        }
        if (reserved.has(`${nextStep.point.x},${nextStep.point.y}`)) {
          markActorBlocked(actor);
          return;
        }
        actorMoves.push({
          actorId: actor.id,
          fromX: actor.x,
          fromY: actor.y,
          toX: nextStep.point.x,
          toY: nextStep.point.y,
          nextStepIndex: nextStep.index,
          nextDirection: nextStep.direction
        });
      });

      if (!actorMoves.length) {
        onComplete();
        return;
      }

      deps.playSound("actor");
      deps.startAnimation({
        type: "actors",
        actorMoves,
        duration: deps.getActorMoveDuration(),
        onComplete: () => {
          actorMoves.forEach((move) => {
            const actor = actors.find((item) => item.id === move.actorId);
            if (!actor) return;
            actor.x = move.toX;
            actor.y = move.toY;
            actor.stepIndex = move.nextStepIndex;
            actor.direction = move.nextDirection;
            if (isWanderingActor(actor) && actor.stepIndex >= actor.path.length - 1) {
              deactivateActor(actor);
            } else {
              actor.finished = actor.mode === "route" && actor.stepIndex >= actor.path.length - 1;
            }
          });
          onComplete();
        }
      });
    }

    function isActorReadyForTurn(actor) {
      if (actor.inactive) return false;
      if (actor.finished && !isWanderingActor(actor)) return false;
      actor.turnCounter = (actor.turnCounter || 0) + 1;
      const startDelay = Math.max(0, actor.startDelay || 0);
      const moveEvery = Math.max(1, actor.moveEvery || 1);
      if (actor.turnCounter <= startDelay) return false;
      return (actor.turnCounter - startDelay) % moveEvery === 0;
    }

    function markActorBlocked(actor) {
      if (!isWanderingActor(actor)) return;
      actor.waitTurns = 1;
      actor.needsReroute = true;
      actor.finished = false;
    }

    function deactivateActor(actor) {
      actor.inactive = true;
      actor.finished = true;
      actor.waitTurns = 0;
      actor.needsReroute = false;
      actor.path = [];
    }

    function getNextActorStep(actor) {
      if (!actor.path || actor.path.length < 2) return null;
      const currentIndex = Number.isInteger(actor.stepIndex) ? actor.stepIndex : findActorPathIndex(actor);
      const direction = actor.direction || 1;

      if (actor.mode === "route" || actor.mode === "wander") {
        const index = currentIndex + 1;
        if (index >= actor.path.length) return null;
        return { point: actor.path[index], index, direction: 1 };
      }

      if (actor.mode === "loop") {
        const index = (currentIndex + 1) % actor.path.length;
        return { point: actor.path[index], index, direction: 1 };
      }

      let nextIndex = currentIndex + direction;
      let nextDirection = direction;
      if (nextIndex < 0 || nextIndex >= actor.path.length) {
        nextDirection = -direction;
        nextIndex = currentIndex + nextDirection;
      }

      if (nextIndex < 0 || nextIndex >= actor.path.length) return null;
      return { point: actor.path[nextIndex], index: nextIndex, direction: nextDirection };
    }

    function findActorPathIndex(actor) {
      const index = (actor.path || []).findIndex((point) => point.x === actor.x && point.y === actor.y);
      return index >= 0 ? index : 0;
    }

    function isActorDestinationFree(actor, point) {
      const level = deps.getLevel();
      if (!point || point.x < 0 || point.y < 0 || point.x >= level.width || point.y >= level.height) return false;
      if (obstacleAtGridCell(point.x, point.y)) return false;
      if (vehicleAtGridCell(point.x, point.y)) return false;
      if (actorAtGridCell(point.x, point.y, actor.id)) return false;
      return true;
    }

    function vehicleAtGridCell(cellX, cellY, ignoreVehicleId) {
      return rules.vehicleAtGridCell ? rules.vehicleAtGridCell(deps.getVehicles(), cellX, cellY, ignoreVehicleId) : null;
    }

    function actorAtGridCell(cellX, cellY, ignoreActorId) {
      return rules.actorAtGridCell ? rules.actorAtGridCell(deps.getActors(), cellX, cellY, ignoreActorId) : null;
    }

    function obstacleAtGridCell(cellX, cellY) {
      return rules.obstacleAtGridCell ? rules.obstacleAtGridCell(deps.getLevel(), cellX, cellY) : null;
    }

    function getActorNeighbors(point) {
      return shuffle([
        { x: point.x + 1, y: point.y },
        { x: point.x - 1, y: point.y },
        { x: point.x, y: point.y + 1 },
        { x: point.x, y: point.y - 1 }
      ]);
    }

    function reconstructActorPath(startKey, targetKey, parents, points) {
      const path = [];
      let key = targetKey;
      while (key) {
        path.push(points.get(key));
        key = parents.get(key);
      }
      path.reverse();
      return path[0] && gridKey(path[0]) === startKey ? path : null;
    }

    function isBoardEdge(point) {
      const level = deps.getLevel();
      return point.x === 0 || point.y === 0 || point.x === level.width - 1 || point.y === level.height - 1;
    }

    function manhattanDistance(a, b) {
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    function gridKey(point) {
      return `${point.x},${point.y}`;
    }

    function randomItem(items) {
      if (!items.length) return null;
      return items[Math.floor(Math.random() * items.length)];
    }

    function shuffle(items) {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const item = result[i];
        result[i] = result[j];
        result[j] = item;
      }
      return result;
    }

    return {
      initializeActors,
      isWanderingActor,
      assignRandomActorRoute,
      buildRandomActorRoute,
      isActorRouteCellFree,
      advanceActors,
      getNextActorStep,
      isActorDestinationFree,
      isBoardEdge,
      getActorNeighbors
    };
  }

  window.PROBKA_ACTORS = {
    createController
  };
})();
