import "dotenv/config";
import { TablrDatabase } from "../packages/core/src/db/database";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { registerRestaurantTools } from "../packages/core/src/tools/restaurant-tools";

async function verify() {
  const db = new TablrDatabase("./tablr-test.db");
  const server = new McpServer({ name: "test", version: "1.0" });
  
  registerRestaurantTools(server, db);
  
  // Find the search_restaurants tool
  const searchTool = (server as any)._tools.get("search_restaurants");
  if (!searchTool) {
    console.error("search_restaurants tool not found!");
    return;
  }

  console.log("Running search_restaurants with query 'Pizza'...");
  
  // Test with no token (fallback)
  process.env.SWIGGY_TOKEN = ""; 
  const result = await searchTool.execute({ query: "Pizza", area: "Koramangala" });
  console.log("Result (No Token):", JSON.stringify(result, null, 2));

  // Test with mock token (should attempt Swiggy and fail/log error)
  process.env.SWIGGY_TOKEN = "mock_token";
  console.log("\nRunning with mock token (expecting Swiggy attempt)...");
  try {
    const resultWithToken = await searchTool.execute({ query: "Biryani" });
    console.log("Result (Mock Token):", JSON.stringify(resultWithToken, null, 2));
  } catch (e) {
    console.log("Caught expected error from mock token Swiggy attempt.");
  }

  db.close();
}

verify().catch(console.error);
