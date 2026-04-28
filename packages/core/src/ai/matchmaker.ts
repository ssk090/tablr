import { randomUUID } from "node:crypto";
import type { TablrDatabase } from "../db/database";
import { searchSimilarProfiles } from "../db/qdrant";
import type { CompatibilityScore, DiningCluster, Match, Profile } from "../types";
import { generateProfileEmbedding } from "./embeddings";

/**
 * Find compatible dining partners using Qdrant vector search.
 */
export async function findMatches(
  db: TablrDatabase,
  profileId: string,
  options: { limit?: number; minScore?: number } = {},
): Promise<Match[]> {
  const { limit = 10, minScore = 0.3 } = options;

  const profile = db.getProfile(profileId);
  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }

  // Generate embedding for the profile to search with
  const vector = await generateProfileEmbedding(profile);

  // Search Qdrant for similar profiles
  const results = await searchSimilarProfiles(vector, {
    limit,
    minScore,
    excludeId: profileId,
  });

  const matches: Match[] = [];

  for (const result of results) {
    const candidateProfile = db.getProfile(result.id);
    if (!candidateProfile) continue;

    matches.push({
      profileId: result.id,
      name: candidateProfile.name,
      score: Math.round(result.score * 1000) / 1000,
      reasons: generateMatchReasons(profile, candidateProfile, result.score),
    });
  }

  return matches;
}

/**
 * Form a dining cluster from the best matches for a profile.
 */
export async function formCluster(
  db: TablrDatabase,
  profileId: string,
  options: { size?: number } = {},
): Promise<DiningCluster> {
  const { size = 5 } = options;

  const matches = await findMatches(db, profileId, { limit: size - 1 });

  const profile = db.getProfile(profileId);
  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }

  const allMembers: Match[] = [
    {
      profileId: profile.id,
      name: profile.name,
      score: 1.0,
      reasons: ["Organizer"],
    },
    ...matches,
  ];

  const averageScore =
    matches.length > 0 ? matches.reduce((sum, m) => sum + m.score, 0) / matches.length : 0;

  // Aggregate cuisine and area preferences from all members
  const cuisineCounts = new Map<string, number>();
  const areaCounts = new Map<string, number>();

  for (const member of allMembers) {
    const memberProfile = db.getProfile(member.profileId);
    if (!memberProfile) continue;

    for (const cuisine of memberProfile.diningPreferences.cuisines) {
      cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) ?? 0) + 1);
    }
    for (const area of memberProfile.diningPreferences.preferredAreas) {
      areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
    }
  }

  const suggestedCuisines = [...cuisineCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cuisine]) => cuisine);

  const suggestedAreas = [...areaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([area]) => area);

  return {
    id: randomUUID(),
    members: allMembers,
    averageScore: Math.round(averageScore * 1000) / 1000,
    suggestedCuisines,
    suggestedAreas,
  };
}

/**
 * Compute a detailed compatibility score between two profiles.
 * Uses Qdrant vector search for the overall semantic score.
 */
export async function computeCompatibility(
  db: TablrDatabase,
  profileIdA: string,
  profileIdB: string,
): Promise<CompatibilityScore> {
  const profileA = db.getProfile(profileIdA);
  const profileB = db.getProfile(profileIdB);
  if (!profileA) throw new Error(`Profile ${profileIdA} not found`);
  if (!profileB) throw new Error(`Profile ${profileIdB} not found`);

  // Generate embeddings and compute similarity via Qdrant search
  const vectorA = await generateProfileEmbedding(profileA);
  const results = await searchSimilarProfiles(vectorA, {
    limit: 1,
    minScore: 0,
    excludeId: undefined,
  });

  const overall = results.find((r) => r.id === profileIdB)?.score ?? 0;

  // Professional overlap
  const professional = computeSetOverlap(
    profileA.semanticProfile?.skills ?? [],
    profileB.semanticProfile?.skills ?? [],
  );

  // Interest overlap
  const interests = computeSetOverlap(profileA.interests, profileB.interests);

  // Dining preference compatibility
  const diningPreferences = computeDiningCompatibility(profileA, profileB);

  const breakdown = generateDetailedBreakdown(profileA, profileB, {
    overall,
    professional,
    interests,
    diningPreferences,
  });

  return {
    overall: Math.round(overall * 1000) / 1000,
    professional: Math.round(professional * 1000) / 1000,
    interests: Math.round(interests * 1000) / 1000,
    diningPreferences: Math.round(diningPreferences * 1000) / 1000,
    breakdown,
  };
}

// ── Helpers ────────────────────────────────────────────────────────

function computeSetOverlap(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 0;

  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function computeDiningCompatibility(a: Profile, b: Profile): number {
  const dp1 = a.diningPreferences;
  const dp2 = b.diningPreferences;

  let score = 0;
  let factors = 0;

  const cuisineOverlap = computeSetOverlap(dp1.cuisines, dp2.cuisines);
  score += cuisineOverlap;
  factors++;

  const budgetLevels = ["budget", "moderate", "premium", "luxury"] as const;
  const diff = Math.abs(
    budgetLevels.indexOf(dp1.budgetRange) - budgetLevels.indexOf(dp2.budgetRange),
  );
  score += diff === 0 ? 1.0 : diff === 1 ? 0.5 : 0;
  factors++;

  const timeOverlap = computeSetOverlap(dp1.preferredTimeSlots, dp2.preferredTimeSlots);
  score += timeOverlap;
  factors++;

  const areaOverlap = computeSetOverlap(dp1.preferredAreas, dp2.preferredAreas);
  score += areaOverlap;
  factors++;

  return factors > 0 ? score / factors : 0;
}

function generateMatchReasons(target: Profile, candidate: Profile, score: number): string[] {
  const reasons: string[] = [];

  if (score > 0.7) reasons.push("Very high semantic similarity");
  else if (score > 0.5) reasons.push("Good semantic similarity");

  const sp1 = target.semanticProfile;
  const sp2 = candidate.semanticProfile;
  if (sp1 && sp2 && sp1.professionalDomain === sp2.professionalDomain) {
    reasons.push(`Same domain: ${sp1.professionalDomain}`);
  }

  const sharedInterests = target.interests.filter((i) =>
    candidate.interests.map((j) => j.toLowerCase()).includes(i.toLowerCase()),
  );
  if (sharedInterests.length > 0) {
    reasons.push(`Shared interests: ${sharedInterests.join(", ")}`);
  }

  const sharedCuisines = target.diningPreferences.cuisines.filter((c) =>
    candidate.diningPreferences.cuisines.map((d) => d.toLowerCase()).includes(c.toLowerCase()),
  );
  if (sharedCuisines.length > 0) {
    reasons.push(`Both enjoy: ${sharedCuisines.join(", ")}`);
  }

  if (reasons.length === 0) {
    reasons.push("Compatible profile based on overall analysis");
  }

  return reasons;
}

function generateDetailedBreakdown(
  a: Profile,
  b: Profile,
  scores: {
    overall: number;
    professional: number;
    interests: number;
    diningPreferences: number;
  },
): string[] {
  const lines: string[] = [];

  lines.push(`Overall semantic similarity: ${(scores.overall * 100).toFixed(1)}%`);
  lines.push(`Professional overlap: ${(scores.professional * 100).toFixed(1)}%`);
  lines.push(`Interest overlap: ${(scores.interests * 100).toFixed(1)}%`);
  lines.push(`Dining preference match: ${(scores.diningPreferences * 100).toFixed(1)}%`);

  if (a.semanticProfile && b.semanticProfile) {
    lines.push(
      `${a.name}: ${a.semanticProfile.professionalDomain} | ${b.name}: ${b.semanticProfile.professionalDomain}`,
    );
  }

  return lines;
}
