import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = new URL("..", import.meta.url);
const defaultDatabaseUrl = "postgresql:///registry?schema=public";

for (const envPath of [new URL("../.env", import.meta.url), new URL("../.env.local", import.meta.url)]) {
  if (existsSync(envPath)) {
    loadEnvFile(fileURLToPath(envPath));
  }
}

const databaseUrl = process.env.DATABASE_URL?.trim() || defaultDatabaseUrl;
const parsedDatabaseUrl = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.replace(/^\//u, ""));

if (!databaseName) {
  console.error("DATABASE_URL must include a database name.");
  process.exit(1);
}

const maintenanceUrl = new URL(databaseUrl);
maintenanceUrl.pathname = "/postgres";
maintenanceUrl.search = "";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
    stdio: options.stdio ?? "pipe"
  });

  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    output: (result.stdout || result.stderr || "").trim()
  };
}

function requireTool(command) {
  const result = run(command, ["--version"]);

  if (!result.ok) {
    console.error(`${command} is required for Registry database preparation.`);
    process.exit(result.status);
  }
}

requireTool("psql");
requireTool("createdb");

const existsResult = run("psql", [
  maintenanceUrl.toString(),
  "-tAc",
  `SELECT 1 FROM pg_database WHERE datname = '${databaseName.replaceAll("'", "''")}';`
]);

if (!existsResult.ok) {
  console.error(existsResult.output || "Unable to inspect local Postgres databases.");
  process.exit(existsResult.status);
}

if (existsResult.output.trim() === "1") {
  console.log(`Database exists: ${databaseName}`);
} else {
  const createResult = run("createdb", ["--maintenance-db", maintenanceUrl.toString(), databaseName]);

  if (!createResult.ok) {
    console.error(createResult.output || `Unable to create database: ${databaseName}`);
    process.exit(createResult.status);
  }

  console.log(`Database created: ${databaseName}`);
}

const steps = [
  ["generate Prisma client", "pnpm", ["--filter", "@registry/webapp", "db:generate"]],
  ["apply existing migrations", "pnpm", ["--filter", "@registry/webapp", "exec", "prisma", "migrate", "deploy"]]
];

for (const [label, command, args] of steps) {
  console.log(`Running: ${label}`);
  const result = run(command, args, { stdio: "inherit" });

  if (!result.ok) {
    process.exit(result.status);
  }
}

console.log(`Registry local database is ready at ${databaseUrl}`);
