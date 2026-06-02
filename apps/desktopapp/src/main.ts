import { app, BrowserWindow, shell } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { buildApplicationMenu } from "./desktop/menu";
import { showStatus } from "./desktop/statusPage";

declare const __REGISTRY_REPO_ROOT__: string;

const appName = "tenra Registry";
const defaultPort = 3487;
const startupTimeoutMs = 30_000;
const defaultDatabaseUrl = "postgresql:///registry?schema=public";
const repoRoot = process.env.TENRA_REGISTRY_REPO_ROOT || __REGISTRY_REPO_ROOT__;
const webappDir = path.resolve(repoRoot, "apps/webapp");
const nextBuildIdPath = path.resolve(webappDir, ".next/BUILD_ID");

let mainWindow: BrowserWindow | undefined;
let serverProcess: ChildProcess | undefined;
let serverLog = "";
let registryBaseUrl: string | undefined;

function appendServerLog(chunk: Buffer | string) {
  serverLog = `${serverLog}${chunk.toString()}`.slice(-12_000);
  logDesktop(chunk.toString().trimEnd());
}

function logDesktop(message: string, error?: unknown) {
  try {
    const logDir = app.getPath("logs");
    fs.mkdirSync(logDir, { recursive: true });
    const details = error instanceof Error ? ` ${error.stack ?? error.message}` : error ? ` ${String(error)}` : "";
    fs.appendFileSync(path.join(logDir, "tenra-registry-desktop.log"), `${new Date().toISOString()} ${message}${details}\n`);
  } catch {
    // Logging must never be the reason the desktop app fails to start.
  }
}

function resolvePnpmCommand() {
  const homeDir = process.env.HOME || app.getPath("home");
  const packageManagerVersion = (() => {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.resolve(repoRoot, "package.json"), "utf8")) as {
        packageManager?: string;
      };
      return packageJson.packageManager?.match(/^pnpm@(.+)$/)?.[1];
    } catch (error) {
      logDesktop("could not read package manager version", error);
      return undefined;
    }
  })();

  const candidates = [
    process.env.PNPM_HOME ? path.join(process.env.PNPM_HOME, "pnpm") : "",
    homeDir ? path.join(homeDir, "Library/pnpm/pnpm") : "",
    homeDir ? path.join(homeDir, ".local/share/pnpm/pnpm") : "",
    homeDir && packageManagerVersion
      ? path.join(homeDir, ".cache/node/corepack/v1/pnpm", packageManagerVersion, "bin/pnpm")
      : "",
    homeDir && packageManagerVersion
      ? path.join(homeDir, ".cache/node/corepack/v1/pnpm", packageManagerVersion, "bin/pnpm.cjs")
      : "",
    "/opt/homebrew/opt/node@22/bin/pnpm",
    "/opt/homebrew/opt/node/bin/pnpm",
    "/opt/homebrew/bin/pnpm",
    "/usr/local/opt/node@22/bin/pnpm",
    "/usr/local/opt/node/bin/pnpm",
    "/usr/local/bin/pnpm",
    "/usr/bin/pnpm",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "pnpm";
}

function getLaunchEnv(extraPaths: string[] = []) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    PATH: [
      ...extraPaths,
      process.env.PATH,
      process.env.PNPM_HOME,
      process.env.COREPACK_HOME,
      "/opt/homebrew/opt/node@22/bin",
      "/opt/homebrew/opt/node/bin",
      "/opt/homebrew/bin",
      "/usr/local/opt/node@22/bin",
      "/usr/local/opt/node/bin",
      "/usr/local/bin",
      "/usr/bin",
      "/bin",
      "/usr/sbin",
      "/sbin",
    ]
      .filter(Boolean)
      .join(":"),
  };

  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

function parseEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const loadEnvFile = (process as typeof process & { loadEnvFile?: (path: string) => void }).loadEnvFile;
  if (typeof loadEnvFile === "function") {
    loadEnvFile(filePath);
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (process.env[key]) {
      continue;
    }

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function prepareLocalEnvironment() {
  parseEnvFile(path.resolve(repoRoot, ".env"));
  parseEnvFile(path.resolve(repoRoot, ".env.local"));

  if (!process.env.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = defaultDatabaseUrl;
    logDesktop(`DATABASE_URL was not set; using ${defaultDatabaseUrl}`);
  }
}

async function findAvailablePort(startPort: number) {
  for (let port = startPort; port < startPort + 60; port += 1) {
    const available = await new Promise<boolean>((resolve) => {
      const probe = net.createServer();
      probe.once("error", () => resolve(false));
      probe.once("listening", () => {
        probe.close(() => resolve(true));
      });
      probe.listen(port, "127.0.0.1");
    });

    if (available) {
      return port;
    }
  }

  throw new Error(`No local port was available near ${startPort}.`);
}

function requestStatus(url: string) {
  return new Promise<number>((resolve, reject) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });

    request.setTimeout(2000, () => {
      request.destroy(new Error("Request timed out."));
    });
    request.once("error", reject);
  });
}

async function waitForRegistry(baseUrl: string) {
  const deadline = Date.now() + startupTimeoutMs;

  while (Date.now() < deadline) {
    if (serverProcess?.exitCode !== null) {
      throw new Error(`Registry server exited with code ${serverProcess?.exitCode ?? "unknown"}.`);
    }

    try {
      const status = await requestStatus(baseUrl);
      if (status >= 200 && status < 400) {
        return;
      }

      if (status >= 500) {
        throw new Error(`Registry returned HTTP ${status}.`);
      }
    } catch (error) {
      if (Date.now() + 750 >= deadline) {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  throw new Error("Registry did not become ready before the startup timeout.");
}

function assertRuntimeReady() {
  if (!fs.existsSync(path.resolve(webappDir, "package.json"))) {
    throw new Error(`Cannot find the Registry web app at ${webappDir}. Set TENRA_REGISTRY_REPO_ROOT if the repo moved.`);
  }

  if (!fs.existsSync(nextBuildIdPath)) {
    throw new Error("The Registry web app has not been built. Run pnpm build:web or pnpm install:desktop from the repo.");
  }
}

async function startRegistryServer() {
  if (serverProcess && serverProcess.exitCode === null && registryBaseUrl) {
    return registryBaseUrl;
  }

  assertRuntimeReady();
  prepareLocalEnvironment();

  const pnpmCommand = resolvePnpmCommand();
  const port = await findAvailablePort(defaultPort);
  const baseUrl = `http://127.0.0.1:${port}`;

  logDesktop(`starting Registry web server at ${baseUrl}`);
  const child = spawn(
    pnpmCommand,
    ["--filter", "@registry/webapp", "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: repoRoot,
      env: getLaunchEnv(path.isAbsolute(pnpmCommand) ? [path.dirname(pnpmCommand)] : []),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  serverProcess = child;
  child.stdout?.on("data", appendServerLog);
  child.stderr?.on("data", appendServerLog);

  child.once("error", (error) => {
    appendServerLog(error instanceof Error ? (error.stack ?? error.message) : String(error));
    logDesktop("server process failed", error);
  });

  await waitForRegistry(baseUrl);
  registryBaseUrl = baseUrl;
  return baseUrl;
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: appName,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.once("closed", () => {
    mainWindow = undefined;
  });

  await showStatus(mainWindow, appName, "Starting the local Registry web app and checking the Postgres-backed dashboard.");

  try {
    const baseUrl = await startRegistryServer();
    await mainWindow.loadURL(baseUrl);
    logDesktop(`main window loaded ${baseUrl}`);
  } catch (error) {
    logDesktop("startup failed", error);
    const message = error instanceof Error ? error.message : String(error);
    await showStatus(
      mainWindow,
      "Registry could not start",
      `${message} Registry loads .env/.env.local and defaults to ${defaultDatabaseUrl}; check that local Postgres is running, the registry database exists, migrations are applied, and the local repo path is correct.`,
      serverLog,
    );
  }
}

function stopRegistryServer() {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill("SIGTERM");
  }
  registryBaseUrl = undefined;
}

app.setName(appName);

app.whenReady().then(() => {
  buildApplicationMenu({
    appName,
    getMainWindow: () => mainWindow,
    getRegistryBaseUrl: () => registryBaseUrl,
  });
  void createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopRegistryServer();
});

process.on("uncaughtException", (error) => {
  logDesktop("uncaught exception", error);
});

process.on("unhandledRejection", (error) => {
  logDesktop("unhandled rejection", error);
});
