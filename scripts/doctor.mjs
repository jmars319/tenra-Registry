import { spawnSync } from "node:child_process";

const steps = [
  ["pnpm", ["check:env"]],
  ["pnpm", ["check:packages"]],
  ["pnpm", ["lint"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["verify:all"]]
];

for (const [command, args] of steps) {
  console.log(`Running: ${command} ${args.join(" ")}`);

  const result = spawnSync(command, args, {
    cwd: new URL("..", import.meta.url),
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
