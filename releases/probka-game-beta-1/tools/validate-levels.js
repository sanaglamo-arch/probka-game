const fs = require("fs");
const path = require("path");
const vm = require("vm");

const levelsPath = path.join(__dirname, "..", "levels.js");
const code = fs.readFileSync(levelsPath, "utf8");
const sandbox = { window: {} };
const errors = [];
const levelIds = new Set();

vm.runInNewContext(code, sandbox, { filename: levelsPath });

const levels = sandbox.window.PROBKA_LEVELS;
const packs = sandbox.window.PROBKA_PACKS || [];
const tools = sandbox.window.PROBKA_LEVEL_TOOLS || {};
const expectedBoardSizes = {
  first_yard: 6,
  after_work: 6,
  courier_arrived: 6,
  janitor_route: 6,
  hopeless_yard: 6
};
const expectedMoveRanges = {
  first_yard: [2, 8],
  after_work: [8, 16],
  courier_arrived: [16, 28],
  janitor_route: [28, 44],
  hopeless_yard: [52, 60]
};
const expectedRevisitRanges = {
  after_work: [2, 8],
  courier_arrived: [8, 18],
  janitor_route: [18, 34],
  hopeless_yard: [40, 48]
};

if (!Array.isArray(levels)) {
  errors.push("PROBKA_LEVELS must be an array");
} else {
  if (levels.length !== 60) errors.push(`expected 60 levels, got ${levels.length}`);
  levels.forEach(validateLevel);
  validatePackProgression();
}

if (errors.length) {
  console.error(`Level validation failed: ${errors.length} error(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Level validation passed: ${levels.length} level(s), ${packs.length} pack(s)`);

function validateLevel(level) {
  const prefix = level && level.id ? level.id : "unknown level";
  const occupied = new Map();
  const localIds = new Set();
  const packIndex = packs.findIndex((pack) => pack.id === level.packId);

  if (!level.id) errors.push(`${prefix}: missing id`);
  if (levelIds.has(level.id)) errors.push(`${prefix}: duplicate level id`);
  levelIds.add(level.id);

  if (!level.packId) errors.push(`${prefix}: missing packId`);
  if (!Number.isInteger(level.width) || !Number.isInteger(level.height)) errors.push(`${prefix}: width and height must be integers`);
  if (level.width !== level.height) errors.push(`${prefix}: board must be square`);
  if (expectedBoardSizes[level.packId] && level.width !== expectedBoardSizes[level.packId]) {
    errors.push(`${prefix}: expected ${expectedBoardSizes[level.packId]}x${expectedBoardSizes[level.packId]} board in ${level.packId}`);
  }

  if (!level.exit || level.exit.side !== "right" || !Number.isInteger(level.exit.row)) {
    errors.push(`${prefix}: only right-side exits are supported`);
  }
  if (!Number.isInteger(level.minMoves) || level.minMoves < 1) errors.push(`${prefix}: missing positive minMoves`);
  if (!Number.isInteger(level.moveLimit) || level.moveLimit < level.minMoves) errors.push(`${prefix}: invalid moveLimit`);
  if (!Number.isInteger(level.difficulty) || !Number.isInteger(level.difficultyScore)) errors.push(`${prefix}: invalid difficulty metadata`);
  validateTargetMoves(prefix, level);

  const range = expectedMoveRanges[level.packId];
  if (range && (level.minMoves < range[0] || level.minMoves > range[1])) {
    errors.push(`${prefix}: minMoves ${level.minMoves} outside expected ${range[0]}-${range[1]}`);
  }

  (level.obstacles || []).forEach((obstacle) => {
    validateUnique(prefix, localIds, obstacle.id, "obstacle");
    const key = cellKey(obstacle.x, obstacle.y);
    if (!inside(level, obstacle.x, obstacle.y)) errors.push(`${prefix}: obstacle ${obstacle.id} out of bounds at ${key}`);
    if (occupied.has(key)) errors.push(`${prefix}: obstacle ${obstacle.id} collides with ${occupied.get(key)} at ${key}`);
    occupied.set(key, obstacle.id);
  });

  (level.vehicles || []).forEach((vehicle) => {
    validateUnique(prefix, localIds, vehicle.id, "vehicle");
    if (!["horizontal", "vertical"].includes(vehicle.axis)) errors.push(`${prefix}: vehicle ${vehicle.id} has invalid axis`);
    if (!Number.isInteger(vehicle.length) || vehicle.length < 2 || vehicle.length > 3) {
      errors.push(`${prefix}: vehicle ${vehicle.id} length must be 2 or 3`);
    }
    for (let i = 0; i < vehicle.length; i += 1) {
      const x = vehicle.x + (vehicle.axis === "horizontal" ? i : 0);
      const y = vehicle.y + (vehicle.axis === "vertical" ? i : 0);
      const key = cellKey(x, y);
      if (!inside(level, x, y)) errors.push(`${prefix}: vehicle ${vehicle.id} out of bounds at ${key}`);
      if (occupied.has(key)) errors.push(`${prefix}: vehicle ${vehicle.id} collides with ${occupied.get(key)} at ${key}`);
      occupied.set(key, vehicle.id);
    }
  });

  const target = (level.vehicles || []).find((vehicle) => vehicle.id === level.targetVehicleId);
  if (!target) errors.push(`${prefix}: missing target vehicle ${level.targetVehicleId}`);
  else if (target.axis !== "horizontal" || target.y !== level.exit.row) errors.push(`${prefix}: target must be horizontal on exit row`);

  (level.actors || []).forEach((actor) => validateActor(prefix, level, occupied, localIds, actor));
  if (packIndex >= 1 && (level.actors || []).length) errors.push(`${prefix}: classic campaign levels must not use actors as fake difficulty`);

  if (!Array.isArray(level.solutionPlan) || !level.solutionPlan.length) errors.push(`${prefix}: missing solutionPlan`);
  if (typeof tools.solveSolutionPlan === "function") {
    const result = tools.solveSolutionPlan(level);
    if (!result.solved) errors.push(`${prefix}: solutionPlan does not solve level (${result.reason || "unknown"})`);
    if (result.solved && result.moves !== level.minMoves) {
      errors.push(`${prefix}: stored minMoves ${level.minMoves} does not match solutionPlan ${result.moves}`);
    }
  }
  validateClassicCampaign(prefix, level);

  if (packIndex >= 1 && typeof tools.solveSimpleTargetLine === "function") {
    const simple = tools.solveSimpleTargetLine(level);
    if (simple.solved && simple.moves <= level.minMoves) {
      errors.push(`${prefix}: too trivial; simple target-line recipe solves in ${simple.moves} moves`);
    }
  }
}

function validateClassicCampaign(prefix, level) {
  if (!level.sourceMeta) {
    if (level.packId !== "first_yard") errors.push(`${prefix}: classic level missing sourceMeta`);
    return;
  }
  const moveCounts = {};
  (level.solutionPlan || []).forEach((move) => {
    moveCounts[move.id] = (moveCounts[move.id] || 0) + 1;
  });
  const repeatedVehicles = Object.values(moveCounts).filter((count) => count >= 2).length;
  const revisits = (level.solutionPlan || []).length - Object.keys(moveCounts).length;
  const range = expectedRevisitRanges[level.packId];
  if (range && (revisits < range[0] || revisits > range[1])) {
    errors.push(`${prefix}: revisits ${revisits} outside expected ${range[0]}-${range[1]}`);
  }
  if (level.packId === "hopeless_yard" && repeatedVehicles < 8) {
    errors.push(`${prefix}: too linear; expected at least 8 vehicles moved more than once, got ${repeatedVehicles}`);
  }
  if (level.packId !== "first_yard" && (moveCounts[level.targetVehicleId] || 0) < 1) {
    errors.push(`${prefix}: target car should move during solution`);
  }
}

function validatePackProgression() {
  let previousAverageScore = 0;
  packs.forEach((pack, packIndex) => {
    const packLevels = levels.filter((level) => level.packId === pack.id);
    if (packLevels.length !== 12) errors.push(`${pack.id}: expected 12 levels, got ${packLevels.length}`);

    const averageScore = Math.round(packLevels.reduce((sum, level) => sum + level.difficultyScore, 0) / Math.max(1, packLevels.length));
    if (averageScore < previousAverageScore) {
      errors.push(`${pack.id}: average difficulty score ${averageScore} is lower than previous pack ${previousAverageScore}`);
    }
    previousAverageScore = averageScore;

    if (typeof tools.makeBlockerSignature === "function") {
      const signatures = new Set(packLevels.map((level) => tools.makeBlockerSignature(level)));
      const minSignatureCount = pack.id === "janitor_route" ? 3 : packIndex <= 1 ? 4 : 5;
      if (signatures.size < minSignatureCount) {
        errors.push(`${pack.id}: expected at least ${minSignatureCount} blocker signatures, got ${signatures.size}`);
      }
    }

    const actorLevels = packLevels.filter((level) => (level.actors || []).length).length;
    if (packIndex >= 1 && actorLevels) errors.push(`${pack.id}: classic campaign pack must not include actor routes, got ${actorLevels}/12`);

    if (packIndex >= 1) validateDependencyLoad(pack, packLevels);
  });
}

function validateDependencyLoad(pack, packLevels) {
  if (typeof tools.countDependencyMoves !== "function") return;
  const weak = packLevels.filter((level) => tools.countDependencyMoves(level) < 3);
  if (weak.length) errors.push(`${pack.id}: weak dependency load in ${weak.map((level) => level.id).join(", ")}`);
}

function validateTargetMoves(prefix, level) {
  if (
    !level.targetMoves ||
    !Number.isInteger(level.targetMoves.threeStars) ||
    !Number.isInteger(level.targetMoves.twoStars) ||
    level.targetMoves.threeStars < level.minMoves ||
    level.targetMoves.twoStars < level.targetMoves.threeStars ||
    level.targetMoves.twoStars > level.moveLimit
  ) {
    errors.push(`${prefix}: targetMoves must fit minMoves and moveLimit`);
  }
}

function validateActor(prefix, level, occupied, localIds, actor) {
  validateUnique(prefix, localIds, actor.id, "actor");
  if (!["courier", "janitor", "pedestrian"].includes(actor.kind)) errors.push(`${prefix}: actor ${actor.id} has invalid kind`);
  if (!["route", "loop", "pingPong"].includes(actor.mode)) errors.push(`${prefix}: campaign actor ${actor.id} must be deterministic, got ${actor.mode}`);
  if (!Array.isArray(actor.path) || actor.path.length < 2) errors.push(`${prefix}: actor ${actor.id} path must have at least 2 points`);
  if (actor.startDelay !== undefined && (!Number.isInteger(actor.startDelay) || actor.startDelay < 0)) {
    errors.push(`${prefix}: actor ${actor.id} startDelay must be non-negative`);
  }
  if (actor.moveEvery !== undefined && (!Number.isInteger(actor.moveEvery) || actor.moveEvery < 1)) {
    errors.push(`${prefix}: actor ${actor.id} moveEvery must be positive`);
  }

  const key = cellKey(actor.x, actor.y);
  if (!inside(level, actor.x, actor.y)) errors.push(`${prefix}: actor ${actor.id} out of bounds at ${key}`);
  if (occupied.has(key)) errors.push(`${prefix}: actor ${actor.id} collides with ${occupied.get(key)} at ${key}`);
  occupied.set(key, actor.id);

  const stepIndex = Number.isInteger(actor.stepIndex) ? actor.stepIndex : 0;
  if (stepIndex < 0 || stepIndex >= actor.path.length) errors.push(`${prefix}: actor ${actor.id} stepIndex out of range`);
  const start = actor.path[stepIndex];
  if (start && (start.x !== actor.x || start.y !== actor.y)) errors.push(`${prefix}: actor ${actor.id} start must match path[stepIndex]`);

  (actor.path || []).forEach((point, index) => {
    const pathKey = cellKey(point.x, point.y);
    if (!inside(level, point.x, point.y)) errors.push(`${prefix}: actor ${actor.id} path point ${index} out of bounds at ${pathKey}`);
    if ((level.obstacles || []).some((obstacle) => obstacle.x === point.x && obstacle.y === point.y)) {
      errors.push(`${prefix}: actor ${actor.id} path point ${index} crosses obstacle at ${pathKey}`);
    }
  });
}

function validateUnique(prefix, localIds, id, type) {
  if (!id) errors.push(`${prefix}: ${type} missing id`);
  if (localIds.has(id)) errors.push(`${prefix}: duplicate local id ${id}`);
  localIds.add(id);
}

function inside(level, x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < level.width && y < level.height;
}

function cellKey(x, y) {
  return `${x},${y}`;
}
