import path from "node:path";
import { loadEnvFile } from "node:process";

let envLoaded = false;

function getEnvFilePath(): string {
  return path.resolve(process.cwd(), "../../.env");
}

export function ensureRegistryEnv(): void {
  if (envLoaded) {
    return;
  }

  loadEnvFile(getEnvFilePath());
  envLoaded = true;
}

export function getDatabaseUrl(): string {
  ensureRegistryEnv();

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Add it to the repo root .env file.");
  }

  return databaseUrl;
}
