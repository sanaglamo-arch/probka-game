const fs = require("fs");
const path = require("path");
const vm = require("vm");

const bankPath = path.join(__dirname, "..", "level-bank.generated.js");
const levelsPath = path.join(__dirname, "..", "levels.js");
const skinsPath = path.join(__dirname, "..", "skins.js");
const dailyPath = path.join(__dirname, "..", "daily.js");
const sandbox = { window: {}, console };
const errors = [];

vm.runInNewContext(fs.readFileSync(bankPath, "utf8"), sandbox, { filename: bankPath });
vm.runInNewContext(fs.readFileSync(levelsPath, "utf8"), sandbox, { filename: levelsPath });
vm.runInNewContext(fs.readFileSync(skinsPath, "utf8"), sandbox, { filename: skinsPath });
vm.runInNewContext(fs.readFileSync(dailyPath, "utf8"), sandbox, { filename: dailyPath });

const modes = sandbox.window.PROBKA_MODES || [];
const levels = sandbox.window.PROBKA_LEVELS || [];
const dailyLevels = sandbox.window.PROBKA_DAILY_LEVELS || [];
const tools = sandbox.window.PROBKA_LEVEL_TOOLS || {};
const skins = sandbox.window.PROBKA_SKINS || [];

if (modes.length !== 3) errors.push(`expected 3 modes, got ${modes.length}`);
if (levels.length !== 300) errors.push(`expected 300 levels, got ${levels.length}`);
if (dailyLevels.length !== 365) errors.push(`expected 365 daily levels, got ${dailyLevels.length}`);

validateModes();
validateLevels();
validateDailyLevels();
validateSkins();
validateRuntimeCopy();

if (errors.length) {
  console.error(`Level validation failed: ${errors.length} error(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Level validation passed: ${levels.length} mode level(s), ${dailyLevels.length} daily level(s), ${modes.length} mode(s)`);

function validateModes() {
  const expected = ["free", "moves", "timed"];
  expected.forEach((id) => {
    const mode = modes.find((item) => item.id === id);
    if (!mode) errors.push(`missing mode ${id}`);
  });
}

function validateLevels() {
  const ids = new Set();
  const boards = new Set();
  modes.forEach((mode) => {
    const modeLevels = levels.filter((level) => level.modeId === mode.id);
    if (modeLevels.length !== 100) errors.push(`${mode.id}: expected 100 levels, got ${modeLevels.length}`);
    let previousAverageGuard = 0;
    let previous = null;
    let firstMoveStreak = 0;
    modeLevels.forEach((level, index) => {
      const prefix = level.id || `${mode.id}_${index + 1}`;
      if (ids.has(level.id)) errors.push(`${prefix}: duplicate id`);
      ids.add(level.id);
      if (level.modeOrder !== index + 1) errors.push(`${prefix}: bad modeOrder`);
      if (boards.has(level.board)) errors.push(`${prefix}: duplicate board`);
      boards.add(level.board);
      validateStructure(prefix, level, mode);
      validateRuleData(prefix, level, mode);
      validateSolution(prefix, level);
      const guard = level.minMoves * 100 + level.difficultyScore;
      if (index > 0 && guard < previousAverageGuard - 1600) errors.push(`${prefix}: difficulty drops too hard`);
      previousAverageGuard = Math.max(previousAverageGuard, guard);
      if (previous) {
        if (level.sourceMeta.rootBoard === previous.sourceMeta.rootBoard) errors.push(`${prefix}: repeats previous root board`);
        if (planSignature(level.solutionPlan, 3) === planSignature(previous.solutionPlan, 3)) {
          errors.push(`${prefix}: repeats previous first-3 solution pattern`);
        }
        if (directionSignature(level.solutionPlan, 8) === directionSignature(previous.solutionPlan, 8)) {
          errors.push(`${prefix}: repeats previous first-8 direction pattern`);
        }
      }
      const firstMove = planSignature(level.solutionPlan, 1);
      firstMoveStreak = previous && firstMove === planSignature(previous.solutionPlan, 1) ? firstMoveStreak + 1 : 1;
      if (firstMoveStreak > 2) errors.push(`${prefix}: first-move pattern streak is too long`);
      previous = level;
    });
    validateModeRanges(mode, modeLevels);
  });
}

function validateDailyLevels() {
  const regularBoards = new Set(levels.map((level) => level.board));
  const ids = new Set();
  const boards = new Set();
  let previous = null;
  let firstMoveStreak = 0;
  dailyLevels.forEach((level, index) => {
    const prefix = level.id || `daily_${index + 1}`;
    if (ids.has(level.id)) errors.push(`${prefix}: duplicate daily id`);
    ids.add(level.id);
    if (level.dailyOrder !== index + 1) errors.push(`${prefix}: bad dailyOrder`);
    if (regularBoards.has(level.board)) errors.push(`${prefix}: duplicates regular board`);
    if (boards.has(level.board)) errors.push(`${prefix}: duplicate daily board`);
    boards.add(level.board);
    validateStructure(prefix, level, { id: "daily" });
    validateSolution(prefix, level);
    if (level.moveLimit !== undefined && level.moveLimit !== null) errors.push(`${prefix}: daily must not have moveLimit`);
    if (!level.sourceMeta || level.sourceMeta.kind !== "classic_rush_hour_daily") errors.push(`${prefix}: invalid daily sourceMeta`);
    if (previous) {
      if (level.sourceMeta.rootBoard === previous.sourceMeta.rootBoard) errors.push(`${prefix}: repeats previous daily root board`);
      if (planSignature(level.solutionPlan, 3) === planSignature(previous.solutionPlan, 3)) {
        errors.push(`${prefix}: repeats previous daily first-3 solution pattern`);
      }
      if (planSignature(level.solutionPlan, 5) === planSignature(previous.solutionPlan, 5)) {
        errors.push(`${prefix}: repeats previous daily first-5 solution pattern`);
      }
      if (directionSignature(level.solutionPlan, 8) === directionSignature(previous.solutionPlan, 8)) {
        errors.push(`${prefix}: repeats previous daily first-8 direction pattern`);
      }
    }
    const firstMove = planSignature(level.solutionPlan, 1);
    firstMoveStreak = previous && firstMove === planSignature(previous.solutionPlan, 1) ? firstMoveStreak + 1 : 1;
    if (firstMoveStreak > 2) errors.push(`${prefix}: daily first-move pattern streak is too long`);
    previous = level;
  });
}

function validateSkins() {
  if (skins.length !== 18) errors.push(`expected 18 skins, got ${skins.length}`);
  const ids = new Set();
  let previousPrice = -1;
  skins.forEach((skin, index) => {
    const prefix = skin.id || `skin_${index + 1}`;
    if (ids.has(skin.id)) errors.push(`${prefix}: duplicate skin id`);
    ids.add(skin.id);
    if (!skin.name || !skin.color || !skin.pattern) errors.push(`${prefix}: missing skin display data`);
    if (!Number.isInteger(skin.price) || skin.price < 0) errors.push(`${prefix}: invalid skin price`);
    if (index === 0 && (skin.id !== "classic_red" || skin.price !== 0)) errors.push(`${prefix}: first skin must be free classic_red`);
    if (skin.price < previousPrice) errors.push(`${prefix}: skin prices must be ascending`);
    previousPrice = skin.price;
  });
}

function validateRuntimeCopy() {
  const runtimeFiles = [
    "index.html",
    "game.js",
    "daily.js",
    "skins.js",
    "config.js",
    "texts.js",
    "progress.js",
    "economy.js",
    "rules.js",
    "session.js",
    "renderer.js",
    "screens.js",
    "tutorial.js",
    "audio.js"
  ];
  const forbidden = [
    { pattern: /HARD/, label: "raw HARD badge" },
    { pattern: /₽/, label: "real currency symbol" },
    { pattern: /Рекламный баннер|заглуш/i, label: "draft ad placeholder text" },
    { pattern: /prototype/i, label: "prototype wording" },
    { pattern: /\b\d+\s*\/\s*10\b/, label: "ambiguous difficulty fraction" }
  ];
  runtimeFiles.forEach((file) => {
    const contents = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    forbidden.forEach((rule) => {
      if (rule.pattern.test(contents)) errors.push(`${file}: contains ${rule.label}`);
    });
  });
}

function validateStructure(prefix, level, mode) {
  if (level.width !== 6 || level.height !== 6) errors.push(`${prefix}: expected 6x6 board`);
  if (mode.id !== "daily" && level.packId !== mode.id) errors.push(`${prefix}: packId must match modeId`);
  if (mode.id === "daily" && level.packId !== "daily") errors.push(`${prefix}: packId must be daily`);
  if (!level.sourceMeta || level.sourceMeta.source !== "fogleman/rush") errors.push(`${prefix}: missing fogleman source metadata`);
  if (!Number.isInteger(level.minMoves) || level.minMoves < 2 || level.minMoves > 60) errors.push(`${prefix}: invalid minMoves ${level.minMoves}`);
  if (!Number.isInteger(level.difficulty) || level.difficulty < 1 || level.difficulty > 10) errors.push(`${prefix}: invalid difficulty`);
  const target = (level.vehicles || []).find((vehicle) => vehicle.id === level.targetVehicleId);
  if (!target) errors.push(`${prefix}: missing target vehicle`);
  if (target && (target.axis !== "horizontal" || target.y !== level.exit.row)) errors.push(`${prefix}: target must be horizontal on exit row`);
  if ((level.actors || []).length) errors.push(`${prefix}: main modes must not use actors yet`);
}

function validateRuleData(prefix, level, mode) {
  if (mode.rule === "moves") {
    if (!Number.isInteger(level.moveLimit) || level.moveLimit < level.minMoves) errors.push(`${prefix}: invalid moveLimit`);
    if (!level.targetMoves || level.targetMoves.threeStars < level.minMoves || level.targetMoves.twoStars > level.moveLimit) {
      errors.push(`${prefix}: invalid targetMoves`);
    }
  } else {
    if (level.moveLimit !== undefined) errors.push(`${prefix}: moveLimit only belongs to moves mode`);
  }
  if (mode.rule === "timed") {
    if (!Number.isInteger(level.timeLimitSec) || level.timeLimitSec < 20) errors.push(`${prefix}: invalid timeLimitSec`);
    if (!level.timeTargets || level.timeTargets.threeStars >= level.timeTargets.twoStars || level.timeTargets.twoStars > level.timeLimitSec) {
      errors.push(`${prefix}: invalid timeTargets`);
    }
  }
}

function validateSolution(prefix, level) {
  const planResult = tools.solveSolutionPlan(level);
  if (!planResult.solved) errors.push(`${prefix}: solutionPlan failed (${planResult.reason || "unknown"})`);
  if (planResult.solved && planResult.moves !== level.minMoves) errors.push(`${prefix}: stored minMoves ${level.minMoves} != plan ${planResult.moves}`);
  if (level.modeOrder % 20 === 0 || level.modeOrder === 1 || level.modeOrder === 100) {
    const shortest = tools.solveShortestPlan(level, 500000);
    if (!shortest.solved) errors.push(`${prefix}: shortest solver failed`);
    if (shortest.solved && shortest.moves !== level.minMoves) errors.push(`${prefix}: shortest ${shortest.moves} != stored ${level.minMoves}`);
  }
}

function validateModeRanges(mode, modeLevels) {
  const min = Math.min(...modeLevels.map((level) => level.minMoves));
  const max = Math.max(...modeLevels.map((level) => level.minMoves));
  const [expectedMin, expectedMax] = mode.minMovesRange;
  if (min < expectedMin || max > expectedMax) errors.push(`${mode.id}: minMoves ${min}-${max} outside ${expectedMin}-${expectedMax}`);
  const first = modeLevels[0].minMoves;
  const last = modeLevels[modeLevels.length - 1].minMoves;
  if (last <= first) errors.push(`${mode.id}: no difficulty growth`);
}

function planSignature(plan, size) {
  return (plan || [])
    .slice(0, size)
    .map((move) => `${move.id}:${Math.sign(move.delta)}:${Math.abs(move.delta)}`)
    .join("|");
}

function directionSignature(plan, size) {
  return (plan || [])
    .slice(0, size)
    .map((move) => `${move.id}:${Math.sign(move.delta)}`)
    .join("|");
}
