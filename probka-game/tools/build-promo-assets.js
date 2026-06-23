#!/usr/bin/env node
/*
 * Yandex Games promo assets for «Пробка во дворе».
 * Polished marketing compositions built ONLY from real in-game art
 * (board.png + real car sprites + classic_red hero car), following the
 * "good example" style from the Yandex docs: a hero board, rich themed
 * background, bold title, feature chips and game-object FX.
 *
 * Output (releases/yandex-assets):
 *   logo-512.png 512x512 · cover-800x470.png 800x470
 *   web-1..3.png 1920x1080 (16:9) · phone-1..3.png 1080x1920 (9:16)
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const GAME_DIR = path.resolve(__dirname, "..");
const OUT_DIR = path.resolve(__dirname, "../../releases/yandex-assets");
const CHROME = "/usr/bin/google-chrome";

// ---- board geometry (assets/yards/_guides/yard-board-layout.json) ----
const BOARD = 1024;
const GF = { left: 125, top: 125 };
const CELL = 120;
const GRID = 6;
const EXIT_ROW = 2;

const fileUrl = (p) => "file://" + p.split(path.sep).join("/");
const yardBoard = (id) => fileUrl(path.join(GAME_DIR, "assets/yards", id, "board.png"));
const yardCar = (id, f) => fileUrl(path.join(GAME_DIR, "assets/yards", id, "traffic", f));
const RED_CAR = fileUrl(path.join(GAME_DIR, "assets/skins/v3/classic_red.png"));

const spriteFor = (yard, v) => yardCar(yard, `${v.len >= 3 ? "van-3" : "car-2"}-${v.axis === "v" ? "v" : "h"}.png`);

// ---- collision-free packer (row 2 reserved for the hero's clear exit lane) ----
function packLayout(candidates) {
  const occ = Array.from({ length: GRID }, () => Array(GRID).fill(false));
  for (let c = 0; c < GRID; c++) occ[EXIT_ROW][c] = true;
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

const POOLS = {
  a: [
    { col: 0, row: 0, len: 3, axis: "v" }, { col: 1, row: 0, len: 2, axis: "h" },
    { col: 3, row: 0, len: 3, axis: "h" }, { col: 4, row: 1, len: 2, axis: "v" },
    { col: 1, row: 1, len: 2, axis: "h" }, { col: 0, row: 3, len: 2, axis: "v" },
    { col: 1, row: 3, len: 3, axis: "h" }, { col: 4, row: 3, len: 2, axis: "v" },
    { col: 5, row: 3, len: 2, axis: "v" }, { col: 0, row: 5, len: 3, axis: "h" },
    { col: 3, row: 5, len: 2, axis: "h" }, { col: 5, row: 0, len: 2, axis: "v" }
  ],
  b: [
    { col: 1, row: 0, len: 2, axis: "v" }, { col: 2, row: 0, len: 3, axis: "h" },
    { col: 5, row: 0, len: 3, axis: "v" }, { col: 0, row: 1, len: 2, axis: "h" },
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
    { col: 0, row: 5, len: 2, axis: "h" }, { col: 2, row: 5, len: 3, axis: "h" }
  ]
};

// ---- board-card geometry (local coords inside an SxS card) ----
function localBox(v, scale) {
  return {
    x: (GF.left + v.col * CELL) * scale,
    y: (GF.top + v.row * CELL) * scale,
    w: (v.axis === "v" ? 1 : v.len) * CELL * scale,
    h: (v.axis === "v" ? v.len : 1) * CELL * scale
  };
}

/* The hero board card: rounded board.png + real cars + red hero + exit FX.
 * Returns inner HTML; caller wraps it in a positioned .card of size S. */
function boardCard(yard, scale, pool, redCol, opts = {}) {
  const S = BOARD * scale;
  const cars = packLayout(POOLS[pool]).map((v) => {
    const b = localBox(v, scale);
    return `<img class="veh" src="${spriteFor(yard, v)}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;transform:scale(1.12)">`;
  }).join("");

  // red hero (vertical sprite rotated 90deg -> points right toward exit)
  const hb = localBox({ col: redCol, row: EXIT_ROW, len: 2, axis: "h" }, scale);
  const boost = 1.18;
  const rw = hb.h * boost, rh = hb.w * boost;
  const rcx = hb.x + hb.w / 2, rcy = hb.y + hb.h / 2;
  const hero = `<img class="hero" src="${RED_CAR}" style="left:${rcx - rw / 2}px;top:${rcy - rh / 2}px;width:${rw}px;height:${rh}px;transform:rotate(90deg)">`;

  // exit FX: glow lane + chevrons at the grid's right edge on the exit row
  const ex = (GF.left + GRID * CELL) * scale;
  const ey = (GF.top + EXIT_ROW * CELL) * scale;
  const cell = CELL * scale;
  const beam = `<div class="beam" style="left:${rcx}px;top:${ey + cell * 0.18}px;height:${cell * 0.64}px;width:${ex - rcx + cell * 1.6}px"></div>`;
  const chev = `<div class="chev" style="left:${ex - cell * 0.05}px;top:${ey}px;width:${cell * 1.5}px;height:${cell}px">
      <svg viewBox="0 0 120 80"><g fill="none" stroke="#86f0bb" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 16 L44 40 L14 64"/><path d="M50 16 L80 40 L50 64"/></g></svg></div>`;
  const coins = opts.coins === false ? "" : [
    [ex + cell * 0.5, ey - cell * 0.15, 1], [ex + cell * 0.9, ey + cell * 0.6, 0.8], [ex + cell * 0.2, ey + cell * 0.9, 0.62]
  ].map(([x, y, s]) => `<div class="coin" style="left:${x}px;top:${y}px;width:${cell * 0.34 * s}px;height:${cell * 0.34 * s}px"></div>`).join("");

  return `<img class="board" src="${yardBoard(yard)}" style="width:${S}px;height:${S}px">
    <div class="board-rim"></div>${cars}${beam}${hero}${chev}${coins}`;
}

// ---- shared scene chrome (rich themed background) ----
function sceneBg(accent, big = true) {
  return `
    <div class="bg-base"></div>
    <div class="bg-glow" style="--accent:${accent}"></div>
    <div class="bg-rays"></div>
    <div class="bg-grid"></div>
    <div class="bg-bokeh"></div>`;
}

const FONT = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">`;

function commonCss(accent) {
  return `
*{margin:0;padding:0;box-sizing:border-box}
html,body{overflow:hidden;background:#070a12;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.frame{position:relative;overflow:hidden}
.bg-base{position:absolute;inset:0;background:linear-gradient(155deg,#101a2b 0%,#0b1220 52%,#070a12 100%)}
.bg-glow{position:absolute;inset:0;background:
  radial-gradient(60% 55% at 72% 30%,color-mix(in srgb,var(--accent) 42%,transparent) 0%,transparent 60%),
  radial-gradient(48% 50% at 22% 78%,color-mix(in srgb,var(--accent) 22%,transparent) 0%,transparent 60%);
  filter:saturate(1.1)}
.bg-rays{position:absolute;inset:-20%;background:repeating-conic-gradient(from 200deg at 72% 26%,rgba(255,255,255,.05) 0deg 4deg,transparent 4deg 13deg);mix-blend-mode:screen;opacity:.5}
.bg-grid{position:absolute;inset:0;opacity:.10;background-image:linear-gradient(rgba(157,184,224,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(157,184,224,.6) 1px,transparent 1px);background-size:64px 64px;-webkit-mask-image:radial-gradient(80% 80% at 50% 45%,#000 30%,transparent 78%)}
.bg-bokeh{position:absolute;inset:0;background:
  radial-gradient(circle at 12% 22%,rgba(255,211,92,.5) 0,transparent 5px),
  radial-gradient(circle at 86% 70%,rgba(134,240,187,.45) 0,transparent 6px),
  radial-gradient(circle at 64% 12%,rgba(255,255,255,.35) 0,transparent 4px),
  radial-gradient(circle at 30% 86%,rgba(120,173,255,.4) 0,transparent 5px);filter:blur(.5px);opacity:.8}
.deco{position:absolute;object-fit:contain;opacity:.12;filter:blur(2px) saturate(.6) brightness(.8);pointer-events:none}
.card{position:absolute}
.board{position:absolute;inset:0;border-radius:34px;box-shadow:0 46px 120px rgba(0,0,0,.62),0 12px 40px rgba(0,0,0,.5)}
.board-rim{position:absolute;inset:0;border-radius:34px;box-shadow:inset 0 0 0 2px rgba(255,211,92,.34),inset 0 0 70px rgba(0,0,0,.45);pointer-events:none}
.veh{position:absolute;object-fit:contain;filter:drop-shadow(0 10px 12px rgba(0,0,0,.5))}
.hero{position:absolute;object-fit:contain;z-index:5;filter:drop-shadow(0 12px 16px rgba(0,0,0,.55)) drop-shadow(0 0 26px rgba(255,72,92,.6))}
.beam{position:absolute;z-index:4;border-radius:999px;background:linear-gradient(90deg,rgba(134,240,187,.0),rgba(134,240,187,.5) 30%,rgba(180,255,214,.85));filter:blur(7px);opacity:.85}
.chev{position:absolute;z-index:6;display:grid;place-items:center;filter:drop-shadow(0 0 20px rgba(134,240,187,.95))}
.chev svg{width:100%;height:100%}
.coin{position:absolute;z-index:6;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#ffc83d 60%,#e69a18);box-shadow:0 0 16px rgba(255,200,61,.8),inset 0 -2px 4px rgba(150,90,0,.5)}
.eyebrow{font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#ffd35c}
.title{font-weight:900;line-height:.92;color:#fff;letter-spacing:.005em;text-shadow:0 8px 36px rgba(0,0,0,.55)}
.title .gold{background:linear-gradient(180deg,#ffe89a,#ffce5a 55%,#f5a623);-webkit-background-clip:text;background-clip:text;color:transparent}
.tagline{color:#c5d3e8;font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:14px}
.chip{display:flex;align-items:center;gap:11px;font-weight:800;color:#eaf1fb;background:rgba(16,24,38,.72);border:1px solid rgba(255,211,92,.34);border-radius:999px;backdrop-filter:blur(6px);box-shadow:0 8px 22px rgba(0,0,0,.35)}
.chip .dot{border-radius:50%;background:linear-gradient(135deg,#ffe89a,#f5a623);box-shadow:0 0 10px rgba(255,200,61,.7)}
.brand{display:flex;align-items:center;font-weight:800;color:#eef4ff}
.brand .gold{color:#ffd35c;font-weight:900}
.brand .sq{border-radius:6px;background:linear-gradient(135deg,#ff7c86,#e7354c);box-shadow:0 0 12px rgba(255,92,104,.7)}
.floor{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.5),transparent);filter:blur(8px)}`;
}

function shell(w, h, accent, body, css) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONT}<style>
${commonCss(accent)}
html,body{width:${w}px;height:${h}px}
.frame{width:${w}px;height:${h}px}
${css}</style></head><body><div class="frame">${body}</div></body></html>`;
}

// ============================ WEB 16:9 ============================
function buildWeb(s) {
  const W = 1920, H = 1080;
  const S = 1010, scale = S / BOARD;
  const left = s.mirror ? 70 : W - S - 70;
  const top = 36;
  const textSide = s.mirror ? `right:90px;` : `left:96px;`;
  const card = `<div class="floor" style="left:${left + S * 0.04}px;top:${top + S - 30}px;width:${S * 0.92}px;height:90px"></div>
    <div class="card" style="left:${left}px;top:${top}px;width:${S}px;height:${S}px;transform:perspective(2600px) rotateY(${s.mirror ? 7 : -7}deg) rotateX(3deg)">${boardCard(s.yard, scale, s.pool, s.redCol)}</div>`;
  const deco = `<img class="deco" src="${spriteFor(s.yard, { len: 3, axis: "h" })}" style="${s.mirror ? "right" : "left"}:40px;top:${H - 250}px;width:520px;height:170px;transform:rotate(${s.mirror ? 8 : -8}deg)">`;
  const body = `${sceneBg(s.accent)}${deco}${card}
    <div class="wtext" style="${textSide}">
      <p class="eyebrow">${s.eyebrow}</p>
      <h1 class="title">${s.title1}<br><span class="gold">${s.title2}</span></h1>
      <p class="tagline">${s.tagline}</p>
      <div class="chips">${s.chips.map((c) => `<span class="chip"><span class="dot"></span>${c}</span>`).join("")}</div>
    </div>`;
  const css = `
    .wtext{position:absolute;top:50%;transform:translateY(-50%);width:760px;${s.mirror ? "text-align:right" : ""}}
    .wtext .eyebrow{font-size:25px;margin-bottom:16px}
    .wtext .title{font-size:118px;margin-bottom:26px}
    .wtext .tagline{font-size:36px;margin-bottom:34px;max-width:640px;${s.mirror ? "margin-left:auto" : ""}}
    .chips{${s.mirror ? "justify-content:flex-end;" : ""}}
    .chip{font-size:26px;padding:15px 26px}
    .chip .dot{width:14px;height:14px}`;
  return shell(W, H, s.accent, body, css);
}

// ============================ PHONE 9:16 ============================
function buildPhone(s) {
  const W = 1080, H = 1920;
  const S = 980, scale = S / BOARD;
  const left = (W - S) / 2, top = 300;
  const card = `<div class="floor" style="left:${left + S * 0.05}px;top:${top + S - 26}px;width:${S * 0.9}px;height:80px"></div>
    <div class="card" style="left:${left}px;top:${top}px;width:${S}px;height:${S}px">${boardCard(s.yard, scale, s.pool, s.redCol)}</div>`;
  const body = `${sceneBg(s.accent)}${card}
    <div class="ptop">
      <p class="eyebrow">${s.eyebrow}</p>
      <h1 class="title">${s.title1} <span class="gold">${s.title2}</span></h1>
    </div>
    <div class="pbot">
      <p class="tagline">${s.tagline}</p>
      <div class="chips">${s.chips.map((c) => `<span class="chip"><span class="dot"></span>${c}</span>`).join("")}</div>
    </div>`;
  const css = `
    .ptop{position:absolute;top:84px;left:0;right:0;text-align:center}
    .ptop .eyebrow{font-size:27px;margin-bottom:14px}
    .ptop .title{font-size:96px}
    .pbot{position:absolute;left:60px;right:60px;bottom:120px;display:flex;flex-direction:column;align-items:center;gap:30px}
    .pbot .tagline{font-size:42px;text-align:center;font-weight:700;line-height:1.18}
    .chips{justify-content:center}
    .chip{font-size:30px;padding:18px 30px}
    .chip .dot{width:16px;height:16px}`;
  return shell(W, H, s.accent, body, css);
}

// ============================ COVER 800x470 ============================
function buildCover() {
  const W = 800, H = 470, accent = "#ffb86b";
  const S = 470, scale = S / BOARD;
  const left = W - S + 26, top = (H - S) / 2;
  const card = `<div class="card" style="left:${left}px;top:${top}px;width:${S}px;height:${S}px;transform:perspective(1400px) rotateY(-8deg) rotateX(3deg)">${boardCard("night_yard", scale, "b", 3, { coins: false })}</div>`;
  const body = `${sceneBg(accent)}${card}
    <div class="ctext">
      <p class="eyebrow">Головоломка-парковка</p>
      <h1 class="title">ПРОБКА<br><span class="gold">во дворе</span></h1>
      <p class="tagline">Выведи красную машину к выезду</p>
      <div class="chips"><span class="chip"><span class="dot"></span>300 уровней</span><span class="chip"><span class="dot"></span>3 режима</span></div>
    </div>`;
  const css = `
    .ctext{position:absolute;left:40px;top:50%;transform:translateY(-50%);width:430px}
    .ctext .eyebrow{font-size:15px;margin-bottom:10px}
    .ctext .title{font-size:62px;margin-bottom:14px}
    .ctext .tagline{font-size:21px;margin-bottom:18px}
    .chip{font-size:16px;padding:9px 16px}.chip .dot{width:10px;height:10px}`;
  return shell(W, H, accent, body, css);
}

// ============================ LOGO 512 ============================
function buildLogo() {
  const W = 512, H = 512, accent = "#ffb86b", yard = "night_yard";
  const scale = 760 / BOARD, S = BOARD * scale;
  const focusX = (GF.left + 5.0 * CELL) * scale;
  const focusY = (GF.top + (EXIT_ROW + 0.5) * CELL) * scale;
  const inner = boardCard(yard, scale, "c", 3, { coins: true });
  const body = `${sceneBg(accent)}
    <div class="logo-clip"><div class="logo-board" style="left:${W / 2 - focusX}px;top:${H / 2 - focusY}px;width:${S}px;height:${S}px">${inner}</div></div>
    <div class="logo-vig"></div><div class="logo-rim"></div>`;
  const css = `
    .logo-clip{position:absolute;inset:0;overflow:hidden}
    .logo-board{position:absolute}
    .logo-board .board{border-radius:0;box-shadow:none}
    .logo-board .board-rim{display:none}
    .logo-vig{position:absolute;inset:0;background:radial-gradient(92% 92% at 50% 42%,transparent 44%,rgba(4,7,12,.7) 100%)}
    .logo-rim{position:absolute;inset:0;box-shadow:inset 0 0 0 12px rgba(10,15,24,.0)}`;
  return shell(W, H, accent, body, css);
}

// ============================ SCENES ============================
const WEB = [
  { name: "web-1", yard: "quiet_yard", pool: "a", redCol: 2, accent: "#79b8ff", mirror: false,
    eyebrow: "Головоломка-парковка", title1: "ПРОБКА", title2: "во дворе",
    tagline: "Выведи красную машину к выезду", chips: ["300 уровней", "3 режима", "Без интернета"] },
  { name: "web-2", yard: "night_yard", pool: "b", redCol: 3, accent: "#ffb060", mirror: true,
    eyebrow: "Двигай машины — расчисти путь", title1: "Реши", title2: "пробку",
    tagline: "Сдвигай соседние машины и освободи выезд", chips: ["Уровень дня", "Режим на время", "Гараж скинов"] },
  { name: "web-3", yard: "business_center", pool: "c", redCol: 2, accent: "#7fb2ff", mirror: false,
    eyebrow: "Новый двор каждый раз", title1: "Десятки", title2: "дворов",
    tagline: "Зима, лес, ночь, бизнес-центр и не только", chips: ["10 дворов", "20+ машин", "Уютная атмосфера"] }
];
const PHONE = [
  { name: "phone-1", yard: "winter_yard", pool: "a", redCol: 2, accent: "#8fd4ff",
    eyebrow: "Головоломка-парковка", title1: "ПРОБКА", title2: "во дворе",
    tagline: "Выведи красную машину к выезду", chips: ["300 уровней", "3 режима"] },
  { name: "phone-2", yard: "forest_yard", pool: "b", redCol: 2, accent: "#9fc46a",
    eyebrow: "Двигай машины", title1: "Расчисти", title2: "путь",
    tagline: "Сдвигай соседей и освободи выезд", chips: ["Уровень дня", "Гараж скинов"] },
  { name: "phone-3", yard: "night_yard", pool: "c", redCol: 2, accent: "#ffb060",
    eyebrow: "Десятки дворов", title1: "Играй", title2: "везде",
    tagline: "Зима, лес, ночь и не только — без интернета", chips: ["Режим на время", "10 дворов"] }
];

// ============================ RENDER ============================
function capture(htmlPath, outPath, w, h) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const profile = path.join(OUT_DIR, `.chrome-${attempt}`);
    const res = spawnSync(CHROME, [
      "--headless=new", "--disable-gpu", "--disable-dev-shm-usage", "--hide-scrollbars",
      "--no-sandbox", "--no-first-run", "--no-default-browser-check",
      "--force-device-scale-factor=1", `--user-data-dir=${profile}`,
      `--window-size=${w},${h}`, `--screenshot=${outPath}`, "--virtual-time-budget=9000",
      fileUrl(htmlPath)
    ], { stdio: "inherit", timeout: 60000 });
    fs.rmSync(profile, { recursive: true, force: true });
    if (!res.error && res.status === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 5000) return;
    console.log(`  retry ${attempt} failed for ${path.basename(outPath)}`);
  }
  throw new Error("chrome failed for " + htmlPath);
}

const README = `# Промо-материалы «Пробка во дворе» (Яндекс Игры)

Оформленные промо-композиции в стиле «хороших примеров» из требований
(п. 5.1.1.2): крупный игровой герой, насыщенный тематический фон, заголовок,
плашки-фичи и игровые эффекты. Всё собрано ТОЛЬКО из ассетов самой игры —
реальные доски дворов (board.png), реальные спрайты машин и красная машина
игрока. Внешних образов нет (п. 5.1.1).

- logo-512.png 512×512 · cover-800x470.png 800×470
- web-1..3.png 1920×1080 (16:9): тихий двор, ночной двор, бизнес-центр
- phone-1..3.png 1080×1920 (9:16): зимний двор, лесная парковка, ночной двор

Пересобрать: \`node probka-game/tools/build-promo-assets.js\`
`;

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.readdirSync(OUT_DIR).forEach((f) => { if (/\.(png|html)$/i.test(f)) fs.unlinkSync(path.join(OUT_DIR, f)); });
  const jobs = [
    { name: "logo-512", w: 512, h: 512, html: buildLogo() },
    { name: "cover-800x470", w: 800, h: 470, html: buildCover() },
    ...WEB.map((s) => ({ name: s.name, w: 1920, h: 1080, html: buildWeb(s) })),
    ...PHONE.map((s) => ({ name: s.name, w: 1080, h: 1920, html: buildPhone(s) }))
  ];
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
