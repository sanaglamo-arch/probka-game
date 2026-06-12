const fs = require("fs");
const path = require("path");
const vm = require("vm");

const days = Number.parseInt(process.argv[2] || "120", 10);
const bankPath = path.join(__dirname, "..", "level-bank.generated.js");
const levelsPath = path.join(__dirname, "..", "levels.js");
const skinsPath = path.join(__dirname, "..", "skins.js");
const dailyPath = path.join(__dirname, "..", "daily.js");
const sandbox = { window: {}, console };
const errors = [];
const ids = new Set();
const boards = new Set();

vm.runInNewContext(fs.readFileSync(bankPath, "utf8"), sandbox, { filename: bankPath });
vm.runInNewContext(fs.readFileSync(levelsPath, "utf8"), sandbox, { filename: levelsPath });
vm.runInNewContext(fs.readFileSync(skinsPath, "utf8"), sandbox, { filename: skinsPath });
vm.runInNewContext(fs.readFileSync(dailyPath, "utf8"), sandbox, { filename: dailyPath });

const daily = sandbox.window.PROBKA_DAILY;
if (!daily || typeof daily.getDailyLevel !== "function") {
  errors.push("PROBKA_DAILY.getDailyLevel must be exported");
} else {
  validateSkins(sandbox.window.PROBKA_SKINS);
  validateDailyBank();
  for (let index = 0; index < days; index += 1) {
    const date = new Date(Date.UTC(2026, 4, 28 + index, 9, 0, 0));
    validateDailyLevel(daily.getDailyLevel(date), date);
  }
}

if (errors.length) {
  console.error(`Daily validation failed: ${errors.length} error(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Daily validation passed: ${days} generated day(s), ${sandbox.window.PROBKA_DAILY_LEVELS.length} bank slot(s)`);

function validateDailyBank() {
  const regular = sandbox.window.PROBKA_LEVELS || [];
  regular.forEach((level) => boards.add(level.board));
  const dailyLevels = sandbox.window.PROBKA_DAILY_LEVELS || [];
  if (dailyLevels.length !== 365) errors.push(`expected 365 daily bank levels, got ${dailyLevels.length}`);
  const slots = new Set();
  dailyLevels.forEach((level, index) => {
    const prefix = level.id || `daily_slot_${index + 1}`;
    if (level.dailyOrder !== index + 1) errors.push(`${prefix}: bad dailyOrder`);
    if (slots.has(level.dateSlot)) errors.push(`${prefix}: duplicate dateSlot`);
    slots.add(level.dateSlot);
    if (boards.has(level.board)) errors.push(`${prefix}: overlaps regular mode board`);
    boards.add(level.board);
    if (!level.sourceMeta || level.sourceMeta.kind !== "classic_rush_hour_daily") {
      errors.push(`${prefix}: missing classic daily source metadata`);
    }
    const replay = sandbox.window.PROBKA_LEVEL_TOOLS.solveSolutionPlan(level);
    if (!replay.solved) errors.push(`${prefix}: solutionPlan failed (${replay.reason || "unknown"})`);
    if (replay.solved && replay.moves !== level.minMoves) errors.push(`${prefix}: plan ${replay.moves} != minMoves ${level.minMoves}`);
  });
}

function validateDailyLevel(level, date) {
  const prefix = level && level.id ? level.id : `daily for ${date.toISOString()}`;
  const occupied = new Map();

  if (!level || typeof level !== "object") {
    errors.push(`${prefix}: level must be an object`);
    return;
  }
  if (ids.has(level.id)) errors.push(`${prefix}: duplicate id`);
  ids.add(level.id);
  if (level.packId !== "daily") errors.push(`${prefix}: packId must be daily`);
  if (level.width !== 6 || level.height !== 6) errors.push(`${prefix}: daily classic challenge must be 6x6`);
  if (!Number.isInteger(level.seed)) errors.push(`${prefix}: missing integer seed`);
  if (level.moveLimit !== undefined && level.moveLimit !== null) errors.push(`${prefix}: daily must not have a moveLimit`);
  if (!Number.isInteger(level.minMoves) || level.minMoves < 36 || level.minMoves > 70) {
    errors.push(`${prefix}: minMoves must be within 36-70, got ${level.minMoves}`);
  }
  if (!Number.isInteger(level.difficultyScore) || level.difficultyScore < 0) errors.push(`${prefix}: invalid difficultyScore`);
  if (level.dailyPlan) errors.push(`${prefix}: must not use old dailyPlan solver shortcut`);
  if (!level.sourceMeta || level.sourceMeta.kind !== "classic_rush_hour_daily") {
    errors.push(`${prefix}: missing classic daily source metadata`);
  }

  const target = (level.vehicles || []).find((vehicle) => vehicle.id === level.targetVehicleId);
  if (!target) errors.push(`${prefix}: missing target vehicle`);
  if (target && (target.axis !== "horizontal" || target.y !== level.exit.row)) {
    errors.push(`${prefix}: target must be horizontal on exit row`);
  }
  if ((level.vehicles || []).length < 10) errors.push(`${prefix}: daily classic should have at least 10 vehicles`);
  if ((level.actors || []).length) errors.push(`${prefix}: daily classic must not use actors yet`);

  (level.obstacles || []).forEach((obstacle) => {
    const key = `${obstacle.x},${obstacle.y}`;
    if (!inside(level, obstacle.x, obstacle.y)) errors.push(`${prefix}: obstacle ${obstacle.id} out of bounds`);
    if (target && obstacle.y === target.y && obstacle.x >= target.x + target.length) {
      errors.push(`${prefix}: obstacle ${obstacle.id} blocks target path`);
    }
    if (occupied.has(key)) errors.push(`${prefix}: obstacle ${obstacle.id} collides with ${occupied.get(key)}`);
    occupied.set(key, obstacle.id);
  });

  (level.vehicles || []).forEach((vehicle) => {
    if (!["horizontal", "vertical"].includes(vehicle.axis)) errors.push(`${prefix}: vehicle ${vehicle.id} has invalid axis`);
    if (!Number.isInteger(vehicle.length) || vehicle.length < 2 || vehicle.length > 3) {
      errors.push(`${prefix}: vehicle ${vehicle.id} has invalid length`);
    }
    for (let i = 0; i < vehicle.length; i += 1) {
      const x = vehicle.x + (vehicle.axis === "horizontal" ? i : 0);
      const y = vehicle.y + (vehicle.axis === "vertical" ? i : 0);
      const key = `${x},${y}`;
      if (!inside(level, x, y)) errors.push(`${prefix}: vehicle ${vehicle.id} out of bounds`);
      if (occupied.has(key)) errors.push(`${prefix}: vehicle ${vehicle.id} collides with ${occupied.get(key)}`);
      occupied.set(key, vehicle.id);
    }
  });

  const replay = sandbox.window.PROBKA_LEVEL_TOOLS.solveSolutionPlan(level);
  if (!replay.solved) errors.push(`${prefix}: stored solutionPlan failed (${replay.reason || "unknown"})`);
  const result = daily.solveLevel(level, level.minMoves + 12, 500000);
  if (!result.solved) errors.push(`${prefix}: no solution within ${level.moveLimit} moves`);
  if (result.solved && result.minMoves !== level.minMoves) {
    errors.push(`${prefix}: stored minMoves ${level.minMoves} does not match solver ${result.minMoves}`);
  }
  if (result.solved && result.method !== "bfs") {
    errors.push(`${prefix}: daily must be validated by bfs, got ${result.method || "unknown"}`);
  }
}

function validateSkins(skins) {
  if (!Array.isArray(skins)) {
    errors.push("PROBKA_SKINS must be exported as an array");
    return;
  }
  if (skins.length !== 18) errors.push(`expected 18 skins, got ${skins.length}`);
  const ids = new Set();
  let previousPrice = -1;
  skins.forEach((skin, index) => {
    if (!skin.id || ids.has(skin.id)) errors.push(`skin ${index}: missing or duplicate id`);
    ids.add(skin.id);
    if (!skin.name) errors.push(`skin ${skin.id}: missing name`);
    if (!/^#[0-9a-fA-F]{6}$/.test(skin.color || "")) errors.push(`skin ${skin.id}: invalid color`);
    if (!/^#[0-9a-fA-F]{6}$/.test(skin.accent || "")) errors.push(`skin ${skin.id}: invalid accent`);
    if (!/^#[0-9a-fA-F]{6}$/.test(skin.trim || "")) errors.push(`skin ${skin.id}: invalid trim`);
    if (!["rally", "checker", "parcel", "pizza", "neon", "siren", "medical", "hazard", "retro", "business", "stickers", "comet", "chrome", "graffiti", "cyber", "crown", "vip", "tow"].includes(skin.pattern)) {
      errors.push(`skin ${skin.id}: invalid pattern`);
    }
    if (!skin.badge || skin.badge.length > 3) errors.push(`skin ${skin.id}: badge must be 1-3 chars`);
    if (!Number.isInteger(skin.price) || skin.price < 0) errors.push(`skin ${skin.id}: invalid price`);
    if (skin.price < previousPrice) errors.push(`skin ${skin.id}: prices must be non-decreasing`);
    previousPrice = skin.price;
  });
  const base = skins.find((skin) => skin.id === "classic_red");
  if (!base || base.price !== 0) errors.push("classic_red skin must exist and be free");
}

function inside(level, x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < level.width && y < level.height;
}
