#!/usr/bin/env node

import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { getConfig } from "./config";
import { TablrDatabase } from "./db/database";
import { ensureCollection } from "./db/qdrant";
import { seedDemoProfiles } from "./db/seed-profiles";
import { registerResources } from "./resources/index";
import { seedRestaurantsIfEmpty } from "./restaurants/discovery";
import { registerDinnerIntentTools } from "./tools/dinner-intent-tools";
import { registerEventTools } from "./tools/event-tools";
import { registerMatchmakingTools } from "./tools/matchmaking-tools";
import { registerProfileTools } from "./tools/profile-tools";
import { registerRestaurantTools } from "./tools/restaurant-tools";

async function main(): Promise<void> {
  // Validate config early
  const config = getConfig();

  // Initialize database
  const db = new TablrDatabase(config.TABLR_DB_PATH);

  // Initialize Qdrant collection
  await ensureCollection();

  // Seed data if empty
  seedRestaurantsIfEmpty(db);
  await seedDemoProfiles(db);

  // Create MCP server
  const server = new McpServer({
    name: "tablr",
    version: "0.1.0",
  });

  // Register all tools
  registerProfileTools(server, db);
  registerMatchmakingTools(server, db);
  registerRestaurantTools(server, db);
  registerEventTools(server, db);
  registerDinnerIntentTools(server, db);

  // Register resources
  registerResources(server, db);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown
  const shutdown = (): void => {
    db.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
