#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const workspace = path.resolve(root, "..");
const version = "1.0.0";
const releaseName = `probka-yandex-${version}`;
const releaseRoot = path.join(workspace, "releases", releaseName);
const archivePath = path.join(workspace, "releases", `${releaseName}.zip`);
const baseRuntimeFiles = [
  "index.html",
  "favicon.svg",
  "assets/skins/v3/classic_red.png",
  "assets/skins/v3/taxi_yellow.png",
  "assets/skins/v3/mint_courier.png",
  "assets/skins/v3/pizza_mobile.png",
  "assets/skins/v3/night_blue.png",
  "assets/skins/v3/yard_police.png",
  "assets/skins/v3/yard_ambulance.png",
  "assets/skins/v3/fire_lane.png",
  "assets/skins/v3/retro_volga.png",
  "assets/skins/v3/business_taxi.png",
  "assets/skins/v3/sticker_drifter.png",
  "assets/skins/v3/violet_share.png",
  "assets/skins/v3/ice_chrome.png",
  "assets/skins/v3/graffiti_coupe.png",
  "assets/skins/v3/cyber_yard.png",
  "assets/skins/v3/gold_yard.png",
  "assets/skins/v3/black_vip.png",
  "assets/skins/v3/tow_final.png",
  "styles.css",
  "level-bank.generated.js",
  "levels.js",
  "yards.js",
  "skins.js",
  "daily.js",
  "config.js",
  "texts.js",
  "yandex-sdk.js",
  "progress.js",
  "economy.js",
  "rules.js",
  "session.js",
  "renderer.js",
  "screens.js",
  "tutorial.js",
  "actors.js",
  "input.js",
  "ads.js",
  "audio.js",
  "game.js"
];
let runtimeFilesCache = null;
const syntaxFiles = [
  "game.js",
  "levels.js",
  "yards.js",
  "skins.js",
  "daily.js",
  "config.js",
  "texts.js",
  "yandex-sdk.js",
  "progress.js",
  "economy.js",
  "rules.js",
  "session.js",
  "renderer.js",
  "screens.js",
  "tutorial.js",
  "actors.js",
  "input.js",
  "ads.js",
  "audio.js",
  "tools/validate-yard-assets.js",
  "tools/build-level-bank.js",
  "tools/generate-themed-yard-sprites.js",
  "tools/validate-levels.js",
  "tools/analyze-levels.js",
  "tools/validate-daily-levels.js",
  "tools/browser-smoke.js"
];
// Copy guard checks user-facing runtime text, not generated data or tool files.
const copyGuardFiles = [
  "game.js",
  "daily.js",
  "yards.js",
  "skins.js",
  "config.js",
  "texts.js",
  "progress.js",
  "economy.js",
  "rules.js",
  "session.js",
  "renderer.js",
  "screens.js",
  "tutorial.js",
  "actors.js",
  "input.js",
  "ads.js",
  "audio.js"
];

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);

main();

function main() {
  if (args.has("--help") || args.has("-h")) {
    printHelp();
    return;
  }
  validateArgs();
  if (args.has("--runtime-only")) {
    validateRuntimeFiles();
    console.log("Yandex runtime-only release check passed");
    return;
  }
  if (args.has("--list-files")) {
    getRuntimeFiles().forEach((file) => console.log(file));
    return;
  }
  if (args.has("--summary")) {
    printRuntimeSummary();
    return;
  }
  if (args.has("--syntax-only")) {
    validateSyntaxFiles(syntaxFiles);
    console.log("Release syntax check passed");
    return;
  }
  if (!args.has("--skip-checks")) {
    runChecks();
  } else {
    console.log("Skipping release checks; runtime files will still be validated");
  }
  validateRuntimeFiles();
  if (args.has("--check")) {
    console.log(getCheckLabel());
    return;
  }
  buildRelease();
}

function validateArgs() {
  const knownArgs = new Set(["--check", "--quick", "--skip-checks", "--syntax-only", "--runtime-only", "--list-files", "--summary", "--yard", "--help", "-h"]);
  const unknownArgs = rawArgs.filter((arg, index) => {
    if (index > 0 && rawArgs[index - 1] === "--yard") return false;
    return arg.startsWith("-") && !knownArgs.has(arg);
  });
  if (unknownArgs.length) {
    console.error(`Unknown release option: ${unknownArgs.join(", ")}`);
    console.error("Run with --help to see supported options.");
    process.exit(1);
  }
  if (args.has("--quick") && args.has("--skip-checks")) {
    console.error("Use either --quick or --skip-checks, not both.");
    process.exit(1);
  }
  if (args.has("--syntax-only") && args.size > 1) {
    console.error("Use --syntax-only by itself.");
    process.exit(1);
  }
  if (args.has("--runtime-only") && args.size > 1) {
    console.error("Use --runtime-only by itself.");
    process.exit(1);
  }
  if (args.has("--list-files") && args.size > 1) {
    console.error("Use --list-files by itself.");
    process.exit(1);
  }
  if (args.has("--summary") && args.size > 1) {
    console.error("Use --summary by itself.");
    process.exit(1);
  }
  if (args.has("--check") && args.has("--skip-checks")) {
    console.error("Use --runtime-only for a check without nested release checks.");
    process.exit(1);
  }
  if (args.has("--yard") && !getOptionValue("--yard")) {
    console.error("Missing value for --yard.");
    process.exit(1);
  }
  if (args.has("--yard") && (!args.has("--quick") || !args.has("--check"))) {
    console.error("Use --yard together with --check --quick.");
    process.exit(1);
  }
}

function printHelp() {
  console.log([
    "Usage: node probka-game/tools/release-yandex.js [--check] [--quick] [--yard <id>] [--syntax-only] [--runtime-only] [--list-files] [--summary] [--skip-checks]",
    "",
    "Options:",
    "  --check        Validate without creating the release folder or zip.",
    "  --quick        Use light checks before check/build.",
    "  --yard <id>    With --check --quick, validate one yard asset pack.",
    "  --syntax-only  Parse release JS files without asset or runtime checks.",
    "  --runtime-only Validate release runtime files without nested checks.",
    "  --list-files    Print runtime files included in the release.",
    "  --summary       Print runtime file count and payload size.",
    "  --skip-checks  Skip nested checks; runtime files are still validated before build/check.",
    "  -h, --help     Show this help."
  ].join("\n"));
}

function getCheckLabel() {
  if (args.has("--skip-checks")) return "Yandex runtime-only release check passed";
  if (args.has("--quick")) return "Yandex quick release check passed";
  return "Yandex release check passed";
}

function getOptionValue(option) {
  const index = rawArgs.indexOf(option);
  if (index === -1) return "";
  const value = rawArgs[index + 1] || "";
  return value.startsWith("-") ? "" : value;
}

function runChecks() {
  validateSyntaxFiles(syntaxFiles);
  console.log(args.has("--quick") ? "Quick release checks enabled" : "Full release checks enabled");
  const yardId = getOptionValue("--yard");
  const yardAssetArgs = ["probka-game/tools/validate-yard-assets.js"];
  if (yardId) yardAssetArgs.push("--yard", yardId);
  const quickChecks = [
    [yardId ? `yard assets (${yardId})` : "yard assets", "node", yardAssetArgs]
  ];
  const fullChecks = [
    ["level bank", "node", ["probka-game/tools/build-level-bank.js", "--check"]],
    ["level validation", "node", ["probka-game/tools/validate-levels.js"]],
    ["level analysis", "node", ["probka-game/tools/analyze-levels.js", "50000"]],
    ["daily validation", "node", ["probka-game/tools/validate-daily-levels.js", "365"]]
  ];
  const commands = args.has("--quick")
    ? quickChecks
    : quickChecks.concat(fullChecks);
  commands.forEach(([label, command, commandArgs]) => runCommand(label, command, commandArgs, workspace));
}

function runCommand(label, command, commandArgs, cwd) {
  console.log(`Running ${label}...`);
  const result = spawnSync(command, commandArgs, { cwd, stdio: "inherit" });
  if (result.error) {
    console.error(`Failed ${label}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Failed ${label}: ${command} ${commandArgs.join(" ")}`);
    process.exit(result.status || 1);
  }
}

function validateSyntaxFiles(files) {
  files.forEach((file) => {
    const filename = path.join(root, file);
    const code = fs.readFileSync(filename, "utf8").replace(/^#!.*\n/, "");
    try {
      new vm.Script(code, { filename });
    } catch (error) {
      fail(`${file}: ${error.message}`);
    }
  });
}

function collectYardAssets() {
  const code = fs.readFileSync(path.join(root, "yards.js"), "utf8");
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "yards.js" });
  const assets = new Set();
  (sandbox.PROBKA_YARDS || []).forEach((yard) => {
    visitAssetTree(yard.assets, assets);
  });
  return Array.from(assets).map((source) => source.replace(/[?#].*$/, "").replace(/^\.\//, ""));
}

function getRuntimeFiles() {
  if (!runtimeFilesCache) runtimeFilesCache = baseRuntimeFiles.concat(collectYardAssets());
  return runtimeFilesCache;
}

function visitAssetTree(node, assets) {
  if (!node) return;
  if (typeof node === "string") {
    assets.add(node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => visitAssetTree(item, assets));
    return;
  }
  Object.values(node).forEach((value) => visitAssetTree(value, assets));
}

function validateRuntimeFiles() {
  const runtimeFiles = getRuntimeFiles();
  runtimeFiles.forEach((file) => {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) fail(`Missing runtime file: ${file}`);
    if (/[^A-Za-z0-9._/-]/.test(file)) fail(`Unsafe runtime filename: ${file}`);
  });
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  validateCopyGuard("index.html", index);
  copyGuardFiles.forEach((file) => {
    validateCopyGuard(file, fs.readFileSync(path.join(root, file), "utf8"));
  });
  const totalBytes = getRuntimePayloadBytes(runtimeFiles);
  const maxBytes = 100 * 1024 * 1024;
  if (totalBytes >= maxBytes) fail(`Release files are too large: ${formatBytes(totalBytes)}`);
  console.log(`Runtime files: ${runtimeFiles.length}`);
  console.log(`Runtime payload: ${formatBytes(totalBytes)}`);
}

function printRuntimeSummary() {
  const runtimeFiles = getRuntimeFiles();
  const existingFiles = runtimeFiles.filter((file) => fs.existsSync(path.join(root, file)));
  const missingFiles = runtimeFiles.filter((file) => !fs.existsSync(path.join(root, file)));
  const totalBytes = getRuntimePayloadBytes(existingFiles);
  console.log(`Runtime files: ${existingFiles.length}/${runtimeFiles.length}`);
  console.log(`Runtime payload: ${formatBytes(totalBytes)}`);
  if (missingFiles.length) {
    console.log(`Missing runtime files: ${missingFiles.length}`);
  }
}

function getRuntimePayloadBytes(files) {
  return files.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0);
}

function buildRelease() {
  if (fs.existsSync(releaseRoot)) {
    fail(`${releaseRoot} already exists. Move it away before rebuilding.`);
  }
  if (fs.existsSync(archivePath)) {
    fail(`${archivePath} already exists. Move it away before rebuilding.`);
  }

  fs.mkdirSync(releaseRoot, { recursive: true });
  const runtimeFiles = getRuntimeFiles();
  runtimeFiles.forEach((file) => {
    const targetPath = path.join(releaseRoot, file);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(path.join(root, file), targetPath);
  });
  const versionHash = getRuntimeHash();
  const releaseIndexPath = path.join(releaseRoot, "index.html");
  fs.writeFileSync(releaseIndexPath, applyCacheVersion(fs.readFileSync(releaseIndexPath, "utf8"), versionHash));
  const releaseGamePath = path.join(releaseRoot, "game.js");
  fs.writeFileSync(releaseGamePath, applyCacheVersion(fs.readFileSync(releaseGamePath, "utf8"), versionHash));

  console.log(`Release folder created: ${releaseRoot}`);
  runCommand("release archive", "zip", ["-qr", archivePath, "."], releaseRoot);

  const archiveSize = fs.statSync(archivePath).size;
  console.log(`Release archive: ${archivePath} (${formatBytes(archiveSize)})`);
}

function validateCopyGuard(file, contents) {
  const forbidden = [
    [/Рекламный баннер|заглуш/i, "draft ad placeholder text"],
    [/prototype/i, "prototype wording"],
    [/HARD/, "raw HARD badge"],
    [/₽/, "real currency symbol"],
    [/\b\d+\s*\/\s*10\b/, "ambiguous difficulty fraction"]
  ];
  forbidden.forEach(([pattern, label]) => {
    if (pattern.test(contents)) fail(`${file} contains ${label}`);
  });
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function getRuntimeHash() {
  const hash = crypto.createHash("sha1");
  getRuntimeFiles()
    .filter((file) => file !== "index.html")
    .forEach((file) => hash.update(fs.readFileSync(path.join(root, file))));
  return hash.digest("hex").slice(0, 10);
}

function applyCacheVersion(index, versionHash) {
  return index.replace(/(\.\/(?:(?:favicon|styles|yandex-sdk|level-bank\.generated|levels|yards|skins|daily|config|texts|progress|economy|rules|session|renderer|screens|tutorial|actors|input|ads|audio|game)\.(?:svg|css|js)|assets\/skins\/v3\/[a-z0-9_-]+\.png))\?v=[^"']+/g, `$1?v=${versionHash}`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
