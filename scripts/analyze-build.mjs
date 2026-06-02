import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const strict = process.argv.includes("--strict");
const configPath = path.join(root, "scripts", "maintainability.config.json");
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};
const budgetBytes = Number(process.env.BUNDLE_BUDGET_KB ?? config.initialBundleBudgetKb ?? 450) * 1024;
const nearBudgetBytes = Number(config.nearBundleBudgetKb ?? 0) * 1024;
const violations = [];
const warnings = [];
const candidateAssetDirs = config.assetDirs ?? [
  "apps/webapp/.next/static/chunks",
  "apps/desktopapp/dist",
  "apps/desktopapp/dist/assets",
];

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else if ([".js", ".cjs", ".mjs"].includes(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function sizeRecord(file) {
  const raw = fs.readFileSync(file);
  return { file: path.relative(root, file).replaceAll("\\", "/"), rawBytes: raw.byteLength, gzipBytes: zlib.gzipSync(raw).byteLength };
}

const assets = candidateAssetDirs.flatMap((dir) => walk(path.join(root, dir))).map(sizeRecord);
const uniqueAssets = assets.filter((asset, index, all) => all.findIndex((candidate) => candidate.file === asset.file) === index);

if (uniqueAssets.length === 0) {
  console.log((config.label ?? path.basename(root)) + " build size report");
  console.log("No built JavaScript assets found. Run the app build first for bundle sizes.");
  if (strict && config.requireBuiltAssets === true) process.exit(1);
  process.exit(0);
}

const sorted = uniqueAssets.sort((left, right) => right.rawBytes - left.rawBytes);
const initialPattern = config.initialChunkPattern ? new RegExp(config.initialChunkPattern) : /\.js$/;
const initial = sorted.find((asset) => initialPattern.test(asset.file)) ?? sorted[0];
console.log((config.label ?? path.basename(root)) + " build size report");
console.log("Initial/largest route chunk: " + initial.file + " " + (initial.rawBytes / 1024).toFixed(2) + " KiB raw / " + (initial.gzipBytes / 1024).toFixed(2) + " KiB gzip");
console.log("Target: " + (budgetBytes / 1024).toFixed(0) + " KiB raw");
console.log("");
console.log("Largest JavaScript assets:");
for (const asset of sorted.slice(0, 12)) {
  console.log("- " + asset.file + ": " + (asset.rawBytes / 1024).toFixed(2) + " KiB raw / " + (asset.gzipBytes / 1024).toFixed(2) + " KiB gzip");
}

if (initial.rawBytes > budgetBytes) {
  violations.push("Initial/largest route chunk exceeds target by " + ((initial.rawBytes - budgetBytes) / 1024).toFixed(2) + " KiB.");
} else if (nearBudgetBytes > 0 && budgetBytes - initial.rawBytes <= nearBudgetBytes) {
  warnings.push("Initial/largest route chunk is within " + ((budgetBytes - initial.rawBytes) / 1024).toFixed(2) + " KiB of target.");
}

for (const budget of config.chunkBudgets ?? []) {
  const pattern = new RegExp(budget.pattern);
  const matches = sorted.filter((asset) => pattern.test(asset.file));
  const targetBytes = Number(budget.budgetKb) * 1024;
  if (matches.length === 0) {
    violations.push("Missing bundle chunk for budget \"" + budget.name + "\".");
    continue;
  }
  const asset = matches.sort((left, right) => right.rawBytes - left.rawBytes)[0];
  console.log("- " + budget.name + " budget: " + asset.file + " " + (asset.rawBytes / 1024).toFixed(2) + " KiB raw / " + (asset.gzipBytes / 1024).toFixed(2) + " KiB gzip, target " + Number(budget.budgetKb).toFixed(0) + " KiB");
  if (asset.rawBytes > targetBytes) violations.push(budget.name + " exceeds target by " + ((asset.rawBytes - targetBytes) / 1024).toFixed(2) + " KiB.");
  else if (nearBudgetBytes > 0 && targetBytes - asset.rawBytes <= nearBudgetBytes) warnings.push(budget.name + " is within " + ((targetBytes - asset.rawBytes) / 1024).toFixed(2) + " KiB of target.");
}

if (warnings.length > 0) {
  console.log("");
  console.log("Bundle near-budget warnings:");
  for (const warning of warnings) console.log("- " + warning);
}
if (violations.length > 0) {
  console.log("");
  console.log("Bundle budget violations:");
  for (const violation of violations) console.log("- " + violation);
}
if (violations.length > 0 || (strict && warnings.length > 0)) process.exit(1);
