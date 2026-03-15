import { spawnSync } from "node:child_process";

const steps = [
  {
    label: "install dependencies",
    command: "pnpm",
    args: ["install"]
  },
  {
    label: "check environment",
    command: "pnpm",
    args: ["check:env"]
  },
  {
    label: "check workspace packages",
    command: "pnpm",
    args: ["check:packages"]
  },
  {
    label: "generate Prisma client",
    command: "pnpm",
    args: ["--filter", "@registry/webapp", "db:generate"]
  }
];

for (const step of steps) {
  console.log(`Running: ${step.label}`);

  const result = spawnSync(step.command, step.args, {
    cwd: new URL("..", import.meta.url),
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
