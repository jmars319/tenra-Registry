import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const fixtureDir = path.resolve("fixtures/handoffs");
const registryDocCheck = spawnSync(process.execPath, ["scripts/generate-handoff-registry.mjs", "--check"], {
  stdio: "inherit"
});
if (registryDocCheck.status !== 0) process.exit(registryDocCheck.status ?? 1);
const expectedSchemas = new Set([
  "tenra-registry.ledger-export.v1",
  "tenra-registry.assembly-document-request.v1"
]);

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listJsonFiles(fullPath) : entry.name.endsWith(".json") ? [fullPath] : [];
  });
}

const files = listJsonFiles(fixtureDir);
if (files.length === 0) {
  throw new Error("No handoff fixtures found.");
}
const payloadsByFile = new Map();

function requireText(value, expected, file) {
  if (typeof value !== "string" || !value.includes(expected)) {
    throw new Error(`${file} must include "${expected}" in its Assembly request context.`);
  }
}

for (const file of files) {
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  payloadsByFile.set(path.basename(file), payload);
  if (!payload || typeof payload !== "object" || typeof payload.schema !== "string") {
    throw new Error(`${file} must contain an object payload with a schema string.`);
  }
  if (typeof payload.exportId !== "string" || !payload.exportId.startsWith("registry-")) {
    throw new Error(`${file} must include a stable registry exportId.`);
  }
  if (!expectedSchemas.has(payload.schema)) {
    throw new Error(`${file} uses an unexpected schema: ${payload.schema}`);
  }
  if (payload.schema === "tenra-registry.ledger-export.v1" && path.basename(file) === "ledger-export.json") {
    const total = payload.rows.reduce((sum, row) => sum + row.amountMinor, 0);
    if (total !== 24000) {
      throw new Error(`${file} must keep the golden Ledger export total at 24000 minor units.`);
    }
  }
  if (
    payload.schema === "tenra-registry.assembly-document-request.v1" &&
    path.basename(file) === "assembly-document-request.json"
  ) {
    requireText(payload.contextMarkdown, "Acme Builders", file);
    requireText(payload.contextMarkdown, "$240.00 past due", file);
    requireText(payload.contextMarkdown, "UNIT-014", file);
    if (payload.desiredOutput !== "notice") {
      throw new Error(`${file} must keep the golden Assembly output as a notice.`);
    }
  }
}

const golden = payloadsByFile.get("ledger-export.json");
const duplicate = payloadsByFile.get("duplicate-reconciliation-ledger-export.json");
if (golden && duplicate) {
  const goldenKey = `${golden.exportId}:${golden.rows?.[0]?.externalId}`;
  const duplicateKey = `${duplicate.exportId}:${duplicate.rows?.[0]?.externalId}`;
  if (goldenKey !== duplicateKey) {
    throw new Error("Duplicate reconciliation fixture must preserve the same Registry export/import key as the golden Ledger export.");
  }
}

console.log(`Validated ${files.length} Registry handoff fixture(s).`);
