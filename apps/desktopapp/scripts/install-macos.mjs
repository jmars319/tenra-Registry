import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(desktopDir, "../..");
const appName = "Registry by Tenra";
const legacyAppNames = ["Tenra Registry"];
const systemApplicationsDir = "/Applications";
const userApplicationsDir = path.resolve(os.homedir(), "Applications");
const outputDir = path.resolve(repoRoot, "dist/desktop");

async function pathExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function findPackagedApp() {
  const directPath = path.resolve(outputDir, `${appName}.app`);
  if (await pathExists(directPath)) {
    return directPath;
  }

  const entries = await readdir(outputDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const candidatePath = path.resolve(outputDir, entry.name, `${appName}.app`);
    if (await pathExists(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error("Registry by Tenra desktop package was not found. Run pnpm package:desktop first.");
}

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if ((code ?? 1) === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "null"}.`));
    });
  });
}

const sourceAppPath = await findPackagedApp();
const targetAppPath = path.resolve(systemApplicationsDir, `${appName}.app`);

await rm(targetAppPath, { recursive: true, force: true });
for (const directoryPath of [userApplicationsDir, systemApplicationsDir]) {
  for (const legacyName of legacyAppNames) {
    await rm(path.resolve(directoryPath, `${legacyName}.app`), {
      recursive: true,
      force: true,
    });
  }
}

await run("/usr/bin/ditto", [sourceAppPath, targetAppPath]);
await run("/usr/bin/xattr", ["-dr", "com.apple.quarantine", targetAppPath]).catch(() => {});
await rm(sourceAppPath, { recursive: true, force: true });

console.log(`Installed ${targetAppPath}`);
