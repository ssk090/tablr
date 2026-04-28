import { QdrantClient } from "@qdrant/js-client-rest";
import { getConfig } from "../config";

const COLLECTION_NAME = "tablr_profiles";
const VECTOR_DIMENSION = 768; // nomic-embed-text via Ollama

let _client: QdrantClient | undefined;

export function getQdrantClient(): QdrantClient {
  if (_client) return _client;
  const config = getConfig();
  _client = new QdrantClient({
    url: config.QDRANT_URL,
    apiKey: config.QDRANT_API_KEY || undefined,
    checkCompatibility: false,
  });
  return _client;
}

/**
 * Ensure the Qdrant collection exists with the correct config.
 */
export async function ensureCollection(): Promise<void> {
  const client = getQdrantClient();

  try {
    await client.getCollection(COLLECTION_NAME);
  } catch {
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_DIMENSION,
        distance: "Cosine",
      },
    });
  }
}

/**
 * Upsert a profile embedding into Qdrant.
 */
export async function upsertProfileVector(
  profileId: string,
  vector: number[],
  payload: Record<string, unknown>,
): Promise<void> {
  const client = getQdrantClient();

  await client.upsert(COLLECTION_NAME, {
    wait: true,
    points: [
      {
        id: profileId,
        vector,
        payload,
      },
    ],
  });
}

/**
 * Search for similar profiles by vector.
 */
export async function searchSimilarProfiles(
  vector: number[],
  options: { limit?: number; minScore?: number; excludeId?: string } = {},
): Promise<Array<{ id: string; score: number; payload: Record<string, unknown> }>> {
  const { limit = 10, minScore = 0.3, excludeId } = options;
  const client = getQdrantClient();

  const filter = excludeId
    ? {
        must_not: [
          {
            has_id: [excludeId],
          },
        ],
      }
    : undefined;

  const results = await client.search(COLLECTION_NAME, {
    vector,
    limit,
    score_threshold: minScore,
    filter,
    with_payload: true,
  });

  return results.map((r) => ({
    id: typeof r.id === "string" ? r.id : String(r.id),
    score: r.score,
    payload: (r.payload ?? {}) as Record<string, unknown>,
  }));
}

/**
 * Delete a profile vector from Qdrant.
 */
export async function deleteProfileVector(profileId: string): Promise<void> {
  const client = getQdrantClient();
  await client.delete(COLLECTION_NAME, {
    wait: true,
    points: [profileId],
  });
}

/**
 * Get vector count in the collection.
 */
export async function getVectorCount(): Promise<number> {
  const client = getQdrantClient();
  try {
    const info = await client.getCollection(COLLECTION_NAME);
    return info.points_count ?? 0;
  } catch {
    return 0;
  }
}
