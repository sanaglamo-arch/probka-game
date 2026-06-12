#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const yardFile = path.join(root, "yards.js");
const MIN_ALPHA = 12;
const TOLERANCE = 1;

const TARGETS = {
  traffic: {
    car2Horizontal: { width: 768, height: 384, box: { x: 24, y: 36, width: 720, height: 312 } },
    car2Vertical: { width: 384, height: 768, box: { x: 36, y: 24, width: 312, height: 720 } },
    van3Horizontal: { width: 1152, height: 384, box: { x: 36, y: 36, width: 1080, height: 312 } },
    van3Vertical: { width: 384, height: 1152, box: { x: 36, y: 36, width: 312, height: 1080 } }
  },
  obstacles: {
    bin: { width: 512, height: 512, box: { x: 64, y: 64, width: 384, height: 384 } },
    cone: { width: 512, height: 512, box: { x: 64, y: 48, width: 384, height: 416 } },
    gate: { width: 512, height: 512, box: { x: 40, y: 184, width: 432, height: 144 } },
    themeBlock: { width: 512, height: 512, box: { x: 64, y: 96, width: 384, height: 320 } }
  }
};

const MONTAGE_ORDER = [
  ["traffic", "car2Horizontal"],
  ["traffic", "car2Vertical"],
  ["traffic", "van3Horizontal"],
  ["traffic", "van3Vertical"],
  ["obstacles", "bin"],
  ["obstacles", "cone"],
  ["obstacles", "gate"],
  ["obstacles", "themeBlock"]
];

const CRC_TABLE = makeCrcTable();

main();

function main() {
  const options = parseArgs(process.argv.slice(2));
  let yards = loadYards();
  if (options.yardId) yards = yards.filter((yard) => yard.id === options.yardId);
  if (options.yardId && !yards.length) fail(`Unknown yard: ${options.yardId}`);

  const jobs = collectJobs(yards);
  const reports = [];
  const errors = [];
  const seen = new Set();

  jobs.forEach((job) => {
    const dedupeKey = `${job.file}:${job.group}:${job.key}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    try {
      const report = processJob(job, options.checkOnly);
      if (report) reports.push(report);
    } catch (error) {
      errors.push(error.message);
    }
  });

  if (options.montagePath) {
    const montage = makeMontage(yards, reports.filter((report) => report.role === "runtime"));
    const montagePath = path.resolve(options.montagePath);
    fs.mkdirSync(path.dirname(montagePath), { recursive: true });
    writePng(montage, montagePath);
    console.log(`Montage: ${montagePath}`);
    console.log(`Montage columns: ${MONTAGE_ORDER.map((entry) => entry.join(".")).join(", ")}`);
  }

  if (errors.length) fail(errors.map((error) => `- ${error}`).join("\n"));

  const mode = options.checkOnly ? "valid" : "normalized";
  const runtimeCount = reports.filter((report) => report.role === "runtime").length;
  const sourceCount = reports.filter((report) => report.role === "source").length;
  console.log(`Yard sprites ${mode}: ${runtimeCount} runtime, ${sourceCount} source`);
}

function parseArgs(args) {
  const options = { checkOnly: false, montagePath: "", yardId: "" };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--check") {
      options.checkOnly = true;
    } else if (arg === "--montage") {
      options.montagePath = args[index + 1] || "";
      index += 1;
    } else if (arg === "--yard") {
      options.yardId = args[index + 1] || "";
      index += 1;
    } else {
      fail(`Unknown argument: ${arg}`);
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

function collectJobs(yards) {
  const jobs = [];
  yards.forEach((yard) => {
    Object.entries(TARGETS.traffic).forEach(([key, target]) => {
      addAssetJobs(jobs, yard, "traffic", key, yard.assets && yard.assets.traffic && yard.assets.traffic[key], target);
    });
    Object.entries(TARGETS.obstacles).forEach(([key, target]) => {
      addAssetJobs(jobs, yard, "obstacles", key, yard.assets && yard.assets.obstacles && yard.assets.obstacles[key], target);
    });
  });
  return jobs;
}

function addAssetJobs(jobs, yard, group, key, source, target) {
  if (!source) {
    jobs.push({ yardId: yard.id, group, key, file: "", target, role: "runtime", missing: true });
    return;
  }
  const file = resolveAsset(source);
  jobs.push({ yardId: yard.id, group, key, file, target, role: "runtime", missing: false });

  const sourceFile = path.join(path.dirname(path.dirname(file)), "source", group, path.basename(file));
  if (fs.existsSync(sourceFile)) {
    jobs.push({ yardId: yard.id, group, key, file: sourceFile, target, role: "source", missing: false });
  }
}

function processJob(job, checkOnly) {
  const label = `${job.yardId}.${job.group}.${job.key}${job.role === "source" ? " source" : ""}`;
  if (job.missing || !job.file) throw new Error(`${label}: missing manifest source`);
  if (!fs.existsSync(job.file)) throw new Error(`${label}: missing file ${relative(job.file)}`);

  const image = readPng(job.file);
  if (image.width !== job.target.width || image.height !== job.target.height) {
    throw new Error(`${label}: expected ${job.target.width}x${job.target.height}, got ${image.width}x${image.height}`);
  }

  const cleaned = cloneImage(image);
  eraseChromaFringe(cleaned);
  clearSoftChromaPixels(cleaned);
  clearLowAlphaPixels(cleaned);
  const before = alphaBounds(cleaned, MIN_ALPHA);
  if (!before) throw new Error(`${label}: no visible alpha`);

  const normalized = normalizeImage(cleaned, before, job.target);
  eraseChromaFringe(normalized);
  clearSoftChromaPixels(normalized);
  clearLowAlphaPixels(normalized);
  const after = alphaBounds(normalized, MIN_ALPHA);
  const errors = validateNormalized(label, normalized, job.target, after);
  if (errors.length) throw new Error(errors.join("\n"));

  if (!checkOnly) writePng(normalized, job.file);
  return {
    yardId: job.yardId,
    group: job.group,
    key: job.key,
    role: job.role,
    before,
    after,
    file: job.file,
    image: checkOnly ? image : normalized
  };
}

function normalizeImage(image, sourceBox, target) {
  const output = {
    width: target.width,
    height: target.height,
    pixels: Buffer.alloc(target.width * target.height * 4)
  };
  resizeInto(image, sourceBox, output, target.box);
  return output;
}

function cloneImage(image) {
  return {
    width: image.width,
    height: image.height,
    pixels: Buffer.from(image.pixels)
  };
}

function eraseChromaFringe(image) {
  const visited = new Uint8Array(image.width * image.height);
  const queue = [];

  function enqueue(x, y) {
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
    const pixelIndex = y * image.width + x;
    if (visited[pixelIndex]) return;
    const dataIndex = pixelIndex * 4;
    if (!isOutsidePixel(image, dataIndex)) return;
    visited[pixelIndex] = 1;
    queue.push(pixelIndex);
  }

  for (let x = 0; x < image.width; x += 1) {
    enqueue(x, 0);
    enqueue(x, image.height - 1);
  }
  for (let y = 0; y < image.height; y += 1) {
    enqueue(0, y);
    enqueue(image.width - 1, y);
  }

  while (queue.length) {
    const pixelIndex = queue.pop();
    const x = pixelIndex % image.width;
    const y = Math.floor(pixelIndex / image.width);
    const dataIndex = pixelIndex * 4;
    if (isChromaKeyPixel(image, dataIndex)) clearPixel(image, dataIndex);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }
}

function isOutsidePixel(image, index) {
  return image.pixels[index + 3] < MIN_ALPHA || isChromaKeyPixel(image, index);
}

function isChromaKeyPixel(image, index) {
  const r = image.pixels[index];
  const g = image.pixels[index + 1];
  const b = image.pixels[index + 2];
  const a = image.pixels[index + 3];
  if (a <= 0) return false;
  const greenKey = g > 175 && r < 100 && b < 130;
  const magentaKey = r > 135 && b > 135 && g <= 115 && Math.abs(r - b) < 90;
  const darkMagentaKey = r > 70 && b > 70 && g < 45 && Math.abs(r - b) < 75;
  const deepPurpleKey = r > 40 && b > 50 && g < 35 && Math.abs(r - b) < 70;
  return greenKey || magentaKey || darkMagentaKey || deepPurpleKey;
}

function clearPixel(image, index) {
  image.pixels[index] = 0;
  image.pixels[index + 1] = 0;
  image.pixels[index + 2] = 0;
  image.pixels[index + 3] = 0;
}

function clearLowAlphaPixels(image) {
  for (let index = 0; index < image.pixels.length; index += 4) {
    if (image.pixels[index + 3] >= MIN_ALPHA) continue;
    clearPixel(image, index);
  }
}

function clearSoftChromaPixels(image) {
  for (let index = 0; index < image.pixels.length; index += 4) {
    const alpha = image.pixels[index + 3];
    if (alpha <= 0 || alpha >= 250 || !isChromaKeyPixel(image, index)) continue;
    clearPixel(image, index);
  }
}

function validateNormalized(label, image, target, box) {
  const errors = [];
  if (image.width !== target.width || image.height !== target.height) {
    errors.push(`${label}: expected ${target.width}x${target.height}, got ${image.width}x${image.height}`);
  }
  if (!box) {
    errors.push(`${label}: no visible alpha after normalize`);
    return errors;
  }

  const actualWidth = box.x1 - box.x0 + 1;
  const actualHeight = box.y1 - box.y0 + 1;
  const centerX = (box.x0 + box.x1 + 1) / 2;
  const centerY = (box.y0 + box.y1 + 1) / 2;
  const expectedCenterX = target.width / 2;
  const expectedCenterY = target.height / 2;

  if (Math.abs(box.x0 - target.box.x) > TOLERANCE ||
      Math.abs(box.y0 - target.box.y) > TOLERANCE ||
      Math.abs(actualWidth - target.box.width) > TOLERANCE ||
      Math.abs(actualHeight - target.box.height) > TOLERANCE) {
    errors.push(`${label}: bbox ${box.x0},${box.y0},${actualWidth}x${actualHeight} does not match ${target.box.x},${target.box.y},${target.box.width}x${target.box.height}`);
  }
  if (Math.abs(centerX - expectedCenterX) > TOLERANCE || Math.abs(centerY - expectedCenterY) > TOLERANCE) {
    errors.push(`${label}: center ${centerX.toFixed(1)},${centerY.toFixed(1)} does not match ${expectedCenterX},${expectedCenterY}`);
  }
  return errors;
}

function resizeInto(source, sourceBox, target, targetBox) {
  for (let y = 0; y < targetBox.height; y += 1) {
    for (let x = 0; x < targetBox.width; x += 1) {
      const sx = mapCoordinate(x, targetBox.width, sourceBox.x0, sourceBox.x1);
      const sy = mapCoordinate(y, targetBox.height, sourceBox.y0, sourceBox.y1);
      const pixel = sampleBilinear(source, sx, sy);
      const to = ((targetBox.y + y) * target.width + targetBox.x + x) * 4;
      target.pixels[to] = pixel[0];
      target.pixels[to + 1] = pixel[1];
      target.pixels[to + 2] = pixel[2];
      target.pixels[to + 3] = pixel[3];
    }
  }
}

function mapCoordinate(value, targetSize, sourceStart, sourceEnd) {
  if (targetSize <= 1) return (sourceStart + sourceEnd) / 2;
  return sourceStart + (value * (sourceEnd - sourceStart)) / (targetSize - 1);
}

function sampleBilinear(image, x, y) {
  const x0 = Math.max(0, Math.min(image.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(image.height - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(image.width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(image.height - 1, y0 + 1));
  const fx = Math.max(0, Math.min(1, x - x0));
  const fy = Math.max(0, Math.min(1, y - y0));
  const p00 = getPremultipliedPixel(image, x0, y0);
  const p10 = getPremultipliedPixel(image, x1, y0);
  const p01 = getPremultipliedPixel(image, x0, y1);
  const p11 = getPremultipliedPixel(image, x1, y1);
  const top = mixPremultiplied(p00, p10, fx);
  const bottom = mixPremultiplied(p01, p11, fx);
  return unpremultiply(mixPremultiplied(top, bottom, fy));
}

function getPremultipliedPixel(image, x, y) {
  const index = (y * image.width + x) * 4;
  const alpha = image.pixels[index + 3] / 255;
  return [
    image.pixels[index] * alpha,
    image.pixels[index + 1] * alpha,
    image.pixels[index + 2] * alpha,
    image.pixels[index + 3]
  ];
}

function mixPremultiplied(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t
  ];
}

function unpremultiply(pixel) {
  const alpha = clamp(Math.round(pixel[3]));
  if (!alpha) return [0, 0, 0, 0];
  const factor = 255 / alpha;
  return [
    clamp(Math.round(pixel[0] * factor)),
    clamp(Math.round(pixel[1] * factor)),
    clamp(Math.round(pixel[2] * factor)),
    alpha
  ];
}

function makeMontage(yards, reports) {
  const tileWidth = 176;
  const tileHeight = 132;
  const gap = 12;
  const width = gap + MONTAGE_ORDER.length * (tileWidth + gap);
  const height = gap + yards.length * (tileHeight + gap);
  const montage = { width, height, pixels: Buffer.alloc(width * height * 4) };
  fillRect(montage, 0, 0, width, height, [17, 22, 30, 255]);

  const byKey = new Map();
  reports.forEach((report) => byKey.set(`${report.yardId}:${report.group}:${report.key}`, report));

  yards.forEach((yard, row) => {
    MONTAGE_ORDER.forEach(([group, key], column) => {
      const x = gap + column * (tileWidth + gap);
      const y = gap + row * (tileHeight + gap);
      const background = group === "traffic" ? [30, 40, 54, 255] : [38, 34, 46, 255];
      fillRect(montage, x, y, tileWidth, tileHeight, background);
      strokeRect(montage, x, y, tileWidth, tileHeight, [92, 110, 132, 255]);
      const report = byKey.get(`${yard.id}:${group}:${key}`);
      if (report) blitContained(report.image, montage, x + 8, y + 8, tileWidth - 16, tileHeight - 16);
    });
  });

  return montage;
}

function fillRect(image, x, y, width, height, color) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(image.width, Math.ceil(x + width));
  const y1 = Math.min(image.height, Math.ceil(y + height));
  for (let yy = y0; yy < y1; yy += 1) {
    for (let xx = x0; xx < x1; xx += 1) {
      setPixel(image, xx, yy, color);
    }
  }
}

function strokeRect(image, x, y, width, height, color) {
  fillRect(image, x, y, width, 1, color);
  fillRect(image, x, y + height - 1, width, 1, color);
  fillRect(image, x, y, 1, height, color);
  fillRect(image, x + width - 1, y, 1, height, color);
}

function blitContained(source, target, x, y, width, height) {
  const scale = Math.min(width / source.width, height / source.height);
  const drawWidth = Math.max(1, Math.round(source.width * scale));
  const drawHeight = Math.max(1, Math.round(source.height * scale));
  const dx = Math.round(x + (width - drawWidth) / 2);
  const dy = Math.round(y + (height - drawHeight) / 2);
  blitScaled(source, target, dx, dy, drawWidth, drawHeight);
}

function blitScaled(source, target, x, y, width, height) {
  for (let dy = 0; dy < height; dy += 1) {
    for (let dx = 0; dx < width; dx += 1) {
      const sx = mapCoordinate(dx, width, 0, source.width - 1);
      const sy = mapCoordinate(dy, height, 0, source.height - 1);
      compositePixel(target, x + dx, y + dy, sampleBilinear(source, sx, sy));
    }
  }
}

function compositePixel(target, x, y, pixel) {
  if (x < 0 || y < 0 || x >= target.width || y >= target.height) return;
  const index = (y * target.width + x) * 4;
  const alpha = pixel[3] / 255;
  const inv = 1 - alpha;
  target.pixels[index] = clamp(Math.round(pixel[0] * alpha + target.pixels[index] * inv));
  target.pixels[index + 1] = clamp(Math.round(pixel[1] * alpha + target.pixels[index + 1] * inv));
  target.pixels[index + 2] = clamp(Math.round(pixel[2] * alpha + target.pixels[index + 2] * inv));
  target.pixels[index + 3] = clamp(Math.round(pixel[3] + target.pixels[index + 3] * inv));
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const index = (y * image.width + x) * 4;
  image.pixels[index] = color[0];
  image.pixels[index + 1] = color[1];
  image.pixels[index + 2] = color[2];
  image.pixels[index + 3] = color[3];
}

function alphaBounds(image, minAlpha) {
  let x0 = image.width;
  let y0 = image.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.pixels[(y * image.width + x) * 4 + 3];
      if (alpha < minAlpha) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  return x1 < x0 ? null : { x0, y0, x1, y1, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

function resolveAsset(source) {
  return path.join(root, source.replace(/[?#].*$/, "").replace(/^\.\//, ""));
}

function relative(file) {
  return path.relative(root, file);
}

function readPng(file) {
  const data = fs.readFileSync(file);
  if (!data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new Error(`${file}: not a PNG`);
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.subarray(offset + 4, offset + 8).toString("ascii");
    const payload = data.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = payload.readUInt32BE(0);
      height = payload.readUInt32BE(4);
      const bitDepth = payload[8];
      colorType = payload[9];
      const interlace = payload[12];
      if (bitDepth !== 8 || ![2, 6].includes(colorType) || interlace !== 0) throw new Error(`${file}: unsupported PNG format`);
    } else if (type === "IDAT") {
      idat.push(payload);
    } else if (type === "IEND") {
      break;
    }
  }

  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(width * height * 4);
  let src = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[src++];
    const row = Buffer.from(raw.subarray(src, src + stride));
    src += stride;
    unfilterRow(row, prev, channels, filter);
    for (let x = 0; x < width; x += 1) {
      const from = x * channels;
      const to = (y * width + x) * 4;
      pixels[to] = row[from];
      pixels[to + 1] = row[from + 1];
      pixels[to + 2] = row[from + 2];
      pixels[to + 3] = channels === 4 ? row[from + 3] : 255;
    }
    prev = row;
  }
  return { width, height, pixels };
}

function unfilterRow(row, prev, channels, filter) {
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= channels ? row[index - channels] : 0;
    const up = prev[index] || 0;
    const upLeft = index >= channels ? prev[index - channels] : 0;
    if (filter === 1) row[index] = (row[index] + left) & 255;
    else if (filter === 2) row[index] = (row[index] + up) & 255;
    else if (filter === 3) row[index] = (row[index] + Math.floor((left + up) / 2)) & 255;
    else if (filter === 4) row[index] = (row[index] + paeth(left, up, upLeft)) & 255;
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

function writePng(image, file) {
  const raw = Buffer.alloc((image.width * 4 + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    raw[y * (image.width * 4 + 1)] = 0;
    image.pixels.copy(raw, y * (image.width * 4 + 1) + 1, y * image.width * 4, (y + 1) * image.width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0))
  ]));
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

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
