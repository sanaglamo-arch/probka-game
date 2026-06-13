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
// CSS-размер телефона + высокий DPR дают чёткое изображение 1290x2640.
const SHOT_CSS_WIDTH = 430;
const SHOT_CSS_HEIGHT = 880;
const SHOT_SCALE = 3;
const shotUrl = (params) => `${baseUrl}/probka-game/index.html?showcase=1&skin=classic_red&${params}`;
const screenshots = [
  { name: "screen1-quiet", url: shotUrl("mode=moves&level=3&yard=quiet_yard") },
  { name: "screen2-night", url: shotUrl("mode=moves&level=24&yard=night_yard") },
  { name: "screen3-winter", url: shotUrl("mode=timed&level=41&yard=winter_yard") },
  { name: "screen4-forest", url: shotUrl("mode=free&level=15&yard=forest_yard") },
  { name: "screen5-neon", url: shotUrl("mode=moves&level=58&yard=neon_yard") },
  { name: "screen6-business", url: shotUrl("mode=timed&level=72&yard=business_center") }
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

function makeIconHtml() {
  return htmlShell(512, 512, `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512">
          <stop stop-color="#20304a"/>
          <stop offset="0.5" stop-color="#101a28"/>
          <stop offset="1" stop-color="#080c13"/>
        </linearGradient>
        <radialGradient id="vign" cx="48%" cy="40%" r="72%">
          <stop offset="0.55" stop-color="#000000" stop-opacity="0"/>
          <stop offset="1" stop-color="#000000" stop-opacity="0.5"/>
        </radialGradient>
        <linearGradient id="red" x1="0" y1="0" x2="0" y2="1">
          <stop stop-color="#ff7a85"/>
          <stop offset="1" stop-color="#e2304a"/>
        </linearGradient>
        <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="16" stdDeviation="15" flood-color="#000" flood-opacity="0.42"/>
        </filter>
        <filter id="exitGlow" x="-90%" y="-90%" width="280%" height="280%">
          <feDropShadow dx="0" dy="0" stdDeviation="13" flood-color="#ffce5a" flood-opacity="0.85"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="url(#bg)"/>
      <!-- лёгкая разметка парковочных рядов -->
      <g stroke="#cdd8e8" stroke-width="5" opacity="0.09" stroke-linecap="round">
        <path d="M70 150h372M70 256h372M70 362h372"/>
      </g>
      <!-- тёплый блик сверху-слева -->
      <circle cx="150" cy="120" r="150" fill="#5a7bb0" opacity="0.10"/>
      <!-- золотой выезд справа, на одной линии с красной машиной -->
      <path d="M372 326h74" fill="none" stroke="#ffd35c" stroke-width="18" stroke-linecap="round" filter="url(#exitGlow)"/>
      <path d="M438 298l44 28-44 28z" fill="#ffe08a" filter="url(#exitGlow)"/>
      <g filter="url(#shadow)">
        ${car(96, 92, 78, 182, "#5aa0ff", "#e8f2ff", 22)}
        ${car(204, 92, 182, 74, "#56d29c", "#ddfff1", 22)}
        ${car(250, 198, 78, 182, "#edc24f", "#fff6cf", 22)}
        ${car(118, 286, 250, 80, "url(#red)", "#fff0f2", 26, true)}
      </g>
      <rect width="512" height="512" fill="url(#vign)"/>
      <circle cx="432" cy="92" r="22" fill="#ffd35c"/>
      <circle cx="432" cy="92" r="10" fill="#fff4be"/>
    </svg>
  `);
}

function makeCoverHtml() {
  return htmlShell(800, 470, `
    <svg width="800" height="470" viewBox="0 0 800 470" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="coverBg" x1="0" y1="0" x2="800" y2="470">
          <stop stop-color="#1d2c42"/>
          <stop offset="0.55" stop-color="#0c1420"/>
          <stop offset="1" stop-color="#070a10"/>
        </linearGradient>
        <linearGradient id="title" x1="44" y1="60" x2="360" y2="180">
          <stop stop-color="#ffffff"/>
          <stop offset="1" stop-color="#a9caff"/>
        </linearGradient>
        <linearGradient id="target" x1="0" y1="0" x2="0" y2="1">
          <stop stop-color="#ff7b86"/>
          <stop offset="1" stop-color="#e2304a"/>
        </linearGradient>
        <radialGradient id="yardGlow" cx="62%" cy="42%" r="55%">
          <stop offset="0" stop-color="#4f6fa0" stop-opacity="0.22"/>
          <stop offset="1" stop-color="#4f6fa0" stop-opacity="0"/>
        </radialGradient>
        <filter id="artShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="20" stdDeviation="16" flood-color="#000" flood-opacity="0.4"/>
        </filter>
        <filter id="exitGlow" x="-90%" y="-90%" width="280%" height="280%">
          <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#ffce5a" flood-opacity="0.8"/>
        </filter>
      </defs>
      <rect width="800" height="470" fill="url(#coverBg)"/>
      <rect width="800" height="470" fill="url(#yardGlow)"/>
      <!-- площадка двора: асфальт с разметкой парковочных мест -->
      <g transform="translate(372 26)">
        <rect x="0" y="0" width="404" height="418" rx="26" fill="#1a2533"/>
        <rect x="10" y="10" width="384" height="398" rx="20" fill="#222f40"/>
        <g stroke="#cfd9e8" stroke-width="4" opacity="0.12" stroke-linecap="round">
          <path d="M44 36v346M140 36v346M236 36v346M332 36v346"/>
        </g>
        <rect x="10" y="10" width="384" height="398" rx="20" fill="none" stroke="#3c4d63" stroke-width="3" opacity="0.5"/>
      </g>
      <!-- золотой выезд справа -->
      <path d="M712 296h70" fill="none" stroke="#ffd35c" stroke-width="18" stroke-linecap="round" filter="url(#exitGlow)"/>
      <path d="M772 268l40 28-40 28z" fill="#ffe08a" filter="url(#exitGlow)"/>
      <g filter="url(#artShadow)">
        ${car(440, 70, 74, 168, "#5aa0ff", "#e9f2ff", 18)}
        ${car(548, 70, 188, 72, "#56d29c", "#ddfff1", 18)}
        ${car(648, 158, 74, 168, "#edc24f", "#fff3bc", 18)}
        ${car(452, 256, 252, 80, "url(#target)", "#fff0f2", 22, true)}
        ${car(452, 360, 170, 70, "#8f7bd6", "#efeaff", 18)}
      </g>
      <!-- текстовый блок слева -->
      <text x="50" y="120" font-family="Arial, sans-serif" font-size="58" font-weight="900" fill="url(#title)">Пробка</text>
      <text x="50" y="184" font-family="Arial, sans-serif" font-size="58" font-weight="900" fill="url(#title)">во дворе</text>
      <text x="52" y="232" font-family="Arial, sans-serif" font-size="23" font-weight="700" fill="#9fb1cb">Двигай машины и</text>
      <text x="52" y="262" font-family="Arial, sans-serif" font-size="23" font-weight="700" fill="#9fb1cb">освободи выезд</text>
      <g font-family="Arial, sans-serif" font-weight="900" fill="#e6eefb">
        <circle cx="62" cy="322" r="6" fill="#ffd35c"/><text x="80" y="331" font-size="27">300 уровней</text>
        <circle cx="62" cy="366" r="6" fill="#56d29c"/><text x="80" y="375" font-size="27">3 режима</text>
      </g>
      <g transform="translate(50 400)">
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
  return `<g>${p.join("")}</g>`;
}

function makeReadme() {
  return `# Ассеты для Яндекс Игр

Все материалы соответствуют требованиям платформы (раздел 5 и 8):
без скруглённых углов/рамок, обложка — иллюстрация (не скриншот),
скриншоты — полнокадровый реальный геймплей на русском без внешних элементов.

- icon-512.png — иконка, 512x512 PNG, квадрат без скруглений и рамок (8.3.3).
- cover-800x470.png — обложка, 800x470 PNG, ИЛЛЮСТРАЦИЯ (не скриншот, 5.6).
- screen1-quiet.png … screen6-business.png — скриншоты геймплея, портрет
  1290x2640, 100% игрового UI на русском, разные дворы и режимы (5.1.1 / 8.2.3).

Пересборка (Linux):
  PROBKA_CHROME="$(which google-chrome)" PROBKA_CHROME_FLAGS="--no-sandbox --disable-dev-shm-usage" \\
    node probka-game/tools/generate-yandex-assets.js http://127.0.0.1:<порт>
  (сервер должен отдавать корень воркспейса, чтобы путь /probka-game/ работал)

Видео для первой модерации не обязательно.
`;
}
