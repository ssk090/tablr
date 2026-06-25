import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";

function loadRootEnv(): void {
  // Skip .env loading on Vercel — env vars are injected by platform
  if (process.env.VERCEL) return;

  let currentDir = dirname(fileURLToPath(import.meta.url));

  while (currentDir !== dirname(currentDir)) {
    const envPath = join(currentDir, ".env");
    if (existsSync(envPath)) {
      try {
        process.loadEnvFile(envPath);
      } catch {
        // Silently ignore .env parse failures on platforms that don't need it
      }
      return;
    }
    currentDir = dirname(currentDir);
  }
}

loadRootEnv();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize PrismaClient");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
