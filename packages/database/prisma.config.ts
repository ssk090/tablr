import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const configDir = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(configDir, "../..", ".env");

if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

function isGenerateCommand(): boolean {
  return process.argv.some((argument) => argument === "generate");
}

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (isGenerateCommand()) {
    return "postgresql://prisma:prisma@localhost:5432/prisma";
  }

  throw new Error("DATABASE_URL is required for Prisma commands that access the database");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: getDatabaseUrl(),
  },
});
