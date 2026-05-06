#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const suiteRoot = path.resolve(repoRoot, "..");

const repos = {
  registry: "tenra Registry",
  ledger: "tenra Ledger",
  assembly: "tenra Assembly",
  proxy: "tenra Proxy",
  scout: "tenra Scout",
  partition: "tenra Partition",
  guardrail: "tenra Guardrail",
  vicina: "Vicina by tenra"
};

function readJson(relativePath) {
  const fullPath = path.join(suiteRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing smoke fixture: ${relativePath}`);
  }
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertRepo(name) {
  const relative = repos[name];
  assert(relative, `Unknown repo key ${name}`);
  assert(fs.existsSync(path.join(suiteRoot, relative, ".git")), `${relative} is not a git repo`);
}

const checks = [
  {
    name: "Registry -> Ledger",
    run() {
      assertRepo("registry");
      assertRepo("ledger");
      const payload = readJson("tenra Registry/fixtures/handoffs/ledger-export.json");
      assert(payload.schema === "tenra-registry.ledger-export.v1", "Registry Ledger schema mismatch");
      assert(payload.rows?.length > 0, "Registry Ledger export has no rows");
    }
  },
  {
    name: "Registry -> Assembly -> Proxy",
    run() {
      assertRepo("assembly");
      assertRepo("proxy");
      const registry = readJson("tenra Registry/fixtures/handoffs/assembly-document-request.json");
      const proxy = readJson("tenra Assembly/fixtures/handoffs/proxy-notice-handoff.json");
      assert(registry.schema === "tenra-registry.assembly-document-request.v1", "Registry Assembly schema mismatch");
      assert(proxy.schema === "tenra-assembly.proxy-notice-handoff.v1", "Assembly Proxy schema mismatch");
      assert(proxy.proxyShapeRequest?.clientApp === "assembly", "Assembly Proxy shape request is missing");
    }
  },
  {
    name: "Scout -> Assembly -> Proxy",
    run() {
      assertRepo("scout");
      assertRepo("assembly");
      const scout = readJson("tenra Scout/fixtures/handoffs/direct-delivery-smoke.json");
      const assembly = readJson("tenra Assembly/fixtures/handoffs/direct-delivery-smoke-proxy-notice.json");
      const proxy = readJson("tenra Proxy/fixtures/handoffs/direct-delivery-smoke-shape.json");
      assert(scout.schema === "tenra-scout.opportunity-handoff.v1", "Scout opportunity schema mismatch");
      assert(assembly.proxyShapeRequest?.sourceArtifact?.schema === "tenra-scout.opportunity-handoff.v1", "Assembly does not preserve Scout source");
      assert(proxy.clientApp === "assembly", "Proxy direct-delivery smoke request should be assembly-shaped");
    }
  },
  {
    name: "Partition -> Guardrail",
    run() {
      assertRepo("partition");
      assertRepo("guardrail");
      const partitionSource = fs.readFileSync(path.join(suiteRoot, "tenra Partition/src/io/partitionLab.ts"), "utf8");
      const guardrail = readJson("tenra Guardrail/fixtures/handoffs/external-action-review.json");
      assert(partitionSource.includes("tenra-guardrail.external-action-review.v1"), "Partition Guardrail export helper missing");
      assert(guardrail.schema === "tenra-guardrail.external-action-review.v1", "Guardrail review fixture schema mismatch");
    }
  },
  {
    name: "Vicina -> Guardrail",
    run() {
      assertRepo("vicina");
      assertRepo("guardrail");
      const vicina = readJson("Vicina by tenra/fixtures/handoffs/workflow-handoff.json");
      assert(vicina.schema === "tenra-vicina.workflow-handoff.v1", "Vicina workflow handoff schema mismatch");
      assert(vicina.targetApps?.includes("guardrail"), "Vicina workflow handoff does not target Guardrail");
    }
  }
];

for (const check of checks) {
  check.run();
  console.log(`OK ${check.name}`);
}

console.log(`suite-smoke: ${checks.length} flow checks passed`);
