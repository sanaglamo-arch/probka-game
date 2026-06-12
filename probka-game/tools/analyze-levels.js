const fs = require("fs");
const path = require("path");
const vm = require("vm");

const bankPath = path.join(__dirname, "..", "level-bank.generated.js");
const levelsPath = path.join(__dirname, "..", "levels.js");
const sandbox = { window: {}, console };

vm.runInNewContext(fs.readFileSync(bankPath, "utf8"), sandbox, { filename: bankPath });
vm.runInNewContext(fs.readFileSync(levelsPath, "utf8"), sandbox, { filename: levelsPath });

const levels = sandbox.window.PROBKA_LEVELS || [];
const dailyLevels = sandbox.window.PROBKA_DAILY_LEVELS || [];
const modes = sandbox.window.PROBKA_MODES || [];
const tools = sandbox.window.PROBKA_LEVEL_TOOLS || {};

modes.forEach((mode) => {
  const modeLevels = levels.filter((level) => level.modeId === mode.id);
  const minMoves = modeLevels.map((level) => level.minMoves);
  const scores = modeLevels.map((level) => level.difficultyScore);
  const revisits = modeLevels.map(countMoveRevisits);
  const dependencyMoves = modeLevels.map((level) => tools.countDependencyMoves(level));
  const signatures = new Set(modeLevels.map((level) => tools.makeBlockerSignature(level)));
  const walls = modeLevels.map((level) => (level.obstacles || []).length);
  const repeatReport = getRepeatReport(modeLevels);
  const replayFailures = modeLevels
    .map((level) => ({ level, result: tools.solveSolutionPlan(level) }))
    .filter((item) => !item.result.solved);
  console.log(
    [
      mode.title,
      `rule=${mode.rule}`,
      `levels=${modeLevels.length}`,
      `minMoves=${range(minMoves)}`,
      `revisits=${range(revisits)}`,
      `dependency=${range(dependencyMoves)}`,
      `score=${range(scores)}`,
      `signatures=${signatures.size}`,
      `walls=${range(walls)}`,
      `adjacentRoot=${repeatReport.sameRoot}`,
      `adjacentFirst3=${repeatReport.sameFirst3}`,
      `firstMoveStreak=${repeatReport.maxFirstMoveStreak}`,
      `replayFailures=${replayFailures.length}`,
      mode.rule === "timed" ? `time=${range(modeLevels.map((level) => level.timeLimitSec))}s` : "",
      mode.rule === "moves" ? `limit=${range(modeLevels.map((level) => level.moveLimit))}` : ""
    ]
      .filter(Boolean)
      .join(" | ")
  );
  if (repeatReport.examples.length) {
    repeatReport.examples.forEach((example) => console.log(`  repeat: ${example}`));
  }
  replayFailures.slice(0, 5).forEach((item) => console.log(`  replay failed: ${item.level.id} (${item.result.reason || "unknown"})`));
});

if (dailyLevels.length) {
  printSequence("Уровень дня", { id: "daily", rule: "daily" }, dailyLevels);
}

function printSequence(title, mode, modeLevels) {
  const minMoves = modeLevels.map((level) => level.minMoves);
  const scores = modeLevels.map((level) => level.difficultyScore);
  const revisits = modeLevels.map(countMoveRevisits);
  const dependencyMoves = modeLevels.map((level) => tools.countDependencyMoves(level));
  const signatures = new Set(modeLevels.map((level) => tools.makeBlockerSignature(level)));
  const walls = modeLevels.map((level) => (level.obstacles || []).length);
  const repeatReport = getRepeatReport(modeLevels);
  const replayFailures = modeLevels
    .map((level) => ({ level, result: tools.solveSolutionPlan(level) }))
    .filter((item) => !item.result.solved);
  console.log(
    [
      title,
      `rule=${mode.rule}`,
      `levels=${modeLevels.length}`,
      `minMoves=${range(minMoves)}`,
      `revisits=${range(revisits)}`,
      `dependency=${range(dependencyMoves)}`,
      `score=${range(scores)}`,
      `signatures=${signatures.size}`,
      `walls=${range(walls)}`,
      `adjacentRoot=${repeatReport.sameRoot}`,
      `adjacentFirst3=${repeatReport.sameFirst3}`,
      `adjacentFirst5=${repeatReport.sameFirst5}`,
      `firstMoveStreak=${repeatReport.maxFirstMoveStreak}`,
      `replayFailures=${replayFailures.length}`,
      repeatReport.maxSimilarity ? `maxSimilarity=${repeatReport.maxSimilarity}` : ""
    ]
      .filter(Boolean)
      .join(" | ")
  );
  if (repeatReport.examples.length) {
    repeatReport.examples.forEach((example) => console.log(`  repeat: ${example}`));
  }
  replayFailures.slice(0, 5).forEach((item) => console.log(`  replay failed: ${item.level.id} (${item.result.reason || "unknown"})`));
}

function countMoveRevisits(level) {
  const ids = new Set();
  (level.solutionPlan || []).forEach((move) => ids.add(move.id));
  return (level.solutionPlan || []).length - ids.size;
}

function range(values) {
  return `${Math.min(...values)}-${Math.max(...values)}`;
}

function getRepeatReport(modeLevels) {
  let sameRoot = 0;
  let sameFirst3 = 0;
  let sameFirst5 = 0;
  let sameFirstMove = 0;
  let firstMoveStreak = 1;
  let maxFirstMoveStreak = 1;
  let maxSimilarity = 0;
  const examples = [];
  for (let index = 1; index < modeLevels.length; index += 1) {
    const previous = modeLevels[index - 1];
    const current = modeLevels[index];
    const firstMoveMatches = planSignature(previous.solutionPlan, 1) === planSignature(current.solutionPlan, 1);
    const first3Matches = planSignature(previous.solutionPlan, 3) === planSignature(current.solutionPlan, 3);
    const first5Matches = planSignature(previous.solutionPlan, 5) === planSignature(current.solutionPlan, 5);
    const rootMatches = previous.sourceMeta.rootBoard === current.sourceMeta.rootBoard;
    if (rootMatches) sameRoot += 1;
    if (firstMoveMatches) sameFirstMove += 1;
    if (first3Matches) sameFirst3 += 1;
    if (first5Matches) sameFirst5 += 1;
    const similarity = getSolutionSimilarity(previous.solutionPlan, current.solutionPlan);
    maxSimilarity = Math.max(maxSimilarity, similarity);
    firstMoveStreak = firstMoveMatches ? firstMoveStreak + 1 : 1;
    maxFirstMoveStreak = Math.max(maxFirstMoveStreak, firstMoveStreak);
    if (examples.length < 8 && (rootMatches || first3Matches || first5Matches || firstMoveStreak > 2 || similarity >= 0.72)) {
      examples.push(`${previous.id}->${current.id} root=${rootMatches} first=${firstMoveMatches} first3=${first3Matches} first5=${first5Matches} similarity=${similarity}`);
    }
  }
  return { sameRoot, sameFirstMove, sameFirst3, sameFirst5, maxFirstMoveStreak, maxSimilarity, examples };
}

function planSignature(plan, size) {
  return (plan || [])
    .slice(0, size)
    .map((move) => `${move.id}:${Math.sign(move.delta)}:${Math.abs(move.delta)}`)
    .join("|");
}

function getSolutionSimilarity(leftPlan = [], rightPlan = []) {
  const size = Math.min(8, leftPlan.length, rightPlan.length);
  if (!size) return 0;
  let same = 0;
  for (let i = 0; i < size; i += 1) {
    const left = leftPlan[i];
    const right = rightPlan[i];
    if (left.id === right.id && Math.sign(left.delta) === Math.sign(right.delta)) same += 1;
  }
  return Number((same / size).toFixed(2));
}
