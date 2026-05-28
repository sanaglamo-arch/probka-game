const fs = require("fs");
const path = require("path");
const vm = require("vm");

const days = Number.parseInt(process.argv[2] || "120", 10);
const dailyPath = path.join(__dirname, "..", "daily.js");
const code = fs.readFileSync(dailyPath, "utf8");
const sandbox = { window: {}, console };
const errors = [];
const ids = new Set();

vm.runInNewContext(code, sandbox, { filename: dailyPath });

const daily = sandbox.window.PROBKA_DAILY;
if (!daily || typeof daily.getDailyLevel !== "function") {
  errors.push("PROBKA_DAILY.getDailyLevel must be exported");
} else {
  validateSkins(sandbox.window.PROBKA_SKINS);
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

console.log(`Daily validation passed: ${days} generated day(s)`);

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
  if (level.width !== 14 || level.height !== 14) errors.push(`${prefix}: hard daily must be 14x14`);
  if (!Number.isInteger(level.seed)) errors.push(`${prefix}: missing integer seed`);
  if (!Number.isInteger(level.moveLimit) || level.moveLimit < 1) errors.push(`${prefix}: invalid moveLimit`);
  if (!Number.isInteger(level.minMoves) || level.minMoves < 12 || level.minMoves > 22) {
    errors.push(`${prefix}: minMoves must be within 12-22, got ${level.minMoves}`);
  }
  if (!Number.isInteger(level.difficultyScore) || level.difficultyScore < 0) errors.push(`${prefix}: invalid difficultyScore`);

  const target = (level.vehicles || []).find((vehicle) => vehicle.id === level.targetVehicleId);
  if (!target) errors.push(`${prefix}: missing target vehicle`);
  if (target && (target.axis !== "horizontal" || target.y !== level.exit.row)) {
    errors.push(`${prefix}: target must be horizontal on exit row`);
  }
  if ((level.vehicles || []).length < 20) errors.push(`${prefix}: hard daily should have at least 20 vehicles`);
  if ((level.obstacles || []).length < 8) errors.push(`${prefix}: hard daily should have at least 8 obstacles`);

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

  const result = daily.solveLevel(level, level.moveLimit, 120000);
  if (!result.solved) errors.push(`${prefix}: no solution within ${level.moveLimit} moves`);
  if (result.solved && result.minMoves !== level.minMoves) {
    errors.push(`${prefix}: stored minMoves ${level.minMoves} does not match solver ${result.minMoves}`);
  }
}

function validateSkins(skins) {
  if (!Array.isArray(skins)) {
    errors.push("PROBKA_SKINS must be exported as an array");
    return;
  }
  if (skins.length !== 6) errors.push(`expected 6 skins, got ${skins.length}`);
  const ids = new Set();
  let previousPrice = -1;
  skins.forEach((skin, index) => {
    if (!skin.id || ids.has(skin.id)) errors.push(`skin ${index}: missing or duplicate id`);
    ids.add(skin.id);
    if (!skin.name) errors.push(`skin ${skin.id}: missing name`);
    if (!/^#[0-9a-fA-F]{6}$/.test(skin.color || "")) errors.push(`skin ${skin.id}: invalid color`);
    if (!/^#[0-9a-fA-F]{6}$/.test(skin.accent || "")) errors.push(`skin ${skin.id}: invalid accent`);
    if (!/^#[0-9a-fA-F]{6}$/.test(skin.trim || "")) errors.push(`skin ${skin.id}: invalid trim`);
    if (!["rally", "checker", "parcel", "neon", "comet", "crown"].includes(skin.pattern)) {
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
