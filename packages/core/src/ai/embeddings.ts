import { getConfig } from "../config";
import type { Profile } from "../types";

/**
 * Generate an embedding vector for a profile using Ollama.
 * Uses nomic-embed-text (768 dimensions) by default.
 */
export async function generateProfileEmbedding(profile: Profile): Promise<number[]> {
  const text = buildEmbeddingText(profile);
  return embed(text);
}

/**
 * Generate an embedding for arbitrary text using Ollama.
 */
export async function embed(text: string): Promise<number[]> {
  const config = getConfig();

  const response = await fetch(`${config.OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.OLLAMA_EMBED_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama embed failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    embeddings: number[][];
  };

  if (!data.embeddings?.[0]) {
    throw new Error("Ollama returned empty embeddings");
  }

  return data.embeddings[0];
}

/**
 * Build a rich text representation of a profile for embedding.
 */
function buildEmbeddingText(profile: Profile): string {
  const parts: string[] = [];

  if (profile.professionalTitle) {
    parts.push(`${profile.professionalTitle} at ${profile.company || "unknown"}`);
  }

  if (profile.bio) {
    parts.push(profile.bio);
  }

  if (profile.interests.length > 0) {
    parts.push(`Interests: ${profile.interests.join(", ")}`);
  }

  if (profile.semanticProfile) {
    const sp = profile.semanticProfile;
    if (sp.professionalDomain) parts.push(`Domain: ${sp.professionalDomain}`);
    if (sp.skills?.length) parts.push(`Skills: ${sp.skills.join(", ")}`);
    if (sp.conversationTopics?.length) {
      parts.push(`Topics: ${sp.conversationTopics.join(", ")}`);
    }
  }

  const dp = profile.diningPreferences;
  if (dp.cuisines.length > 0) {
    parts.push(`Cuisines: ${dp.cuisines.join(", ")}`);
  }
  if (dp.preferredAreas.length > 0) {
    parts.push(`Areas: ${dp.preferredAreas.join(", ")}`);
  }

  return parts.join(". ");
}
