import { z } from "zod";
import type { Profile } from "../types";
import { generateProfileEmbedding } from "../ai/embeddings";
import { ensureCollection, upsertProfileVector } from "../db/qdrant";

const PrismaProfileLikeSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  bio: z.string().default(""),
  professionalTitle: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  githubUrl: z.string().nullable().optional(),
  interests: z.unknown().default([]),
  city: z.string().nullable().optional(),
  diningPreferences: z.unknown().default({}),
  semanticProfile: z.unknown().nullable().optional(),
  isActive: z.boolean().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export interface ProfileVectorSyncResult {
  readonly status: "synced" | "failed";
  readonly profileId: string;
  readonly error?: Error;
}

export function mapPrismaProfileToCoreProfile(rawProfile: unknown): Profile {
  const profile = PrismaProfileLikeSchema.parse(rawProfile);
  const toIso = (value: string | Date): string =>
    value instanceof Date ? value.toISOString() : value;

  return {
    id: profile.id,
    name: profile.name,
    bio: profile.bio,
    professionalTitle: profile.professionalTitle ?? undefined,
    company: profile.company ?? undefined,
    email: profile.email ?? undefined,
    linkedinUrl: profile.linkedinUrl ?? undefined,
    githubUrl: profile.githubUrl ?? undefined,
    interests: Array.isArray(profile.interests) ? (profile.interests as string[]) : [],
    city: profile.city ?? "Bangalore",
    diningPreferences: profile.diningPreferences as Profile["diningPreferences"],
    semanticProfile: (profile.semanticProfile ?? undefined) as Profile["semanticProfile"],
    isActive: profile.isActive ?? true,
    createdAt: toIso(profile.createdAt),
    updatedAt: toIso(profile.updatedAt),
  };
}

export async function syncProfileVectorFromProfile(
  rawProfile: unknown,
  options: { readonly failOpen?: boolean } = {},
): Promise<ProfileVectorSyncResult> {
  const profile = mapPrismaProfileToCoreProfile(rawProfile);
  try {
    const vector = await generateProfileEmbedding(profile);
    await ensureCollection();
    await upsertProfileVector(profile.id, vector, {
      name: profile.name,
      title: profile.professionalTitle,
    });
    return { status: "synced", profileId: profile.id };
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    if (options.failOpen ?? true) {
      return { status: "failed", profileId: profile.id, error: normalizedError };
    }
    throw new Error(`Failed to sync profile vector for ${profile.id}: ${normalizedError.message}`);
  }
}
