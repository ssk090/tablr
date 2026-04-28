import { z } from "zod";

const AgentConfigSchema = z.object({
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  GROQ_MODEL: z.string().default("meta-llama/llama-4-scout-17b-16e-instruct"),

  // Tablr MCP server (stdio)
  TABLR_SERVER_PATH: z.string().default("./dist/index.js"),

  // Swiggy Food MCP (HTTP) — optional
  SWIGGY_FOOD_URL: z.string().default("https://mcp.swiggy.com/food"),
  SWIGGY_TOKEN: z.string().default(""),

  // Qdrant for Tablr server process
  QDRANT_URL: z.string().default("http://localhost:6333"),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export function loadAgentConfig(): AgentConfig {
  return AgentConfigSchema.parse({
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL,
    TABLR_SERVER_PATH: process.env.TABLR_SERVER_PATH,
    SWIGGY_DINEOUT_URL: process.env.SWIGGY_DINEOUT_URL,
    SWIGGY_TOKEN: process.env.SWIGGY_TOKEN,
    SWIGGY_FOOD_URL: process.env.SWIGGY_FOOD_URL,
    QDRANT_URL: process.env.QDRANT_URL,
  });
}
