import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const expectedDirectories = [
  "apps/webapp",
  "apps/desktopapp",
  "apps/mobileapp",
  "packages/shared-types",
  "packages/domain",
  "packages/api-contracts",
  "packages/validation",
  "packages/auth",
  "packages/ui",
  "packages/config",
  "scripts",
  "docs",
  "archive"
];

const expectedPackages = [
  "@registry/webapp",
  "@registry/desktopapp",
  "@registry/mobileapp",
  "@registry/shared-types",
  "@registry/domain",
  "@registry/api-contracts",
  "@registry/validation",
  "@registry/auth",
  "@registry/ui",
  "@registry/config"
];

const packageFiles = expectedDirectories
  .filter((directory) => directory.startsWith("apps/") || directory.startsWith("packages/"))
  .map((directory) => `${directory}/package.json`);

let hasFailure = false;

console.log("Registry by Tenra workspace structure check");

for (const directory of expectedDirectories) {
  try {
    await access(new URL(`../${directory}`, import.meta.url), constants.F_OK);
    console.log(`PASS ${directory}`);
  } catch {
    hasFailure = true;
    console.log(`FAIL ${directory}`);
  }
}

for (const packageFile of packageFiles) {
  try {
    const packageJson = JSON.parse(
      await readFile(new URL(`../${packageFile}`, import.meta.url), "utf8")
    );

    if (expectedPackages.includes(packageJson.name)) {
      console.log(`PASS ${packageJson.name}`);
    } else {
      hasFailure = true;
      console.log(`FAIL unexpected package name in ${packageFile}`);
    }
  } catch {
    hasFailure = true;
    console.log(`FAIL ${packageFile}`);
  }
}

if (hasFailure) {
  process.exitCode = 1;
}
