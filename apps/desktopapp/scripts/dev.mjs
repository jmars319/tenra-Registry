import { spawnSync } from "node:child_process";

const cwd = new URL("..", import.meta.url);

function hasCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe"
  });

  return result.status === 0;
}

function hasNativeDesktopPrerequisites() {
  return (
    hasCommand("pnpm", ["exec", "tauri", "--version"]) &&
    hasCommand("rustc", ["--version"]) &&
    hasCommand("xcodebuild", ["-version"])
  );
}

const hasDesktopSupport = hasNativeDesktopPrerequisites();
const command = hasDesktopSupport ? ["pnpm", ["dev:tauri"]] : ["pnpm", ["dev:web"]];

if (!hasDesktopSupport) {
  console.log("Native desktop prerequisites are incomplete. Falling back to the Vite shell.");
}

const result = spawnSync(command[0], command[1], {
  cwd,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
