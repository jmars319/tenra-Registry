import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "./env";

declare global {
  var registryPrisma: PrismaClient | undefined;
}

getDatabaseUrl();

const adapter = new PrismaPg({
  connectionString: getDatabaseUrl()
});

export const db =
  globalThis.registryPrisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.registryPrisma = db;
}
