#!/usr/bin/env node

import "dotenv/config";

import * as readline from "node:readline";
import { runConversation } from './agent';
import { closeClients, createClients } from './clients';
import { loadAgentConfig } from './config';

async function main(): Promise<void> {
  console.log("🍽️  Tablr — AI Social Dining Agent");
  console.log("━".repeat(40));

  const config = loadAgentConfig();

  console.log("Connecting to MCP servers...");
  const clients = await createClients(config);

  const hasSwiggy = clients.swiggy !== null;
  console.log(`✅ Tablr MCP connected`);
  console.log(
    hasSwiggy
      ? "✅ Swiggy Dineout MCP connected"
      : "⚠️  Swiggy Dineout not connected (set SWIGGY_TOKEN to enable)",
  );
  console.log("━".repeat(40));
  console.log('Type your message, or "exit" to quit.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  const prompt = (): void => {
    rl.question("You: ", async (input) => {
      const trimmed = input.trim();

      if (!trimmed || trimmed.toLowerCase() === "exit") {
        console.log("\n👋 Goodbye! Happy dining.");
        await closeClients(clients);
        rl.close();
        process.exit(0);
      }

      messages.push({ role: "user", content: trimmed });

      try {
        const response = await runConversation(clients, config, messages);
        messages.push({ role: "assistant", content: response.text });

        console.log(`\nTablr: ${response.text}\n`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Something went wrong";
        console.error(`\n❌ Error: ${msg}\n`);
      }

      prompt();
    });
  };

  prompt();
}

main().catch((error: unknown) => {
  console.error("Fatal:", error instanceof Error ? error.message : error);
  process.exit(1);
});
