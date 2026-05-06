#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
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
  align: "tenra Align",
  facet: "tenra Facet",
  derive: "tenra Derive",
  sentinel: "tenra Sentinel",
  vicina: "Vicina by tenra"
};

const verifierScripts = [
  { repo: "registry", command: "pnpm", args: ["run", "verify:handoffs"] },
  { repo: "ledger", command: "pnpm", args: ["run", "verify:handoffs"] },
  { repo: "assembly", command: "pnpm", args: ["run", "verify:handoffs"] },
  { repo: "proxy", command: "pnpm", args: ["run", "verify:handoffs"] },
  { repo: "scout", command: "pnpm", args: ["run", "verify:handoffs"] },
  { repo: "partition", command: "npm", args: ["run", "verify:handoffs"] },
  { repo: "guardrail", command: "pnpm", args: ["run", "verify:handoffs"] },
  { repo: "align", command: "pnpm", args: ["run", "verify:handoffs"] },
  { repo: "facet", command: "pnpm", args: ["run", "verify:handoffs"] },
  { repo: "derive", command: "pnpm", args: ["run", "verify:handoffs"] },
  { repo: "sentinel", command: "pnpm", args: ["run", "verify:handoffs"] },
  { repo: "sentinel", command: "pnpm", args: ["run", "verify:derive-roundtrip"] },
  { repo: "vicina", command: "pnpm", args: ["run", "verify:handoffs"] }
];

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

function runLocalVerifiers() {
  for (const verifier of verifierScripts) {
    const repoPath = path.join(suiteRoot, repos[verifier.repo]);
    console.log(`RUN ${repos[verifier.repo]}: ${verifier.command} ${verifier.args.join(" ")}`);
    const result = spawnSync(verifier.command, verifier.args, {
      cwd: repoPath,
      stdio: "inherit"
    });
    if (result.status !== 0) {
      throw new Error(`${repos[verifier.repo]} verifier failed.`);
    }
  }
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
  },
  {
    name: "Align -> Guardrail -> Proxy",
    run() {
      assertRepo("align");
      assertRepo("guardrail");
      assertRepo("proxy");
      const align = readJson("tenra Align/fixtures/handoffs/review-reply-route.json");
      assert(align.schema === "tenra-align.review-reply-route.v1", "Align review route schema mismatch");
      assert(align.guardrailReviewRequest?.schema === "tenra-guardrail.external-action-review.v1", "Align route missing Guardrail review request");
      assert(align.proxyShapeRequest?.clientApp === "align", "Align route missing Proxy shape request");
    }
  },
  {
    name: "Facet -> Derive -> Sentinel",
    run() {
      assertRepo("facet");
      assertRepo("derive");
      assertRepo("sentinel");
      const facet = readJson("tenra Facet/fixtures/handoffs/orientation-packet.json");
      const derive = readJson("tenra Derive/fixtures/handoffs/reasoning-brief.json");
      assert(facet.schema === "tenra-facet.orientation-packet.v1", "Facet orientation schema mismatch");
      assert(facet.handoff?.recommendedNextApp === "derive", "Facet fixture should recommend Derive");
      assert(derive.schema === "tenra-derive.reasoning-brief.v1", "Derive reasoning brief schema mismatch");
      assert(derive.handoff?.recommendedConsumers?.includes("sentinel"), "Derive brief should target Sentinel");
    }
  },
  {
    name: "Sentinel -> Derive -> Guardrail",
    run() {
      assertRepo("sentinel");
      assertRepo("derive");
      assertRepo("guardrail");
      const sentinel = readJson("tenra Sentinel/fixtures/handoffs/risk-brief.json");
      assert(sentinel.schema === "tenra-sentinel.risk-brief.v1", "Sentinel risk brief schema mismatch");
      assert(sentinel.handoff?.recommendedConsumers?.includes("derive"), "Sentinel risk brief should target Derive");
      assert(sentinel.handoff?.recommendedConsumers?.includes("guardrail"), "Sentinel risk brief should target Guardrail");
    }
  }
];

runLocalVerifiers();

for (const check of checks) {
  check.run();
  console.log(`OK ${check.name}`);
}

console.log(`suite-smoke: ${checks.length} flow checks passed`);
