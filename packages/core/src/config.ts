import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const ConfigSchema = z.object({
  GROQ_API_KEY: z.string().optional(),
  TABLR_DB_PATH: z.string().default(join(homedir(), ".tablr", "tablr.db")),
  GROQ_MODEL: z.string().default("meta-llama/llama-4-scout-17b-16e-instruct"),
  OLLAMA_URL: z.string().default("http://localhost:11434"),
  OLLAMA_EMBED_MODEL: z.string().default("nomic-embed-text"),
  QDRANT_URL: z.string().default("http://localhost:6333"),
  QDRANT_API_KEY: z.string().default(""),
  SWIGGY_FOOD_URL: z.string().default("https://mcp.swiggy.com/food"),
});

export type Config = z.infer<typeof ConfigSchema>;

let _config: Config | undefined;

export function getConfig(): Config {
  if (_config) return _config;

  _config = ConfigSchema.parse({
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    TABLR_DB_PATH: process.env.TABLR_DB_PATH,
    GROQ_MODEL: process.env.GROQ_MODEL,
    OLLAMA_URL: process.env.OLLAMA_URL,
    OLLAMA_EMBED_MODEL: process.env.OLLAMA_EMBED_MODEL,
    QDRANT_URL: process.env.QDRANT_URL,
    QDRANT_API_KEY: process.env.QDRANT_API_KEY,
  });

  return _config;
}
