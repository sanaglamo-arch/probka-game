#!/usr/bin/env node
/*
 * Builds Yandex Games promo assets from the REAL in-game art (board.png + real
 * traffic sprites + the classic_red hero car). Every asset is a top-down parking
 * scene composed from the game's own materials, so promo == gameplay.
 *
 * Output: releases/yandex-assets
 *   logo-512.png        512x512   app icon / logo
 *   cover-800x470.png   800x470   store cover
 *   web1..3.png         1920x1080 16:9 gameplay promo
 *   phone1..3.png       1080x1920 9:16 gameplay promo
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const GAME_DIR = path.resolve(__dirname, "..");
const OUT_DIR = path.resolve(__dirname, "../../releases/yandex-assets");
const CHROME = "/usr/bin/google-chrome";

// ---- board geometry (from assets/yards/_guides/yard-board-layout.json) ----
const BOARD = 1024;
const GF = { left: 125, top: 125 }; // grid frame origin
const CELL = 120; // px per cell in board coordinates
const EXIT_ROW = 2; // exit gap is on the right edge at row index 2

function fileUrl(p) {
  return "file://" + p.split(path.sep).join("/");
}
function yardBoard(id) {
  return fileUrl(path.join(GAME_DIR, "assets/yards", id, "board.png"));
}
function yardCar(id, file) {
  return fileUrl(path.join(GAME_DIR, "assets/yards", id, "traffic", file));
}
const RED_CAR = fileUrl(path.join(GAME_DIR, "assets/skins/v3/classic_red.png"));

// sprite filename for a vehicle
function spriteFor(yard, v) {
  const ax = v.axis === "v" ? "v" : "h";
  const base = v.len >= 3 ? `van-3-${ax}.png` : `car-2-${ax}.png`;
  return yardCar(yard, base);
}

/* Map a board-space box to frame pixels given the board placement. */
function boardPlacement(frameW, frameH, scale, anchor) {
  const S = BOARD * scale;
  let left, top;
  if (anchor.centerGridX) left = frameW / 2 - (GF.left + 3 * CELL) * scale;
  else left = anchor.left;
  if (anchor.centerGridY) top = frameH / 2 - (GF.top + 3 * CELL) * scale;
  else top = anchor.top;
  return { S, left, top, scale };
}
function cellRect(pl, v) {
  const w = (v.axis === "v" ? 1 : v.len) * CELL;
  const h = (v.axis === "v" ? v.len : 1) * CELL;
  const bx = GF.left + v.col * CELL;
  const by = GF.top + v.row * CELL;
  return {
    x: pl.left + bx * pl.scale,
    y: pl.top + by * pl.scale,
    w: w * pl.scale,
    h: h * pl.scale
  };
}

// ---- HTML building blocks ----
const FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">`;

function carImg(pl, v, yard, extra = "") {
  const r = cellRect(pl, v);
  const boost = 1.13;
  return `<img class="veh" src="${spriteFor(yard, v)}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;transform:scale(${boost});${extra}">`;
}

// Red hero car: classic_red.png is a vertical sprite; rotate 90deg for a
// horizontal car pointing right toward the exit.
function redCar(pl, col, row, len = 2) {
  const v = { col, row, len, axis: "h" };
  const r = cellRect(pl, v);
  const boost = 1.16;
  // place a vertical-sized img, rotate it 90deg cw -> becomes horizontal len x 1
  const w = r.h * boost; // after rotation visual width comes from element height
  const h = r.w * boost;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  return `<img class="hero" src="${RED_CAR}" style="left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;transform:rotate(90deg);">`;
}

// Glowing green exit chevrons positioned at the right edge exit row.
function exitArrow(pl, row = EXIT_ROW) {
  const bx = GF.left + 6 * CELL; // right edge of grid (col 6)
  const by = GF.top + row * CELL;
  const x = pl.left + bx * pl.scale;
  const y = pl.top + by * pl.scale;
  const cell = CELL * pl.scale;
  const aw = cell * 1.5;
  return `<div class="exit" style="left:${x - cell * 0.15}px;top:${y}px;width:${aw}px;height:${cell}px;">
    <svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid meet">
      <g fill="none" stroke="#7fe7b0" stroke-width="13" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 18 L46 40 L18 62"/>
        <path d="M52 18 L80 40 L52 62"/>
      </g>
    </svg>
  </div>`;
}

function shell(w, h, body, extraCss = "") {
  return `<!doctype html><html><head><meta charset="utf-8">${FONT_LINK}
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px;overflow:hidden;background:#080b11;font-family:Inter,system-ui,sans-serif}
.frame{position:relative;width:${w}px;height:${h}px;overflow:hidden}
.board{position:absolute;image-rendering:auto}
.veh{position:absolute;object-fit:contain;filter:drop-shadow(0 ${Math.round(h*0.012)}px ${Math.round(h*0.012)}px rgba(0,0,0,.55))}
.hero{position:absolute;object-fit:contain;filter:drop-shadow(0 ${Math.round(h*0.013)}px ${Math.round(h*0.014)}px rgba(0,0,0,.6)) drop-shadow(0 0 ${Math.round(h*0.02)}px rgba(255,92,104,.45))}
.exit{position:absolute;display:grid;place-items:center;filter:drop-shadow(0 0 ${Math.round(h*0.018)}px rgba(119,231,176,.85))}
.exit svg{width:100%;height:100%}
.vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 50% 42%,transparent 52%,rgba(0,0,0,.45) 100%)}
${extraCss}
</style></head><body><div class="frame">${body}</div></body></html>`;
}

// ============================ SCENES ============================
// Greedy packer on a 6x6 occupancy grid. Row 2 (the exit row) is fully reserved
// so the red hero's lane to the exit is always clear -> reads as "about to win".
// Candidates that don't fit are dropped, so layouts are always collision-free.
function packLayout(redCol, candidates) {
  const occ = Array.from({ length: 6 }, () => Array(6).fill(false));
  for (let c = 0; c < 6; c++) occ[EXIT_ROW][c] = true; // reserve exit lane + hero
  const placed = [];
  for (const v of candidates) {
    const cells = [];
    let ok = true;
    for (let i = 0; i < v.len; i++) {
      const c = v.axis === "v" ? v.col : v.col + i;
      const r = v.axis === "v" ? v.row + i : v.row;
      if (c < 0 || c > 5 || r < 0 || r > 5 || occ[r][c]) { ok = false; break; }
      cells.push([r, c]);
    }
    if (!ok) continue;
    cells.forEach(([r, c]) => (occ[r][c] = true));
    placed.push(v);
  }
  return placed;
}

// Dense, varied candidate pools (big anchors first). Packer keeps what fits.
const POOLS = {
  a: [
    { col: 0, row: 0, len: 3, axis: "v" }, { col: 1, row: 0, len: 2, axis: "h" },
    { col: 3, row: 0, len: 3, axis: "h" }, { col: 4, row: 1, len: 2, axis: "v" },
    { col: 1, row: 1, len: 2, axis: "h" },
    { col: 0, row: 3, len: 2, axis: "v" }, { col: 1, row: 3, len: 3, axis: "h" },
    { col: 4, row: 3, len: 2, axis: "v" }, { col: 5, row: 3, len: 2, axis: "v" },
    { col: 0, row: 5, len: 3, axis: "h" }, { col: 3, row: 5, len: 2, axis: "h" },
    { col: 5, row: 0, len: 2, axis: "v" }
  ],
  b: [
    { col: 1, row: 0, len: 2, axis: "v" }, { col: 0, row: 0, len: 1, axis: "v" },
    { col: 2, row: 0, len: 3, axis: "h" }, { col: 5, row: 0, len: 3, axis: "v" },
    { col: 0, row: 1, len: 2, axis: "h" },
    { col: 0, row: 3, len: 3, axis: "h" }, { col: 3, row: 3, len: 2, axis: "v" },
    { col: 4, row: 4, len: 2, axis: "h" }, { col: 0, row: 4, len: 2, axis: "v" },
    { col: 1, row: 5, len: 2, axis: "h" }, { col: 3, row: 5, len: 3, axis: "h" }
  ],
  c: [
    { col: 0, row: 0, len: 2, axis: "h" }, { col: 2, row: 0, len: 2, axis: "v" },
    { col: 3, row: 0, len: 2, axis: "h" }, { col: 5, row: 0, len: 2, axis: "v" },
    { col: 0, row: 1, len: 2, axis: "v" }, { col: 4, row: 1, len: 2, axis: "v" },
    { col: 1, row: 3, len: 2, axis: "h" }, { col: 3, row: 3, len: 3, axis: "h" },
    { col: 0, row: 3, len: 2, axis: "v" }, { col: 5, row: 3, len: 2, axis: "v" },
    { col: 0, row: 5, len: 2, axis: "h" }, { col: 2, row: 5, len: 3, axis: "h" },
    { col: 5, row: 5, len: 1, axis: "v" }
  ]
};

const WEB_SCENES = [
  { name: "web-1", yard: "quiet_yard", pool: "a", redCol: 2, eyebrow: "Головоломка-парковка", caption: "Выведи красную машину к выезду" },
  { name: "web-2", yard: "night_yard", pool: "b", redCol: 3, eyebrow: "300 уровней · 3 режима", caption: "Двигай машины и расчисти путь" },
  { name: "web-3", yard: "business_center", pool: "c", redCol: 2, eyebrow: "Новый уровень каждый день", caption: "Сотни дворов и стильные машины" }
];

const PHONE_SCENES = [
  { name: "phone-1", yard: "winter_yard", pool: "a", redCol: 2, moves: 14, level: 12, caption: "Освободи выезд за минимум ходов" },
  { name: "phone-2", yard: "forest_yard", pool: "b", redCol: 2, moves: 9, level: 47, caption: "Двигай машины — выведи красную" },
  { name: "phone-3", yard: "night_yard", pool: "c", redCol: 2, moves: 11, level: 88, caption: "300 уровней и режим на время" }
];

function buildWeb(scene) {
  const W = 1920, H = 1080;
  const scale = 2000 / BOARD;
  const pl = boardPlacement(W, H, scale, { centerGridX: true, centerGridY: true });
  const cars = packLayout(scene.redCol, POOLS[scene.pool]).map((v) => carImg(pl, v, scene.yard)).join("");
  const body = `
    <img class="board" src="${yardBoard(scene.yard)}" style="left:${pl.left}px;top:${pl.top}px;width:${pl.S}px;height:${pl.S}px">
    ${cars}
    ${exitArrow(pl)}
    ${redCar(pl, scene.redCol, EXIT_ROW)}
    <div class="vignette"></div>
    <div class="wm">
      <div class="logo-chip"><span class="lc-red"></span>ПРОБКА <b>во дворе</b></div>
    </div>
    <div class="cap">
      <p class="eyebrow">${scene.eyebrow}</p>
      <p class="cap-main">${scene.caption}</p>
    </div>`;
  const css = `
    .wm{position:absolute;top:46px;left:54px}
    .logo-chip{display:flex;align-items:center;gap:14px;font-size:30px;font-weight:800;letter-spacing:.06em;color:#eef4ff;background:rgba(12,17,25,.62);border:1px solid rgba(255,211,92,.4);padding:14px 24px;border-radius:999px;backdrop-filter:blur(6px)}
    .logo-chip b{font-weight:900;color:#ffd35c;letter-spacing:.02em}
    .lc-red{width:20px;height:20px;border-radius:6px;background:linear-gradient(135deg,#ff7c86,#e7354c);box-shadow:0 0 12px rgba(255,92,104,.7)}
    .cap{position:absolute;left:54px;bottom:48px;max-width:60%}
    .cap .eyebrow{font-size:24px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#ffd35c;margin-bottom:12px}
    .cap-main{font-size:52px;line-height:1.05;font-weight:900;color:#fff;text-shadow:0 6px 26px rgba(0,0,0,.6)}`;
  return shell(W, H, body, css);
}

function buildPhone(scene) {
  const W = 1080, H = 1920;
  // Big board near the top (sides barely cropped) so gameplay dominates and there
  // is no empty band before the HUD.
  const scale = 1260 / BOARD; // board ~1260px tall (~66% of frame), ~90px side crop
  const S = BOARD * scale;
  const left = (W - S) / 2;
  const top = 132;
  const pl = { S, left, top, scale };
  const cars = packLayout(scene.redCol, POOLS[scene.pool]).map((v) => carImg(pl, v, scene.yard)).join("");
  const body = `
    <div class="bg"></div>
    <img class="board" src="${yardBoard(scene.yard)}" style="left:${pl.left}px;top:${pl.top}px;width:${pl.S}px;height:${pl.S}px">
    ${cars}
    ${exitArrow(pl)}
    ${redCar(pl, scene.redCol, EXIT_ROW)}
    <div class="topbar">
      <div class="logo-chip"><span class="lc-red"></span>ПРОБКА <b>во дворе</b></div>
      <div class="lvl">Уровень ${scene.level}</div>
    </div>
    <div class="hud">
      <div class="hud-row">
        <div class="stat"><small>ХОДЫ</small><strong>${scene.moves}</strong></div>
        <div class="tools">
          <div class="tool">↶<span>Отмена</span></div>
          <div class="tool">💡<span>Подсказка</span></div>
        </div>
      </div>
      <p class="cap-main">${scene.caption}</p>
    </div>`;
  const css = `
    .bg{position:absolute;inset:0;background:radial-gradient(135% 60% at 50% 14%,#1b2a3e 0%,#0e151f 50%,#070a10 100%)}
    .topbar{position:absolute;top:48px;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:0 50px}
    .logo-chip{display:flex;align-items:center;gap:13px;font-size:32px;font-weight:800;letter-spacing:.05em;color:#eef4ff}
    .logo-chip b{font-weight:900;color:#ffd35c}
    .lc-red{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,#ff7c86,#e7354c);box-shadow:0 0 12px rgba(255,92,104,.7)}
    .lvl{font-size:28px;font-weight:800;color:#9fb0c6}
    .hud{position:absolute;left:46px;right:46px;top:1452px;display:flex;flex-direction:column;gap:40px}
    .hud-row{display:flex;align-items:center;justify-content:space-between;gap:24px}
    .stat{display:flex;flex-direction:column;gap:8px;background:rgba(14,20,30,.82);border:1px solid rgba(255,211,92,.34);border-radius:26px;padding:22px 40px}
    .stat small{font-size:24px;font-weight:800;letter-spacing:.2em;color:#ffd35c}
    .stat strong{font-size:72px;font-weight:900;color:#fff;line-height:.86}
    .tools{display:flex;gap:22px}
    .tool{display:flex;flex-direction:column;align-items:center;gap:10px;font-size:46px;font-weight:800;color:#d7e2f2;background:rgba(20,28,40,.84);border:1px solid rgba(255,255,255,.1);border-radius:26px;padding:22px 34px}
    .tool span{font-size:23px;color:#9fb0c6;font-weight:700}
    .cap-main{font-size:50px;line-height:1.1;font-weight:900;color:#fff;text-align:center;text-shadow:0 6px 24px rgba(0,0,0,.6);margin-top:6px}`;
  return shell(W, H, body, css);
}

function buildCover() {
  const W = 800, H = 470;
  const yard = "night_yard";
  // board on the right ~58% width, full height bleed
  const scale = 560 / BOARD;
  const S = BOARD * scale;
  const pl = { S, left: W - S + 70, top: H / 2 - (GF.top + 3 * CELL) * scale, scale };
  const layout = [
    { col: 0, row: 1, len: 3, axis: "v" },
    { col: 1, row: 1, len: 2, axis: "v" },
    { col: 1, row: 3, len: 3, axis: "h" },
    { col: 4, row: 1, len: 2, axis: "v" },
    { col: 5, row: 3, len: 2, axis: "v" }
  ];
  const cars = layout.map((v) => carImg(pl, v, yard)).join("");
  const body = `
    <div class="cbg"></div>
    <img class="board" src="${yardBoard(yard)}" style="left:${pl.left}px;top:${pl.top}px;width:${pl.S}px;height:${pl.S}px">
    ${cars}
    ${exitArrow(pl)}
    ${redCar(pl, 3, EXIT_ROW)}
    <div class="fade"></div>
    <div class="copy">
      <p class="eyebrow">Головоломка-парковка</p>
      <h1>ПРОБКА<br><b>во дворе</b></h1>
      <p class="tag">Выведи красную машину к выезду</p>
      <div class="chips"><span>300 уровней</span><span>3 режима</span></div>
    </div>`;
  const css = `
    .cbg{position:absolute;inset:0;background:linear-gradient(115deg,#0c1320 0%,#0c1320 38%,#101a28 100%)}
    .fade{position:absolute;inset:0;background:linear-gradient(90deg,#0a111c 30%,rgba(10,17,28,.6) 48%,transparent 64%)}
    .copy{position:absolute;left:42px;top:0;height:100%;display:flex;flex-direction:column;justify-content:center;gap:8px;width:430px}
    .copy .eyebrow{font-size:16px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ffd35c}
    .copy h1{font-size:62px;line-height:.94;font-weight:900;color:#fff;letter-spacing:.01em}
    .copy h1 b{color:#ffd35c}
    .copy .tag{margin-top:10px;font-size:22px;font-weight:700;color:#c2d0e4}
    .chips{display:flex;gap:12px;margin-top:18px}
    .chips span{font-size:18px;font-weight:800;color:#0c1320;background:#ffd35c;padding:9px 18px;border-radius:999px}`;
  return shell(W, H, body, css);
}

function buildLogo() {
  const W = 512, H = 512;
  const yard = "night_yard";
  // tight crop on the exit corner with the red hero escaping past blockers
  const scale = 760 / BOARD;
  const S = BOARD * scale;
  // center on the exit area (right side, row 2)
  const focusX = GF.left + 5.0 * CELL;
  const focusY = GF.top + (EXIT_ROW + 0.5) * CELL;
  const pl = { S, left: W / 2 - focusX * scale, top: H / 2 - focusY * scale, scale };
  const layout = [
    { col: 3, row: 0, len: 2, axis: "v" },
    { col: 4, row: 1, len: 2, axis: "v" },
    { col: 5, row: 0, len: 2, axis: "v" },
    { col: 3, row: 3, len: 2, axis: "h" }
  ];
  const cars = layout.map((v) => carImg(pl, v, yard)).join("");
  const body = `
    <img class="board" src="${yardBoard(yard)}" style="left:${pl.left}px;top:${pl.top}px;width:${pl.S}px;height:${pl.S}px">
    ${cars}
    ${exitArrow(pl)}
    ${redCar(pl, 3, EXIT_ROW)}
    <div class="ivig"></div>
    <div class="irim"></div>`;
  const css = `
    .ivig{position:absolute;inset:0;background:radial-gradient(95% 95% at 50% 42%,transparent 46%,rgba(4,7,12,.62) 100%)}
    .irim{position:absolute;inset:0;box-shadow:inset 0 0 0 10px rgba(255,211,92,.0)}`;
  return shell(W, H, body, css);
}

// ============================ RENDER ============================
function capture(htmlPath, outPath, w, h) {
  const res = spawnSync(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
    "--no-first-run", "--no-default-browser-check", "--force-device-scale-factor=1",
    "--default-background-color=00000000",
    `--window-size=${w},${h}`,
    `--screenshot=${outPath}`,
    "--virtual-time-budget=9000",
    fileUrl(htmlPath)
  ], { stdio: "inherit", timeout: 60000 });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error("chrome failed for " + htmlPath);
}

const README = `# Промо-материалы «Пробка во дворе» (Яндекс Игры)

Все материалы собраны из реальных игровых ассетов: настоящие доски дворов
(board.png), реальные спрайты машин и фирменная красная машина игрока. Геймплей
занимает почти весь кадр (значительно больше 70%, п. 5.1.1.2) — внешних
изображений и образов нет (п. 5.1.1).

## Состав
- logo-512.png        — логотип/иконка, 512×512 PNG
- cover-800x470.png   — обложка, 800×470 PNG
- web-1.png .. web-3.png    — промо для веб (16:9), 1920×1080, разные дворы
- phone-1.png .. phone-3.png — промо для телефона (9:16), 1080×1920

## Дворы
web: тихий двор, ночной двор, бизнес-центр.
phone: зимний двор, лесная парковка, ночной двор.

Пересобрать: \`node probka-game/tools/build-promo-assets.js\`
`;

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // remove every stale promo file so the folder holds only the final set
  fs.readdirSync(OUT_DIR).forEach((f) => {
    if (/\.(png|html)$/i.test(f)) fs.unlinkSync(path.join(OUT_DIR, f));
  });

  const jobs = [];
  jobs.push({ name: "logo-512", w: 512, h: 512, html: buildLogo() });
  jobs.push({ name: "cover-800x470", w: 800, h: 470, html: buildCover() });
  WEB_SCENES.forEach((s) => jobs.push({ name: s.name, w: 1920, h: 1080, html: buildWeb(s) }));
  PHONE_SCENES.forEach((s) => jobs.push({ name: s.name, w: 1080, h: 1920, html: buildPhone(s) }));

  jobs.forEach((j) => {
    const htmlPath = path.join(OUT_DIR, `_${j.name}.html`);
    fs.writeFileSync(htmlPath, j.html);
    capture(htmlPath, path.join(OUT_DIR, `${j.name}.png`), j.w, j.h);
    fs.unlinkSync(htmlPath);
    console.log("rendered", j.name);
  });
  fs.writeFileSync(path.join(OUT_DIR, "README.md"), README);
  console.log("done ->", OUT_DIR);
}

main();
