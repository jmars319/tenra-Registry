import path from "node:path";
import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = new URL("..", import.meta.url);
const repoRoot = path.resolve(fileURLToPath(cwd), "../..");
const envFile = path.resolve(repoRoot, ".env");

loadEnvFile(envFile);

const result = spawnSync("pnpm", ["exec", "prisma", ...process.argv.slice(2)], {
  cwd,
  env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
  stdio: "inherit"
});

process.exit(result.status ?? 1);
