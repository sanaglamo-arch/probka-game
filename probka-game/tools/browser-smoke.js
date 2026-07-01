#!/usr/bin/env node

const { spawn, spawnSync } = require("child_process");
const http = require("http");
const path = require("path");

const workspace = path.resolve(__dirname, "../..");
const chromePath = process.env.PROBKA_SMOKE_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chromeExtraFlags = (process.env.PROBKA_SMOKE_CHROME_FLAGS || "").split(/\s+/).filter(Boolean);
const port = Number(process.env.PROBKA_SMOKE_PORT || process.argv[2] || 5181);
const url = `http://localhost:${port}/probka-game/tools/browser-smoke.html`;

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function main() {
  const server = spawn("python3", ["-m", "http.server", String(port)], {
    cwd: workspace,
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitForServer(server);
    const result = spawnSync(chromePath, [
      ...chromeExtraFlags,
      "--headless=new",
      "--disable-gpu",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-sync",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--user-data-dir=/private/tmp/probka-browser-smoke",
      "--window-size=1024,768",
      "--virtual-time-budget=60000",
      "--dump-dom",
      url
    ], { encoding: "utf8", timeout: 70000 });

    if (result.status !== 0) {
      process.stdout.write(result.stdout || "");
      process.stderr.write(result.stderr || "");
      throw new Error(`Chrome smoke failed with exit ${result.status}${result.error ? `: ${result.error.message}` : ""}`);
    }

    const output = result.stdout || "";
    const match = output.match(/PROBKA_SMOKE_(PASS|FAIL|RUNNING)[\s\S]*?(?=<\/pre>)/);
    if (!match) {
      process.stdout.write(output.slice(-2000));
      throw new Error("Smoke result marker not found");
    }
    const report = decodeHtml(match[0]);
    console.log(report);
    if (report.includes("PROBKA_SMOKE_FAIL") || report.includes("PROBKA_SMOKE_RUNNING")) process.exit(1);
  } finally {
    server.kill("SIGTERM");
    spawnSync("pkill", ["-f", "/private/tmp/probka-browser-smoke"], { stdio: "ignore" });
  }
}

function waitForServer(server) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timeout = setTimeout(() => finish(reject, new Error("Smoke server did not start")), 4000);
    const interval = setInterval(() => {
      http.get(`http://localhost:${port}/probka-game/index.html`, (response) => {
        response.resume();
        if (response.statusCode === 200) finish(resolve);
      }).on("error", () => {});
    }, 120);
    server.stderr.on("data", (chunk) => {
      const text = String(chunk);
      if (/Address already in use|PermissionError/.test(text)) {
        finish(reject, new Error(text.trim()));
      }
    });
    server.on("exit", (code) => {
      if (code !== null && code !== 0) {
        finish(reject, new Error(`Smoke server exited with ${code}`));
      }
    });

    function finish(callback, value) {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      clearInterval(interval);
      callback(value);
    }
  });
}

function decodeHtml(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}
