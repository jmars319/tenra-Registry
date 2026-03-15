import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const cwd = new URL("..", import.meta.url);
const envFile = new URL("../.env", import.meta.url);

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe"
  });

  return {
    ok: result.status === 0,
    output: (result.stdout || result.stderr || "").trim()
  };
}

function parseMajor(versionOutput) {
  const match = versionOutput.match(/v?(\d+)/u);
  return match ? Number(match[1]) : undefined;
}

let hasEnvFile = true;

try {
  await access(envFile, constants.F_OK);
  loadEnvFile(fileURLToPath(envFile));
} catch {
  hasEnvFile = false;
}

const checks = [
  {
    label: "Node.js",
    required: true,
    test() {
      const result = runCommand("node", ["-v"]);
      const major = parseMajor(result.output);

      return {
        ...result,
        ok: result.ok && typeof major === "number" && major >= 22
      };
    }
  },
  {
    label: "pnpm",
    required: true,
    test() {
      const result = runCommand("pnpm", ["-v"]);
      const major = parseMajor(result.output);

      return {
        ...result,
        ok: result.ok && typeof major === "number" && major >= 10
      };
    }
  },
  {
    label: "DATABASE_URL",
    required: true,
    test() {
      const databaseUrl = process.env.DATABASE_URL?.trim();

      return {
        ok: typeof databaseUrl === "string" && databaseUrl.length > 0,
        output: databaseUrl ? "configured" : "missing from repo root .env"
      };
    }
  },
  {
    label: "Postgres connection",
    required: true,
    test() {
      const databaseUrl = process.env.DATABASE_URL?.trim();

      if (!databaseUrl) {
        return {
          ok: false,
          output: "DATABASE_URL is not configured"
        };
      }

      const parsedUrl = new URL(databaseUrl);
      parsedUrl.search = "";

      return runCommand("psql", [parsedUrl.toString(), "-c", "SELECT 1;"]);
    }
  },
  {
    label: "Rust toolchain",
    required: false,
    test() {
      return runCommand("rustc", ["--version"]);
    }
  },
  {
    label: "Workspace Tauri CLI",
    required: false,
    test() {
      return runCommand("pnpm", ["--filter", "@registry/desktopapp", "exec", "tauri", "--version"]);
    }
  },
  {
    label: "Xcode app",
    required: false,
    test() {
      return runCommand("xcodebuild", ["-version"]);
    }
  },
  {
    label: "Workspace Expo CLI",
    required: false,
    test() {
      return runCommand("pnpm", ["--filter", "@registry/mobileapp", "exec", "expo", "--version"]);
    }
  }
];

const missingEnv = [];

for (const requiredFile of [".env.example"]) {
  try {
    await access(new URL(`../${requiredFile}`, import.meta.url), constants.F_OK);
  } catch {
    missingEnv.push(requiredFile);
  }
}

console.log("Registry environment check");

let hasFailure = false;

for (const check of checks) {
  const result = check.test();
  const status = result.ok ? "PASS" : check.required ? "FAIL" : "WARN";
  const detail = result.output ? ` - ${result.output}` : "";

  console.log(`${status} ${check.label}${detail}`);

  if (check.required && !result.ok) {
    hasFailure = true;
  }
}

if (missingEnv.length > 0) {
  hasFailure = true;
  console.log(`FAIL missing required repo files: ${missingEnv.join(", ")}`);
}

if (!hasEnvFile) {
  hasFailure = true;
  console.log("FAIL missing repo root .env file");
}

console.log("Note: native desktop prerequisites are optional at this scaffold stage.");

if (hasFailure) {
  process.exitCode = 1;
}
