#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const files = {
  detailPage: "apps/webapp/app/handoffs/[exportId]/page.tsx",
  replayRoute: "apps/webapp/app/api/handoffs/replay/[exportId]/route.ts",
  registryData: "apps/webapp/src/server/registry-data/handoffs.ts"
};

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const detailPage = read(files.detailPage);
const replayRoute = read(files.replayRoute);
const registryData = read(files.registryData);

assert(detailPage.includes("Replay payload preview"), "detail page should keep replay payload preview copy");
assert(detailPage.includes("Recorded summary vs current replay"), "detail page should render replay diff summary");
assert(detailPage.includes('method="post"'), "detail page should expose replay POST form");
assert(detailPage.includes("Replay history"), "detail page should render replay attempt history");
assert(detailPage.includes("datalist"), "detail page should expose endpoint presets");
assert(detailPage.includes("/api/handoffs/replay/"), "detail page should post to replay route");
assert(replayRoute.includes("export async function POST"), "replay route should support POST delivery");
assert(replayRoute.includes(":replay:"), "replay route should record replay attempts separately");
assert(replayRoute.includes("content-type"), "replay route should accept JSON and form posts");
assert(replayRoute.includes("updateHandoffDeliveryStatus"), "replay POST should update audit delivery status");
assert(registryData.includes("listHandoffReplayAudits"), "registry data should expose replay attempt history");

console.log("Verified Registry handoff replay detail and POST delivery coverage.");
