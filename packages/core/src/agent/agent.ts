import { groq } from "@ai-sdk/groq";
import { generateText, stepCountIs } from "ai";
import type { MCPClients } from './clients';
import { getAllTools } from './clients';
import type { AgentConfig } from './config';
import { SYSTEM_PROMPT } from './system-prompt';

export interface AgentResponse {
  readonly text: string;
}

/**
 * Run a single agent turn with the given user message.
 */
export async function runAgent(
  clients: MCPClients,
  config: AgentConfig,
  userMessage: string,
): Promise<AgentResponse> {
  const tools = await getAllTools(clients);

  const { text } = await generateText({
    model: groq(config.GROQ_MODEL),
    tools,
    stopWhen: stepCountIs(10),
    system: SYSTEM_PROMPT,
    prompt: userMessage,
  });

  return { text };
}

/**
 * Run a multi-turn conversation with message history.
 */
export async function runConversation(
  clients: MCPClients,
  config: AgentConfig,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<AgentResponse> {
  const tools = await getAllTools(clients);

  const { text } = await generateText({
    model: groq(config.GROQ_MODEL),
    tools,
    stopWhen: stepCountIs(10),
    system: SYSTEM_PROMPT,
    messages,
  });

  return { text };
}
