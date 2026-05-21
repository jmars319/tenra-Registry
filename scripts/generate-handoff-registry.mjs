import fs from "node:fs";
import path from "node:path";

/**
 * @tenra-handoff tenra-registry.ledger-export.v1 | Registry | Ledger
 * @tenra-handoff tenra-registry.assembly-document-request.v1 | Registry | Assembly
 */

const sourceRoots = ["packages", "apps", "src", "scripts", "fixtures"];
const sourceExtensions = new Set([".js", ".mjs", ".ts", ".tsx", ".json"]);
const annotationPattern = /@tenra-handoff\s+([^|\n]+)\|\s*([^|\n]+)\|\s*([^\n]+)/gu;

function listSourceFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") return [];
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return sourceExtensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

function readAnnotatedContracts() {
  const contractsById = new Map();
  const files = sourceRoots.flatMap((root) => listSourceFiles(path.resolve(root)));

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(annotationPattern)) {
      const contract = match[1]?.trim();
      const owner = match[2]?.trim();
      const consumers = match[3]?.replace(/\s*\*\/\s*$/u, "").trim();
      if (contract && owner && consumers && !contractsById.has(contract)) {
        contractsById.set(contract, [contract, owner, consumers]);
      }
    }
  }

  const contracts = [...contractsById.values()];
  if (contracts.length === 0) {
    throw new Error("No @tenra-handoff source annotations found.");
  }
  return contracts;
}

const contracts = readAnnotatedContracts();

const content = `# Registry Handoff Registry

Generated from \`@tenra-handoff\` source annotations by \`scripts/generate-handoff-registry.mjs\`.

Registry owns two business handoff payloads: Ledger exports and Assembly document requests. Handoffs are explicit JSON payloads moved through local UI actions, API routes, exports, imports, or fixtures. Apps should not read another app's private storage directly.

Envelope baseline:

- \`schema\`: exact contract id when the payload has one.
- \`sourceApp\`: producing app when the contract supports it.
- \`exportId\`: stable producer export id when duplicate-safe reconciliation is needed.
- \`exportedAt\` or \`exportedAtMs\`: creation timestamp.
- \`traceId\` or source artifact metadata when a downstream app needs audit context.
- Target apps are advisory routing metadata, not hidden coupling.

Registered contracts:

| Contract | Owner | Consumers |
| --- | --- | --- |
${contracts.map(([contract, owner, consumers]) => `| \`${contract}\` | ${owner} | ${consumers} |`).join("\n")}

Validation entrypoint:

- Run the repository's \`verify:handoffs\` script before changing or consuming a handoff fixture.
`;

const outputPath = path.resolve("docs/HANDOFF_REGISTRY.md");
const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";

if (process.argv.includes("--check")) {
  if (current !== content) {
    throw new Error("docs/HANDOFF_REGISTRY.md is out of date. Run node scripts/generate-handoff-registry.mjs.");
  }
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content);
}
