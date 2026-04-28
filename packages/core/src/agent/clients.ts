import { createMCPClient, createMcpTransport } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import type { ToolSet } from "ai";
import type { AgentConfig } from './config';

type MCPClientInstance = Awaited<ReturnType<typeof createMCPClient>>;

  readonly tablr: MCPClientInstance;
  readonly swiggyDineout: MCPClientInstance | null;
  readonly swiggyFood: MCPClientInstance | null;
}

/**
 * Connect to the Tablr MCP server via stdio.
 */
async function connectTablr(config: AgentConfig): Promise<MCPClientInstance> {
  const transport = new Experimental_StdioMCPTransport({
    command: "node",
    args: [config.TABLR_SERVER_PATH],
    env: {
      ...process.env,
      GROQ_API_KEY: config.GROQ_API_KEY,
      QDRANT_URL: config.QDRANT_URL,
    },
  });

  return createMCPClient({ transport });
}

/**
 * Connect to Swiggy Dineout MCP via HTTP.
 */
async function connectSwiggyDineout(config: AgentConfig): Promise<MCPClientInstance | null> {
  if (!config.SWIGGY_TOKEN || !config.SWIGGY_DINEOUT_URL) return null;

  const transport = createMcpTransport({
    type: "http",
    url: config.SWIGGY_DINEOUT_URL,
    headers: { Authorization: `Bearer ${config.SWIGGY_TOKEN}` },
  });

  return createMCPClient({ transport });
}

/**
 * Connect to Swiggy Food MCP via HTTP.
 */
async function connectSwiggyFood(config: AgentConfig): Promise<MCPClientInstance | null> {
  if (!config.SWIGGY_TOKEN || !config.SWIGGY_FOOD_URL) return null;

  const transport = createMcpTransport({
    type: "http",
    url: config.SWIGGY_FOOD_URL,
    headers: { Authorization: `Bearer ${config.SWIGGY_TOKEN}` },
  });

  return createMCPClient({ transport });
}

/**
 * Initialize all MCP client connections.
 */
export async function createClients(config: AgentConfig): Promise<MCPClients> {
  const [tablr, swiggyDineout, swiggyFood] = await Promise.all([
    connectTablr(config),
    connectSwiggyDineout(config),
    connectSwiggyFood(config),
  ]);
  return { tablr, swiggyDineout, swiggyFood };
}

/**
 * Collect all tools from connected MCP servers into a single object.
 */
export async function getAllTools(clients: MCPClients): Promise<ToolSet> {
  const tablrTools = (await clients.tablr.tools()) as ToolSet;
  let allTools = { ...tablrTools };

  if (clients.swiggyDineout) {
    const dineoutTools = await clients.swiggyDineout.tools();
    allTools = { ...allTools, ...dineoutTools };
  }

  if (clients.swiggyFood) {
    const foodTools = await clients.swiggyFood.tools();
    allTools = { ...allTools, ...foodTools };
  }

  return allTools;
}

/**
 * Gracefully close all MCP clients.
 */
export async function closeClients(clients: MCPClients): Promise<void> {
  await clients.tablr.close();
  if (clients.swiggyDineout) await clients.swiggyDineout.close();
  if (clients.swiggyFood) await clients.swiggyFood.close();
}