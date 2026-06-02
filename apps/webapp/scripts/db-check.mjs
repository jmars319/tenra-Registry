import path from "node:path";
import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = new URL("..", import.meta.url);
const repoRoot = path.resolve(fileURLToPath(cwd), "../..");
const envFile = path.resolve(repoRoot, ".env");

loadEnvFile(envFile);

const prismaEnv = { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1" };

const steps = [
  ["pnpm", ["exec", "prisma", "validate"]],
  ["pnpm", ["exec", "prisma", "migrate", "status"]]
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, {
    cwd,
    env: prismaEnv,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
