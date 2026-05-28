(function () {
  const PACKS = [
    { id: "first_yard", title: "Первый двор", subtitle: "База: машины, выезд и первые заторы" },
    { id: "after_work", title: "После работы", subtitle: "Первые честные развилки и возвраты" },
    { id: "courier_arrived", title: "Плотный двор", subtitle: "Средние classic-пазлы без случайного хаоса" },
    { id: "janitor_route", title: "Тесный квартал", subtitle: "Pre-hard раскладки с длинными возвратами" },
    { id: "hopeless_yard", title: "Двор без надежды", subtitle: "Классические hard-раскладки с возвратами и ловушками" }
  ];

  const PACK_CONFIGS = [
    { size: 6, margin: 2, filler: 3, obstacles: 1 },
    { size: 6, margin: 3, filler: 0, obstacles: 0 },
    { size: 6, margin: 5, filler: 0, obstacles: 0 },
    { size: 6, margin: 6, filler: 0, obstacles: 0 },
    { size: 6, margin: 8, filler: 0, obstacles: 0 }
  ];
  const CAR_COLORS = ["#4aa3ff", "#55d6a8", "#ffd166", "#e8edf2", "#b889ff", "#ff9f43", "#9ba6b2"];
  const OBSTACLE_KINDS = ["bin", "cone", "snow", "gate"];
  const TARGET_ROWS = {
    6: [2, 3, 4, 1],
    7: [4, 2, 5, 3],
    8: [4, 3, 5, 2],
    9: [5, 3, 6, 4],
    10: [5, 3, 6, 4],
    12: [6, 10, 8, 9, 7]
  };
  const TITLE_SETS = [
    ["Первый выезд", "Такси у подъезда", "Мусорные баки", "Доставка приехала", "Вечер пятницы", "Место с конусом", "Узкий проезд", "Каршеринг встал", "Сугроб", "Шлагбаум", "Все спешат", "Двор проснулся"],
    ["После работы", "Газель поперек", "Два ряда", "Никто не уезжает", "Плотный вечер", "Поздний таксист", "Сосед закрыл", "Смена мест", "Дворовой узел", "Пробка у арки", "Почти выехал", "Полный двор"],
    ["Первый клубок", "Запертый ряд", "Тихий тупик", "Дальний маневр", "Два возврата", "Узкая арка", "Перестановка", "Сложный карман", "Почти выезд", "Обратный ход", "Плотная смена", "Средний финал"],
    ["Старый двор", "Три возврата", "Тесный ряд", "Соседский узел", "Петля у арки", "Дальний блок", "Поворотный момент", "Закрытый проезд", "Двойной карман", "Ложный просвет", "Перед финалом", "Тесный квартал"],
    ["Двор без надежды", "Все сразу", "Две траектории", "Курьер и дворник", "Последний просвет", "Ночная смена", "Плотный хаос", "Дворовой финт", "Живой затор", "Почти тупик", "Соседи смотрят", "Финальный выезд"]
  ];
  const CLASSIC_PACK_LAYOUTS = {
    first_yard_late: [
      layout(4, "oxCCMooooKMoAAJKooooJoooIFFoooIGGooo", "fogleman/rush-derived", 1),
      layout(4, "oxCCMooooKMoAAoKooooooooIooLooIooLoo", "fogleman/rush-derived", 1),
      layout(5, "ooCCooDDDKooAAJKooooJEEoIFFoooIooooo", "fogleman/rush-derived", 1),
      layout(4, "ooooooDDDKooAAJKooooJEEooFFooooGGooo", "fogleman/rush-derived", 1),
      layout(6, "ooIIFooBBBFoAAEGoDooEGoDoCCHHooooooo", "local_solver_generator"),
      layout(6, "EEooJJoFFHHBoAAoGBoIooGooIoCCCoooDDD", "local_solver_generator")
    ],
    after_work: [
      layout(8, "oDDoIJFFFoIJoAAoGoooHoGoBoHEECBooooC", "local_solver_generator"),
      layout(8, "ooJIIoCCJoHFoGAAHFoGBoooDGBEEEDooooo", "local_solver_generator"),
      layout(8, "ooBBEoooooEoDAAoEoDoCoooooCoFFooCGGo", "local_solver_generator"),
      layout(9, "ooDoGoooDoGoAADooBoEEEoBoFFCoBoooCoo", "local_solver_generator"),
      layout(9, "oooFoGoooFoGoAAoDGoEoBDooEoBCCoooooo", "local_solver_generator"),
      layout(9, "BBoFFFoGGIEDoAAIEDooCIooooCoHHooCoJJ", "local_solver_generator"),
      layout(9, "HoooooHoooBoEAAoBoEoDoBooCDFFFoCooGG", "local_solver_generator"),
      layout(10, "oEooGooECDGoAACDGoooCooFHooBBFHooooo", "local_solver_generator"),
      layout(10, "IoEEEoIDDDooooAACoHHHoCoGoFoCoGoFoBB", "local_solver_generator"),
      layout(11, "HooooGHooBCGEAABCoEFoBCooFIIoooDDDoo", "local_solver_generator"),
      layout(12, "oEEHooooDHGCAADoGCIoDoGoIBBooooFFooo", "local_solver_generator"),
      layout(16, "ooooBoEEEoBoAAFDBoGGFDooCHHIooCooIoo", "local_solver_generator")
    ],
    courier_arrived: [
      layout(17, "DDDFFGoKKEoGAAoEIoLoBoIoLoBJJCHHHooC", "local_solver_generator"),
      layout(18, "ooDDoJoooGoJoAAGHJIIICHooBoCEEoBFFoo", "local_solver_generator"),
      layout(18, "oKIHHHCKILEoCAALEoCJJGGDBBoooDoFFooD", "local_solver_generator"),
      layout(18, "GGFDooooFDBooAADBooICooHoICEEHoooooH", "local_solver_generator"),
      layout(18, "IBGGoFIBooKFoAAEKFooDEJJooDHHHooDoCC", "local_solver_generator"),
      layout(19, "oBBDExFKKDEoFAAoEooIHooLJIHCCLJGGooo", "local_solver_generator"),
      layout(19, "EEEJJoooIoHHAAIooDKoGGoDKFFoCoBBBoCo", "local_solver_generator"),
      layout(19, "ooooBHEEEJBHoAAJGCKoFJGCKoFDDooIIooo", "local_solver_generator"),
      layout(20, "ooIGGGDDIooELoAABELCKoBFoCKJJFooHHHo", "local_solver_generator"),
      layout(21, "IJJHFFIooHCGooAACGDDLLCGooBEEoooBKKo", "local_solver_generator"),
      layout(25, "DCoFFIDCoEKIBAAEKHBoGooHBoGJJJoooooo", "local_solver_generator"),
      layout(27, "ooJEEoGoJHDoGAAHDFLLoooFBBBCIFKKoCIo", "local_solver_generator")
    ],
    janitor_route: [
      layout(28, "oooJxoCCCJLoHAAKLoHoIKDDooIEEooFFooo", "fogleman/rush-derived", 6),
      layout(29, "BBBKooDDoKoLIAAKoLIoJEEMFFJooMooxoHH", "fogleman/rush-derived", 5),
      layout(29, "oxCCMoDDDKMoAAJKooooJLEEIFFLooIoooxo", "fogleman/rush-derived", 8),
      layout(30, "oxCCMoDDDKMoAAJKooooJLEEIFFLooIGGooo", "fogleman/rush-derived", 8),
      layout(30, "oxCCMoDDDKMoAAJKooooJEEoIFFLooIooLoo", "fogleman/rush-derived", 1),
      layout(31, "oxCCMoDDDKMoAAJKooooJEEoIFFLooIGGLoo", "fogleman/rush-derived", 1),
      layout(32, "oxCCMNDDDKMNAAJKooooJEEoIFFLooIooLox", "fogleman/rush-derived", 1),
      layout(32, "ooBBoxDDDKooAAJKoMooJEEMIFFLooIooLox", "fogleman/rush-derived", 2),
      layout(34, "oxCCMoDDDKMoAAJKooooJLEEIFFLoNIooooN", "fogleman/rush-derived", 8),
      layout(35, "oooJLxCCCJLoHAAKooHoIKDDooIEEMoooooM", "fogleman/rush-derived", 7),
      layout(36, "oooJLxCCCJLoHAAKooHoIKDDooIEEMoFFooM", "fogleman/rush-derived", 7),
      layout(42, "oooJxoCCCJLoHAAKLoHoIKDDooIEEooFFoxo", "fogleman/rush-derived", 6)
    ],
    hopeless_yard: [
      layout(52, "oxCCMNDDDKMNAAJKooooJEEoIFFLooIGGLox", "fogleman/rush", 1),
      layout(53, "ooBBoxDDDKooAAJKoMooJEEMIFFLooIGGLox", "fogleman/rush", 2),
      layout(53, "ooBBoxDDDKooAAJKoMooJEEMIFFLooIGGLHH", "fogleman/rush", 3),
      layout(53, "BBBCCNDDoxMNJAAoMOJoKFFOGGKLooxIILoo", "fogleman/rush", 4),
      layout(54, "BBBKCCDDoKoLIAAKoLIoJEEMFFJooMooxoHH", "fogleman/rush", 5),
      layout(54, "oooJxoCCCJLoHAAKLoHoIKDDooIEEMoFFoxM", "fogleman/rush", 6),
      layout(54, "oooJLxCCCJLoHAAKooHoIKDDooIEEMoFFoxM", "fogleman/rush", 7),
      layout(54, "oxCCMoDDDKMoAAJKooooJLEEIFFLoNIGGoxN", "fogleman/rush", 8),
      layout(55, "ooBBMxDDDKMoAAJKoNooJEENIFFLooIGGLHH", "fogleman/rush", 9),
      layout(55, "ooBBMxDDDKMoAAJKoNooJEENIFFLooIGGLox", "fogleman/rush", 10),
      layout(58, "BBoKMxDDDKMoIAALooIoJLEEooJFFNoGGoxN", "fogleman/rush", 11),
      layout(60, "IBBxooIooLDDJAALooJoKEEMFFKooMGGHHHM", "fogleman/rush", 12)
    ]
  };

  window.PROBKA_PACKS = PACKS;
  window.PROBKA_LEVEL_TOOLS = {
    solveSolutionPlan,
    solveSimpleTargetLine,
    makeBlockerSignature,
    countDependencyMoves,
    simulateActorsAfterMove
  };
  window.PROBKA_LEVELS = buildLevels();

  function buildLevels() {
    const levels = [];
    PACKS.forEach((pack, packIndex) => {
      for (let localIndex = 1; localIndex <= 12; localIndex += 1) {
        levels.push(makeLevel(levels.length + 1, pack, packIndex, localIndex));
      }
    });
    return levels;
  }

  function makeLevel(number, pack, packIndex, localIndex) {
    if (packIndex === 0 && localIndex > 6) {
      return makeClassicLevel(number, pack, packIndex, localIndex, CLASSIC_PACK_LAYOUTS.first_yard_late[localIndex - 7]);
    }
    if (packIndex >= 1) {
      return makeClassicLevel(number, pack, packIndex, localIndex, CLASSIC_PACK_LAYOUTS[pack.id][localIndex - 1]);
    }

    const config = PACK_CONFIGS[packIndex];
    const spec = makeSpec(config.size, packIndex, localIndex);
    const level = {
      id: `yard_${pad(number)}`,
      packId: pack.id,
      title: TITLE_SETS[packIndex][localIndex - 1],
      introText: pack.subtitle,
      difficulty: 1,
      difficultyScore: 0,
      minMoves: 0,
      searchStates: 0,
      width: config.size,
      height: config.size,
      exit: { side: "right", row: spec.row },
      targetVehicleId: "red",
      targetMoves: { threeStars: 3, twoStars: 5 },
      moveLimit: 8,
      vehicles: [],
      obstacles: [],
      actors: [],
      solutionPlan: []
    };
    const occupied = new Set();

    addVehicle(level, occupied, makeVehicle("red", 0, spec.row, 2, "horizontal", "#ff5c68", "target"));
    if (packIndex === 0) buildTutorialPuzzle(level, occupied, spec, localIndex);
    else buildChainPuzzle(level, occupied, spec, packIndex, localIndex);

    const protectedCells = collectProtectedCells(level);
    addFillerVehicles(level, occupied, protectedCells, config.filler + Math.floor((localIndex - 1) / 4), packIndex, localIndex);
    addFillerObstacles(level, occupied, protectedCells, config.obstacles + Math.floor(localIndex / 6), packIndex, localIndex);
    finalizeLevel(level, packIndex, localIndex);
    return level;
  }

  function layout(moves, board, source, sourceIndex) {
    return { moves, board, source, sourceIndex };
  }

  function makeClassicLevel(number, pack, packIndex, localIndex, source) {
    if (!source) throw new Error(`${pack.id} ${localIndex}: missing classic layout`);
    const level = parseClassicBoard(source.board, {
      id: `yard_${pad(number)}`,
      packId: pack.id,
      title: TITLE_SETS[packIndex][localIndex - 1],
      introText: pack.subtitle,
      sourceMeta: {
        kind: "classic_rush_hour",
        source: source.source,
        sourceIndex: source.sourceIndex || null,
        board: source.board,
        sourceMoves: source.moves
      }
    });
    if (typeof document !== "undefined") {
      finalizeClassicMetadata(level, source, packIndex, localIndex);
      return level;
    }

    const solved = solveClassicShortestPlan(level);
    if (!solved.solved) throw new Error(`${level.id}: classic hard layout is unsolved`);
    if (solved.moves !== source.moves) {
      throw new Error(`${level.id}: expected ${source.moves} classic moves, got ${solved.moves}`);
    }
    level.solutionPlan = solved.plan;
    finalizeLevel(level, packIndex, localIndex);
    level.searchStates = solved.states;
    return level;
  }

  function finalizeClassicMetadata(level, source, packIndex, localIndex) {
    const margin = PACK_CONFIGS[packIndex].margin;
    level.minMoves = source.moves;
    level.moveLimit = source.moves + margin;
    level.targetMoves = {
      threeStars: Math.min(level.moveLimit, source.moves + Math.max(1, Math.floor(margin / 2))),
      twoStars: Math.min(level.moveLimit, source.moves + margin - 1)
    };
    level.difficultyScore = Math.round(source.moves * 14 + level.vehicles.length * 5 + level.obstacles.length * 7 + 110 + localIndex * 4);
    level.difficulty = clamp(Math.ceil((level.difficultyScore - 20) / 14), 1, 10);
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
      ...metadata,
      difficulty: 1,
      difficultyScore: 0,
      minMoves: 0,
      searchStates: 0,
      width: size,
      height: size,
      exit: { side: "right", row: target.y },
      targetVehicleId: "red",
      targetMoves: { threeStars: 3, twoStars: 5 },
      moveLimit: 8,
      vehicles,
      obstacles,
      actors: [],
      solutionPlan: []
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

  function solveClassicShortestPlan(level) {
    const start = level.vehicles.map((vehicle) => ({ x: vehicle.x, y: vehicle.y }));
    const startKey = encodeClassicState(start);
    const queue = [start];
    const parents = new Map();
    const seen = new Set([startKey]);

    for (let head = 0; head < queue.length; head += 1) {
      const state = queue[head];
      if (isClassicSolved(level, state)) {
        return { solved: true, moves: reconstructClassicPlan(parents, startKey, encodeClassicState(state)).length, states: seen.size, plan: reconstructClassicPlan(parents, startKey, encodeClassicState(state)) };
      }

      for (let index = 0; index < level.vehicles.length; index += 1) {
        const vehicle = { ...level.vehicles[index], ...state[index] };
        const occupied = buildOccupied(level, stateToVehicles(level, state), [], index);
        [-1, 1].forEach((sign) => {
          for (let delta = sign; Math.abs(delta) < level.width; delta += sign) {
            if (!canTravel(level, vehicle, delta, occupied)) break;
            const next = state.map((position) => ({ ...position }));
            next[index] = {
              x: state[index].x + (vehicle.axis === "horizontal" ? delta : 0),
              y: state[index].y + (vehicle.axis === "vertical" ? delta : 0)
            };
            const nextKey = encodeClassicState(next);
            if (seen.has(nextKey)) continue;
            seen.add(nextKey);
            parents.set(nextKey, { previous: encodeClassicState(state), move: { id: vehicle.id, delta } });
            queue.push(next);
          }
        });
      }
    }

    return { solved: false, moves: 0, states: seen.size, plan: [] };
  }

  function reconstructClassicPlan(parents, startKey, goalKey) {
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

  function stateToVehicles(level, state) {
    return level.vehicles.map((vehicle, index) => ({ ...vehicle, ...state[index] }));
  }

  function encodeClassicState(state) {
    return state.map((position) => `${position.x},${position.y}`).join("|");
  }

  function isClassicSolved(level, state) {
    const targetIndex = level.vehicles.findIndex((vehicle) => vehicle.id === level.targetVehicleId);
    const target = level.vehicles[targetIndex];
    return target && state[targetIndex].x + target.length >= level.width;
  }

  function makeSpec(size, packIndex, localIndex) {
    const direction = packIndex === 0 ? "simple" : chooseDirection(size, packIndex, localIndex);
    const rows = TARGET_ROWS[size] || TARGET_ROWS[6];
    let row = rows[(localIndex + packIndex) % rows.length];
    if (direction === "up") row = clamp(row, 4, size - 2);
    if (direction === "down") row = clamp(row, 2, size - 5);

    const chainCount = getChainCount(packIndex, localIndex);
    const start = localIndex % 2 === 0 ? 3 : 2;
    let columns = packIndex >= 4 ? makeHopelessColumns(localIndex) : makeColumns(size, start, chainCount);
    if (columns.length < chainCount) columns = makeColumns(size, 2, chainCount);

    return {
      direction,
      row,
      columns,
      usePrelock: packIndex >= 4 || (packIndex === 3 && localIndex >= 9),
      pinColumns: getPinColumns(packIndex, localIndex, row, columns),
      capColumns: getCapColumns(packIndex, localIndex, columns),
      guardColumns: getGuardColumns(packIndex, localIndex, columns),
      prelockColumns: getPrelockColumns(packIndex, localIndex, columns),
      pocketColumns: packIndex === 1 ? columns.slice(0, 1) : columns,
      actorCount: packIndex >= 4 ? 2 : packIndex >= 2 ? 1 : 0
    };
  }

  function getPrelockColumns(packIndex, localIndex, columns) {
    if (packIndex === 3 && localIndex >= 9) return columns.slice(0, 1);
    if (packIndex < 4) return [];
    return columns;
  }

  function getPinColumns(packIndex, localIndex, row, columns) {
    if (packIndex < 4 || localIndex < 7 || row < 8) return [];
    return columns;
  }

  function getGuardColumns(packIndex, localIndex, columns) {
    if (packIndex < 4) return [];
    return columns;
  }

  function getCapColumns(packIndex, localIndex, columns) {
    if (packIndex < 4) return [];
    return columns;
  }

  function chooseDirection(size, packIndex, localIndex) {
    const canUseDown = size >= 7;
    if (!canUseDown) return "up";
    if (packIndex >= 4) return "up";
    return (packIndex + localIndex) % 3 === 0 ? "down" : "up";
  }

  function getChainCount(packIndex, localIndex) {
    if (packIndex === 1) return 2;
    if (packIndex === 2) return localIndex <= 4 ? 2 : 3;
    if (packIndex === 3) return localIndex <= 3 ? 3 : 4;
    return 4;
  }

  function makeColumns(size, start, count) {
    const columns = [];
    for (let x = start; x < size && columns.length < count; x += 3) {
      columns.push(x);
    }
    return columns;
  }

  function makeHopelessColumns(localIndex) {
    const variants = [
      [2, 5, 8, 11],
      [2, 5, 8, 11],
      [2, 5, 8, 11],
      [2, 5, 8, 11],
      [2, 5, 8, 11]
    ];
    return variants[(localIndex - 1) % variants.length];
  }

  function buildTutorialPuzzle(level, occupied, spec, localIndex) {
    const row = spec.row;
    const count = localIndex <= 2 ? 1 : 2;
    const columns = makeColumns(level.width, localIndex % 2 ? 3 : 2, count);
    columns.forEach((column, index) => {
      const length = localIndex >= 9 && index === 0 ? 3 : 2;
      const canMoveUp = row >= length;
      const canMoveDown = row + length < level.height;
      const useDown = canMoveDown && (!canMoveUp || (localIndex + index) % 3 === 0);
      const y = useDown ? row : row - length + 1;
      const id = `block_${index + 1}`;
      addVehicle(level, occupied, makeVehicle(id, column, y, length, "vertical", pickColor(localIndex + index), index ? "van" : "taxi"));
      level.solutionPlan.push({ id, delta: useDown ? 1 : -1 });
    });

    if (localIndex >= 7) {
      const lockY = row <= 2 ? row + 2 : row - 2;
      addVehicleIfFree(level, occupied, makeVehicle("lesson_lock", 1, lockY, 2, "horizontal", pickColor(localIndex + 3), "compact"));
    }
    level.solutionPlan.push({ id: "red", delta: level.width - 2 });
  }

  function buildChainPuzzle(level, occupied, spec, packIndex, localIndex) {
    const row = spec.row;
    const firstColumn = spec.columns[0];
    spec.pinColumns.forEach((column) => addCapPin(level, occupied, spec, column));
    spec.capColumns.forEach((column) => addCapLock(level, occupied, spec, column));
    spec.guardColumns.forEach((column) => addGuard(level, occupied, spec, column));
    if (spec.usePrelock) spec.prelockColumns.forEach((column) => addPrelock(level, occupied, spec, column));
    spec.pocketColumns.forEach((column) => addPocket(level, occupied, spec, column));

    const chainMoves = spec.columns.map((column, index) => addChain(level, occupied, spec, column, index, localIndex));
    chainMoves.forEach((move) => level.solutionPlan.push({ id: move.lockId, delta: -1 }));
    chainMoves.forEach((move) => level.solutionPlan.push({ id: move.blockerId, delta: move.blockerDelta }));

    if (spec.actorCount) addDesignedActors(level, occupied, spec, packIndex, localIndex);
    level.solutionPlan.push({ id: "red", delta: level.width - 2 });

    if (row !== level.exit.row) throw new Error(`${level.id}: target row mismatch`);
  }

  function addCapPin(level, occupied, spec, column) {
    if (spec.direction !== "up" || spec.row < 8) return;
    const y = spec.row - 7;
    const id = `pin_${column}`;
    addVehicle(level, occupied, makeVehicle(id, column - 2, y, 2, "vertical", pickColor(column + 17), "compact"));
    level.solutionPlan.push({ id, delta: -1 });
  }

  function addCapLock(level, occupied, spec, column) {
    if (spec.direction !== "up") return;
    const y = spec.row - 6;
    const id = `cap_${column}`;
    addVehicle(level, occupied, makeVehicle(id, column - 1, y, 2, "horizontal", pickColor(column + 13), "taxi"));
    level.solutionPlan.push({ id, delta: -1 });
  }

  function addGuard(level, occupied, spec, column) {
    if (spec.direction !== "up") return;
    const y = spec.row - 5;
    const id = `guard_${column}`;
    addVehicle(level, occupied, makeVehicle(id, column, y, 2, "vertical", pickColor(column + 11), "van"));
    level.solutionPlan.push({ id, delta: -1 });
  }

  function addPrelock(level, occupied, spec, column) {
    const y = spec.direction === "up" ? spec.row - 4 : spec.row + 4;
    const id = `prelock_${column}`;
    addVehicle(level, occupied, makeVehicle(id, column - 2, y, 2, "horizontal", pickColor(column + 9), "compact"));
    level.solutionPlan.push({ id, delta: 1 });
  }

  function addPocket(level, occupied, spec, column) {
    const id = `pocket_${column}`;
    const y = spec.direction === "up" ? spec.row - 3 : spec.row + 2;
    const delta = spec.direction === "up" ? -1 : 1;
    addVehicle(level, occupied, makeVehicle(id, column - 2, y, 2, "vertical", pickColor(column + 4), "sedan"));
    level.solutionPlan.push({ id, delta });
  }

  function addChain(level, occupied, spec, column, index, localIndex) {
    const up = spec.direction === "up";
    const row = spec.row;
    const blockerY = up ? row - 1 : row;
    const lockRow = up ? row - 2 : row + 2;
    const stopRow = up ? row + 1 : row - 1;
    const blockerId = `block_${column}`;
    const lockId = `lock_${column}`;

    addVehicle(level, occupied, makeVehicle(lockId, column - 1, lockRow, 2, "horizontal", pickColor(localIndex + index * 3), "delivery"));
    addVehicle(level, occupied, makeVehicle(blockerId, column, blockerY, 2, "vertical", pickColor(localIndex + index * 5 + 1), index % 2 ? "van" : "taxi"));
    addObstacle(level, occupied, {
      id: `stop_${column}`,
      kind: index % 2 ? "gate" : "cone",
      x: column,
      y: stopRow
    });

    return { lockId, blockerId, blockerDelta: up ? -1 : 1 };
  }

  function addDesignedActors(level, occupied, spec, packIndex, localIndex) {
    const firstKind = packIndex === 2 ? "courier" : packIndex === 3 ? "janitor" : localIndex % 2 ? "courier" : "janitor";
    const firstMode = firstKind === "courier" ? "route" : "pingPong";
    addActor(level, occupied, makeActorCandidate(level, occupied, spec, firstKind, firstMode, 0, localIndex));

    if (spec.actorCount > 1) {
      const secondKind = firstKind === "courier" ? "janitor" : "pedestrian";
      const secondMode = secondKind === "pedestrian" ? "loop" : "pingPong";
      addActor(level, occupied, makeActorCandidate(level, occupied, spec, secondKind, secondMode, 1, localIndex));
    }
  }

  function makeActorCandidate(level, occupied, spec, kind, mode, order, localIndex) {
    const sideRows = [spec.row + (spec.direction === "up" ? 1 : -1), spec.row + (spec.direction === "up" ? 2 : -2), 1, level.height - 2];
    const starts = [level.width - 1, level.width - 2, level.width - 3, 0, 1];
    for (const y of sideRows) {
      if (y < 0 || y >= level.height) continue;
      for (const startX of starts) {
        const route = buildActorRoute(level, occupied, startX, y, mode, order);
        if (!route) continue;
        return {
          id: `${kind}_${order + 1}`,
          kind,
          mode,
          x: route[0].x,
          y: route[0].y,
          path: route,
          stepIndex: 0,
          direction: 1,
          startDelay: kind === "courier" && localIndex % 4 === 0 ? 1 : 0,
          moveEvery: kind === "pedestrian" ? 2 : 1
        };
      }
    }
    throw new Error(`${level.id}: cannot place ${kind} actor`);
  }

  function buildActorRoute(level, occupied, startX, y, mode, order) {
    if (!inside(level, startX, y) || occupied.has(cellKey(startX, y))) return null;
    const direction = startX > level.width / 2 ? -1 : 1;
    const length = mode === "route" ? 3 : 4;
    const path = [];
    for (let step = 0; step < length; step += 1) {
      const x = startX + direction * step;
      if (!inside(level, x, y)) return null;
      const key = cellKey(x, y);
      if (occupied.has(key)) return null;
      path.push({ x, y });
    }
    if (mode === "loop" && order % 2) {
      const turn = { x: path[path.length - 1].x, y: y + (y > 1 ? -1 : 1) };
      if (!inside(level, turn.x, turn.y) || occupied.has(cellKey(turn.x, turn.y))) return null;
      path.push(turn);
    }
    return path;
  }

  function collectProtectedCells(level) {
    const protectedCells = new Set();
    const target = level.vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
    if (target) {
      for (let x = target.x; x < level.width; x += 1) protectedCells.add(cellKey(x, target.y));
    }
    const trace = traceSolution(level);
    trace.forEach((cell) => protectedCells.add(cellKey(cell.x, cell.y)));
    return protectedCells;
  }

  function addFillerVehicles(level, occupied, protectedCells, targetCount, packIndex, localIndex) {
    const candidates = [];
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        candidates.push({ x, y, length: (x + y + localIndex) % 4 === 0 ? 3 : 2, axis: "horizontal", kind: "compact" });
        candidates.push({ x, y, length: 2, axis: "vertical", kind: "sedan" });
      }
    }
    let added = 0;
    stableShuffle(candidates, packIndex * 97 + localIndex * 31).forEach((candidate) => {
      if (added >= targetCount) return;
      const vehicle = {
        id: `car_${added + 1}`,
        ...candidate,
        color: pickColor(localIndex + added * 2)
      };
      if (vehicleTouchesCells(vehicle, protectedCells)) return;
      if (!addVehicleIfFree(level, occupied, vehicle)) return;
      added += 1;
    });
  }

  function addFillerObstacles(level, occupied, protectedCells, targetCount, packIndex, localIndex) {
    const cells = [];
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const key = cellKey(x, y);
        if (occupied.has(key) || protectedCells.has(key)) continue;
        cells.push({ x, y });
      }
    }
    let added = 0;
    stableShuffle(cells, packIndex * 131 + localIndex * 17).forEach((point) => {
      if (added >= targetCount) return;
      addObstacle(level, occupied, {
        id: `obstacle_${added + 1}`,
        kind: OBSTACLE_KINDS[(packIndex + localIndex + added) % OBSTACLE_KINDS.length],
        ...point
      });
      added += 1;
    });
  }

  function finalizeLevel(level, packIndex, localIndex) {
    const solved = solveSolutionPlan(level);
    if (!solved.solved) throw new Error(`${level.id}: invalid solution plan (${solved.reason || "unknown"})`);

    const minMoves = solved.moves;
    const margin = PACK_CONFIGS[packIndex].margin;
    level.minMoves = minMoves;
    level.searchStates = solved.actorTicks;
    level.moveLimit = minMoves + margin;
    level.targetMoves = {
      threeStars: Math.min(level.moveLimit, minMoves + Math.max(1, Math.floor(margin / 2))),
      twoStars: Math.min(level.moveLimit, minMoves + margin - 1)
    };
    level.difficultyScore = Math.round(
      minMoves * 11 +
        countDependencyMoves(level) * 5 +
        level.vehicles.length * 2.2 +
        level.obstacles.length * 3 +
        level.actors.length * 9 +
        (level.width - 6) * 13 +
        packIndex * 4 +
        Math.floor(localIndex / 3)
    );
    level.difficulty = clamp(Math.ceil((level.difficultyScore - 20) / 14), 1, 10);
  }

  function solveSolutionPlan(level) {
    const vehicles = level.vehicles.map(cloneVehicleState);
    const actors = (level.actors || []).map(cloneActorState);
    let actorTicks = 0;

    for (const step of level.solutionPlan || []) {
      const index = vehicles.findIndex((vehicle) => vehicle.id === step.id);
      if (index < 0) return { solved: false, reason: `missing vehicle ${step.id}` };
      const vehicle = vehicles[index];
      const occupied = buildOccupied(level, vehicles, actors, index);
      if (!canTravel(level, vehicle, step.delta, occupied)) return { solved: false, reason: `blocked move ${step.id}:${step.delta}` };
      vehicle.x += vehicle.axis === "horizontal" ? step.delta : 0;
      vehicle.y += vehicle.axis === "vertical" ? step.delta : 0;
      if (isSolvedState(level, vehicles)) return { solved: true, moves: level.solutionPlan.indexOf(step) + 1, actorTicks };
      actorTicks += simulateActorsAfterMove(level, vehicles, actors);
    }

    return { solved: isSolvedState(level, vehicles), moves: (level.solutionPlan || []).length, actorTicks };
  }

  function traceSolution(level) {
    const vehicles = level.vehicles.map(cloneVehicleState);
    const actors = (level.actors || []).map(cloneActorState);
    const cells = [];
    (level.solutionPlan || []).forEach((step) => {
      const index = vehicles.findIndex((vehicle) => vehicle.id === step.id);
      if (index < 0) return;
      const vehicle = vehicles[index];
      vehicleCells(vehicle).forEach((cell) => cells.push(cell));
      travelCells(vehicle, step.delta).forEach((cell) => cells.push(cell));
      vehicle.x += vehicle.axis === "horizontal" ? step.delta : 0;
      vehicle.y += vehicle.axis === "vertical" ? step.delta : 0;
      simulateActorsAfterMove(level, vehicles, actors);
      actors.forEach((actor) => {
        if (!actor.inactive) cells.push({ x: actor.x, y: actor.y });
      });
    });
    return cells;
  }

  function simulateActorsAfterMove(level, vehicles, actors) {
    const moves = [];
    actors.forEach((actor) => {
      if (actor.inactive || (actor.finished && actor.mode !== "wander")) return;
      actor.turnCounter = (actor.turnCounter || 0) + 1;
      const startDelay = Math.max(0, actor.startDelay || 0);
      const moveEvery = Math.max(1, actor.moveEvery || 1);
      if (actor.turnCounter <= startDelay || (actor.turnCounter - startDelay) % moveEvery !== 0) return;

      const next = getNextActorStep(actor);
      if (!next) return;
      const reserved = new Set(moves.map((move) => cellKey(move.toX, move.toY)));
      if (reserved.has(cellKey(next.point.x, next.point.y))) return;
      if (!isActorDestinationFree(level, vehicles, actors, actor, next.point)) return;
      moves.push({ actor, point: next.point, index: next.index, direction: next.direction });
    });

    moves.forEach((move) => {
      move.actor.x = move.point.x;
      move.actor.y = move.point.y;
      move.actor.stepIndex = move.index;
      move.actor.direction = move.direction;
      if (move.actor.mode === "route" && move.actor.stepIndex >= move.actor.path.length - 1) move.actor.finished = true;
    });
    return moves.length;
  }

  function getNextActorStep(actor) {
    if (!actor.path || actor.path.length < 2) return null;
    const currentIndex = Number.isInteger(actor.stepIndex) ? actor.stepIndex : 0;
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
    let index = currentIndex + direction;
    let nextDirection = direction;
    if (index < 0 || index >= actor.path.length) {
      nextDirection = -direction;
      index = currentIndex + nextDirection;
    }
    if (index < 0 || index >= actor.path.length) return null;
    return { point: actor.path[index], index, direction: nextDirection };
  }

  function isActorDestinationFree(level, vehicles, actors, actor, point) {
    if (!inside(level, point.x, point.y)) return false;
    if ((level.obstacles || []).some((obstacle) => obstacle.x === point.x && obstacle.y === point.y)) return false;
    if (vehicles.some((vehicle) => vehicleOccupiesCell(vehicle, point.x, point.y))) return false;
    if (actors.some((item) => item.id !== actor.id && !item.inactive && item.x === point.x && item.y === point.y)) return false;
    return true;
  }

  function solveSimpleTargetLine(level) {
    const vehicles = level.vehicles.map(cloneVehicleState);
    const targetIndex = vehicles.findIndex((vehicle) => vehicle.id === level.targetVehicleId);
    if (targetIndex < 0) return { solved: false, moves: Infinity };
    const target = vehicles[targetIndex];
    let moves = 0;

    for (let guard = 0; guard < level.width; guard += 1) {
      const blockerIndex = vehicles.findIndex((vehicle, index) => {
        return index !== targetIndex && vehicleOccupiesRow(vehicle, target.y, target.x + target.length);
      });
      if (blockerIndex < 0) break;
      const blocker = vehicles[blockerIndex];
      if (blocker.axis !== "vertical") return { solved: false, moves: Infinity };
      const occupied = buildOccupied(level, vehicles, [], blockerIndex);
      const delta = findSimpleClearDelta(level, blocker, target.y, occupied);
      if (!delta) return { solved: false, moves: Infinity };
      blocker.y += delta;
      moves += 1;
    }

    const occupied = buildOccupied(level, vehicles, [], targetIndex);
    const delta = level.width - target.length - target.x;
    if (!canTravel(level, target, delta, occupied)) return { solved: false, moves: Infinity };
    return { solved: true, moves: moves + 1 };
  }

  function findSimpleClearDelta(level, vehicle, targetRow, occupied) {
    const deltas = [];
    for (let delta = -1; delta > -level.height; delta -= 1) deltas.push(delta);
    for (let delta = 1; delta < level.height; delta += 1) deltas.push(delta);
    return deltas.find((delta) => {
      if (!canTravel(level, vehicle, delta, occupied)) return false;
      const moved = { ...vehicle, y: vehicle.y + delta };
      return !vehicleOccupiesRow(moved, targetRow, vehicle.x);
    });
  }

  function countDependencyMoves(level) {
    return (level.solutionPlan || []).filter((move) => !move.id.startsWith("block_") && move.id !== level.targetVehicleId).length;
  }

  function makeBlockerSignature(level) {
    const target = level.vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
    const blockers = level.vehicles
      .filter((vehicle) => target && vehicle.id !== target.id && vehicleOccupiesRow(vehicle, target.y, target.x + target.length))
      .map((vehicle) => `${vehicle.x}:${vehicle.y}:${vehicle.length}`)
      .join(",");
    return `${level.width}x${level.height}:r${target ? target.y : "?"}:${blockers}`;
  }

  function buildOccupied(level, vehicles, actors, skipVehicleIndex) {
    const occupied = new Set((level.obstacles || []).map((obstacle) => cellKey(obstacle.x, obstacle.y)));
    vehicles.forEach((vehicle, index) => {
      if (index === skipVehicleIndex) return;
      vehicleCells(vehicle).forEach((cell) => occupied.add(cellKey(cell.x, cell.y)));
    });
    actors.forEach((actor) => {
      if (!actor.inactive) occupied.add(cellKey(actor.x, actor.y));
    });
    return occupied;
  }

  function canTravel(level, vehicle, delta, occupied) {
    if (!Number.isInteger(delta) || delta === 0) return false;
    const direction = Math.sign(delta);
    for (let step = direction; Math.abs(step) <= Math.abs(delta); step += direction) {
      if (!canPlace(level, vehicle, step, occupied)) return false;
    }
    return true;
  }

  function canPlace(level, vehicle, delta, occupied) {
    for (let i = 0; i < vehicle.length; i += 1) {
      const x = vehicle.x + (vehicle.axis === "horizontal" ? i + delta : 0);
      const y = vehicle.y + (vehicle.axis === "vertical" ? i + delta : 0);
      if (!inside(level, x, y) || occupied.has(cellKey(x, y))) return false;
    }
    return true;
  }

  function addVehicle(level, occupied, vehicle) {
    if (!addVehicleIfFree(level, occupied, vehicle)) throw new Error(`${level.id}: cannot place vehicle ${vehicle.id}`);
  }

  function addVehicleIfFree(level, occupied, vehicle) {
    if (!vehicleCells(vehicle).every((cell) => inside(level, cell.x, cell.y) && !occupied.has(cellKey(cell.x, cell.y)))) return false;
    level.vehicles.push(vehicle);
    vehicleCells(vehicle).forEach((cell) => occupied.add(cellKey(cell.x, cell.y)));
    return true;
  }

  function addObstacle(level, occupied, obstacle) {
    const key = cellKey(obstacle.x, obstacle.y);
    if (!inside(level, obstacle.x, obstacle.y) || occupied.has(key)) throw new Error(`${level.id}: cannot place obstacle ${obstacle.id}`);
    level.obstacles.push(obstacle);
    occupied.add(key);
  }

  function addActor(level, occupied, actor) {
    const key = cellKey(actor.x, actor.y);
    if (!inside(level, actor.x, actor.y) || occupied.has(key)) throw new Error(`${level.id}: cannot place actor ${actor.id}`);
    if ((actor.path || []).some((point) => !inside(level, point.x, point.y))) throw new Error(`${level.id}: actor ${actor.id} path is out of bounds`);
    level.actors.push(actor);
    occupied.add(key);
  }

  function makeVehicle(id, x, y, length, axis, color, kind) {
    return { id, x, y, length, axis, color, kind };
  }

  function vehicleTouchesCells(vehicle, cells) {
    return vehicleCells(vehicle).some((cell) => cells.has(cellKey(cell.x, cell.y)));
  }

  function vehicleCells(vehicle) {
    const cells = [];
    for (let i = 0; i < vehicle.length; i += 1) {
      cells.push({
        x: vehicle.x + (vehicle.axis === "horizontal" ? i : 0),
        y: vehicle.y + (vehicle.axis === "vertical" ? i : 0)
      });
    }
    return cells;
  }

  function travelCells(vehicle, delta) {
    const cells = [];
    const direction = Math.sign(delta);
    for (let step = direction; Math.abs(step) <= Math.abs(delta); step += direction) {
      const moved = {
        ...vehicle,
        x: vehicle.x + (vehicle.axis === "horizontal" ? step : 0),
        y: vehicle.y + (vehicle.axis === "vertical" ? step : 0)
      };
      vehicleCells(moved).forEach((cell) => cells.push(cell));
    }
    return cells;
  }

  function vehicleOccupiesRow(vehicle, row, afterX) {
    return vehicleCells(vehicle).some((cell) => cell.y === row && cell.x >= afterX);
  }

  function vehicleOccupiesCell(vehicle, cellX, cellY) {
    return vehicleCells(vehicle).some((cell) => cell.x === cellX && cell.y === cellY);
  }

  function cloneVehicleState(vehicle) {
    return { ...vehicle };
  }

  function cloneActorState(actor) {
    return {
      mode: "route",
      stepIndex: 0,
      direction: 1,
      startDelay: 0,
      moveEvery: 1,
      turnCounter: 0,
      finished: false,
      inactive: false,
      ...actor,
      path: (actor.path || []).map((point) => ({ ...point }))
    };
  }

  function isSolvedState(level, vehicles) {
    const target = vehicles.find((vehicle) => vehicle.id === level.targetVehicleId);
    return target && target.axis === "horizontal" && target.y === level.exit.row && target.x + target.length >= level.width;
  }

  function stableShuffle(items, seed) {
    return items
      .map((item, index) => ({ item, score: (index * 47 + seed * 97 + (item.x || 0) * 31 + (item.y || 0) * 53) % 997 }))
      .sort((a, b) => a.score - b.score)
      .map((entry) => entry.item);
  }

  function pickColor(index) {
    return CAR_COLORS[Math.abs(index) % CAR_COLORS.length];
  }

  function inside(level, x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < level.width && y < level.height;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cellKey(x, y) {
    return `${x},${y}`;
  }

  function pad(value) {
    return String(value).padStart(3, "0");
  }
})();
