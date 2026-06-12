#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const workspace = path.resolve(__dirname, "../..");
const outDir = path.join(workspace, "releases", "yandex-assets");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
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

const screenshots = [
  {
    name: "desktop1",
    width: 1280,
    height: 720,
    url: `${baseUrl}/probka-game/?showcase=1&mode=moves&level=1&yard=quiet_yard&skin=classic_red&capture=promo-gameplay&asset=desktop-quiet-gameplay`
  },
  {
    name: "desktop2",
    width: 1280,
    height: 720,
    url: `${baseUrl}/probka-game/?showcase=1&mode=moves&level=49&yard=night_yard&skin=classic_red&capture=promo-gameplay&asset=desktop-night-gameplay`
  },
  {
    name: "desktop3",
    width: 1280,
    height: 720,
    url: `${baseUrl}/probka-game/?showcase=1&mode=timed&level=85&yard=winter_yard&skin=classic_red&capture=promo-gameplay&asset=desktop-winter-gameplay`
  },
  {
    name: "desktop4",
    width: 1280,
    height: 720,
    url: `${baseUrl}/probka-game/?showcase=1&mode=free&level=35&yard=forest_yard&skin=classic_red&capture=promo-gameplay&asset=desktop-forest-gameplay`
  },
  {
    name: "desktop5",
    width: 1280,
    height: 720,
    url: `${baseUrl}/probka-game/?showcase=1&mode=moves&level=72&yard=business_center&skin=classic_red&capture=promo-gameplay&asset=desktop-business-gameplay`
  },
  {
    name: "mobile1",
    width: 1280,
    height: 720,
    url: `${baseUrl}/probka-game/?showcase=1&mode=moves&level=12&yard=quiet_yard&skin=classic_red&capture=promo-gameplay&asset=mobile-quiet-gameplay`
  },
  {
    name: "mobile2",
    width: 1280,
    height: 720,
    url: `${baseUrl}/probka-game/?showcase=1&mode=timed&level=55&yard=rainy_yard&skin=classic_red&capture=promo-gameplay&asset=mobile-rainy-gameplay`
  }
];

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
    capture(shot.url, path.join(outDir, `${shot.name}.png`), shot.width, shot.height, 2200);
  });

  fs.writeFileSync(path.join(outDir, "README.md"), makeReadme());
  console.log(`Yandex assets written to ${outDir}`);
}

function cleanOldScreenshotFiles() {
  fs.readdirSync(outDir).forEach((file) => {
    if (/^(screenshot-|desktop\d+|mobile\d+).*\.png$/i.test(file)) {
      fs.unlinkSync(path.join(outDir, file));
    }
  });
}

function capture(url, outputPath, width, height, virtualTime = 600) {
  const result = spawnSync(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-extensions",
    "--disable-sync",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--window-size=${width},${height}`,
    `--screenshot=${outputPath}`,
    `--virtual-time-budget=${virtualTime}`,
    url
  ], { stdio: "inherit", timeout: 20000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Chrome screenshot failed for ${url}`);
}

function makeIconHtml() {
  return htmlShell(512, 512, `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="60" y1="30" x2="460" y2="500">
          <stop stop-color="#172334"/>
          <stop offset="0.55" stop-color="#0e1622"/>
          <stop offset="1" stop-color="#090d14"/>
        </linearGradient>
        <linearGradient id="red" x1="140" y1="270" x2="372" y2="270">
          <stop stop-color="#ff7280"/>
          <stop offset="1" stop-color="#e7354c"/>
        </linearGradient>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity="0.38"/>
        </filter>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#ffcf5b" flood-opacity="0.55"/>
        </filter>
      </defs>
      <rect width="512" height="512" fill="url(#bg)"/>
      <g opacity="0.23">
        ${gridLines(76, 76, 6)}
      </g>
      <path d="M74 92c78-18 165-18 260 0 38 7 72 9 104 5" fill="none" stroke="#5d6d82" stroke-width="16" stroke-linecap="round" opacity="0.24"/>
      <path d="M70 420c94 14 185 12 274-4 36-7 70-7 102 0" fill="none" stroke="#5d6d82" stroke-width="16" stroke-linecap="round" opacity="0.2"/>
      <path d="M414 241h54v66h-54" fill="none" stroke="#74e0a4" stroke-width="16" stroke-linecap="round" filter="url(#glow)"/>
      <g filter="url(#shadow)">
        ${car(110, 114, 74, 180, "#62a0ff", "#dbeafe", 22)}
        ${car(204, 112, 170, 70, "#57d19c", "#ddfff1", 22)}
        ${car(246, 206, 78, 190, "#e7b650", "#fff5c3", 22)}
        ${car(132, 283, 260, 78, "url(#red)", "#fff0f2", 26, true)}
      </g>
      <g fill="#fff6d5" opacity="0.95">
        <path d="M377 254l30 30-30 30v-18h-54v-24h54z"/>
      </g>
      <circle cx="402" cy="110" r="20" fill="#ffd35c"/>
      <circle cx="402" cy="110" r="9" fill="#fff4be"/>
    </svg>
  `);
}

function makeCoverHtml() {
  return htmlShell(800, 470, `
    <svg width="800" height="470" viewBox="0 0 800 470" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="coverBg" x1="0" y1="0" x2="800" y2="470">
          <stop stop-color="#172436"/>
          <stop offset="0.56" stop-color="#0b121d"/>
          <stop offset="1" stop-color="#070a10"/>
        </linearGradient>
        <linearGradient id="title" x1="44" y1="62" x2="356" y2="168">
          <stop stop-color="#ffffff"/>
          <stop offset="1" stop-color="#a9caff"/>
        </linearGradient>
        <linearGradient id="target" x1="430" y1="260" x2="704" y2="260">
          <stop stop-color="#ff7b86"/>
          <stop offset="1" stop-color="#e9364d"/>
        </linearGradient>
        <linearGradient id="road" x1="278" y1="456" x2="740" y2="58">
          <stop stop-color="#273343"/>
          <stop offset="0.52" stop-color="#17212e"/>
          <stop offset="1" stop-color="#303b4a"/>
        </linearGradient>
        <filter id="artShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="22" stdDeviation="18" flood-color="#000" flood-opacity="0.36"/>
        </filter>
        <filter id="yellowGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#ffd35c" flood-opacity="0.45"/>
        </filter>
      </defs>
      <rect width="800" height="470" fill="url(#coverBg)"/>
      <path d="M448 0h352v470H232z" fill="url(#road)" opacity="0.94"/>
      <path d="M496 0h58L334 470h-66z" fill="#0c1119" opacity="0.35"/>
      <path d="M660 0h42L468 470h-46z" fill="#0c1119" opacity="0.28"/>
      <g opacity="0.32" stroke="#ffd35c" stroke-width="6" stroke-linecap="round" stroke-dasharray="34 28">
        <path d="M584 28L392 444"/>
      </g>
      <g opacity="0.22" stroke="#aebbd0" stroke-width="3">
        <path d="M520 54l204 90"/>
        <path d="M476 150l204 90"/>
        <path d="M432 246l204 90"/>
        <path d="M388 342l204 90"/>
      </g>
      <text x="52" y="106" font-family="Arial, sans-serif" font-size="54" font-weight="900" fill="url(#title)">Пробка</text>
      <text x="52" y="166" font-family="Arial, sans-serif" font-size="54" font-weight="900" fill="url(#title)">во дворе</text>
      <text x="56" y="214" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#aebbd0">Двигай машины</text>
      <text x="56" y="247" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#aebbd0">и освободи выезд</text>
      <g filter="url(#artShadow)">
        ${car(530, 66, 72, 172, "#69a4ff", "#e9f2ff", 18)}
        ${car(632, 102, 72, 172, "#55d19c", "#ddfff1", 18)}
        ${car(432, 144, 214, 76, "#e8b950", "#fff3bc", 20)}
        ${car(494, 256, 244, 78, "url(#target)", "#fff0f2", 22, true)}
        ${car(348, 330, 76, 150, "#6f8fb8", "#e9f2ff", 18)}
      </g>
      <path d="M720 284h58v76h-58" fill="none" stroke="#76dfaa" stroke-width="12" stroke-linecap="round" filter="url(#yellowGlow)"/>
      <path d="M680 282l46 36-46 36v-24h-98v-28h98z" fill="#fff3b6"/>
      <g font-family="Arial, sans-serif" font-weight="900" fill="#dceaff">
        <text x="56" y="342" font-size="28">300 уровней</text>
        <text x="56" y="382" font-size="28">3 режима</text>
      </g>
      <circle cx="76" cy="416" r="16" fill="#ffd35c"/>
      <text x="106" y="425" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="#f2f6ff">Уровень дня</text>
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

function car(x, y, width, height, fill, windowFill, radius, target = false) {
  const horizontal = width >= height;
  const winW = horizontal ? width * 0.22 : width * 0.55;
  const winH = horizontal ? height * 0.48 : height * 0.24;
  const winX = x + (horizontal ? width * 0.15 : width * 0.22);
  const winY = y + (horizontal ? height * 0.24 : height * 0.14);
  const stripe = target
    ? `<rect x="${x + width * 0.48}" y="${y + 8}" width="${Math.max(8, horizontal ? 12 : width - 16)}" height="${horizontal ? height - 16 : 12}" rx="6" fill="#ffffff" opacity="0.24"/>`
    : "";
  return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}"/>
      <rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" rx="10" fill="${windowFill}" opacity="0.82"/>
      ${stripe}
      <rect x="${x + 10}" y="${y + height - 8}" width="${width - 20}" height="6" rx="3" fill="#000" opacity="0.12"/>
    </g>`;
}

function makeReadme() {
  return `# Yandex Games assets

- icon-512.png: icon upload, 512x512 PNG
- cover-800x470.png: illustrated cover upload, 800x470 PNG
- desktop1.png: desktop gameplay screenshot, quiet yard
- desktop2.png: desktop gameplay screenshot, night yard
- desktop3.png: desktop gameplay screenshot, winter yard
- desktop4.png: desktop gameplay screenshot, forest yard
- desktop5.png: desktop gameplay screenshot, business center yard
- mobile1.png: mobile gameplay screenshot, 16:9
- mobile2.png: mobile gameplay screenshot, 16:9

Videos are optional for the first moderation pass.
`;
}
