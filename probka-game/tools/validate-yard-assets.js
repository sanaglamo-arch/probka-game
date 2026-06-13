#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const yardFile = path.join(root, "yards.js");
const STANDARD_GRID_FRAME = { left: 125, top: 125, right: 845, bottom: 845 };

const REQUIRED_VEHICLES = {
  car2Horizontal: { width: 768, height: 384, axis: "horizontal" },
  car2Vertical: { width: 384, height: 768, axis: "vertical" },
  van3Horizontal: { width: 1152, height: 384, axis: "horizontal" },
  van3Vertical: { width: 384, height: 1152, axis: "vertical" }
};

const REQUIRED_OBSTACLES = {
  bin: { width: 512, height: 512 },
  cone: { width: 512, height: 512 },
  gate: { width: 512, height: 512 },
  themeBlock: { width: 512, height: 512 }
};

main();

function main() {
  const options = parseArgs(process.argv.slice(2));
  let yards = loadYards();
  const errors = [];
  if (options.yardId) yards = yards.filter((yard) => yard.id === options.yardId);
  if (options.yardId && !yards.length) errors.push(`unknown yard ${options.yardId}`);
  if (!options.yardId && yards.length !== 10) errors.push(`expected 10 yards, got ${yards.length}`);

  const ids = new Set();
  yards.forEach((yard) => {
    if (ids.has(yard.id)) errors.push(`${yard.id}: duplicate id`);
    ids.add(yard.id);
    validateYard(yard, errors, options);
  });

  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exit(1);
  }

  console.log(`Yard assets valid: ${yards.length} yard${yards.length === 1 ? "" : "s"}`);
}

function parseArgs(args) {
  const options = { yardId: "", boardOnly: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--yard") {
      options.yardId = args[index + 1] || "";
      index += 1;
    } else if (arg === "--board-only") {
      options.boardOnly = true;
    }
  }
  return options;
}

function loadYards() {
  const code = fs.readFileSync(yardFile, "utf8");
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: yardFile });
  return sandbox.PROBKA_YARDS || [];
}

function validateYard(yard, errors, options) {
  if (!yard.fullArtBoard) errors.push(`${yard.id}: fullArtBoard must be true`);
  const frame = yard.gridFrame || {};
  validateGridFrame(yard.id, frame, errors);
  const exit = yard.exitFrame || {};
  validateExitFrame(yard.id, frame, exit, errors);
  const assets = yard.assets || {};
  validatePng(yard.id, "board", assets.board, { width: 1024, height: 1024, alpha: false }, errors);
  if (options.boardOnly) return;

  Object.entries(REQUIRED_VEHICLES).forEach(([key, spec]) => {
    validatePng(yard.id, `traffic.${key}`, assets.traffic && assets.traffic[key], { ...spec, alpha: true, minCoverage: 0.28, maxCoverage: 0.92, minPrimaryCoverage: 0.88, minSecondaryCoverage: 0.72 }, errors);
  });
  Object.entries(REQUIRED_OBSTACLES).forEach(([key, spec]) => {
    validatePng(yard.id, `obstacles.${key}`, assets.obstacles && assets.obstacles[key], { ...spec, alpha: true, minCoverage: 0.12, maxCoverage: 0.78 }, errors);
  });
}

function validateGridFrame(yardId, frame, errors) {
  const values = ["left", "top", "right", "bottom"].map((key) => Number(frame[key]));
  if (values.some((value) => !Number.isFinite(value))) {
    errors.push(`${yardId}: gridFrame has non-numeric values`);
    return;
  }
  const [left, top, right, bottom] = values;
  Object.entries(STANDARD_GRID_FRAME).forEach(([key, expected]) => {
    if (Math.abs(Number(frame[key]) - expected) > 0.5) {
      errors.push(`${yardId}: gridFrame.${key} must be ${expected}, got ${Number(frame[key]).toFixed(1)}`);
    }
  });
  const width = right - left;
  const height = bottom - top;
  if (left < 60 || top < 60 || right > 970 || bottom > 970) {
    errors.push(`${yardId}: gridFrame must stay inside the 1024 board with art margins`);
  }
  if (width < 660 || width > 830 || height < 660 || height > 830) {
    errors.push(`${yardId}: gridFrame size must be a plausible 6x6 board (${width.toFixed(1)}x${height.toFixed(1)})`);
  }
  if (Math.abs(width - height) > 12) {
    errors.push(`${yardId}: gridFrame must be close to square (${width.toFixed(1)}x${height.toFixed(1)})`);
  }
}

function validateExitFrame(yardId, frame, exit, errors) {
  if (exit.row !== 2) errors.push(`${yardId}: exitFrame.row must be 2`);
  const cell = (Number(frame.bottom) - Number(frame.top)) / 6;
  const expectedY = Number(frame.top) + cell * 2;
  const expectedX = Number(frame.right);
  if (Math.abs(Number(exit.x) - expectedX) > 1) {
    errors.push(`${yardId}: exitFrame.x must align to right grid edge`);
  }
  if (Math.abs(Number(exit.y) - expectedY) > 1.5 || Math.abs(Number(exit.height) - cell) > 1.5) {
    errors.push(`${yardId}: exitFrame must align to third row`);
  }
}

function validatePng(yardId, label, source, spec, errors) {
  if (!source) {
    errors.push(`${yardId}: missing ${label}`);
    return;
  }
  const file = resolveAsset(source);
  if (!fs.existsSync(file)) {
    errors.push(`${yardId}: missing file ${source}`);
    return;
  }

  let image;
  try {
    image = readPng(file);
  } catch (error) {
    errors.push(`${yardId}: ${source}: ${error.message}`);
    return;
  }

  if (image.width !== spec.width || image.height !== spec.height) {
    errors.push(`${yardId}: ${source}: expected ${spec.width}x${spec.height}, got ${image.width}x${image.height}`);
  }

  if (!spec.alpha) return;

  const corners = [
    getPixel(image, 0, 0)[3],
    getPixel(image, image.width - 1, 0)[3],
    getPixel(image, 0, image.height - 1)[3],
    getPixel(image, image.width - 1, image.height - 1)[3]
  ];
  if (corners.some((alpha) => alpha > 8)) errors.push(`${yardId}: ${source}: sprite corners are not transparent`);

  const box = alphaBounds(image, 12);
  if (!box) {
    errors.push(`${yardId}: ${source}: no visible alpha`);
    return;
  }
  if (box.x0 <= 1 || box.y0 <= 1 || box.x1 >= image.width - 2 || box.y1 >= image.height - 2) {
    errors.push(`${yardId}: ${source}: visible pixels touch edge (${box.x0},${box.y0},${box.x1},${box.y1})`);
  }
  const coverage = ((box.x1 - box.x0 + 1) * (box.y1 - box.y0 + 1)) / (image.width * image.height);
  if (coverage < spec.minCoverage || coverage > spec.maxCoverage) {
    errors.push(`${yardId}: ${source}: suspicious sprite coverage ${coverage.toFixed(2)}`);
  }
  if (spec.axis) {
    const boxWidthRatio = (box.x1 - box.x0 + 1) / image.width;
    const boxHeightRatio = (box.y1 - box.y0 + 1) / image.height;
    const primary = spec.axis === "horizontal" ? boxWidthRatio : boxHeightRatio;
    const secondary = spec.axis === "horizontal" ? boxHeightRatio : boxWidthRatio;
    if (primary < spec.minPrimaryCoverage) {
      errors.push(`${yardId}: ${source}: vehicle is visually too short on ${spec.axis} axis (${primary.toFixed(2)})`);
    }
    if (secondary < spec.minSecondaryCoverage) {
      errors.push(`${yardId}: ${source}: vehicle is visually too thin on secondary axis (${secondary.toFixed(2)})`);
    }
  }
  const fringe = countLikelyChromaPixels(image);
  if (fringe > Math.max(20, image.width * image.height * 0.0004)) {
    errors.push(`${yardId}: ${source}: likely chroma fringe (${fringe} pixels)`);
  }
}

function resolveAsset(source) {
  return path.join(root, source.replace(/[?#].*$/, "").replace(/^\.\//, ""));
}

function readPng(file) {
  const data = fs.readFileSync(file);
  if (!data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new Error("not a PNG");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 8;
  let palette = null;
  let trns = null;
  const idat = [];
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.subarray(offset + 4, offset + 8).toString("ascii");
    const payload = data.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = payload.readUInt32BE(0);
      height = payload.readUInt32BE(4);
      bitDepth = payload[8];
      colorType = payload[9];
      const interlace = payload[12];
      if (interlace !== 0) throw new Error("unsupported PNG interlace");
      if (![0, 2, 3, 4, 6].includes(colorType)) throw new Error(`unsupported PNG color type ${colorType}`);
      if (![1, 2, 4, 8, 16].includes(bitDepth)) throw new Error(`unsupported PNG bit depth ${bitDepth}`);
    } else if (type === "PLTE") {
      palette = Buffer.from(payload);
    } else if (type === "tRNS") {
      trns = Buffer.from(payload);
    } else if (type === "IDAT") {
      idat.push(payload);
    } else if (type === "IEND") {
      break;
    }
  }
  // Normalize any PNG (grayscale/RGB/palette/alpha, bit depth 1-16) into an RGBA buffer.
  // pngquant ships palette PNGs (color type 3), optipng may drop bit depth below 8.
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : 4;
  const bpp = Math.max(1, Math.ceil((bitDepth * channels) / 8));
  const stride = Math.ceil((width * channels * bitDepth) / 8);
  const maxSample = (1 << bitDepth) - 1;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(width * height * 4);
  const scale = (v) => (bitDepth === 8 || bitDepth === 16 ? v : Math.round((v * 255) / maxSample));
  const sampleAt = (row, sampleIndex) => {
    if (bitDepth === 8) return row[sampleIndex];
    if (bitDepth === 16) return row[sampleIndex * 2];
    const perByte = 8 / bitDepth;
    const byteIndex = Math.floor(sampleIndex / perByte);
    const shift = 8 - bitDepth * ((sampleIndex % perByte) + 1);
    return (row[byteIndex] >> shift) & maxSample;
  };
  let src = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[src++];
    const row = Buffer.from(raw.subarray(src, src + stride));
    src += stride;
    unfilterRow(row, prev, bpp, filter);
    for (let x = 0; x < width; x += 1) {
      const to = (y * width + x) * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 255;
      if (colorType === 3) {
        const idx = sampleAt(row, x);
        if (palette) {
          r = palette[idx * 3];
          g = palette[idx * 3 + 1];
          b = palette[idx * 3 + 2];
        }
        a = trns && idx < trns.length ? trns[idx] : 255;
      } else if (colorType === 0) {
        r = g = b = scale(sampleAt(row, x));
      } else if (colorType === 4) {
        r = g = b = scale(sampleAt(row, x * 2));
        a = scale(sampleAt(row, x * 2 + 1));
      } else if (colorType === 2) {
        r = scale(sampleAt(row, x * 3));
        g = scale(sampleAt(row, x * 3 + 1));
        b = scale(sampleAt(row, x * 3 + 2));
      } else {
        r = scale(sampleAt(row, x * 4));
        g = scale(sampleAt(row, x * 4 + 1));
        b = scale(sampleAt(row, x * 4 + 2));
        a = scale(sampleAt(row, x * 4 + 3));
      }
      pixels[to] = r;
      pixels[to + 1] = g;
      pixels[to + 2] = b;
      pixels[to + 3] = a;
    }
    prev = row;
  }
  return { width, height, pixels };
}

function unfilterRow(row, prev, channels, filter) {
  for (let i = 0; i < row.length; i += 1) {
    const left = i >= channels ? row[i - channels] : 0;
    const up = prev[i] || 0;
    const upLeft = i >= channels ? prev[i - channels] : 0;
    if (filter === 1) row[i] = (row[i] + left) & 255;
    else if (filter === 2) row[i] = (row[i] + up) & 255;
    else if (filter === 3) row[i] = (row[i] + Math.floor((left + up) / 2)) & 255;
    else if (filter === 4) row[i] = (row[i] + paeth(left, up, upLeft)) & 255;
    else if (filter !== 0) throw new Error(`unsupported filter ${filter}`);
  }
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function getPixel(image, x, y) {
  const index = (y * image.width + x) * 4;
  return [image.pixels[index], image.pixels[index + 1], image.pixels[index + 2], image.pixels[index + 3]];
}

function alphaBounds(image, minAlpha) {
  let x0 = image.width;
  let y0 = image.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (getPixel(image, x, y)[3] >= minAlpha) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < x0 ? null : { x0, y0, x1, y1 };
}

function countLikelyChromaPixels(image) {
  let count = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const [r, g, b, a] = getPixel(image, x, y);
      if (a <= 0) continue;
      const greenKey = g > 180 && r < 80 && b < 100;
      const magentaKey = r > 140 && b > 140 && g < 100;
      if (greenKey || magentaKey) count += 1;
    }
  }
  return count;
}
