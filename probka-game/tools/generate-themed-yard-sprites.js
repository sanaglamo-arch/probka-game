#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const rawArgs = process.argv.slice(2);
const yardId = getArg("--yard") || "holiday_yard";

const THEMES = {
  holiday_yard: {
    kind: "holiday",
    car: [203, 42, 62, 255],
    van: [38, 120, 84, 255],
    trim: [255, 210, 92, 255],
    glass: [255, 242, 196, 255],
    dark: [48, 35, 38, 255],
    light: [255, 248, 220, 255],
    accent: [255, 118, 122, 255],
    ribbon: [255, 216, 102, 255]
  },
  rainy_yard: {
    kind: "rainy",
    car: [58, 112, 168, 255],
    van: [54, 84, 104, 255],
    trim: [142, 202, 230, 255],
    glass: [186, 222, 238, 255],
    dark: [28, 38, 48, 255],
    light: [220, 242, 248, 255],
    accent: [94, 178, 216, 255],
    ribbon: [156, 208, 222, 255]
  },
  neon_yard: {
    kind: "neon",
    car: [96, 54, 178, 255],
    van: [28, 150, 172, 255],
    trim: [91, 242, 255, 255],
    glass: [186, 246, 255, 255],
    dark: [18, 18, 38, 255],
    light: [236, 218, 255, 255],
    accent: [184, 104, 255, 255],
    ribbon: [95, 242, 255, 255]
  },
  night_yard: {
    kind: "night",
    car: [36, 58, 92, 255],
    van: [70, 72, 86, 255],
    trim: [255, 184, 104, 255],
    glass: [210, 226, 244, 255],
    dark: [18, 22, 32, 255],
    light: [255, 226, 168, 255],
    accent: [255, 160, 92, 255],
    ribbon: [230, 186, 92, 255]
  },
  old_block_yard: {
    kind: "oldblock",
    car: [112, 92, 66, 255],
    van: [88, 104, 74, 255],
    trim: [184, 142, 76, 255],
    glass: [180, 196, 178, 255],
    dark: [52, 46, 38, 255],
    light: [214, 184, 128, 255],
    accent: [154, 72, 54, 255],
    ribbon: [184, 142, 76, 255]
  },
  business_center: {
    kind: "business",
    car: [54, 72, 96, 255],
    van: [78, 86, 96, 255],
    trim: [204, 166, 82, 255],
    glass: [220, 232, 242, 255],
    dark: [30, 36, 44, 255],
    light: [238, 242, 246, 255],
    accent: [122, 154, 196, 255],
    ribbon: [204, 166, 82, 255]
  },
  underground_parking: {
    kind: "underground",
    car: [74, 82, 94, 255],
    van: [96, 96, 94, 255],
    trim: [224, 184, 78, 255],
    glass: [198, 214, 226, 255],
    dark: [32, 34, 38, 255],
    light: [188, 198, 208, 255],
    accent: [118, 128, 142, 255],
    ribbon: [224, 184, 78, 255]
  },
  quiet_yard: {
    kind: "quiet",
    car: [74, 126, 188, 255],
    van: [82, 128, 104, 255],
    trim: [218, 184, 88, 255],
    glass: [206, 226, 238, 255],
    dark: [38, 48, 58, 255],
    light: [228, 232, 218, 255],
    accent: [120, 174, 255, 255],
    ribbon: [218, 184, 88, 255]
  },
  winter_yard: {
    kind: "winter",
    car: [92, 150, 190, 255],
    van: [118, 142, 158, 255],
    trim: [232, 242, 248, 255],
    glass: [220, 244, 255, 255],
    dark: [46, 62, 74, 255],
    light: [248, 252, 255, 255],
    accent: [142, 212, 255, 255],
    ribbon: [232, 242, 248, 255]
  },
  forest_yard: {
    kind: "forest",
    car: [92, 122, 74, 255],
    van: [78, 104, 70, 255],
    trim: [198, 172, 82, 255],
    glass: [202, 222, 188, 255],
    dark: [38, 54, 34, 255],
    light: [218, 204, 142, 255],
    accent: [126, 152, 92, 255],
    ribbon: [198, 172, 82, 255]
  }
};

function main() {
  validateArgs();
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }
  if (process.argv.includes("--gallery")) {
    writeGallery();
    return;
  }
  if (process.argv.includes("--check-coverage")) {
    checkThemeCoverage();
    return;
  }
  if (process.argv.includes("--all")) {
    Object.keys(THEMES).forEach((id) => generateYard(id));
    return;
  }
  generateYard(yardId);
}

function validateArgs() {
  const known = new Set(["--yard", "--all", "--check-coverage", "--gallery", "--help", "-h"]);
  const unknown = rawArgs.filter((arg, index) => {
    if (index > 0 && rawArgs[index - 1] === "--yard") return false;
    return arg.startsWith("-") && !known.has(arg);
  });
  if (unknown.length) fail(`Unknown option: ${unknown.join(", ")}`);
  const modeCount = ["--all", "--check-coverage", "--gallery", "--help", "-h"].filter((flag) => rawArgs.includes(flag)).length;
  if (modeCount > 1) fail("Use only one generator mode at a time.");
  if (rawArgs.includes("--yard") && !getArg("--yard")) fail("Missing value for --yard.");
  if (rawArgs.includes("--yard") && modeCount > 0) fail("Use --yard without --all, --gallery, --check-coverage, or --help.");
}

function printHelp() {
  console.log([
    "Usage: node probka-game/tools/generate-themed-yard-sprites.js [--yard <id>] [--all] [--check-coverage] [--gallery]",
    "",
    "Options:",
    "  --yard <id>        Generate themed traffic and obstacle sprites for one yard.",
    "  --all              Generate themed sprites for every supported active yard.",
    "  --check-coverage   Verify every active yard has a theme definition.",
    "  --gallery          Write a lightweight HTML gallery for visual review.",
    "  -h, --help         Show this help."
  ].join("\n"));
}

function checkThemeCoverage() {
  const code = fs.readFileSync(path.join(root, "yards.js"), "utf8");
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "yards.js" });
  const yardIds = (sandbox.PROBKA_YARDS || []).map((yard) => yard.id);
  const missing = yardIds.filter((id) => !THEMES[id]);
  if (missing.length) fail(`Missing themed sprite definitions: ${missing.join(", ")}`);
  const extra = Object.keys(THEMES).filter((id) => !yardIds.includes(id));
  if (extra.length) fail(`Unused themed sprite definitions: ${extra.join(", ")}`);
  console.log(`Themed sprite coverage: ${yardIds.length}/${yardIds.length} active yards`);
}

function writeGallery() {
  const code = fs.readFileSync(path.join(root, "yards.js"), "utf8");
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "yards.js" });
  const yards = sandbox.PROBKA_YARDS || [];
  const guideDir = path.join(root, "assets", "yards", "_guides");
  fs.mkdirSync(guideDir, { recursive: true });
  const html = renderGalleryHtml(yards);
  const file = path.join(guideDir, "themed-sprites-gallery.html");
  fs.writeFileSync(file, html);
  console.log(`Themed sprite gallery: ${file}`);
}

function renderGalleryHtml(yards) {
  const rows = yards.map((yard) => {
    const base = `../${yard.id}`;
    const sprites = [
      ["car h", `${base}/traffic/car-2-h.png`],
      ["car v", `${base}/traffic/car-2-v.png`],
      ["van h", `${base}/traffic/van-3-h.png`],
      ["van v", `${base}/traffic/van-3-v.png`],
      ["bin", `${base}/obstacles/bin.png`],
      ["cone", `${base}/obstacles/cone.png`],
      ["gate", `${base}/obstacles/gate.png`],
      ["block", `${base}/obstacles/theme-block.png`]
    ].map(([label, src]) => `
      <figure>
        <img src="${src}" alt="${escapeHtml(yard.id)} ${label}">
        <figcaption>${label}</figcaption>
      </figure>
    `).join("");
    return `
      <section style="--yard-base: ${escapeHtml(yard.palette && yard.palette.base || "#181c22")}; --yard-accent: ${escapeHtml(yard.palette && yard.palette.accent || "#7aa2ff")}">
        <h2>${escapeHtml(yard.name)} <span>${escapeHtml(yard.id)}</span></h2>
        <p>${escapeHtml(yard.concept || yard.rarity || "yard")} · ${escapeHtml(yard.rarity || "collection")} · ${yard.price ? `${yard.price} coins` : "base"}</p>
        <div class="sprites">${sprites}</div>
      </section>
    `;
  }).join("");
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Probka themed yard sprites</title>
  <style>
    body { margin: 0; background: #111318; color: #eef2f6; font: 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { padding: 24px; display: grid; gap: 20px; }
    section { border: 1px solid var(--yard-accent); border-radius: 8px; padding: 16px; background: linear-gradient(90deg, var(--yard-base), #181c22 72%); }
    h1, h2 { margin: 0; font-weight: 700; }
    h1 { font-size: 22px; }
    h2 { font-size: 16px; margin-bottom: 12px; }
    h2 span { color: #9aa6b2; font-weight: 500; margin-left: 8px; }
    p { margin: -4px 0 12px; color: #b8c1cc; }
    .note { margin: 0; color: #c7d0da; }
    .sprites { display: grid; grid-template-columns: repeat(8, minmax(90px, 1fr)); gap: 12px; align-items: end; }
    figure { margin: 0; display: grid; gap: 6px; justify-items: center; min-width: 0; }
    img { max-width: 100%; max-height: 120px; object-fit: contain; image-rendering: auto; background: #0b0d10; border-radius: 6px; padding: 8px; box-sizing: border-box; }
    figcaption { color: #aab4bf; font-size: 12px; }
  </style>
</head>
<body>
  <main>
    <h1>Probka themed yard sprites</h1>
    <p class="note">Horizontal vehicles face right; vertical vehicles face upward. Review only runtime sprites shown here.</p>
    ${rows}
  </main>
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function generateYard(id) {
  const theme = THEMES[id];
  if (!theme) fail(`Unsupported yard: ${id}`);

  const yardDir = path.join(root, "assets", "yards", id);
  const trafficDir = path.join(yardDir, "traffic");
  const sourceTrafficDir = path.join(yardDir, "source", "traffic");
  const obstacleDir = path.join(yardDir, "obstacles");
  const sourceObstacleDir = path.join(yardDir, "source", "obstacles");
  [trafficDir, sourceTrafficDir, obstacleDir, sourceObstacleDir].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

  writeVehiclePair(trafficDir, sourceTrafficDir, "car-2-h.png", 768, 384, "horizontal", 2, theme.car, theme);
  writeVehiclePair(trafficDir, sourceTrafficDir, "car-2-v.png", 384, 768, "vertical", 2, theme.car, theme);
  writeVehiclePair(trafficDir, sourceTrafficDir, "van-3-h.png", 1152, 384, "horizontal", 3, theme.van, theme);
  writeVehiclePair(trafficDir, sourceTrafficDir, "van-3-v.png", 384, 1152, "vertical", 3, theme.van, theme);

  const obstacles = getObstacleDrawers(theme.kind);
  Object.entries(obstacles).forEach(([name, draw]) => {
    const png = renderPng(512, 512, (ctx) => draw(ctx, theme));
    fs.writeFileSync(path.join(obstacleDir, name), png);
    fs.writeFileSync(path.join(sourceObstacleDir, name), png);
  });

  console.log(`Generated themed sprites for ${id}`);
}

function writeVehiclePair(trafficDir, sourceTrafficDir, name, width, height, axis, length, bodyColor, theme) {
  const png = renderVehiclePng(width, height, axis, length, bodyColor, theme);
  fs.writeFileSync(path.join(trafficDir, name), png);
  fs.writeFileSync(path.join(sourceTrafficDir, name), png);
}

function writeVehicle(file, width, height, axis, length, bodyColor, theme) {
  fs.writeFileSync(file, renderVehiclePng(width, height, axis, length, bodyColor, theme));
}

function renderVehiclePng(width, height, axis, length, bodyColor, theme) {
  return renderPng(width, height, (ctx) => {
    const horizontal = axis === "horizontal";
    const x0 = horizontal ? 36 : 76;
    const y0 = horizontal ? 76 : 36;
    const x1 = width - x0 - 1;
    const y1 = height - y0 - 1;
    const radius = 46;

    roundedRect(ctx, x0, y0, x1, y1, radius, bodyColor);
    roundedRect(ctx, x0 + 28, y0 + 26, x1 - 28, y1 - 26, 34, shade(bodyColor, 18));
    drawVehicleShapeDetails(ctx, x0, y0, x1, y1, horizontal, length, theme);

    if (horizontal) {
      rect(ctx, x0 + 82, y0 - 24, x1 - 118, y0 + 38, theme.glass);
      rect(ctx, x0 + 110, y1 - 38, x1 - 148, y1 - 12, theme.trim);
      rect(ctx, x0 + 32, y0 + 46, x1 - 32, y0 + 74, theme.accent);
      drawVehicleDecor(ctx, x0, y0, x1, y1, horizontal, theme);
      drawVehicleDirectionMarkers(ctx, x0, y0, x1, y1, horizontal, theme);
      wheel(ctx, x0 + 92, y1 + 18, theme);
      wheel(ctx, x1 - 92, y1 + 18, theme);
      if (length === 3) {
        rect(ctx, Math.floor(width * 0.58), y0 + 86, Math.floor(width * 0.78), y1 - 78, theme.trim);
      }
    } else {
      rect(ctx, x0 - 24, y0 + 82, x0 + 38, y1 - 118, theme.glass);
      rect(ctx, x1 - 38, y0 + 110, x1 - 12, y1 - 148, theme.trim);
      rect(ctx, x0 + 46, y0 + 32, x0 + 74, y1 - 32, theme.accent);
      drawVehicleDecor(ctx, x0, y0, x1, y1, horizontal, theme);
      drawVehicleDirectionMarkers(ctx, x0, y0, x1, y1, horizontal, theme);
      wheel(ctx, x0 - 18, y0 + 92, theme);
      wheel(ctx, x1 + 18, y0 + 92, theme);
      wheel(ctx, x0 - 18, y1 - 92, theme);
      wheel(ctx, x1 + 18, y1 - 92, theme);
      if (length === 3) {
        rect(ctx, x0 + 86, Math.floor(height * 0.58), x1 - 78, Math.floor(height * 0.78), theme.trim);
      }
    }
  });
}

function getObstacleDrawers(kind) {
  if (kind === "rainy") {
    return {
      "bin.png": drawRainyBin,
      "cone.png": drawRainyCone,
      "gate.png": drawRainyGate,
      "theme-block.png": drawRainyPuddle
    };
  }
  if (kind === "neon") {
    return {
      "bin.png": drawNeonBox,
      "cone.png": drawNeonCone,
      "gate.png": drawNeonGate,
      "theme-block.png": drawNeonBlock
    };
  }
  if (kind === "night") {
    return {
      "bin.png": drawNightBin,
      "cone.png": drawNightCone,
      "gate.png": drawNightGate,
      "theme-block.png": drawNightLamp
    };
  }
  if (kind === "oldblock") {
    return {
      "bin.png": drawOldBlockBin,
      "cone.png": drawOldBlockCone,
      "gate.png": drawOldBlockGate,
      "theme-block.png": drawOldBlockCrate
    };
  }
  if (kind === "business") {
    return {
      "bin.png": drawBusinessBin,
      "cone.png": drawBusinessCone,
      "gate.png": drawBusinessGate,
      "theme-block.png": drawBusinessPlanter
    };
  }
  if (kind === "underground") {
    return {
      "bin.png": drawUndergroundBin,
      "cone.png": drawUndergroundCone,
      "gate.png": drawUndergroundGate,
      "theme-block.png": drawUndergroundColumn
    };
  }
  if (kind === "quiet") {
    return {
      "bin.png": drawQuietBin,
      "cone.png": drawQuietCone,
      "gate.png": drawQuietGate,
      "theme-block.png": drawQuietPlanter
    };
  }
  if (kind === "winter") {
    return {
      "bin.png": drawWinterBin,
      "cone.png": drawWinterCone,
      "gate.png": drawWinterGate,
      "theme-block.png": drawWinterSnow
    };
  }
  if (kind === "forest") {
    return {
      "bin.png": drawForestBin,
      "cone.png": drawForestCone,
      "gate.png": drawForestGate,
      "theme-block.png": drawForestLeaves
    };
  }
  return {
    "bin.png": drawHolidayBin,
    "cone.png": drawHolidayCone,
    "gate.png": drawHolidayGate,
    "theme-block.png": drawHolidayGift
  };
}

function drawHolidayBin(ctx, theme) {
  roundedRect(ctx, 124, 162, 388, 404, 26, [126, 42, 50, 255]);
  roundedRect(ctx, 150, 122, 362, 174, 20, theme.accent);
  rect(ctx, 112, 390, 400, 430, theme.dark);
  rect(ctx, 178, 198, 214, 374, theme.ribbon);
  rect(ctx, 298, 198, 334, 374, theme.ribbon);
  drawStringLights(ctx, 150, 212, 362, 212, theme);
  wheel(ctx, 188, 440, theme);
  wheel(ctx, 324, 440, theme);
}

function drawRainyBin(ctx, theme) {
  roundedRect(ctx, 116, 172, 396, 398, 28, [52, 78, 92, 255]);
  roundedRect(ctx, 146, 130, 366, 178, 18, [88, 118, 132, 255]);
  rect(ctx, 126, 244, 386, 282, theme.trim);
  rect(ctx, 112, 386, 400, 428, theme.dark);
  drawRainDrops(ctx, 176, 198, 336, 350, theme);
  wheel(ctx, 188, 438, theme);
  wheel(ctx, 324, 438, theme);
}

function drawRainyCone(ctx, theme) {
  tri(ctx, 256, 82, 112, 424, 400, 424, [70, 130, 166, 255]);
  tri(ctx, 256, 136, 184, 326, 328, 326, [108, 178, 208, 255]);
  rect(ctx, 88, 408, 424, 456, theme.dark);
  rect(ctx, 150, 292, 362, 328, theme.light);
  rect(ctx, 192, 198, 320, 230, theme.light);
  drawRainDrops(ctx, 218, 240, 294, 360, theme);
}

function drawRainyGate(ctx, theme) {
  roundedRect(ctx, 98, 104, 148, 430, 16, [50, 72, 86, 255]);
  roundedRect(ctx, 364, 104, 414, 430, 16, [50, 72, 86, 255]);
  rect(ctx, 128, 146, 384, 188, theme.trim);
  rect(ctx, 128, 258, 384, 300, theme.trim);
  rect(ctx, 154, 160, 218, 174, theme.light);
  rect(ctx, 294, 272, 358, 286, theme.light);
  drawRainDrops(ctx, 180, 198, 332, 354, theme);
}

function drawRainyPuddle(ctx, theme) {
  ellipse(ctx, 256, 310, 150, 68, [42, 98, 132, 255]);
  ellipse(ctx, 248, 298, 108, 42, [74, 150, 184, 255]);
  ellipse(ctx, 286, 282, 54, 18, theme.light);
  roundedRect(ctx, 160, 128, 352, 210, 18, [54, 76, 90, 255]);
  rect(ctx, 178, 152, 334, 184, theme.trim);
  drawRainDrops(ctx, 182, 224, 338, 382, theme);
}

function drawNeonBox(ctx, theme) {
  roundedRect(ctx, 120, 150, 392, 406, 24, [30, 30, 62, 255]);
  rect(ctx, 146, 188, 366, 224, theme.trim);
  rect(ctx, 146, 312, 366, 348, theme.accent);
  rect(ctx, 112, 390, 400, 430, theme.dark);
  drawNeonDots(ctx, 164, 264, 348, 264, theme);
  wheel(ctx, 188, 440, theme);
  wheel(ctx, 324, 440, theme);
}

function drawNeonCone(ctx, theme) {
  tri(ctx, 256, 78, 110, 424, 402, 424, [82, 48, 168, 255]);
  tri(ctx, 256, 126, 178, 326, 334, 326, [42, 200, 222, 255]);
  rect(ctx, 86, 408, 426, 456, theme.dark);
  rect(ctx, 150, 292, 362, 328, theme.accent);
  rect(ctx, 190, 198, 322, 230, theme.trim);
  drawNeonDots(ctx, 204, 254, 308, 254, theme);
}

function drawNeonGate(ctx, theme) {
  roundedRect(ctx, 82, 92, 166, 432, 22, [26, 24, 62, 255]);
  roundedRect(ctx, 346, 92, 430, 432, 22, [26, 24, 62, 255]);
  rect(ctx, 118, 132, 394, 172, theme.trim);
  rect(ctx, 118, 300, 394, 340, theme.accent);
  rect(ctx, 230, 96, 282, 428, [44, 40, 96, 255]);
  drawNeonDots(ctx, 142, 152, 370, 152, theme);
  drawNeonDots(ctx, 142, 320, 370, 320, theme);
}

function drawNeonBlock(ctx, theme) {
  roundedRect(ctx, 142, 92, 370, 420, 30, [24, 22, 58, 255]);
  rect(ctx, 174, 132, 338, 180, theme.trim);
  rect(ctx, 174, 220, 338, 268, theme.accent);
  rect(ctx, 174, 308, 338, 356, theme.light);
  drawNeonDots(ctx, 184, 392, 328, 392, theme);
}

function drawNightBin(ctx, theme) {
  roundedRect(ctx, 122, 164, 390, 404, 26, [52, 60, 72, 255]);
  roundedRect(ctx, 148, 124, 364, 176, 18, [82, 86, 96, 255]);
  rect(ctx, 112, 390, 400, 430, theme.dark);
  rect(ctx, 178, 198, 214, 374, theme.trim);
  rect(ctx, 298, 198, 334, 374, theme.trim);
  drawWarmReflectors(ctx, 154, 220, 358, 220, theme);
  wheel(ctx, 188, 440, theme);
  wheel(ctx, 324, 440, theme);
}

function drawNightCone(ctx, theme) {
  tri(ctx, 256, 78, 110, 424, 402, 424, [150, 88, 46, 255]);
  tri(ctx, 256, 126, 178, 326, 334, 326, theme.accent);
  rect(ctx, 86, 408, 426, 456, theme.dark);
  rect(ctx, 150, 292, 362, 328, theme.light);
  rect(ctx, 190, 198, 322, 230, theme.light);
}

function drawNightGate(ctx, theme) {
  roundedRect(ctx, 96, 100, 148, 432, 18, [58, 58, 66, 255]);
  roundedRect(ctx, 364, 100, 416, 432, 18, [58, 58, 66, 255]);
  rect(ctx, 126, 142, 386, 184, theme.trim);
  rect(ctx, 126, 256, 386, 298, theme.trim);
  drawWarmReflectors(ctx, 154, 164, 358, 164, theme);
  drawWarmReflectors(ctx, 154, 278, 358, 278, theme);
}

function drawNightLamp(ctx, theme) {
  rect(ctx, 238, 132, 274, 398, [58, 58, 66, 255]);
  roundedRect(ctx, 176, 98, 336, 176, 28, theme.light);
  ellipse(ctx, 256, 216, 118, 48, [255, 188, 92, 90]);
  roundedRect(ctx, 142, 362, 370, 418, 18, theme.dark);
  drawWarmReflectors(ctx, 176, 390, 336, 390, theme);
}

function drawOldBlockBin(ctx, theme) {
  roundedRect(ctx, 120, 164, 392, 404, 22, [94, 86, 68, 255]);
  roundedRect(ctx, 148, 124, 364, 176, 16, [126, 108, 76, 255]);
  rect(ctx, 112, 390, 400, 430, theme.dark);
  rect(ctx, 172, 204, 220, 374, theme.accent);
  rect(ctx, 294, 198, 334, 374, theme.trim);
  drawCracks(ctx, 154, 228, 350, 336, theme);
  wheel(ctx, 188, 440, theme);
  wheel(ctx, 324, 440, theme);
}

function drawOldBlockCone(ctx, theme) {
  tri(ctx, 256, 82, 110, 424, 402, 424, [156, 84, 52, 255]);
  tri(ctx, 256, 140, 184, 326, 328, 326, [196, 126, 72, 255]);
  rect(ctx, 86, 408, 426, 456, theme.dark);
  rect(ctx, 150, 292, 362, 328, theme.light);
  rect(ctx, 190, 198, 322, 230, theme.light);
  drawCracks(ctx, 206, 242, 314, 356, theme);
}

function drawOldBlockGate(ctx, theme) {
  roundedRect(ctx, 96, 102, 148, 432, 14, [98, 82, 62, 255]);
  roundedRect(ctx, 364, 102, 416, 432, 14, [98, 82, 62, 255]);
  rect(ctx, 126, 142, 386, 184, theme.trim);
  rect(ctx, 126, 256, 386, 298, theme.accent);
  drawCracks(ctx, 146, 198, 366, 346, theme);
}

function drawOldBlockCrate(ctx, theme) {
  roundedRect(ctx, 122, 150, 390, 398, 18, [108, 86, 58, 255]);
  rect(ctx, 148, 178, 364, 216, theme.trim);
  rect(ctx, 148, 282, 364, 320, theme.dark);
  rect(ctx, 234, 150, 278, 398, theme.accent);
  drawCracks(ctx, 162, 230, 350, 360, theme);
}

function drawBusinessBin(ctx, theme) {
  roundedRect(ctx, 118, 154, 394, 404, 22, [70, 78, 88, 255]);
  roundedRect(ctx, 146, 116, 366, 174, 16, [132, 142, 154, 255]);
  rect(ctx, 112, 390, 400, 430, theme.dark);
  rect(ctx, 176, 196, 214, 374, theme.trim);
  rect(ctx, 298, 196, 336, 374, theme.trim);
  drawCleanMarks(ctx, 156, 236, 356, 336, theme);
  wheel(ctx, 188, 440, theme);
  wheel(ctx, 324, 440, theme);
}

function drawBusinessCone(ctx, theme) {
  roundedRect(ctx, 196, 92, 316, 398, 34, [86, 104, 128, 255]);
  rect(ctx, 204, 154, 308, 186, theme.light);
  rect(ctx, 204, 254, 308, 286, theme.trim);
  roundedRect(ctx, 142, 388, 370, 450, 20, theme.dark);
}

function drawBusinessGate(ctx, theme) {
  roundedRect(ctx, 102, 122, 154, 420, 14, [62, 70, 82, 255]);
  roundedRect(ctx, 358, 122, 410, 420, 14, [62, 70, 82, 255]);
  roundedRect(ctx, 138, 152, 374, 206, 14, theme.light);
  roundedRect(ctx, 138, 268, 374, 322, 14, theme.trim);
  drawCleanMarks(ctx, 166, 180, 346, 296, theme);
}

function drawBusinessPlanter(ctx, theme) {
  roundedRect(ctx, 116, 248, 396, 402, 26, [76, 84, 92, 255]);
  rect(ctx, 140, 278, 372, 318, theme.trim);
  ellipse(ctx, 256, 230, 126, 58, [54, 118, 82, 255]);
  ellipse(ctx, 220, 208, 58, 30, [82, 146, 92, 255]);
  ellipse(ctx, 296, 204, 64, 32, [74, 134, 86, 255]);
  drawCleanMarks(ctx, 156, 350, 356, 350, theme);
}

function drawUndergroundBin(ctx, theme) {
  roundedRect(ctx, 118, 158, 394, 404, 20, [76, 78, 82, 255]);
  roundedRect(ctx, 146, 120, 366, 174, 14, [120, 122, 126, 255]);
  rect(ctx, 112, 390, 400, 430, theme.dark);
  rect(ctx, 176, 196, 214, 374, theme.trim);
  rect(ctx, 298, 196, 336, 374, theme.trim);
  drawHazardStripes(ctx, 150, 246, 362, 326, theme);
  wheel(ctx, 188, 440, theme);
  wheel(ctx, 324, 440, theme);
}

function drawUndergroundCone(ctx, theme) {
  tri(ctx, 256, 80, 108, 424, 404, 424, [94, 98, 104, 255]);
  tri(ctx, 256, 132, 180, 326, 332, 326, [140, 144, 150, 255]);
  rect(ctx, 86, 408, 426, 456, theme.dark);
  rect(ctx, 150, 292, 362, 328, theme.trim);
  rect(ctx, 190, 198, 322, 230, theme.light);
  drawHazardStripes(ctx, 184, 242, 328, 282, theme);
}

function drawUndergroundGate(ctx, theme) {
  roundedRect(ctx, 94, 96, 150, 432, 12, [68, 70, 76, 255]);
  roundedRect(ctx, 362, 96, 418, 432, 12, [68, 70, 76, 255]);
  rect(ctx, 126, 142, 386, 184, theme.light);
  rect(ctx, 126, 256, 386, 298, theme.light);
  drawHazardStripes(ctx, 132, 146, 380, 184, theme);
  drawHazardStripes(ctx, 132, 260, 380, 298, theme);
}

function drawUndergroundColumn(ctx, theme) {
  roundedRect(ctx, 156, 110, 356, 408, 26, [92, 94, 98, 255]);
  rect(ctx, 144, 156, 368, 202, theme.trim);
  rect(ctx, 144, 318, 368, 364, theme.trim);
  drawHazardStripes(ctx, 156, 156, 356, 202, theme);
  drawHazardStripes(ctx, 156, 318, 356, 364, theme);
}

function drawQuietBin(ctx, theme) {
  roundedRect(ctx, 120, 162, 392, 404, 24, [72, 108, 118, 255]);
  roundedRect(ctx, 148, 122, 364, 176, 18, [112, 148, 154, 255]);
  rect(ctx, 112, 390, 400, 430, theme.dark);
  rect(ctx, 178, 198, 214, 374, theme.trim);
  rect(ctx, 298, 198, 334, 374, theme.trim);
  drawCleanMarks(ctx, 158, 238, 354, 338, theme);
  wheel(ctx, 188, 440, theme);
  wheel(ctx, 324, 440, theme);
}

function drawQuietCone(ctx, theme) {
  tri(ctx, 256, 82, 110, 424, 402, 424, [92, 138, 168, 255]);
  tri(ctx, 256, 136, 184, 326, 328, 326, theme.accent);
  rect(ctx, 86, 408, 426, 456, theme.dark);
  rect(ctx, 150, 292, 362, 328, theme.light);
  rect(ctx, 190, 198, 322, 230, theme.trim);
}

function drawQuietGate(ctx, theme) {
  roundedRect(ctx, 96, 100, 148, 432, 16, [72, 94, 104, 255]);
  roundedRect(ctx, 364, 100, 416, 432, 16, [72, 94, 104, 255]);
  rect(ctx, 126, 142, 386, 184, theme.light);
  rect(ctx, 126, 256, 386, 298, theme.trim);
  drawCleanMarks(ctx, 154, 164, 358, 278, theme);
}

function drawQuietPlanter(ctx, theme) {
  roundedRect(ctx, 118, 256, 394, 404, 22, [82, 112, 94, 255]);
  rect(ctx, 146, 286, 366, 326, theme.trim);
  ellipse(ctx, 256, 230, 138, 56, [70, 138, 94, 255]);
  ellipse(ctx, 210, 210, 54, 30, [98, 162, 106, 255]);
  ellipse(ctx, 302, 208, 64, 32, [88, 150, 100, 255]);
}

function drawWinterBin(ctx, theme) {
  roundedRect(ctx, 120, 164, 392, 404, 24, [86, 118, 138, 255]);
  roundedRect(ctx, 148, 122, 364, 176, 18, [126, 160, 176, 255]);
  rect(ctx, 112, 390, 400, 430, theme.dark);
  rect(ctx, 178, 198, 214, 374, theme.trim);
  rect(ctx, 298, 198, 334, 374, theme.trim);
  drawSnowCaps(ctx, 142, 142, 370, 190, theme);
  wheel(ctx, 188, 440, theme);
  wheel(ctx, 324, 440, theme);
}

function drawWinterCone(ctx, theme) {
  tri(ctx, 256, 82, 110, 424, 402, 424, [82, 150, 188, 255]);
  tri(ctx, 256, 136, 184, 326, 328, 326, theme.accent);
  rect(ctx, 86, 408, 426, 456, theme.dark);
  rect(ctx, 150, 292, 362, 328, theme.light);
  rect(ctx, 190, 198, 322, 230, theme.light);
  drawSnowCaps(ctx, 172, 168, 340, 212, theme);
}

function drawWinterGate(ctx, theme) {
  roundedRect(ctx, 96, 100, 148, 432, 16, [78, 108, 128, 255]);
  roundedRect(ctx, 364, 100, 416, 432, 16, [78, 108, 128, 255]);
  rect(ctx, 126, 142, 386, 184, theme.light);
  rect(ctx, 126, 256, 386, 298, theme.accent);
  drawSnowCaps(ctx, 126, 122, 386, 164, theme);
  drawSnowCaps(ctx, 126, 236, 386, 278, theme);
}

function drawWinterSnow(ctx, theme) {
  ellipse(ctx, 256, 342, 168, 72, theme.light);
  ellipse(ctx, 198, 302, 88, 54, [226, 244, 252, 255]);
  ellipse(ctx, 308, 288, 104, 62, [236, 250, 255, 255]);
  circle(ctx, 214, 238, 46, theme.light);
  circle(ctx, 286, 220, 60, [230, 246, 254, 255]);
  roundedRect(ctx, 174, 118, 338, 190, 18, [122, 190, 224, 255]);
  rect(ctx, 246, 190, 270, 298, [90, 134, 160, 255]);
  drawSnowCaps(ctx, 168, 100, 344, 138, theme);
}

function drawForestBin(ctx, theme) {
  roundedRect(ctx, 120, 164, 392, 404, 24, [78, 104, 64, 255]);
  roundedRect(ctx, 148, 122, 364, 176, 18, [112, 132, 76, 255]);
  rect(ctx, 112, 390, 400, 430, theme.dark);
  rect(ctx, 178, 198, 214, 374, theme.trim);
  rect(ctx, 298, 198, 334, 374, theme.trim);
  drawLeaves(ctx, 152, 212, 360, 350, theme);
  wheel(ctx, 188, 440, theme);
  wheel(ctx, 324, 440, theme);
}

function drawForestCone(ctx, theme) {
  tri(ctx, 256, 82, 110, 424, 402, 424, [104, 126, 72, 255]);
  tri(ctx, 256, 136, 184, 326, 328, 326, [144, 164, 90, 255]);
  rect(ctx, 86, 408, 426, 456, theme.dark);
  rect(ctx, 150, 292, 362, 328, theme.light);
  rect(ctx, 190, 198, 322, 230, theme.trim);
  drawLeaves(ctx, 194, 238, 318, 362, theme);
}

function drawForestGate(ctx, theme) {
  roundedRect(ctx, 96, 100, 148, 432, 16, [70, 92, 54, 255]);
  roundedRect(ctx, 364, 100, 416, 432, 16, [70, 92, 54, 255]);
  rect(ctx, 126, 142, 386, 184, theme.trim);
  rect(ctx, 126, 256, 386, 298, theme.light);
  drawLeaves(ctx, 150, 196, 362, 348, theme);
}

function drawForestLeaves(ctx, theme) {
  roundedRect(ctx, 184, 172, 328, 386, 28, [100, 76, 46, 255]);
  ellipse(ctx, 256, 174, 82, 36, [132, 96, 54, 255]);
  ellipse(ctx, 256, 174, 48, 20, [86, 62, 38, 255]);
  ellipse(ctx, 256, 338, 162, 70, [74, 112, 56, 255]);
  drawLeaves(ctx, 134, 206, 378, 382, theme);
  line(ctx, 214, 210, 202, 342, [76, 54, 34, 255], 4);
  line(ctx, 298, 210, 312, 342, [76, 54, 34, 255], 4);
}

function drawHolidayCone(ctx, theme) {
  tri(ctx, 256, 76, 104, 424, 408, 424, [218, 58, 55, 255]);
  tri(ctx, 256, 128, 178, 326, 334, 326, [255, 126, 96, 255]);
  rect(ctx, 86, 408, 426, 456, theme.dark);
  rect(ctx, 146, 292, 366, 328, theme.ribbon);
  rect(ctx, 190, 198, 322, 230, theme.ribbon);
  drawStringLights(ctx, 176, 266, 336, 266, theme);
}

function drawHolidayGate(ctx, theme) {
  roundedRect(ctx, 96, 98, 148, 432, 18, [128, 42, 50, 255]);
  roundedRect(ctx, 364, 98, 416, 432, 18, [128, 42, 50, 255]);
  rect(ctx, 126, 142, 386, 184, theme.ribbon);
  rect(ctx, 126, 256, 386, 298, theme.ribbon);
  drawStringLights(ctx, 146, 162, 366, 162, theme);
  drawStringLights(ctx, 146, 276, 366, 276, theme);
}

function drawHolidayGift(ctx, theme) {
  roundedRect(ctx, 112, 154, 400, 398, 24, [39, 126, 86, 255]);
  rect(ctx, 92, 124, 420, 178, [210, 45, 62, 255]);
  rect(ctx, 236, 124, 276, 398, theme.ribbon);
  rect(ctx, 112, 244, 400, 284, theme.ribbon);
  circle(ctx, 214, 118, 44, theme.ribbon);
  circle(ctx, 298, 118, 44, theme.ribbon);
  rect(ctx, 186, 94, 326, 134, theme.ribbon);
  drawStringLights(ctx, 142, 344, 370, 344, theme);
}

function drawVehicleDecor(ctx, x0, y0, x1, y1, horizontal, theme) {
  const cx = Math.floor((x0 + x1) / 2);
  const cy = Math.floor((y0 + y1) / 2);
  if (theme.kind === "holiday") {
    drawStringLights(ctx, horizontal ? x0 + 84 : x0 + 20, horizontal ? y0 + 20 : y0 + 84, horizontal ? x1 - 84 : x0 + 20, horizontal ? y0 + 20 : y1 - 84, theme);
    drawRibbon(ctx, cx, cy, horizontal, theme);
  } else if (theme.kind === "rainy") {
    drawRainDrops(ctx, x0 + 52, y0 + 52, x1 - 52, y1 - 52, theme);
    if (horizontal) rect(ctx, x0 + 96, cy - 16, x1 - 96, cy + 16, theme.trim);
    else rect(ctx, cx - 16, y0 + 96, cx + 16, y1 - 96, theme.trim);
  } else if (theme.kind === "neon") {
    drawNeonDots(ctx, horizontal ? x0 + 112 : cx, horizontal ? cy : y0 + 112, horizontal ? x1 - 112 : cx, horizontal ? cy : y1 - 112, theme);
  } else if (theme.kind === "night") {
    drawWarmReflectors(ctx, horizontal ? x0 + 108 : cx, horizontal ? cy : y0 + 108, horizontal ? x1 - 108 : cx, horizontal ? cy : y1 - 108, theme);
  } else if (theme.kind === "oldblock") {
    drawCracks(ctx, x0 + 80, y0 + 74, x1 - 80, y1 - 74, theme);
  } else if (theme.kind === "business") {
    drawCleanMarks(ctx, horizontal ? x0 + 122 : cx, horizontal ? cy : y0 + 122, horizontal ? x1 - 122 : cx, horizontal ? cy : y1 - 122, theme);
  } else if (theme.kind === "underground") {
    if (horizontal) drawHazardStripes(ctx, x0 + 112, cy - 22, x1 - 112, cy + 22, theme);
    else drawHazardStripes(ctx, cx - 18, y0 + 112, cx + 18, y1 - 112, theme);
  } else if (theme.kind === "quiet") {
    drawCleanMarks(ctx, horizontal ? x0 + 130 : cx, horizontal ? cy : y0 + 130, horizontal ? x1 - 130 : cx, horizontal ? cy : y1 - 130, theme);
  } else if (theme.kind === "winter") {
    drawSnowCaps(ctx, x0 + 72, y0 + 36, x1 - 72, y0 + 78, theme);
  } else if (theme.kind === "forest") {
    drawLeaves(ctx, x0 + 80, y0 + 62, x1 - 80, y1 - 62, theme);
  }
}

function drawVehicleShapeDetails(ctx, x0, y0, x1, y1, horizontal, length, theme) {
  const cx = Math.floor((x0 + x1) / 2);
  const cy = Math.floor((y0 + y1) / 2);
  if (theme.kind === "business") {
    if (horizontal) {
      rect(ctx, x0 + 72, y0 + 92, x1 - 72, y0 + 116, theme.light);
      rect(ctx, x0 + 72, y1 - 116, x1 - 72, y1 - 92, theme.light);
    } else {
      rect(ctx, x0 + 92, y0 + 72, x0 + 116, y1 - 72, theme.light);
      rect(ctx, x1 - 116, y0 + 72, x1 - 92, y1 - 72, theme.light);
    }
  } else if (theme.kind === "underground") {
    if (horizontal) {
      rect(ctx, x0 + 66, y0 + 104, x1 - 66, y0 + 130, shade(theme.dark, 18));
      rect(ctx, x0 + 66, y1 - 130, x1 - 66, y1 - 104, shade(theme.dark, 18));
    } else {
      rect(ctx, x0 + 104, y0 + 66, x0 + 130, y1 - 66, shade(theme.dark, 18));
      rect(ctx, x1 - 130, y0 + 66, x1 - 104, y1 - 66, shade(theme.dark, 18));
    }
  } else if (theme.kind === "forest" || theme.kind === "winter") {
    if (horizontal) {
      rect(ctx, x0 + 130, y0 + 104, x1 - 130, y0 + 124, theme.dark);
      rect(ctx, x0 + 130, y1 - 124, x1 - 130, y1 - 104, theme.dark);
      if (length === 3) rect(ctx, cx - 120, cy - 18, cx + 120, cy + 18, theme.light);
    } else {
      rect(ctx, x0 + 104, y0 + 130, x0 + 124, y1 - 130, theme.dark);
      rect(ctx, x1 - 124, y0 + 130, x1 - 104, y1 - 130, theme.dark);
      if (length === 3) rect(ctx, cx - 18, cy - 120, cx + 18, cy + 120, theme.light);
    }
  } else if (theme.kind === "oldblock") {
    drawCracks(ctx, x0 + 82, y0 + 92, x1 - 82, y1 - 92, theme);
  } else if (theme.kind === "rainy") {
    if (horizontal) {
      ellipse(ctx, x0 + 170, y0 + 96, 62, 18, [230, 246, 255, 120]);
      ellipse(ctx, x1 - 190, y1 - 96, 80, 18, [230, 246, 255, 100]);
    } else {
      ellipse(ctx, x0 + 96, y0 + 170, 18, 62, [230, 246, 255, 120]);
      ellipse(ctx, x1 - 96, y1 - 190, 18, 80, [230, 246, 255, 100]);
    }
  } else if (theme.kind === "neon") {
    if (horizontal) rect(ctx, x0 + 94, cy - 8, x1 - 94, cy + 8, theme.trim);
    else rect(ctx, cx - 8, y0 + 94, cx + 8, y1 - 94, theme.trim);
  }
}

function drawVehicleDirectionMarkers(ctx, x0, y0, x1, y1, horizontal, theme) {
  const headlight = theme.kind === "night" || theme.kind === "holiday" ? theme.light : [238, 246, 250, 255];
  const tail = [210, 44, 58, 255];
  if (horizontal) {
    roundedRect(ctx, x1 - 62, y0 + 86, x1 - 28, y0 + 126, 10, headlight);
    roundedRect(ctx, x1 - 62, y1 - 126, x1 - 28, y1 - 86, 10, headlight);
    roundedRect(ctx, x0 + 28, y0 + 96, x0 + 52, y0 + 134, 8, tail);
    roundedRect(ctx, x0 + 28, y1 - 134, x0 + 52, y1 - 96, 8, tail);
    rect(ctx, x1 - 116, Math.floor((y0 + y1) / 2) - 18, x1 - 72, Math.floor((y0 + y1) / 2) + 18, theme.trim);
  } else {
    roundedRect(ctx, x0 + 86, y0 + 28, x0 + 126, y0 + 62, 10, headlight);
    roundedRect(ctx, x1 - 126, y0 + 28, x1 - 86, y0 + 62, 10, headlight);
    roundedRect(ctx, x0 + 96, y1 - 52, x0 + 134, y1 - 28, 8, tail);
    roundedRect(ctx, x1 - 134, y1 - 52, x1 - 96, y1 - 28, 8, tail);
    rect(ctx, Math.floor((x0 + x1) / 2) - 18, y0 + 72, Math.floor((x0 + x1) / 2) + 18, y0 + 116, theme.trim);
  }
}

function drawRibbon(ctx, cx, cy, horizontal, theme) {
  if (horizontal) {
    rect(ctx, cx - 24, cy - 112, cx + 24, cy + 112, theme.ribbon);
    rect(ctx, cx - 112, cy - 20, cx + 112, cy + 20, theme.ribbon);
  } else {
    rect(ctx, cx - 112, cy - 24, cx + 112, cy + 24, theme.ribbon);
    rect(ctx, cx - 20, cy - 112, cx + 20, cy + 112, theme.ribbon);
  }
  circle(ctx, cx - 28, cy - 22, 26, theme.ribbon);
  circle(ctx, cx + 28, cy - 22, 26, theme.ribbon);
}

function drawStringLights(ctx, x0, y0, x1, y1, theme) {
  const bulbs = [theme.light, theme.ribbon, theme.accent, [101, 214, 145, 255]];
  const count = 7;
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    circle(ctx, x, y, 10, bulbs[i % bulbs.length]);
  }
}

function drawRainDrops(ctx, x0, y0, x1, y1, theme) {
  const count = 8;
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    const x = Math.round(x0 + (x1 - x0) * ((i * 37) % 100) / 100);
    const y = Math.round(y0 + (y1 - y0) * t);
    ellipse(ctx, x, y, 8, 16, i % 2 ? theme.light : theme.trim);
  }
}

function drawNeonDots(ctx, x0, y0, x1, y1, theme) {
  const colors = [theme.trim, theme.accent, theme.light];
  for (let i = 0; i < 6; i += 1) {
    const t = i / 5;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    circle(ctx, x, y, 13, colors[i % colors.length]);
  }
}

function drawWarmReflectors(ctx, x0, y0, x1, y1, theme) {
  for (let i = 0; i < 5; i += 1) {
    const t = i / 4;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    circle(ctx, x, y, 12, i % 2 ? theme.light : theme.accent);
  }
}

function drawCracks(ctx, x0, y0, x1, y1, theme) {
  const color = shade(theme.dark, 28);
  for (let i = 0; i < 4; i += 1) {
    const x = x0 + i * Math.floor((x1 - x0) / 4);
    const y = y0 + ((i * 43) % Math.max(1, y1 - y0));
    line(ctx, x, y, x + 42, y + 24, color, 5);
    line(ctx, x + 34, y + 18, x + 58, y - 10, color, 4);
  }
}

function drawCleanMarks(ctx, x0, y0, x1, y1, theme) {
  const count = 4;
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    rect(ctx, x - 18, y - 8, x + 18, y + 8, i % 2 ? theme.light : theme.trim);
  }
}

function drawHazardStripes(ctx, x0, y0, x1, y1, theme) {
  rect(ctx, x0, y0, x1, y1, theme.dark);
  const stripeWidth = 26;
  for (let x = x0 - (y1 - y0); x <= x1; x += stripeWidth * 2) {
    clippedTri(ctx, x0, y0, x1, y1, x, y1, x + stripeWidth, y1, x + stripeWidth + (y1 - y0), y0, theme.trim);
    clippedTri(ctx, x0, y0, x1, y1, x, y1, x + (y1 - y0), y0, x + stripeWidth + (y1 - y0), y0, theme.trim);
  }
}

function clippedTri(ctx, clipX0, clipY0, clipX1, clipY1, ax, ay, bx, by, cx, cy, color) {
  const minX = Math.max(clipX0, Math.floor(Math.min(ax, bx, cx)));
  const maxX = Math.min(clipX1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(clipY0, Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(clipY1, Math.ceil(Math.max(ay, by, cy)));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const w0 = edge(bx, by, cx, cy, x, y);
      const w1 = edge(cx, cy, ax, ay, x, y);
      const w2 = edge(ax, ay, bx, by, x, y);
      if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) set(ctx, x, y, color);
    }
  }
}

function drawSnowCaps(ctx, x0, y0, x1, y1, theme) {
  ellipse(ctx, Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2), Math.round((x1 - x0) / 2), Math.round((y1 - y0) / 2), theme.light);
  circle(ctx, x0 + 42, y1 - 8, 18, theme.light);
  circle(ctx, x1 - 54, y1 - 4, 22, theme.light);
}

function drawLeaves(ctx, x0, y0, x1, y1, theme) {
  const colors = [
    theme.accent,
    theme.trim,
    [118, 82, 48, 255],
    [86, 126, 58, 255]
  ];
  for (let i = 0; i < 12; i += 1) {
    const x = x0 + ((i * 37) % Math.max(1, x1 - x0));
    const y = y0 + ((i * 53) % Math.max(1, y1 - y0));
    ellipse(ctx, x, y, 18, 9, colors[i % colors.length]);
  }
}

function line(ctx, x0, y0, x1, y1, color, width) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i += 1) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    circle(ctx, x, y, width, color);
  }
}

function wheel(ctx, cx, cy, theme) {
  circle(ctx, cx, cy, 42, theme.dark);
  circle(ctx, cx, cy, 22, [210, 218, 220, 255]);
}

function roundedRect(ctx, x0, y0, x1, y1, r, color) {
  rect(ctx, x0 + r, y0, x1 - r, y1, color);
  rect(ctx, x0, y0 + r, x1, y1 - r, color);
  circle(ctx, x0 + r, y0 + r, r, color);
  circle(ctx, x1 - r, y0 + r, r, color);
  circle(ctx, x0 + r, y1 - r, r, color);
  circle(ctx, x1 - r, y1 - r, r, color);
}

function rect(ctx, x0, y0, x1, y1, color) {
  for (let y = Math.max(0, y0); y <= Math.min(ctx.height - 1, y1); y += 1) {
    for (let x = Math.max(0, x0); x <= Math.min(ctx.width - 1, x1); x += 1) {
      set(ctx, x, y, color);
    }
  }
}

function circle(ctx, cx, cy, radius, color) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) set(ctx, x, y, color);
    }
  }
}

function ellipse(ctx, cx, cy, rx, ry, color) {
  for (let y = cy - ry; y <= cy + ry; y += 1) {
    for (let x = cx - rx; x <= cx + rx; x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) set(ctx, x, y, color);
    }
  }
}

function tri(ctx, ax, ay, bx, by, cx, cy, color) {
  const minX = Math.floor(Math.min(ax, bx, cx));
  const maxX = Math.ceil(Math.max(ax, bx, cx));
  const minY = Math.floor(Math.min(ay, by, cy));
  const maxY = Math.ceil(Math.max(ay, by, cy));
  const area = edge(ax, ay, bx, by, cx, cy);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const w0 = edge(bx, by, cx, cy, x, y);
      const w1 = edge(cx, cy, ax, ay, x, y);
      const w2 = edge(ax, ay, bx, by, x, y);
      if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) set(ctx, x, y, color);
    }
  }
  void area;
}

function edge(ax, ay, bx, by, cx, cy) {
  return (cx - ax) * (by - ay) - (cy - ay) * (bx - ax);
}

function set(ctx, x, y, color) {
  if (x < 0 || y < 0 || x >= ctx.width || y >= ctx.height) return;
  const index = (y * ctx.width + x) * 4;
  ctx.pixels[index] = color[0];
  ctx.pixels[index + 1] = color[1];
  ctx.pixels[index + 2] = color[2];
  ctx.pixels[index + 3] = color[3];
}

function shade(color, amount) {
  return [
    clamp(color[0] + amount),
    clamp(color[1] + amount),
    clamp(color[2] + amount),
    color[3]
  ];
}

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function renderPng(width, height, draw) {
  const ctx = { width, height, pixels: Buffer.alloc(width * height * 4) };
  draw(ctx);
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    ctx.pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const buffer = Buffer.alloc(12 + data.length);
  buffer.writeUInt32BE(data.length, 0);
  typeBuffer.copy(buffer, 4);
  data.copy(buffer, 8);
  buffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return buffer;
}

const CRC_TABLE = makeCrcTable();

main();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
