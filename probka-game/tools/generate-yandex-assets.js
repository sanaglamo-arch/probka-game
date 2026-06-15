#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const workspace = path.resolve(__dirname, "../..");
const outDir = path.join(workspace, "releases", "yandex-assets");
const chromePath =
  process.env.PROBKA_CHROME ||
  process.env.PROBKA_SMOKE_CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chromeExtraFlags = (process.env.PROBKA_CHROME_FLAGS || "").split(/\s+/).filter(Boolean);
const baseUrl = process.argv[2] || "http://127.0.0.1:5174";

const pages = [
  {
    name: "icon-512",
    width: 512,
    height: 512,
    html: makeIconHtml()
  },
  {
    name: "cover-800x470",
    width: 800,
    height: 470,
    html: makeCoverHtml()
  }
];

// Скриншоты — полнокадровый портретный геймплей без промо-обёртки:
// 100% игрового UI, русский язык, без внешних элементов (требования 5.1.1 / 5.1.1.2 / 8.2.3).
// Требование площадки: портрет строго 9:16, длинная сторона 1280–2560 px.
// CSS 450x800 (=9:16) × DPR 3 = 1350x2400 — точная пропорция и чёткость.
const SHOT_CSS_WIDTH = 450;
const SHOT_CSS_HEIGHT = 800;
const SHOT_SCALE = 3;
// capture=mobile прячет брендовый топбар → геймплей-экран (HUD+доска+кнопки)
// занимает ≥70% кадра (требование Яндекса 5.1.1.2).
const shotUrl = (params) => `${baseUrl}/probka-game/index.html?showcase=1&capture=mobile&skin=classic_red&${params}`;
const screenshots = [
  { name: "screen1-night", url: shotUrl("mode=moves&level=24&yard=night_yard") },
  { name: "screen2-neon", url: shotUrl("mode=moves&level=58&yard=neon_yard") },
  { name: "screen3-winter", url: shotUrl("mode=timed&level=41&yard=winter_yard") },
  { name: "screen4-holiday", url: shotUrl("mode=free&level=33&yard=holiday_yard") },
  { name: "screen5-forest", url: shotUrl("mode=moves&level=15&yard=forest_yard") },
  { name: "screen6-rainy", url: shotUrl("mode=timed&level=66&yard=rainy_yard") }
].map((shot) => ({ ...shot, width: SHOT_CSS_WIDTH, height: SHOT_CSS_HEIGHT, scale: SHOT_SCALE }));

main();

function main() {
  if (!fs.existsSync(chromePath)) throw new Error(`Chrome not found: ${chromePath}`);
  fs.mkdirSync(outDir, { recursive: true });
  cleanOldScreenshotFiles();

  pages.forEach((page) => {
    const htmlPath = path.join(outDir, `${page.name}.html`);
    const pngPath = path.join(outDir, `${page.name}.png`);
    fs.writeFileSync(htmlPath, page.html);
    capture(`file://${htmlPath}`, pngPath, page.width, page.height);
  });

  screenshots.forEach((shot) => {
    capture(shot.url, path.join(outDir, `${shot.name}.png`), shot.width, shot.height, 2600, shot.scale || 1);
  });

  fs.writeFileSync(path.join(outDir, "README.md"), makeReadme());
  console.log(`Yandex assets written to ${outDir}`);
}

function cleanOldScreenshotFiles() {
  fs.readdirSync(outDir).forEach((file) => {
    if (/^(screenshot-|desktop\d+|mobile\d+|screen\d+).*\.png$/i.test(file)) {
      fs.unlinkSync(path.join(outDir, file));
    }
  });
}

function capture(url, outputPath, width, height, virtualTime = 600, scale = 1) {
  const result = spawnSync(chromePath, [
    ...chromeExtraFlags,
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-extensions",
    "--disable-sync",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--window-size=${width},${height}`,
    `--force-device-scale-factor=${scale}`,
    `--screenshot=${outputPath}`,
    `--virtual-time-budget=${virtualTime}`,
    url
  ], { stdio: "inherit", timeout: 30000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Chrome screenshot failed for ${url}`);
}

// Новый концепт «Побег героя»: одна крупная красная машина в динамике
// вырывается к светящемуся выезду со скоростными штрихами.
function makeIconHtml() {
  return htmlShell(512, 512, `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512">
          <stop stop-color="#243a59"/>
          <stop offset="0.55" stop-color="#111d2e"/>
          <stop offset="1" stop-color="#070a10"/>
        </linearGradient>
        <radialGradient id="vign" cx="50%" cy="46%" r="74%">
          <stop offset="0.52" stop-color="#000000" stop-opacity="0"/>
          <stop offset="1" stop-color="#000000" stop-opacity="0.5"/>
        </radialGradient>
        ${carArtDefs()}
      </defs>
      <rect width="512" height="512" fill="url(#bg)"/>
      <ellipse cx="432" cy="150" rx="250" ry="250" fill="#ffce5a" opacity="0.16"/>
      <!-- тусклые машины затора, из которого вырвался герой -->
      <g opacity="0.4">
        ${car(18, 392, 70, 150, "url(#car-blue)", "#dfe9f6", 18)}
        ${car(300, 432, 172, 66, "url(#car-gold)", "#fff1cf", 18)}
      </g>
      <!-- штрихи скорости + герой + стрелка выезда, повёрнуты по ходу -->
      <g transform="rotate(-24 246 282)">
        <g>
          <rect x="-18" y="250" width="92" height="12" rx="6" fill="#ffe7a6" opacity="0.5"/>
          <rect x="4" y="276" width="80" height="10" rx="5" fill="#ffffff" opacity="0.38"/>
          <rect x="-6" y="300" width="88" height="11" rx="5" fill="#ffd27a" opacity="0.42"/>
        </g>
        ${car(96, 232, 300, 100, "url(#car-red)", "#ffe9ec", 28, true)}
        <g filter="url(#exitGlow)">
          <path d="M404 282h72" stroke="#ffe08a" stroke-width="20" stroke-linecap="round"/>
          <path d="M462 250l56 32-56 32z" fill="#ffe08a"/>
        </g>
      </g>
      <rect width="512" height="512" fill="url(#vign)"/>
      <g fill="#ffe9b0">
        <circle cx="486" cy="150" r="6"/>
        <circle cx="452" cy="98" r="4"/>
        <circle cx="500" cy="206" r="4"/>
      </g>
    </svg>
  `);
}

function makeCoverHtml() {
  return htmlShell(800, 470, `
    <svg width="800" height="470" viewBox="0 0 800 470" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="coverBg2" x1="0" y1="0" x2="800" y2="470">
          <stop stop-color="#21344f"/>
          <stop offset="0.55" stop-color="#0e1828"/>
          <stop offset="1" stop-color="#070a10"/>
        </linearGradient>
        <linearGradient id="title" x1="44" y1="60" x2="360" y2="190">
          <stop stop-color="#ffffff"/>
          <stop offset="1" stop-color="#a9caff"/>
        </linearGradient>
        ${carArtDefs()}
      </defs>
      <rect width="800" height="470" fill="url(#coverBg2)"/>
      <ellipse cx="700" cy="150" rx="320" ry="300" fill="#ffce5a" opacity="0.14"/>
      <!-- тусклый затор -->
      <g opacity="0.38">
        ${car(560, 372, 72, 150, "url(#car-blue)", "#dfe9f6", 18)}
        ${car(648, 392, 150, 64, "url(#car-gold)", "#fff1cf", 18)}
      </g>
      <!-- герой вырывается к выезду -->
      <g transform="rotate(-18 600 252)">
        <g>
          <rect x="392" y="222" width="96" height="12" rx="6" fill="#ffe7a6" opacity="0.5"/>
          <rect x="414" y="248" width="84" height="10" rx="5" fill="#ffffff" opacity="0.36"/>
          <rect x="400" y="272" width="92" height="11" rx="5" fill="#ffd27a" opacity="0.42"/>
        </g>
        ${car(500, 206, 252, 92, "url(#car-red)", "#ffe9ec", 24, true)}
        <g filter="url(#exitGlow)">
          <path d="M762 252h54" stroke="#ffe08a" stroke-width="18" stroke-linecap="round"/>
          <path d="M812 226l44 26-44 26z" fill="#ffe08a"/>
        </g>
      </g>
      <!-- текстовый блок слева -->
      <text x="50" y="122" font-family="Arial, sans-serif" font-size="60" font-weight="900" fill="url(#title)">Пробка</text>
      <text x="50" y="188" font-family="Arial, sans-serif" font-size="60" font-weight="900" fill="url(#title)">во дворе</text>
      <text x="52" y="236" font-family="Arial, sans-serif" font-size="23" font-weight="700" fill="#9fb1cb">Двигай машины и</text>
      <text x="52" y="266" font-family="Arial, sans-serif" font-size="23" font-weight="700" fill="#9fb1cb">освободи выезд</text>
      <g font-family="Arial, sans-serif" font-weight="900" fill="#e6eefb">
        <circle cx="62" cy="326" r="6" fill="#ffd35c"/><text x="80" y="335" font-size="27">300 уровней</text>
        <circle cx="62" cy="370" r="6" fill="#56d29c"/><text x="80" y="379" font-size="27">3 режима</text>
      </g>
      <g transform="translate(50 404)">
        <rect x="0" y="0" width="214" height="44" rx="22" fill="#ffffff" opacity="0.06"/>
        <circle cx="26" cy="22" r="13" fill="#ffd35c"/><circle cx="26" cy="22" r="6" fill="#fff4be"/>
        <text x="48" y="30" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#f2f6ff">Уровень дня</text>
      </g>
    </svg>
  `);
}

function htmlShell(width, height, body) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body { width: ${width}px; height: ${height}px; margin: 0; overflow: hidden; background: #070a10; }
    body { display: grid; place-items: center; }
    svg { display: block; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function gridLines(x, y, cells, step = 55) {
  const size = cells * step;
  const lines = [];
  for (let i = 0; i <= cells; i += 1) {
    const p = i * step;
    lines.push(`<path d="M${x + p} ${y}v${size}" stroke="#aab7c8" stroke-width="2"/>`);
    lines.push(`<path d="M${x} ${y + p}h${size}" stroke="#aab7c8" stroke-width="2"/>`);
  }
  return lines.join("");
}

// Детальная машина вид сверху: корпус с бликом, кабина, лобовое/заднее стекло,
// 4 колеса, фары (белые спереди) и стопы (красные сзади).
function car(x, y, width, height, fill, windowFill, radius, target = false) {
  const horizontal = width >= height;
  const bodyR = Math.min(radius, Math.min(width, height) * 0.46);
  const glass = windowFill;
  const n = (v) => Number(v.toFixed(1));
  const p = [];
  const wheel = (wx, wy, ww, wh) =>
    `<rect x="${n(wx)}" y="${n(wy)}" width="${n(ww)}" height="${n(wh)}" rx="${n(Math.min(ww, wh) * 0.45)}" fill="#10151d" opacity="0.9"/>`;

  if (horizontal) {
    const ww = width * 0.2, wh = height * 0.16;
    const rear = x + width * 0.13, front = x + width * 0.87 - ww;
    p.push(wheel(rear, y - wh * 0.4, ww, wh), wheel(front, y - wh * 0.4, ww, wh));
    p.push(wheel(rear, y + height - wh * 0.6, ww, wh), wheel(front, y + height - wh * 0.6, ww, wh));
  } else {
    const ww = width * 0.16, wh = height * 0.2;
    const rear = y + height * 0.13, front = y + height * 0.87 - wh;
    p.push(wheel(x - ww * 0.4, rear, ww, wh), wheel(x - ww * 0.4, front, ww, wh));
    p.push(wheel(x + width - ww * 0.6, rear, ww, wh), wheel(x + width - ww * 0.6, front, ww, wh));
  }

  p.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" rx="${n(bodyR)}" fill="${fill}"/>`);
  p.push(`<rect x="${n(x + width * 0.05)}" y="${n(y + height * 0.07)}" width="${n(width * 0.9)}" height="${n(height * 0.32)}" rx="${n(bodyR * 0.7)}" fill="#ffffff" opacity="0.16"/>`);

  if (horizontal) {
    const cx = x + width * 0.3, cw = width * 0.44;
    p.push(`<rect x="${n(cx)}" y="${n(y + height * 0.15)}" width="${n(cw)}" height="${n(height * 0.7)}" rx="${n(height * 0.2)}" fill="#0b1016" opacity="0.16"/>`);
    p.push(`<rect x="${n(cx + cw * 0.5)}" y="${n(y + height * 0.21)}" width="${n(cw * 0.42)}" height="${n(height * 0.58)}" rx="${n(height * 0.15)}" fill="${glass}" opacity="0.88"/>`);
    p.push(`<rect x="${n(cx + cw * 0.07)}" y="${n(y + height * 0.24)}" width="${n(cw * 0.34)}" height="${n(height * 0.52)}" rx="${n(height * 0.15)}" fill="${glass}" opacity="0.68"/>`);
    const hw = width * 0.035, hh = height * 0.17;
    p.push(`<rect x="${n(x + width - hw * 1.6)}" y="${n(y + height * 0.15)}" width="${n(hw)}" height="${n(hh)}" rx="${n(hw * 0.5)}" fill="#fff6cf"/>`);
    p.push(`<rect x="${n(x + width - hw * 1.6)}" y="${n(y + height * 0.68)}" width="${n(hw)}" height="${n(hh)}" rx="${n(hw * 0.5)}" fill="#fff6cf"/>`);
    p.push(`<rect x="${n(x + hw * 0.6)}" y="${n(y + height * 0.17)}" width="${n(hw)}" height="${n(hh)}" rx="${n(hw * 0.5)}" fill="#ff5a5f"/>`);
    p.push(`<rect x="${n(x + hw * 0.6)}" y="${n(y + height * 0.66)}" width="${n(hw)}" height="${n(hh)}" rx="${n(hw * 0.5)}" fill="#ff5a5f"/>`);
  } else {
    const cy = y + height * 0.3, ch = height * 0.44;
    p.push(`<rect x="${n(x + width * 0.15)}" y="${n(cy)}" width="${n(width * 0.7)}" height="${n(ch)}" rx="${n(width * 0.2)}" fill="#0b1016" opacity="0.16"/>`);
    p.push(`<rect x="${n(x + width * 0.21)}" y="${n(cy + ch * 0.5)}" width="${n(width * 0.58)}" height="${n(ch * 0.42)}" rx="${n(width * 0.15)}" fill="${glass}" opacity="0.88"/>`);
    p.push(`<rect x="${n(x + width * 0.24)}" y="${n(cy + ch * 0.07)}" width="${n(width * 0.52)}" height="${n(ch * 0.32)}" rx="${n(width * 0.15)}" fill="${glass}" opacity="0.68"/>`);
    const lw = width * 0.17, lh = height * 0.035;
    p.push(`<rect x="${n(x + width * 0.15)}" y="${n(y + height - lh * 1.6)}" width="${n(lw)}" height="${n(lh)}" rx="${n(lh * 0.5)}" fill="#fff6cf"/>`);
    p.push(`<rect x="${n(x + width * 0.85 - lw)}" y="${n(y + height - lh * 1.6)}" width="${n(lw)}" height="${n(lh)}" rx="${n(lh * 0.5)}" fill="#fff6cf"/>`);
    p.push(`<rect x="${n(x + width * 0.15)}" y="${n(y + lh * 0.6)}" width="${n(lw)}" height="${n(lh)}" rx="${n(lh * 0.5)}" fill="#ff5a5f"/>`);
    p.push(`<rect x="${n(x + width * 0.85 - lw)}" y="${n(y + lh * 0.6)}" width="${n(lw)}" height="${n(lh)}" rx="${n(lh * 0.5)}" fill="#ff5a5f"/>`);
  }
  return `<g filter="url(#carShadow)">${p.join("")}</g>`;
}

// Общие defs: глянцевые градиенты кузовов, мягкая тень и свечение выезда.
function carArtDefs() {
  const grads = {
    red: ["#ff8a93", "#d62a43"],
    blue: ["#8cc0ff", "#2f6ad6"],
    green: ["#7ce3b0", "#1f9e6a"],
    gold: ["#ffd673", "#df991e"],
    purple: ["#bba0f2", "#6e4ed0"],
    teal: ["#74e2e8", "#1f9aa6"]
  };
  let s = "";
  for (const k of Object.keys(grads)) {
    s += `<linearGradient id="car-${k}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${grads[k][0]}"/><stop offset="1" stop-color="${grads[k][1]}"/></linearGradient>`;
  }
  s += `<filter id="carShadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="9" stdDeviation="9" flood-color="#04060c" flood-opacity="0.5"/></filter>`;
  s += `<filter id="exitGlow" x="-120%" y="-120%" width="340%" height="340%"><feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#ffce5a" flood-opacity="0.9"/></filter>`;
  return s;
}

function makeReadme() {
  return `# Ассеты для Яндекс Игр

Все материалы соответствуют требованиям платформы (раздел 5 и 8):
без скруглённых углов/рамок, обложка — иллюстрация (не скриншот),
скриншоты — полнокадровый реальный геймплей на русском без внешних элементов.

- icon-512.png — иконка, 512x512 PNG, квадрат без скруглений и рамок (8.3.3).
- cover-800x470.png — обложка, 800x470 PNG, ИЛЛЮСТРАЦИЯ (не скриншот, 5.6).
- screen1-night.png … screen6-rainy.png — скриншоты геймплея, портрет
  1290x2640, 100% игрового UI на русском, разные дворы и режимы (5.1.1 / 8.2.3).

Пересборка (Linux):
  PROBKA_CHROME="$(which google-chrome)" PROBKA_CHROME_FLAGS="--no-sandbox --disable-dev-shm-usage" \\
    node probka-game/tools/generate-yandex-assets.js http://127.0.0.1:<порт>
  (сервер должен отдавать корень воркспейса, чтобы путь /probka-game/ работал)

Видео для первой модерации не обязательно.
`;
}
