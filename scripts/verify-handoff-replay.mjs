#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const files = {
  detailPage: "apps/webapp/app/handoffs/[exportId]/page.tsx",
  replayRoute: "apps/webapp/app/api/handoffs/replay/[exportId]/route.ts"
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

assert(detailPage.includes("Replay payload preview"), "detail page should keep replay payload preview copy");
assert(detailPage.includes("Recorded summary vs current replay"), "detail page should render replay diff summary");
assert(detailPage.includes('method="post"'), "detail page should expose replay POST form");
assert(detailPage.includes("/api/handoffs/replay/"), "detail page should post to replay route");
assert(replayRoute.includes("export async function POST"), "replay route should support POST delivery");
assert(replayRoute.includes("content-type"), "replay route should accept JSON and form posts");
assert(replayRoute.includes("updateHandoffDeliveryStatus"), "replay POST should update audit delivery status");

console.log("Verified Registry handoff replay detail and POST delivery coverage.");
