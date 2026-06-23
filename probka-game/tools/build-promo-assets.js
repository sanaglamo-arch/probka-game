#!/usr/bin/env node
/*
 * Yandex Games promo for «Пробка во дворе».
 * A feature carousel — every screenshot is its OWN detailed scene (mechanic,
 * many yards, garage of cars, modes, daily/rewards), not a repeated banner.
 * Built ONLY from real in-game art: board.png, real car sprites, real skins.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const GAME_DIR = path.resolve(__dirname, "..");
const OUT_DIR = path.resolve(__dirname, "../../releases/yandex-assets");
const CHROME = "/usr/bin/google-chrome";

const BOARD = 1024, GF = { left: 125, top: 125 }, CELL = 120, GRID = 6, EXIT_ROW = 2;
const fileUrl = (p) => "file://" + p.split(path.sep).join("/");
const yardBoard = (id) => fileUrl(path.join(GAME_DIR, "assets/yards", id, "board.png"));
const yardCar = (id, f) => fileUrl(path.join(GAME_DIR, "assets/yards", id, "traffic", f));
const skinUrl = (id) => fileUrl(path.join(GAME_DIR, "assets/skins/v3", id + ".png"));
const RED = skinUrl("classic_red");
const spriteFor = (yard, v) => yardCar(yard, `${v.len >= 3 ? "van-3" : "car-2"}-${v.axis === "v" ? "v" : "h"}.png`);

// ---------- collision-free packer (row 2 = clear exit lane) ----------
function packLayout(cands) {
  const occ = Array.from({ length: GRID }, () => Array(GRID).fill(false));
  for (let c = 0; c < GRID; c++) occ[EXIT_ROW][c] = true;
  const out = [];
  for (const v of cands) {
    const cells = []; let ok = true;
    for (let i = 0; i < v.len; i++) {
      const c = v.axis === "v" ? v.col : v.col + i;
      const r = v.axis === "v" ? v.row + i : v.row;
      if (c < 0 || c > 5 || r < 0 || r > 5 || occ[r][c]) { ok = false; break; }
      cells.push([r, c]);
    }
    if (!ok) continue;
    cells.forEach(([r, c]) => (occ[r][c] = true));
    out.push(v);
  }
  return out;
}
const POOLS = {
  a: [{ col: 0, row: 0, len: 3, axis: "v" }, { col: 1, row: 0, len: 2, axis: "h" }, { col: 3, row: 0, len: 3, axis: "h" }, { col: 4, row: 1, len: 2, axis: "v" }, { col: 1, row: 1, len: 2, axis: "h" }, { col: 0, row: 3, len: 2, axis: "v" }, { col: 1, row: 3, len: 3, axis: "h" }, { col: 4, row: 3, len: 2, axis: "v" }, { col: 5, row: 3, len: 2, axis: "v" }, { col: 0, row: 5, len: 3, axis: "h" }, { col: 3, row: 5, len: 2, axis: "h" }, { col: 5, row: 0, len: 2, axis: "v" }],
  b: [{ col: 1, row: 0, len: 2, axis: "v" }, { col: 2, row: 0, len: 3, axis: "h" }, { col: 5, row: 0, len: 3, axis: "v" }, { col: 0, row: 1, len: 2, axis: "h" }, { col: 0, row: 3, len: 3, axis: "h" }, { col: 3, row: 3, len: 2, axis: "v" }, { col: 4, row: 4, len: 2, axis: "h" }, { col: 0, row: 4, len: 2, axis: "v" }, { col: 1, row: 5, len: 2, axis: "h" }, { col: 3, row: 5, len: 3, axis: "h" }],
  c: [{ col: 0, row: 0, len: 2, axis: "h" }, { col: 2, row: 0, len: 2, axis: "v" }, { col: 3, row: 0, len: 2, axis: "h" }, { col: 5, row: 0, len: 2, axis: "v" }, { col: 0, row: 1, len: 2, axis: "v" }, { col: 4, row: 1, len: 2, axis: "v" }, { col: 1, row: 3, len: 2, axis: "h" }, { col: 3, row: 3, len: 3, axis: "h" }, { col: 0, row: 3, len: 2, axis: "v" }, { col: 5, row: 3, len: 2, axis: "v" }, { col: 0, row: 5, len: 2, axis: "h" }, { col: 2, row: 5, len: 3, axis: "h" }]
};

const localBox = (v, s) => ({ x: (GF.left + v.col * CELL) * s, y: (GF.top + v.row * CELL) * s, w: (v.axis === "v" ? 1 : v.len) * CELL * s, h: (v.axis === "v" ? v.len : 1) * CELL * s });

// ---------- board renderer (real board + real cars + red hero + FX) ----------
function boardInner(yard, scale, o = {}) {
  const pool = o.pool || "a", redCol = o.redCol == null ? 2 : o.redCol;
  const S = BOARD * scale, cell = CELL * scale;
  let html = `<img class="board" src="${yardBoard(yard)}" style="width:${S}px;height:${S}px"><div class="board-rim"></div>`;
  html += packLayout(POOLS[pool]).map((v) => { const b = localBox(v, scale); return `<img class="veh" src="${spriteFor(yard, v)}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;transform:scale(1.12)">`; }).join("");

  const heroAt = (col, op = 1, z = 5, cls = "hero") => {
    const hb = localBox({ col, row: EXIT_ROW, len: 2, axis: "h" }, scale), boost = 1.18;
    const w = hb.h * boost, h = hb.w * boost, cx = hb.x + hb.w / 2, cy = hb.y + hb.h / 2;
    return `<img class="${cls}" src="${o.redSkin || RED}" style="left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;transform:rotate(90deg);opacity:${op};z-index:${z}">`;
  };
  if (o.trail) html += heroAt(redCol - 1.1, 0.16, 3, "hero ghost") + heroAt(redCol - 0.55, 0.28, 4, "hero ghost");

  const ex = (GF.left + GRID * CELL) * scale, ey = (GF.top + EXIT_ROW * CELL) * scale;
  const rcx = localBox({ col: redCol, row: EXIT_ROW, len: 2, axis: "h" }, scale).x + cell;
  if (o.beam !== false) html += `<div class="beam" style="left:${rcx}px;top:${ey + cell * 0.2}px;height:${cell * 0.6}px;width:${ex - rcx + cell * 1.7}px"></div>`;
  html += heroAt(o.heroCol == null ? redCol : o.heroCol, 1, 7);
  if (o.swipe) {
    const sx = rcx - cell * 0.4, sy = ey + cell * 0.5;
    html += `<div class="swipe" style="left:${sx}px;top:${sy - cell * 0.42}px;width:${cell * 2.1}px;height:${cell * 0.84}px">
      <svg viewBox="0 0 210 84"><circle cx="34" cy="42" r="26" fill="rgba(255,255,255,.18)" stroke="#fff" stroke-width="5"/><circle cx="34" cy="42" r="11" fill="#fff"/>
      <path d="M64 42 H168" stroke="#fff" stroke-width="13" stroke-linecap="round"/><path d="M150 22 L182 42 L150 62" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
  }
  if (o.chevron !== false) html += `<div class="chev" style="left:${ex - cell * 0.05}px;top:${ey}px;width:${cell * 1.5}px;height:${cell}px"><svg viewBox="0 0 120 80"><g fill="none" stroke="#86f0bb" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16 L44 40 L14 64"/><path d="M50 16 L80 40 L50 64"/></g></svg></div>`;
  if (o.coins) html += [[ex + cell * .5, ey - cell * .15, 1], [ex + cell * .95, ey + cell * .6, .8], [ex + cell * .2, ey + cell * .95, .6]].map(([x, y, s]) => `<div class="coin" style="left:${x}px;top:${y}px;width:${cell * .34 * s}px;height:${cell * .34 * s}px"></div>`).join("");
  return html;
}

// ---------- shared chrome ----------
const FONT = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">`;
const bg = (accent) => `<div class="bg-base"></div><div class="bg-glow" style="--accent:${accent}"></div><div class="bg-rays"></div><div class="bg-grid"></div><div class="bg-bokeh"></div>`;

function baseCss() {
  return `
*{margin:0;padding:0;box-sizing:border-box}
html,body{overflow:hidden;background:#070a12;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.frame{position:relative;overflow:hidden}
.bg-base{position:absolute;inset:0;background:linear-gradient(155deg,#101a2b 0%,#0b1220 52%,#070a12 100%)}
.bg-glow{position:absolute;inset:0;background:radial-gradient(60% 55% at 50% 36%,color-mix(in srgb,var(--accent) 40%,transparent) 0%,transparent 60%),radial-gradient(48% 50% at 18% 82%,color-mix(in srgb,var(--accent) 20%,transparent) 0%,transparent 60%)}
.bg-rays{position:absolute;inset:-20%;background:repeating-conic-gradient(from 200deg at 50% 30%,rgba(255,255,255,.045) 0deg 4deg,transparent 4deg 13deg);mix-blend-mode:screen;opacity:.45}
.bg-grid{position:absolute;inset:0;opacity:.09;background-image:linear-gradient(rgba(157,184,224,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(157,184,224,.6) 1px,transparent 1px);background-size:64px 64px;-webkit-mask-image:radial-gradient(82% 82% at 50% 45%,#000 30%,transparent 80%)}
.bg-bokeh{position:absolute;inset:0;background:radial-gradient(circle at 12% 22%,rgba(255,211,92,.5) 0,transparent 5px),radial-gradient(circle at 86% 70%,rgba(134,240,187,.45) 0,transparent 6px),radial-gradient(circle at 64% 12%,rgba(255,255,255,.35) 0,transparent 4px),radial-gradient(circle at 30% 86%,rgba(120,173,255,.4) 0,transparent 5px);filter:blur(.5px);opacity:.8}
.card{position:absolute}
.board{position:absolute;inset:0;border-radius:30px;box-shadow:0 46px 120px rgba(0,0,0,.62),0 12px 40px rgba(0,0,0,.5)}
.board-rim{position:absolute;inset:0;border-radius:30px;box-shadow:inset 0 0 0 2px rgba(255,211,92,.32),inset 0 0 70px rgba(0,0,0,.42);pointer-events:none}
.veh{position:absolute;object-fit:contain;filter:drop-shadow(0 10px 12px rgba(0,0,0,.5))}
.hero{position:absolute;object-fit:contain;filter:drop-shadow(0 12px 16px rgba(0,0,0,.55)) drop-shadow(0 0 26px rgba(255,72,92,.6))}
.ghost{filter:none}
.beam{position:absolute;z-index:4;border-radius:999px;background:linear-gradient(90deg,rgba(134,240,187,0),rgba(134,240,187,.5) 30%,rgba(180,255,214,.85));filter:blur(7px);opacity:.85}
.swipe{position:absolute;z-index:8;filter:drop-shadow(0 4px 10px rgba(0,0,0,.5))}.swipe svg{width:100%;height:100%}
.chev{position:absolute;z-index:6;display:grid;place-items:center;filter:drop-shadow(0 0 20px rgba(134,240,187,.95))}.chev svg{width:100%;height:100%}
.coin{position:absolute;z-index:6;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#ffc83d 60%,#e69a18);box-shadow:0 0 16px rgba(255,200,61,.8),inset 0 -2px 4px rgba(150,90,0,.5)}
.floor{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.5),transparent);filter:blur(8px)}
.eyebrow{font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#ffd35c}
.head{font-weight:900;line-height:.96;color:#fff;text-shadow:0 8px 34px rgba(0,0,0,.6)}
.head .g{background:linear-gradient(180deg,#ffe89a,#ffce5a 55%,#f5a623);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{color:#c8d6ea;font-weight:600}
.capband{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(0deg,rgba(6,9,16,.94) 8%,rgba(6,9,16,.55) 55%,transparent)}
.topband{position:absolute;left:0;right:0;top:0;background:linear-gradient(180deg,rgba(6,9,16,.92) 6%,rgba(6,9,16,.45) 55%,transparent)}`;
}
function shell(w, h, css, body) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${baseCss()}
html,body{width:${w}px;height:${h}px}.frame{width:${w}px;height:${h}px}${css}</style></head><body><div class="frame">${body}</div></body></html>`;
}

// ============================================================
// WEB-1 — core mechanic (big board, swipe hint, motion, exit)
// ============================================================
function W1() {
  const W = 1920, H = 1080, accent = "#79b8ff";
  const S = 960, scale = S / BOARD, left = (W - S) / 2 + 30, top = 24;
  const body = `${bg(accent)}
    <div class="card" style="left:${left}px;top:${top}px;width:${S}px;height:${S}px">${boardInner("quiet_yard", scale, { pool: "a", redCol: 2, trail: true, swipe: true, coins: true })}</div>
    <div class="capband" style="height:300px"></div>
    <div class="t">
      <p class="eyebrow">Как играть</p>
      <h1 class="head">Сдвигай машины — <span class="g">выводи красную</span> к выезду</h1>
    </div>`;
  const css = `.t{position:absolute;left:70px;right:70px;bottom:54px}.t .eyebrow{font-size:26px;margin-bottom:14px}.t .head{font-size:74px;max-width:1500px}`;
  return shell(W, H, css, body);
}

// ============================================================
// WEB-2 — many yards (postcard collage of real boards)
// ============================================================
function W2() {
  const W = 1920, H = 1080, accent = "#8a7bff";
  const mini = (yard, pool, redCol, x, y, s, rot, z) => {
    const sc = s / BOARD;
    return `<div class="mini" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;transform:rotate(${rot}deg);z-index:${z}">${boardInner(yard, sc, { pool, redCol, coins: false, beam: false, swipe: false })}</div>`;
  };
  const body = `${bg(accent)}
    ${mini("winter_yard", "a", 2, markX(980), 64, 470, -7, 2)}
    ${mini("forest_yard", "b", 2, 1430, 150, 470, 7, 1)}
    ${mini("night_yard", "c", 2, 905, 540, 470, -5, 3)}
    ${mini("business_center", "a", 3, 1380, 575, 470, 6, 2)}
    <div class="t">
      <p class="eyebrow">Десятки дворов</p>
      <h1 class="head">Каждый двор —<br><span class="g">как настоящий</span></h1>
      <p class="sub">Зима, лес, ночной город, бизнес-центр, подземный паркинг и ещё больше.</p>
    </div>`;
  const css = `.mini{position:absolute}.mini .board{border-radius:26px}.mini .board-rim{border-radius:26px}
    .t{position:absolute;left:80px;top:140px;width:760px}.t .eyebrow{font-size:25px;margin-bottom:16px}.t .head{font-size:86px;margin-bottom:26px}.t .sub{font-size:30px;line-height:1.4;max-width:600px}`;
  return shell(W, H, css, body);
}
function markX(x) { return x; }

// ============================================================
// WEB-3 — garage (showroom lineup of real car skins)
// ============================================================
function W3() {
  const W = 1920, H = 1080, accent = "#ffc24d";
  const cars = [
    { id: "yard_police", x: 150, s: .9 }, { id: "taxi_yellow", x: 440, s: .96 },
    { id: "classic_red", x: 740, s: 1.12 }, { id: "fire_lane", x: 1075, s: .96 },
    { id: "gold_yard", x: 1370, s: .9 }, { id: "night_blue", x: 1650, s: .84 }
  ];
  const baseW = 250, cy = 600;
  const lineup = cars.map((c, i) => {
    const w = baseW * c.s, h = w * 2;
    const x = c.x, y = cy - h / 2;
    return `<div class="spot" style="left:${x - w * .12}px;top:${y + h - 30}px;width:${w * 1.24}px;height:${w * .5}px"></div>
      <img class="gcar refl" src="${skinUrl(c.id)}" style="left:${x}px;top:${y + h - 18}px;width:${w}px;height:${h}px;z-index:${i}">
      <img class="gcar" src="${skinUrl(c.id)}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${20 + Math.round(c.s * 10)}">`;
  }).join("");
  const body = `${bg(accent)}<div class="showfloor"></div>${lineup}
    <div class="topband" style="height:300px"></div>
    <div class="t">
      <p class="eyebrow">Гараж</p>
      <h1 class="head">Открывай <span class="g">десятки машин</span></h1>
      <p class="sub">Полиция, такси, пожарная, ретро-Волга, неон и золотая легенда.</p>
    </div>`;
  const css = `.showfloor{position:absolute;left:0;right:0;bottom:0;height:46%;background:linear-gradient(0deg,#0a1018 0%,rgba(10,16,24,.2) 100%);box-shadow:inset 0 2px 40px rgba(0,0,0,.5)}
    .gcar{position:absolute;object-fit:contain;filter:drop-shadow(0 22px 26px rgba(0,0,0,.6))}
    .gcar.refl{transform:scaleY(-1);opacity:.18;filter:blur(3px)}
    .spot{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(255,194,77,.4),transparent);filter:blur(10px);z-index:1}
    .t{position:absolute;left:0;right:0;top:54px;text-align:center}.t .eyebrow{font-size:24px;margin-bottom:14px}.t .head{font-size:84px;margin-bottom:18px}.t .sub{font-size:30px}`;
  return shell(W, H, css, body);
}

// ============================================================
// PHONE-1 — core mechanic (portrait gameplay + swipe)
// ============================================================
function P1() {
  const W = 1080, H = 1920, accent = "#8fd4ff";
  const S = 1000, scale = S / BOARD, left = (W - S) / 2, top = 470;
  const body = `${bg(accent)}
    <div class="topband" style="height:430px"></div>
    <div class="t">
      <p class="eyebrow">Как играть</p>
      <h1 class="head">Двигай машины —<br><span class="g">освободи выезд</span></h1>
    </div>
    <div class="card" style="left:${left}px;top:${top}px;width:${S}px;height:${S}px">${boardInner("quiet_yard", scale, { pool: "a", redCol: 2, trail: true, swipe: true, coins: true })}</div>
    <p class="hint">Красная машина выезжает, когда путь свободен</p>`;
  const css = `.t{position:absolute;left:60px;right:60px;top:96px;text-align:center}.t .eyebrow{font-size:30px;margin-bottom:18px}.t .head{font-size:104px}
    .hint{position:absolute;left:60px;right:60px;bottom:120px;text-align:center;color:#c8d6ea;font-size:40px;font-weight:600;line-height:1.3}`;
  return shell(W, H, css, body);
}

// ============================================================
// PHONE-2 — three modes (3 stacked gameplay panels w/ badges)
// ============================================================
function P2() {
  const W = 1080, H = 1920, accent = "#ff9d5c";
  const S = 430, scale = S / BOARD, x = 70;
  const rows = [
    { yard: "quiet_yard", pool: "a", redCol: 2, icon: stepsIcon(), name: "На ходы", desc: "Уложись в лимит ходов" },
    { yard: "night_yard", pool: "c", redCol: 2, icon: clockIcon(), name: "На время", desc: "Успей до конца таймера" },
    { yard: "forest_yard", pool: "b", redCol: 2, icon: infIcon(), name: "Свободно", desc: "Решай без ограничений" }
  ];
  const panels = rows.map((r, i) => {
    const top = 300 + i * 500;
    return `<div class="card pcard" style="left:${x}px;top:${top}px;width:${S}px;height:${S}px">${boardInner(r.yard, scale, { pool: r.pool, redCol: r.redCol, coins: false })}</div>
      <div class="mode" style="top:${top + 40}px"><div class="mi">${r.icon}</div><div class="mt"><strong>${r.name}</strong><span>${r.desc}</span></div></div>`;
  }).join("");
  const body = `${bg(accent)}<div class="t"><p class="eyebrow">Три режима</p><h1 class="head">Играй <span class="g">как хочешь</span></h1></div>${panels}`;
  const css = `.t{position:absolute;left:0;right:0;top:96px;text-align:center}.t .eyebrow{font-size:30px;margin-bottom:16px}.t .head{font-size:92px}
    .pcard .board{border-radius:26px}.pcard .board-rim{border-radius:26px}
    .mode{position:absolute;left:${x + S + 44}px;right:64px;display:flex;align-items:center;gap:26px}
    .mode .mi{flex:none;width:104px;height:104px;display:grid;place-items:center;border-radius:26px;background:rgba(16,24,38,.8);border:1px solid rgba(255,211,92,.4);box-shadow:0 10px 26px rgba(0,0,0,.4)}
    .mode .mi svg{width:56px;height:56px}
    .mode .mt strong{display:block;color:#fff;font-size:50px;font-weight:900;line-height:1}
    .mode .mt span{display:block;color:#c8d6ea;font-size:31px;font-weight:600;margin-top:10px}`;
  return shell(W, H, css, body);
}
function stepsIcon() { return `<svg viewBox="0 0 64 64" fill="none" stroke="#ffd35c" stroke-width="6" stroke-linecap="round"><path d="M10 50 H22 V38 H34 V26 H46 V14 H56"/></svg>`; }
function clockIcon() { return `<svg viewBox="0 0 64 64" fill="none" stroke="#ffd35c" stroke-width="6"><circle cx="32" cy="34" r="22"/><path d="M32 22 V34 L42 40" stroke-linecap="round"/><path d="M24 8 H40" stroke-linecap="round"/></svg>`; }
function infIcon() { return `<svg viewBox="0 0 64 64" fill="none" stroke="#ffd35c" stroke-width="6"><path d="M20 32c0-7 12-7 12 0s12 7 12 0-12-7-12 0-12 7-12 0z"/></svg>`; }

// ============================================================
// PHONE-3 — daily + reward (streak calendar + win burst)
// ============================================================
function P3() {
  const W = 1080, H = 1920, accent = "#ffcf5b";
  const S = 920, scale = S / BOARD, left = (W - S) / 2, top = 620;
  // win burst: coins + confetti radiating from the exit area
  const cxp = left + S * 0.9, cyp = top + S * 0.42;
  const confetti = Array.from({ length: 26 }, (_, i) => {
    const a = (i * 47 % 360) * Math.PI / 180, d = 120 + (i * 53 % 300);
    const x = cxp + Math.cos(a) * d, y = cyp + Math.sin(a) * d * 0.8;
    const cols = ["#ffd35c", "#ff6b78", "#86f0bb", "#79b8ff", "#fff"];
    return `<div class="conf" style="left:${x}px;top:${y}px;background:${cols[i % 5]};transform:rotate(${i * 37}deg)"></div>`;
  }).join("");
  const days = Array.from({ length: 7 }, (_, i) => `<div class="day ${i < 5 ? "on" : ""}">${i < 5 ? "✓" : i + 1}</div>`).join("");
  const body = `${bg(accent)}
    <div class="t">
      <p class="eyebrow">Уровень дня</p>
      <h1 class="head">Новый уровень <span class="g">каждый день</span></h1>
      <div class="streak"><div class="flame">🔥</div><div class="days">${days}</div></div>
    </div>
    ${confetti}
    <div class="card" style="left:${left}px;top:${top}px;width:${S}px;height:${S}px">${boardInner("night_yard", scale, { pool: "b", redCol: 3, heroCol: 4.3, coins: true })}</div>
    <p class="hint">Заходи каждый день и держи серию побед</p>`;
  const css = `.t{position:absolute;left:60px;right:60px;top:90px;text-align:center}.t .eyebrow{font-size:30px;margin-bottom:16px}.t .head{font-size:88px;margin-bottom:34px}
    .streak{display:flex;align-items:center;justify-content:center;gap:18px}
    .flame{font-size:64px;filter:drop-shadow(0 0 18px rgba(255,140,40,.8))}
    .days{display:flex;gap:12px}
    .day{width:74px;height:74px;border-radius:20px;display:grid;place-items:center;font-size:36px;font-weight:900;color:#8aa0bd;background:rgba(16,24,38,.7);border:1px solid rgba(255,255,255,.1)}
    .day.on{color:#0c1320;background:linear-gradient(135deg,#ffe89a,#f5a623);border-color:transparent;box-shadow:0 0 18px rgba(255,200,61,.6)}
    .conf{position:absolute;z-index:6;width:18px;height:30px;border-radius:4px;box-shadow:0 0 8px rgba(0,0,0,.3)}
    .hint{position:absolute;left:60px;right:60px;bottom:96px;text-align:center;color:#c8d6ea;font-size:38px;font-weight:600}`;
  return shell(W, H, css, body);
}

// ============================================================
// Brand key-art (logo + cover): glossy red hero car bursting through a
// glowing green EXIT, vivid gradient, perspective grid floor, light & gloss.
// ============================================================
const NIGHT_BLUE = skinUrl("night_blue"), TAXI = skinUrl("taxi_yellow");
const BRAND_CSS = `
.vbg{position:absolute;inset:0;background:radial-gradient(125% 120% at 26% 16%,#2f6ea4 0%,#1a4569 42%,#0b1f33 100%)}
.vglow{position:absolute;inset:0;background:radial-gradient(40% 44% at var(--ex,72%) var(--ey,28%),rgba(110,245,175,.6),transparent 62%);mix-blend-mode:screen}
.vrays{position:absolute;inset:-25%;background:repeating-conic-gradient(from 150deg at var(--ex,72%) var(--ey,28%),rgba(255,255,255,.07) 0deg 3deg,transparent 3deg 12deg);mix-blend-mode:screen;opacity:.5}
.gridwrap{position:absolute;left:-25%;right:-25%;bottom:-8%;height:62%;perspective:480px;perspective-origin:center top}
.grid3d{position:absolute;inset:0;transform:rotateX(64deg);transform-origin:bottom center;background-image:linear-gradient(rgba(255,211,92,.5) 2px,transparent 2px),linear-gradient(90deg,rgba(255,211,92,.32) 2px,transparent 2px);background-size:62px 62px;-webkit-mask-image:linear-gradient(to top,#000 2%,transparent 78%);mask-image:linear-gradient(to top,#000 2%,transparent 78%);opacity:.55}
.vbokeh{position:absolute;inset:0;background:radial-gradient(circle at 16% 26%,rgba(255,211,92,.55) 0,transparent 5px),radial-gradient(circle at 82% 64%,rgba(134,240,187,.5) 0,transparent 6px),radial-gradient(circle at 60% 14%,rgba(255,255,255,.4) 0,transparent 4px);opacity:.85}
.sheen{position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.18),transparent 26%);pointer-events:none}
.vig{position:absolute;inset:0;background:radial-gradient(96% 96% at 50% 44%,transparent 52%,rgba(3,8,14,.6) 100%);pointer-events:none}
.exit-glow{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(95,245,175,.85),transparent);filter:blur(8px)}
.exit-sign{position:absolute;display:grid;place-items:center;border-radius:24px;background:linear-gradient(155deg,#49e89a,#13a45f);box-shadow:0 0 44px rgba(80,240,160,.9),inset 0 3px 0 rgba(255,255,255,.45),inset 0 -6px 14px rgba(0,80,40,.4),0 20px 34px rgba(0,0,0,.45)}
.exit-sign svg{width:62%;height:62%}
.streak{position:absolute;border-radius:999px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.65));filter:blur(2.5px);transform-origin:left center}
.hero-wrap{position:absolute}
.hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 20px 24px rgba(0,0,0,.6)) drop-shadow(0 0 34px rgba(255,68,88,.72))}
.hero-gloss{position:absolute;inset:0;background:linear-gradient(122deg,rgba(255,255,255,0) 32%,rgba(255,255,255,.82) 47%,rgba(255,255,255,0) 58%);-webkit-mask:var(--m) center/contain no-repeat;mask:var(--m) center/contain no-repeat;mix-blend-mode:screen;opacity:.95}
.blocker{position:absolute;object-fit:contain;filter:brightness(.78) drop-shadow(0 14px 18px rgba(0,0,0,.5))}
.scoin{position:absolute;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#ffc83d 60%,#e69a18);box-shadow:0 0 16px rgba(255,200,61,.85),inset 0 -2px 4px rgba(150,90,0,.5)}
.bt{font-weight:900;line-height:.9;color:#fff;text-shadow:0 6px 30px rgba(0,0,0,.65)}
.bt .g{background:linear-gradient(180deg,#ffe79a,#ffce5a 55%,#f5a623);-webkit-background-clip:text;background-clip:text;color:transparent}
.beye{font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#ffd35c}
.btag{color:#d7e6f6;font-weight:600}`;

const heroCar = (w, h, left, top, rot, skin = RED) =>
  `<div class="hero-wrap" style="left:${left}px;top:${top}px;width:${w}px;height:${h}px;transform:rotate(${rot}deg)">
     <img class="hero-img" src="${skin}"><div class="hero-gloss" style="--m:url('${skin}')"></div></div>`;
const exitSign = (left, top, size) =>
  `<div class="exit-glow" style="left:${left - size * .35}px;top:${top - size * .35}px;width:${size * 1.7}px;height:${size * 1.7}px"></div>
   <div class="exit-sign" style="left:${left}px;top:${top}px;width:${size}px;height:${size}px">
     <svg viewBox="0 0 100 100"><path d="M20 50 H64" stroke="#fff" stroke-width="13" stroke-linecap="round"/><path d="M50 27 L78 50 L50 73" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
const streaks = (x, y, n, len, rot, gap) => Array.from({ length: n }, (_, i) =>
  `<div class="streak" style="left:${x}px;top:${y + i * gap}px;width:${len - i % 2 * len * .3}px;height:${Math.max(5, len * .03)}px;transform:rotate(${rot}deg)"></div>`).join("");
const sparkCoins = (pts) => pts.map(([x, y, s]) => `<div class="scoin" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px"></div>`).join("");

// ---------------- COVER 800x470 ----------------
function cover() {
  const W = 800, H = 470;
  const body = `<div class="vbg"></div><div class="vglow" style="--ex:80%;--ey:24%"></div><div class="vrays" style="--ex:80%;--ey:24%"></div>
    <div class="gridwrap"><div class="grid3d"></div></div><div class="vbokeh"></div>
    <img class="blocker" src="${NIGHT_BLUE}" style="left:556px;top:300px;width:120px;height:240px;transform:rotate(-12deg)">
    <img class="blocker" src="${TAXI}" style="left:690px;top:248px;width:112px;height:224px;transform:rotate(16deg)">
    ${streaks(372, 250, 4, 150, 31, 26)}
    ${exitSign(636, 64, 118)}
    ${heroCar(214, 428, 430, 66, 31)}
    ${sparkCoins([[620, 196, 26], [690, 150, 18], [600, 250, 14]])}
    <div class="scrim"></div>
    <div class="t"><p class="beye">Головоломка-парковка</p><h1 class="bt">ПРОБКА<br><span class="g">во дворе</span></h1><p class="btag">Выведи красную машину к выезду</p></div>
    <div class="sheen"></div>`;
  const css = BRAND_CSS + `
    .scrim{position:absolute;inset:0;background:linear-gradient(90deg,#08182a 26%,rgba(8,24,42,.55) 44%,transparent 60%);pointer-events:none}
    .t{position:absolute;left:42px;top:50%;transform:translateY(-50%);width:360px;z-index:5}
    .t .beye{font-size:15px;margin-bottom:11px}.t .bt{font-size:70px;margin-bottom:16px}.t .btag{font-size:22px;line-height:1.25}`;
  return shell(W, H, css, body);
}

// ---------------- LOGO / ICON 512 ----------------
function logo() {
  const W = 512, H = 512;
  const body = `<div class="vbg"></div><div class="vglow" style="--ex:70%;--ey:26%"></div><div class="vrays" style="--ex:70%;--ey:26%"></div>
    <div class="gridwrap"><div class="grid3d"></div></div><div class="vbokeh"></div>
    <img class="blocker" src="${NIGHT_BLUE}" style="left:-34px;top:296px;width:158px;height:316px;transform:rotate(-13deg)">
    <img class="blocker" src="${TAXI}" style="left:392px;top:330px;width:150px;height:300px;transform:rotate(17deg)">
    ${streaks(96, 372, 4, 168, 28, 30)}
    ${exitSign(330, 116, 150)}
    ${heroCar(226, 452, 150, 110, 28)}
    ${sparkCoins([[300, 250, 30], [380, 210, 20], [286, 196, 15]])}
    <div class="sheen"></div><div class="vig"></div>`;
  return shell(W, H, BRAND_CSS, body);
}

// ============================================================ render
function capture(htmlPath, outPath, w, h) {
  for (let a = 1; a <= 3; a++) {
    const profile = path.join(OUT_DIR, `.chrome-${a}`);
    const res = spawnSync(CHROME, ["--headless=new", "--disable-gpu", "--disable-dev-shm-usage", "--hide-scrollbars", "--no-sandbox", "--no-first-run", "--no-default-browser-check", "--force-device-scale-factor=1", `--user-data-dir=${profile}`, `--window-size=${w},${h}`, `--screenshot=${outPath}`, "--virtual-time-budget=9000", fileUrl(htmlPath)], { stdio: "inherit", timeout: 60000 });
    fs.rmSync(profile, { recursive: true, force: true });
    if (!res.error && res.status === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 5000) return;
    console.log(`  retry ${a} for ${path.basename(outPath)}`);
  }
  throw new Error("chrome failed " + htmlPath);
}

const README = `# Промо-материалы «Пробка во дворе» (Яндекс Игры)

Карусель-тур по игре: каждый скриншот — отдельная фича с собственной
композицией (механика, дворы, гараж машин, режимы, уровень дня), а не
повтор обложки. Без плашек-кнопок. Всё из реальных ассетов игры
(board.png, спрайты машин, скины) — внешних образов нет (п. 5.1.1).

- logo-512.png 512×512 · cover-800x470.png 800×470
- web-1 механика · web-2 десятки дворов · web-3 гараж машин (1920×1080, 16:9)
- phone-1 механика · phone-2 три режима · phone-3 уровень дня (1080×1920, 9:16)

Пересобрать: \`node probka-game/tools/build-promo-assets.js\`
`;

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.readdirSync(OUT_DIR).forEach((f) => { if (/\.(png|html)$/i.test(f)) fs.unlinkSync(path.join(OUT_DIR, f)); });
  const jobs = [
    { name: "logo-512", w: 512, h: 512, html: logo() },
    { name: "cover-800x470", w: 800, h: 470, html: cover() },
    { name: "web-1", w: 1920, h: 1080, html: W1() },
    { name: "web-2", w: 1920, h: 1080, html: W2() },
    { name: "web-3", w: 1920, h: 1080, html: W3() },
    { name: "phone-1", w: 1080, h: 1920, html: P1() },
    { name: "phone-2", w: 1080, h: 1920, html: P2() },
    { name: "phone-3", w: 1080, h: 1920, html: P3() }
  ];
  jobs.forEach((j) => {
    const p = path.join(OUT_DIR, `_${j.name}.html`);
    fs.writeFileSync(p, j.html);
    capture(p, path.join(OUT_DIR, `${j.name}.png`), j.w, j.h);
    fs.unlinkSync(p);
    console.log("rendered", j.name);
  });
  fs.writeFileSync(path.join(OUT_DIR, "README.md"), README);
  console.log("done ->", OUT_DIR);
}
main();
