import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const strict = process.argv.includes("--strict");
const writeContracts = process.argv.includes("--write-contracts");
const config = JSON.parse(fs.readFileSync(path.join(root, "scripts", "maintainability.config.json"), "utf8"));

// Scan configuration boundary
const styleExtensions = new Set([".css", ".scss", ".sass", ".less"]);
const sourceExtensions = new Set(config.sourceExtensions);
const ignoredSegments = new Set([
  ".expo",
  ".git",
  ".next",
  ".turbo",
  ".vite",
  "coverage",
  "dist",
  "dist-bundle",
  "node_modules",
  "out",
  "target",
  "web-build",
  ...(config.ignoredSegments ?? []),
]);
const violations = [];
const warnings = [];

function rel(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function lineCount(file) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/).length;
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function matchesAny(value, patterns) {
  return patterns.some((pattern) => value.includes(pattern));
}

function trackedFiles() {
  try {
    return execSync("git ls-files", { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredSegments.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

// Source inventory boundary
function collectSourceRecords() {
  const files = config.sourceRoots
    .filter((directory) => fs.existsSync(path.join(root, directory)))
    .flatMap((directory) => walk(path.join(root, directory)))
    .filter((file, index, all) => all.indexOf(file) === index);
  return files.map((file) => ({ file: rel(file), ext: path.extname(file), lines: lineCount(file) }));
}

function configuredBudget(record) {
  const specific = config.specificFileBudgets?.[record.file];
  if (specific) return specific;
  if (styleExtensions.has(record.ext)) return config.maxStyleFileLines;
  if (/^apps\/desktopapp\/src\/main\.ts$/.test(record.file)) return config.maxDesktopMainLines;
  if (/^apps\/webapp\/app\/layout\.tsx$/.test(record.file) || /^apps\/webapp\/src\/components\/app-shell\.tsx$/.test(record.file)) {
    return config.maxAppShellLines;
  }
  if (/^packages\/[^/]+\/src\/index\.ts$/.test(record.file)) return config.maxDomainBarrelLines;
  return config.maxImplementationFileLines;
}

// Budget audit boundary
function checkBudgets(records) {
  for (const record of records) {
    const budget = configuredBudget(record);
    const remaining = budget - record.lines;
    if (record.lines > budget) violations.push(record.file + " has " + record.lines + " lines; budget is " + budget + ".");
    else if (remaining <= config.nearBudgetLineThreshold) warnings.push(record.file + " is within " + remaining + " lines of its " + budget + "-line budget.");
  }
}

function checkGeneratedArtifacts(records) {
  const generated = [...records.map((record) => record.file), ...trackedFiles()].filter(
    (file) =>
      matchesAny(file, config.generatedPathPatterns ?? []) &&
      !matchesAny(file, config.allowedGeneratedPathPatterns ?? []),
  );
  for (const file of sortedUnique(generated)) violations.push("generated/runtime artifact is tracked or in source scan: " + file);
}

function checkImports(records) {
  const importPattern = /(?:import\s+(?:[^"']+\s+from\s+)?|export\s+[^"']+\s+from\s+|require\()\s*["']([^"']+)["']/g;
  for (const record of records.filter((item) => !styleExtensions.has(item.ext))) {
    if (matchesAny(record.file, config.allowedGeneratedPathPatterns ?? [])) continue;
    const source = read(record.file);
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (matchesAny(specifier, config.bannedImportSpecifiers ?? [])) {
        violations.push(record.file + " imports banned path " + specifier + ".");
      }
      for (const rule of config.startupImportBans ?? []) {
        if (matchesAny(record.file, rule.files) && matchesAny(specifier, rule.specifiers)) {
          violations.push(record.file + " imports startup-banned path " + specifier + ".");
        }
      }
    }
  }
}

function checkCssOwnership() {
  const rootStyles = read("apps/webapp/app/globals.css").trim();
  const nonImportLines = rootStyles.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("@import"));
  if (nonImportLines.length > 0) violations.push("apps/webapp/app/globals.css must remain an import-only style entrypoint.");
  for (const required of config.requiredStyleImports ?? []) {
    if (!rootStyles.includes(required)) violations.push("apps/webapp/app/globals.css is missing required import " + required + ".");
  }
}

function checkAssetBudgets() {
  for (const [file, budgetBytes] of Object.entries(config.assetBudgets ?? {})) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) {
      violations.push("asset budget target is missing: " + file);
      continue;
    }
    const size = fs.statSync(absolute).size;
    const remaining = Number(budgetBytes) - size;
    if (size > Number(budgetBytes)) violations.push(file + " is " + size + " bytes; asset budget is " + budgetBytes + " bytes.");
    else if (remaining <= Number(config.nearAssetBudgetBytes ?? 0)) warnings.push(file + " is within " + remaining + " bytes of its asset budget.");
  }
}

function exportedNames(file) {
  const source = read(file);
  const names = [];
  for (const match of source.matchAll(/export\s+(?:const|function|class|interface|type)\s+([A-Za-z0-9_]+)/g)) names.push(match[1]);
  for (const match of source.matchAll(/export\s+\*\s+from\s+["']([^"']+)["']/g)) {
    const target = path.join(path.dirname(file), match[1] + ".ts");
    if (fs.existsSync(path.join(root, target))) names.push(...exportedNames(target));
  }
  return sortedUnique(names);
}

function packageExports() {
  const exportsByPackage = {};
  for (const file of fs.readdirSync(path.join(root, "packages"))) {
    const packagePath = path.join("packages", file, "package.json");
    if (fs.existsSync(path.join(root, packagePath))) {
      const packageJson = JSON.parse(read(packagePath));
      exportsByPackage[packageJson.name] = packageJson.exports;
    }
  }
  return exportsByPackage;
}

function nextRoutePath(file, suffix) {
  const route = file.replace(/^apps\/webapp\/app/, "").replace(new RegExp(`${suffix}$`), "");
  return route === "" ? "/" : route;
}

function routeContracts() {
  const routes = [];
  for (const file of trackedFiles().filter((item) => item.startsWith("apps/webapp/app/"))) {
    if (file.endsWith("/page.tsx")) routes.push({ kind: "page", path: nextRoutePath(file, "/page.tsx") });
    if (file.endsWith("/route.ts")) {
      const source = read(file);
      const methods = sortedUnique([...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map((match) => match[1]));
      routes.push({ kind: "route", methods, path: nextRoutePath(file, "/route.ts") });
    }
  }
  return routes.sort((left, right) => (left.path + left.kind).localeCompare(right.path + right.kind));
}

function prismaContracts() {
  const schema = read("apps/webapp/prisma/schema.prisma");
  return {
    enums: sortedUnique([...schema.matchAll(/^enum\s+([A-Za-z0-9_]+)/gm)].map((match) => match[1])),
    models: sortedUnique([...schema.matchAll(/^model\s+([A-Za-z0-9_]+)/gm)].map((match) => match[1])),
  };
}

// Contract snapshot boundary
function contractSnapshot() {
  const rootPackage = JSON.parse(read("package.json"));
  const menuSource = read("apps/desktopapp/src/desktop/menu.ts");
  const apiSource = fs.readdirSync(path.join(root, "packages/api-contracts/src/contracts"))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => read(path.join("packages/api-contracts/src/contracts", file)))
    .join("\n");
  return {
    apiPublicExports: exportedNames("packages/api-contracts/src/index.ts"),
    desktopBridgeMethods: [],
    desktopMenuLabels: sortedUnique([...menuSource.matchAll(/label:\s*"([^"]+)"/g)].map((match) => match[1])),
    domainPublicExports: exportedNames("packages/domain/src/index.ts"),
    handoffSchemas: sortedUnique([...apiSource.matchAll(/"([^"]*tenra-registry[^"]*\.v\d+)"/g)].map((match) => match[1])),
    packageExports: { rootWorkspaces: rootPackage.workspaces, packages: packageExports() },
    prisma: prismaContracts(),
    routes: routeContracts(),
    validationPublicExports: exportedNames("packages/validation/src/index.ts"),
  };
}

function checkContracts() {
  const snapshot = contractSnapshot();
  const snapshotPath = path.join(root, config.contractSnapshotPath);
  if (writeContracts) {
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + "\n");
    return;
  }
  if (!fs.existsSync(snapshotPath)) {
    violations.push("missing contract snapshot: " + config.contractSnapshotPath);
    return;
  }
  const expected = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  if (JSON.stringify(snapshot, null, 2) !== JSON.stringify(expected, null, 2)) {
    violations.push("contract snapshot drift: " + config.contractSnapshotPath);
  }
}

// Report output boundary
const records = collectSourceRecords();
const implementationRecords = records.filter((record) => !styleExtensions.has(record.ext));
const styleRecords = records.filter((record) => styleExtensions.has(record.ext));
checkBudgets(records);
checkGeneratedArtifacts(records);
checkImports(records);
checkCssOwnership();
checkAssetBudgets();
checkContracts();

console.log((config.label ?? path.basename(root)) + " maintainability audit");
console.log("");
console.log("Largest implementation files:");
for (const record of implementationRecords.sort((left, right) => right.lines - left.lines).slice(0, 12)) console.log("- " + record.file + ": " + record.lines + " lines");
console.log("");
console.log("Largest style files:");
for (const record of styleRecords.sort((left, right) => right.lines - left.lines).slice(0, 8)) console.log("- " + record.file + ": " + record.lines + " lines");
console.log("");
console.log("Contracts: " + (writeContracts ? "snapshot written" : "snapshot checked"));

if (warnings.length > 0) {
  console.log("");
  console.log("Near-budget warnings:");
  for (const warning of warnings) console.log("- " + warning);
}
if (violations.length > 0) {
  console.log("");
  console.log("Maintainability violations:");
  for (const violation of violations) console.log("- " + violation);
}
if (violations.length > 0 || (strict && config.failOnNearBudgetWarnings && warnings.length > 0)) process.exit(1);
