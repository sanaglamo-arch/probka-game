const count = Number.parseInt(process.argv[2] || "6", 10);
const seed = Number.parseInt(process.argv[3] || "27", 10);

const rows = [2, 3, 1, 4];
const actorKinds = ["courier", "janitor", "pedestrian"];
const colors = ["#4aa3ff", "#55d6a8", "#ffd166", "#e8edf2", "#b889ff", "#ff9f43"];

const candidates = Array.from({ length: count }, (_, index) => makeCandidate(index + 1, seed + index * 17));

console.log(JSON.stringify(candidates, null, 2));

function makeCandidate(number, value) {
  const row = rows[value % rows.length];
  const actorKind = actorKinds[value % actorKinds.length];
  const actorPath = verticalPath(5, row);
  const actorIsCourier = actorKind === "courier";
  const moveLimit = 7 + (value % 4);
  return {
    id: `draft_${String(number).padStart(3, "0")}`,
    packId: "draft_pack",
    title: `Черновой двор ${number}`,
    introText: "Generated draft: polish before moving to levels.js",
    difficulty: 5 + (value % 5),
    width: 6,
    height: 6,
    exit: { side: "right", row },
    targetVehicleId: "red",
    targetMoves: { threeStars: Math.ceil(moveLimit * 0.55), twoStars: Math.ceil(moveLimit * 0.8) },
    moveLimit,
    vehicles: [
      { id: "red", x: 0, y: row, length: 2, axis: "horizontal", color: "#ff5c68" },
      { id: "block_1", x: 3, y: row <= 2 ? row : row - 1, length: 2, axis: "vertical", color: colors[value % colors.length] },
      { id: "block_2", x: 4, y: row <= 2 ? row : row - 1, length: 2, axis: "vertical", color: colors[(value + 2) % colors.length] },
      { id: "car_1", x: 0, y: row === 1 ? 4 : 1, length: 2, axis: "horizontal", color: colors[(value + 3) % colors.length] }
    ],
    obstacles: [
      { id: "obstacle_1", kind: value % 2 ? "cone" : "bin", x: 1, y: row === 4 ? 1 : 5 }
    ],
    actors: [
      {
        id: `${actorKind}_1`,
        kind: actorKind,
        x: actorIsCourier ? actorPath[0].x : 5,
        y: actorIsCourier ? actorPath[0].y : row,
        path: actorPath,
        mode: actorIsCourier ? "wander" : value % 2 ? "pingPong" : "loop",
        stepIndex: actorIsCourier ? 0 : 1,
        direction: 1
      }
    ]
  };
}

function verticalPath(x, row) {
  const start = Math.max(0, Math.min(3, row - 1));
  return [
    { x, y: start },
    { x, y: start + 1 },
    { x, y: start + 2 }
  ];
}
