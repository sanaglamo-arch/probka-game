const fs = require("fs");
const path = require("path");
const vm = require("vm");

const levelsPath = path.join(__dirname, "..", "levels.js");
const code = fs.readFileSync(levelsPath, "utf8");
const sandbox = { window: {} };
const failures = [];

vm.runInNewContext(code, sandbox, { filename: levelsPath });

const levels = sandbox.window.PROBKA_LEVELS || [];
const packs = sandbox.window.PROBKA_PACKS || [];
const tools = sandbox.window.PROBKA_LEVEL_TOOLS || {};

packs.forEach((pack) => {
  const packLevels = levels.filter((level) => level.packId === pack.id);
  const solved = packLevels.map((level) => ({ level, result: tools.solveSolutionPlan(level) }));
  const minMoves = solved.map((item) => item.result.moves).filter(Number.isFinite);
  const scores = packLevels.map((level) => level.difficultyScore);
  const dependencyMoves = packLevels.map((level) => tools.countDependencyMoves(level));
  const revisits = packLevels.map(countMoveRevisits);
  const actorLevels = packLevels.filter((level) => (level.actors || []).length).length;
  const simpleSolved = packLevels.filter((level) => {
    const simple = tools.solveSimpleTargetLine(level);
    return simple.solved && simple.moves <= level.minMoves;
  }).length;
  const signatures = new Set(packLevels.map((level) => tools.makeBlockerSignature(level)));

  solved.forEach(({ level, result }) => {
    if (!result.solved) failures.push(`${level.id} ${level.title}: solutionPlan failed (${result.reason || "unknown"})`);
  });

  console.log(
    [
      pack.title,
      `levels=${packLevels.length}`,
      `board=${packLevels[0].width}x${packLevels[0].height}`,
      `minMoves=${Math.min(...minMoves)}-${Math.max(...minMoves)}`,
      `dependency=${Math.min(...dependencyMoves)}-${Math.max(...dependencyMoves)}`,
      `revisits=${Math.min(...revisits)}-${Math.max(...revisits)}`,
      `actors=${actorLevels}/12`,
      `simple=${simpleSolved}`,
      `signatures=${signatures.size}`,
      `score=${Math.min(...scores)}-${Math.max(...scores)}`,
      `vehicles=${Math.min(...packLevels.map((level) => level.vehicles.length))}-${Math.max(...packLevels.map((level) => level.vehicles.length))}`
    ].join(" | ")
);
});

if (failures.length) {
  console.error(`\nUnsolved levels: ${failures.length}`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

function countMoveRevisits(level) {
  const ids = new Set();
  (level.solutionPlan || []).forEach((move) => ids.add(move.id));
  return (level.solutionPlan || []).length - ids.size;
}
