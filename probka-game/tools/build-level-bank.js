const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");
const { spawnSync } = require("child_process");

const outputPath = path.join(__dirname, "..", "level-bank.generated.js");
const dataDir = path.join(__dirname, "..", "data");
const checkOnly = process.argv.includes("--check");

const modes = [
  {
    id: "free",
    title: "Свободный двор",
    subtitle: "Без лимитов, спокойно разбираешь затор",
    icon: "∞",
    rule: "free",
    minMovesRange: [2, 52]
  },
  {
    id: "moves",
    title: "На счет ходов",
    subtitle: "Уложись в лимит ходов",
    icon: "#",
    rule: "moves",
    minMovesRange: [4, 60]
  },
  {
    id: "timed",
    title: "На время",
    subtitle: "Думай быстро, но без хаоса",
    icon: "⏱",
    rule: "timed",
    minMovesRange: [3, 58]
  }
];

const fallbackSeeds = [
  seed(60, "IBBxooIooLDDJAALooJoKEEMFFKooMGGHHHM", 2332),
  seed(58, "BBoKMxDDDKMoIAALooIoJLEEooJFFNoGGoxN", 9192),
  seed(55, "ooBBMxDDDKMoAAJKoNooJEENIFFLooIGGLox", 9712),
  seed(55, "ooBBMxDDDKMoAAJKoNooJEENIFFLooIGGLHH", 8257),
  seed(54, "oxCCMoDDDKMoAAJKooooJLEEIFFLoNIGGoxN", 6355),
  seed(54, "oooJLxCCCJLoHAAKooHoIKDDooIEEMoFFoxM", 3461),
  seed(54, "oooJxoCCCJLoHAAKLoHoIKDDooIEEMoFFoxM", 2948),
  seed(54, "BBBKCCDDoKoLIAAKoLIoJEEMFFJooMooxoHH", 1845),
  seed(53, "BBBCCNDDoxMNJAAoMOJoKFFOGGKLooxIILoo", 4705),
  seed(53, "ooBBoxDDDKooAAJKoMooJEEMIFFLooIGGLHH", 4228),
  seed(53, "ooBBoxDDDKooAAJKoMooJEEMIFFLooIGGLox", 4102),
  seed(52, "oxCCMNDDDKMNAAJKooooJEEoIFFLooIGGLox", 7178),
  seed(52, "oxCCMNDDDKMNAAJKooooJLEEIFFLooIGGHHo", 5717),
  seed(51, "xCCoLMooJoLMAAJoLNHIDDDNHIoKEExooKGG", 9360),
  seed(51, "GBBoLoGHIoLMGHIAAMCCCKoMooJKDDEEJFFo", 4780),
  seed(50, "BBIooMGHIoLMGHAALNGCCKoNooJKDDooJEEx", 14385),
  seed(50, "ooIBBBooIKooAAJKoLCCJDDLGHEEoLGHFFoo", 4643),
  seed(50, "ooooxoCCCJLoAAIJLMooIDDMHEEKooHFFKox", 3874),
  seed(50, "ooooLxCCCJLoAAIJoMooIDDMHEEKooHFFKox", 3676),
  seed(50, "ooooLxCCCJLoAAIJoMooIDDMHEEKooHFFKGG", 3169),
  seed(50, "ooooxoCCCJLoAAIJLMooIDDMHEEKooHFFKGG", 2966),
  seed(50, "ooxCCLDDoKoLIAAKooIoJKEEFFJooMGGGHHM", 1845)
];

const sourceBundle = loadSourceBundle();
const bank = buildBank(sourceBundle);
validateBank(bank);

if (checkOnly) {
  validateGeneratedFile();
  console.log(
    `Level bank check passed: ${bank.levels.length} mode levels, ${bank.dailyLevels.length} daily levels, input=${bank.source.inputFile}`
  );
} else {
  fs.writeFileSync(outputPath, renderBank(bank));
  console.log(
    `Wrote ${path.relative(process.cwd(), outputPath)} (${bank.levels.length} mode levels, ${bank.dailyLevels.length} daily levels, input=${bank.source.inputFile})`
  );
}

function seed(moves, board, clusterSize, sourceLine = 0) {
  return { moves, board, clusterSize, sourceLine };
}

function loadSourceBundle() {
  const choices = [
    { file: "rush.txt", type: "text", label: "full rush.txt" },
    { file: "rush.txt.gz", type: "gzip", label: "full rush.txt.gz" },
    { file: "rush.txt.bz2", type: "bzip2", label: "full rush.txt.bz2" },
    { file: "rush1000.txt", type: "text", label: "rush1000.txt" }
  ];
  for (const choice of choices) {
    const filePath = path.join(dataDir, choice.file);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) continue;
    let text = "";
    try {
      text = readSourceText(filePath, choice.type);
    } catch (error) {
      console.warn(`skip ${choice.file}: ${error.message}`);
      continue;
    }
    const sources = parseSourceText(text);
    if (sources.length >= 50) {
      return { sources, inputFile: choice.label, partial: choice.file === "rush1000.txt" };
    }
  }
  return { sources: fallbackSeeds, inputFile: "built-in fallback seeds", partial: true };
}

function readSourceText(filePath, type) {
  if (type === "gzip") return zlib.gunzipSync(fs.readFileSync(filePath)).toString("utf8");
  if (type === "bzip2") {
    const result = spawnSync("bzip2", ["-dc", filePath], { encoding: "utf8" });
    if (result.status !== 0) throw new Error("cannot decompress bzip2 source");
    return result.stdout;
  }
  return fs.readFileSync(filePath, "utf8");
}

function parseSourceText(text) {
  const byBoard = new Map();
  text.split(/\r?\n/).forEach((line, lineIndex) => {
    const match = line.trim().match(/^(\d+)\s+([A-Zox.]{36})\s+(\d+)/);
    if (!match) return;
    const item = seed(Number(match[1]), match[2], Number(match[3]), lineIndex + 1);
    if (!byBoard.has(item.board)) byBoard.set(item.board, item);
  });
  return Array.from(byBoard.values()).sort((left, right) => {
    if (right.moves !== left.moves) return right.moves - left.moves;
    return right.clusterSize - left.clusterSize;
  });
}

function buildBank(bundle) {
  const candidates = buildCandidates(bundle.sources);
  const usedBoards = new Set();
  const levels = [];
  modes.forEach((mode) => {
    const selected = selectSequence({
      id: mode.id,
      count: 100,
      range: mode.minMovesRange,
      exponent: mode.id === "free" ? 1.4 : mode.id === "moves" ? 1.16 : 1.08,
      mode,
      candidates,
      usedBoards
    });
    selected.forEach((candidate, index) => {
      const modeOrder = index + 1;
      const id = `${mode.id}_${pad(modeOrder)}`;
      const margin = getMoveMargin(modeOrder);
      const timeLimitSec = getTimeLimit(candidate, modeOrder);
      const level = {
        id,
        modeId: mode.id,
        modeOrder,
        title: getLevelTitle(mode.id, modeOrder),
        introText: mode.subtitle,
        difficulty: getDifficulty(candidate.minMoves),
        difficultyScore: candidate.difficultyScore + modeOrder,
        minMoves: candidate.minMoves,
        searchStates: candidate.clusterSize,
        width: 6,
        height: 6,
        board: candidate.board,
        sourceMeta: makeSourceMeta(candidate, "classic_rush_hour"),
        solutionPlan: candidate.solutionPlan
      };
      if (mode.rule === "moves") {
        level.moveLimit = candidate.minMoves + margin;
        level.targetMoves = {
          threeStars: candidate.minMoves + Math.max(1, Math.floor(margin / 2)),
          twoStars: candidate.minMoves + margin - 1
        };
      } else {
        level.targetMoves = {
          threeStars: candidate.minMoves + 2,
          twoStars: candidate.minMoves + 8
        };
      }
      if (mode.rule === "timed") {
        level.timeLimitSec = timeLimitSec;
        level.timeTargets = {
          threeStars: Math.max(12, Math.round(timeLimitSec * 0.56)),
          twoStars: Math.max(18, Math.round(timeLimitSec * 0.78))
        };
      }
      levels.push(level);
      usedBoards.add(candidate.board);
    });
  });

  const dailySelected = selectSequence({
    id: "daily",
    count: 365,
    range: [42, 60],
    exponent: 0.72,
    candidates,
    usedBoards,
    daily: true
  });
  const slots = getYearSlots();
  const dailyLevels = dailySelected.map((candidate, index) => {
    const dailyOrder = index + 1;
    const slot = slots[index];
    return {
      id: `daily_${pad(dailyOrder)}`,
      packId: "daily",
      dailyOrder,
      dateSlot: slot.dateSlot,
      month: slot.month,
      day: slot.day,
      title: "Уровень дня",
      introText: `Календарный вызов: ${slot.label}`,
      difficulty: getDifficulty(candidate.minMoves),
      difficultyScore: candidate.difficultyScore + 365 + dailyOrder,
      minMoves: candidate.minMoves,
      searchStates: candidate.clusterSize,
      width: 6,
      height: 6,
      board: candidate.board,
      sourceMeta: makeSourceMeta(candidate, "classic_rush_hour_daily"),
      targetMoves: {
        threeStars: candidate.minMoves + 2,
        twoStars: candidate.minMoves + 7
      },
      solutionPlan: candidate.solutionPlan
    };
  });

  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: {
      name: "Michael Fogleman Rush Hour database",
      repo: "https://github.com/fogleman/rush",
      article: "https://www.michaelfogleman.com/rush/",
      license: "MIT",
      inputFile: bundle.inputFile,
      sourceCount: bundle.sources.length,
      candidateCount: candidates.length,
      strategy: bundle.partial
        ? "available source roots plus shortest-path states; full rush.txt(.gz) is supported when present locally"
        : "full database shortlist plus shortest-path states"
    },
    modes,
    levels,
    dailyLevels
  };
}

function makeSourceMeta(candidate, kind) {
  return {
    kind,
    source: "fogleman/rush",
    board: candidate.board,
    rootBoard: candidate.rootBoard,
    sourceMoves: candidate.sourceMoves,
    clusterSize: candidate.clusterSize,
    sourceLine: candidate.sourceLine,
    prefixMoves: candidate.prefixMoves
  };
}

function buildCandidates(sources) {
  const byBoard = new Map();
  sources.forEach((source, sourceIndex) => {
    let parsed;
    let solved;
    try {
      parsed = parseBoard(source.board);
      solved = solveShortest(parsed);
    } catch (error) {
      console.warn(`skip source ${sourceIndex + 1}: ${error.message}`);
      return;
    }
    if (!solved.solved || solved.moves !== source.moves) {
      console.warn(`skip source ${sourceIndex + 1}: expected ${source.moves}, got ${solved.moves}`);
      return;
    }
    for (let prefix = 0; prefix <= solved.plan.length - 2; prefix += 1) {
      const state = applyPlan(parsed, solved.plan.slice(0, prefix));
      const board = encodeBoard(parsed, state);
      if (byBoard.has(board)) continue;
      const minMoves = solved.plan.length - prefix;
      if (minMoves < 2 || minMoves > 60) continue;
      const solutionPlan = solved.plan.slice(prefix).map((move) => ({ ...move }));
      const vehicles = parsed.vehicles.map((vehicle, index) => ({ ...vehicle, ...state[index] }));
      const revisits = countRevisits(solutionPlan);
      const wallCount = parsed.obstacles.length;
      const vehicleCount = vehicles.length;
      const clusterSize = Math.max(1, Math.round(source.clusterSize * (minMoves / source.moves)));
      const difficultyScore = Math.round(
        minMoves * 16 + revisits * 7 + Math.log10(clusterSize + 1) * 18 + wallCount * 18 + vehicleCount * 3
      );
      byBoard.set(board, {
        board,
        rootBoard: source.board,
        sourceMoves: source.moves,
        clusterSize,
        sourceLine: source.sourceLine || sourceIndex + 1,
        minMoves,
        revisits,
        wallCount,
        vehicleCount,
        prefixMoves: prefix,
        difficultyScore,
        firstMoveSignature: getPlanSignature(solutionPlan, 1),
        firstThreeSignature: getPlanSignature(solutionPlan, 3),
        firstFiveSignature: getPlanSignature(solutionPlan, 5),
        firstEightDirectionSignature: getDirectionSignature(solutionPlan, 8),
        firstPatternSignature: getFirstPatternSignature(solutionPlan),
        solutionPlan
      });
    }
  });
  return Array.from(byBoard.values()).sort((left, right) => {
    if (left.minMoves !== right.minMoves) return left.minMoves - right.minMoves;
    if (left.difficultyScore !== right.difficultyScore) return left.difficultyScore - right.difficultyScore;
    return left.board.localeCompare(right.board);
  });
}

function selectSequence(config) {
  const { id, count, range, exponent, mode, candidates, usedBoards, daily = false } = config;
  const [min, max] = range;
  const selected = [];
  const localSources = new Map();
  for (let order = 1; order <= count; order += 1) {
    const t = count === 1 ? 0 : (order - 1) / (count - 1);
    const targetMoves = Math.round(min + (max - min) * Math.pow(t, exponent));
    let candidate = candidates
      .filter((item) => !usedBoards.has(item.board) && !selected.some((taken) => taken.board === item.board))
      .filter((item) => item.minMoves >= min && item.minMoves <= max)
      .sort((left, right) => scoreCandidate(left, targetMoves, localSources, mode, selected, daily) - scoreCandidate(right, targetMoves, localSources, mode, selected, daily))[0];

    if (!candidate && daily) {
      candidate = candidates
        .filter((item) => !usedBoards.has(item.board) && !selected.some((taken) => taken.board === item.board))
        .filter((item) => item.minMoves >= 36 && item.minMoves <= 60)
        .sort((left, right) => scoreCandidate(left, targetMoves, localSources, mode, selected, daily) - scoreCandidate(right, targetMoves, localSources, mode, selected, daily))[0];
    }
    if (!candidate) throw new Error(`${id}: not enough candidates for item ${order}; candidates=${candidates.length}`);
    selected.push(candidate);
    localSources.set(candidate.rootBoard, (localSources.get(candidate.rootBoard) || 0) + 1);
    usedBoards.add(candidate.board);
  }
  return selected;
}

function scoreCandidate(candidate, targetMoves, localSources, mode, selected, daily) {
  const sourcePenalty = (localSources.get(candidate.rootBoard) || 0) * (daily ? 3.2 : 1.7);
  const wallPreference = mode && mode.id === "timed" ? candidate.wallCount * 1.2 : 0;
  const revisitPreference = mode && mode.id === "moves" ? -candidate.revisits * 0.18 : 0;
  const dailyDepthPreference = daily ? -candidate.revisits * 0.12 - Math.log10(candidate.clusterSize + 1) * 0.35 : 0;
  const repeatPenalty = scoreRepeatPenalty(candidate, selected);
  return Math.abs(candidate.minMoves - targetMoves) * 100 + sourcePenalty + wallPreference + revisitPreference + dailyDepthPreference + candidate.vehicleCount * 0.05 + repeatPenalty;
}

function scoreRepeatPenalty(candidate, selected) {
  const last = selected[selected.length - 1];
  const prev = selected[selected.length - 2];
  const recent = selected.slice(-10);
  let penalty = 0;
  if (last) {
    if (candidate.rootBoard === last.rootBoard) penalty += 90000;
    if (candidate.firstThreeSignature === last.firstThreeSignature) penalty += 90000;
    if (candidate.firstFiveSignature === last.firstFiveSignature) penalty += 50000;
    if (candidate.firstEightDirectionSignature === last.firstEightDirectionSignature) penalty += 70000;
    if (candidate.firstMoveSignature === last.firstMoveSignature) penalty += prev && prev.firstMoveSignature === last.firstMoveSignature ? 70000 : 5000;
    if (candidate.firstPatternSignature === last.firstPatternSignature) penalty += 9000;
  }
  penalty += recent.filter((item) => item.rootBoard === candidate.rootBoard).length * 8500;
  penalty += recent.filter((item) => item.firstThreeSignature === candidate.firstThreeSignature).length * 12000;
  penalty += recent.filter((item) => item.firstFiveSignature === candidate.firstFiveSignature).length * 16000;
  penalty += recent.filter((item) => item.firstEightDirectionSignature === candidate.firstEightDirectionSignature).length * 22000;
  penalty += recent.filter((item) => item.firstPatternSignature === candidate.firstPatternSignature).length * 3000;
  return penalty;
}

function getMoveMargin(order) {
  if (order <= 12) return 8;
  if (order <= 35) return 7;
  if (order <= 65) return 6;
  if (order <= 86) return 5;
  return 4;
}

function getTimeLimit(candidate, order) {
  const pressure = order < 20 ? 1.08 : order < 65 ? 1.02 : 0.98;
  return Math.max(38, Math.round((candidate.minMoves * 5.4 + candidate.revisits * 2 + Math.log10(candidate.clusterSize + 1) * 4 + 18) * pressure));
}

function getDifficulty(minMoves) {
  if (minMoves <= 8) return 1;
  if (minMoves <= 14) return 2;
  if (minMoves <= 20) return 3;
  if (minMoves <= 26) return 4;
  if (minMoves <= 32) return 5;
  if (minMoves <= 38) return 6;
  if (minMoves <= 44) return 7;
  if (minMoves <= 50) return 8;
  if (minMoves <= 55) return 9;
  return 10;
}

function getLevelTitle(modeId, order) {
  const prefixes = {
    free: ["Тихий двор", "Свободный проезд", "Без спешки", "Дворовая пауза"],
    moves: ["Точный выезд", "Лимитный двор", "Ход в ход", "Счетчик двора"],
    timed: ["Быстрый двор", "Секундомер", "Пробка на время", "Горящий выезд"]
  };
  const pool = prefixes[modeId] || prefixes.moves;
  return `${pool[(order - 1) % pool.length]} ${order}`;
}

function getYearSlots() {
  const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const slots = [];
  monthLengths.forEach((length, monthIndex) => {
    for (let day = 1; day <= length; day += 1) {
      slots.push({
        month: monthIndex + 1,
        day,
        dateSlot: `${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        label: `${day} ${monthNames[monthIndex]}`
      });
    }
  });
  return slots;
}

function validateBank(bank) {
  if (bank.modes.length !== 3) throw new Error("expected 3 modes");
  if (bank.levels.length !== 300) throw new Error(`expected 300 levels, got ${bank.levels.length}`);
  if (bank.dailyLevels.length !== 365) throw new Error(`expected 365 daily levels, got ${bank.dailyLevels.length}`);
  const boards = new Set();
  bank.modes.forEach((mode) => {
    const modeLevels = bank.levels.filter((level) => level.modeId === mode.id);
    if (modeLevels.length !== 100) throw new Error(`${mode.id}: expected 100 levels`);
    validateSequence(`${mode.id}`, modeLevels, boards, mode);
  });
  validateSequence("daily", bank.dailyLevels, boards, null);
}

function validateSequence(name, sequence, boards, mode) {
  let previousGuard = 0;
  let previous = null;
  let firstMoveStreak = 0;
  sequence.forEach((level, index) => {
    if (boards.has(level.board)) throw new Error(`${level.id}: duplicate board across bank`);
    boards.add(level.board);
    const guard = level.minMoves * 100 + level.difficultyScore;
    if (mode && guard < previousGuard - 1600) throw new Error(`${level.id}: difficulty drops too hard`);
    previousGuard = Math.max(previousGuard, guard);
    if (previous) {
      if (level.sourceMeta.rootBoard === previous.sourceMeta.rootBoard) throw new Error(`${level.id}: repeats previous root board in ${name}`);
      if (getPlanSignature(level.solutionPlan, 3) === getPlanSignature(previous.solutionPlan, 3)) {
        throw new Error(`${level.id}: repeats previous first-3 solution pattern in ${name}`);
      }
      if (getPlanSignature(level.solutionPlan, 5) === getPlanSignature(previous.solutionPlan, 5)) {
        throw new Error(`${level.id}: repeats previous first-5 solution pattern in ${name}`);
      }
      if (getDirectionSignature(level.solutionPlan, 8) === getDirectionSignature(previous.solutionPlan, 8)) {
        throw new Error(`${level.id}: repeats previous first-8 direction pattern in ${name}`);
      }
    }
    const firstMove = getPlanSignature(level.solutionPlan, 1);
    firstMoveStreak = previous && firstMove === getPlanSignature(previous.solutionPlan, 1) ? firstMoveStreak + 1 : 1;
    if (firstMoveStreak > 2) throw new Error(`${level.id}: first-move pattern streak is too long in ${name}`);
    previous = level;
    if (mode && mode.rule === "moves" && (!Number.isInteger(level.moveLimit) || level.moveLimit < level.minMoves)) {
      throw new Error(`${level.id}: invalid moveLimit`);
    }
    if (mode && mode.rule !== "moves" && level.moveLimit !== undefined) throw new Error(`${level.id}: moveLimit only belongs to moves mode`);
    if (mode && mode.rule === "timed" && (!Number.isInteger(level.timeLimitSec) || !level.timeTargets)) {
      throw new Error(`${level.id}: invalid timer data`);
    }
    if (!mode && level.moveLimit !== undefined) throw new Error(`${level.id}: daily must not have moveLimit`);
    if (!Array.isArray(level.solutionPlan) || level.solutionPlan.length !== level.minMoves) {
      throw new Error(`${level.id}: bad solutionPlan length`);
    }
    if (index !== 0 && index % 25 === 0) {
      const parsed = parseBoard(level.board);
      const solved = solveShortest(parsed);
      if (!solved.solved || solved.moves !== level.minMoves) {
        throw new Error(`${level.id}: shortest solver mismatch`);
      }
    }
  });
}

function validateGeneratedFile() {
  if (!fs.existsSync(outputPath)) throw new Error("level-bank.generated.js is missing; run build-level-bank.js first");
  const code = fs.readFileSync(outputPath, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox, { filename: outputPath });
  const existing = sandbox.window.PROBKA_LEVEL_BANK;
  if (!existing) throw new Error("generated file must export PROBKA_LEVEL_BANK");
  validateBank(existing);
}

function renderBank(bank) {
  return `// Generated by tools/build-level-bank.js. Do not edit by hand.\n(function () {\n  window.PROBKA_LEVEL_BANK = ${JSON.stringify(bank, null, 2)};\n})();\n`;
}

function parseBoard(board) {
  if (!/^[A-Zox.]{36}$/.test(board)) throw new Error(`invalid board: ${board}`);
  const groups = new Map();
  const obstacles = [];
  for (let index = 0; index < board.length; index += 1) {
    const mark = board[index];
    const x = index % 6;
    const y = Math.floor(index / 6);
    if (mark === "o" || mark === ".") continue;
    if (mark === "x") {
      obstacles.push({ id: `obstacle_${obstacles.length + 1}`, mark, x, y });
      continue;
    }
    if (!groups.has(mark)) groups.set(mark, []);
    groups.get(mark).push({ x, y });
  }
  const vehicles = Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([mark, cells]) => {
      const xs = Array.from(new Set(cells.map((cell) => cell.x)));
      const ys = Array.from(new Set(cells.map((cell) => cell.y)));
      const axis = xs.length === 1 ? "vertical" : "horizontal";
      const x = Math.min(...cells.map((cell) => cell.x));
      const y = Math.min(...cells.map((cell) => cell.y));
      const length = cells.length;
      if (length < 2 || length > 3) throw new Error(`classic vehicle ${mark} has invalid length ${length}`);
      if (axis === "horizontal" && (ys.length !== 1 || !isContiguous(xs))) throw new Error(`classic vehicle ${mark} is not contiguous`);
      if (axis === "vertical" && (xs.length !== 1 || !isContiguous(ys))) throw new Error(`classic vehicle ${mark} is not contiguous`);
      return {
        mark,
        id: mark === "A" ? "red" : `classic_${mark.toLowerCase()}`,
        x,
        y,
        length,
        axis
      };
    });
  const target = vehicles.find((vehicle) => vehicle.id === "red");
  if (!target) throw new Error(`missing target in ${board}`);
  return { width: 6, height: 6, board, vehicles, obstacles, targetVehicleId: "red", exit: { side: "right", row: target.y } };
}

function solveShortest(level) {
  const start = level.vehicles.map((vehicle) => ({ x: vehicle.x, y: vehicle.y }));
  const startKey = encodeState(start);
  const queue = [start];
  const parents = new Map();
  const seen = new Set([startKey]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const state = queue[cursor];
    const key = encodeState(state);
    if (isSolved(level, state)) {
      const plan = reconstructPlan(parents, startKey, key);
      return { solved: true, moves: plan.length, plan, states: seen.size };
    }
    for (let index = 0; index < level.vehicles.length; index += 1) {
      const vehicle = { ...level.vehicles[index], ...state[index] };
      const occupied = buildOccupied(level, state, index);
      [-1, 1].forEach((sign) => {
        for (let delta = sign; Math.abs(delta) < 6; delta += sign) {
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
  return { solved: false, moves: 0, plan: [], states: seen.size };
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

function buildOccupied(level, state, skipIndex = -1) {
  const occupied = new Set(level.obstacles.map((obstacle) => `${obstacle.x},${obstacle.y}`));
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
  for (let step = 1; step <= Math.abs(delta); step += 1) {
    const sign = Math.sign(delta);
    const leadingX = vehicle.x + (vehicle.axis === "horizontal" ? (sign > 0 ? vehicle.length - 1 + step : -step) : 0);
    const leadingY = vehicle.y + (vehicle.axis === "vertical" ? (sign > 0 ? vehicle.length - 1 + step : -step) : 0);
    if (leadingX < 0 || leadingY < 0 || leadingX >= level.width || leadingY >= level.height) return false;
    if (occupied.has(`${leadingX},${leadingY}`)) return false;
  }
  return true;
}

function isSolved(level, state) {
  const index = level.vehicles.findIndex((vehicle) => vehicle.id === level.targetVehicleId);
  const target = level.vehicles[index];
  return state[index].x + target.length >= level.width;
}

function applyPlan(level, plan) {
  const state = level.vehicles.map((vehicle) => ({ x: vehicle.x, y: vehicle.y }));
  plan.forEach((move) => {
    const index = level.vehicles.findIndex((vehicle) => vehicle.id === move.id);
    const vehicle = level.vehicles[index];
    state[index] = {
      x: state[index].x + (vehicle.axis === "horizontal" ? move.delta : 0),
      y: state[index].y + (vehicle.axis === "vertical" ? move.delta : 0)
    };
  });
  return state;
}

function encodeBoard(level, state) {
  const cells = Array(36).fill("o");
  level.obstacles.forEach((obstacle) => {
    cells[obstacle.y * 6 + obstacle.x] = "x";
  });
  level.vehicles.forEach((vehicle, index) => {
    const position = state[index];
    for (let step = 0; step < vehicle.length; step += 1) {
      const x = position.x + (vehicle.axis === "horizontal" ? step : 0);
      const y = position.y + (vehicle.axis === "vertical" ? step : 0);
      cells[y * 6 + x] = vehicle.mark;
    }
  });
  return cells.join("");
}

function encodeState(state) {
  return state.map((position) => `${position.x},${position.y}`).join("|");
}

function countRevisits(plan) {
  const seen = new Set();
  let revisits = 0;
  plan.forEach((move) => {
    if (seen.has(move.id)) revisits += 1;
    seen.add(move.id);
  });
  return revisits;
}

function getPlanSignature(plan, size) {
  return (plan || [])
    .slice(0, size)
    .map((move) => `${move.id}:${Math.sign(move.delta)}:${Math.abs(move.delta)}`)
    .join("|");
}

function getDirectionSignature(plan, size) {
  return (plan || [])
    .slice(0, size)
    .map((move) => `${move.id}:${Math.sign(move.delta)}`)
    .join("|");
}

function getFirstPatternSignature(plan) {
  return (plan || [])
    .slice(0, 5)
    .map((move) => `${move.id === "red" ? "red" : "other"}:${Math.sign(move.delta)}:${Math.abs(move.delta) > 1 ? "long" : "short"}`)
    .join("|");
}

function isContiguous(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.every((value, index) => index === 0 || value === sorted[index - 1] + 1);
}

function pad(value) {
  return String(value).padStart(3, "0");
}
