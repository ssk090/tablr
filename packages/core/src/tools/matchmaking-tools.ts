import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from "zod";
import { computeCompatibility, findMatches, formCluster } from '../ai/matchmaker';
import type { TablrDatabase } from '../db/database';

export function registerMatchmakingTools(server: McpServer, db: TablrDatabase): void {
  // ── find_compatible_diners ───────────────────────────────────────

  server.tool(
    "find_compatible_diners",
    "Find compatible dining partners for a profile based on semantic similarity of professional backgrounds, interests, and dining preferences. Returns ranked matches with compatibility scores and reasons.",
    {
      profileId: z.string().describe("Profile ID to find matches for"),
      limit: z
        .union([z.number(), z.string()])
        .optional()
        .describe("Maximum matches to return (default: 5)"),
      minScore: z
        .union([z.number(), z.string()])
        .optional()
        .describe("Minimum compatibility score 0-1 (default: 0.3)"),
    },
    async (rawArgs) => {
      const profileId = rawArgs.profileId;
      const limit = rawArgs.limit != null ? Number(rawArgs.limit) : 5;
      const minScore = rawArgs.minScore != null ? Number(rawArgs.minScore) : 0.3;
      try {
        const matches = await findMatches(db, profileId, { limit, minScore });

        if (matches.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No compatible diners found. The pool may be too small or the minimum score too high. Try lowering the minScore or wait for more people to register.",
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  matchCount: matches.length,
                  matches: matches.map((m) => ({
                    profileId: m.profileId,
                    name: m.name,
                    compatibilityScore: m.score,
                    reasons: m.reasons,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error finding matches: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── form_dining_group ────────────────────────────────────────────

  server.tool(
    "form_dining_group",
    "Create an optimal dining group of 4-6 compatible people starting from one profile. Aggregates cuisine and area preferences across all members to suggest ideal venues.",
    {
      profileId: z.string().describe("Profile ID of the person initiating the group"),
      size: z
        .union([z.number(), z.string()])
        .optional()
        .describe("Desired group size including initiator (default: 5)"),
    },
    async (rawArgs) => {
      const profileId = rawArgs.profileId;
      const size = rawArgs.size != null ? Number(rawArgs.size) : 5;
      try {
        const cluster = await formCluster(db, profileId, { size });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  clusterId: cluster.id,
                  groupSize: cluster.members.length,
                  averageCompatibility: cluster.averageScore,
                  members: cluster.members.map((m) => ({
                    profileId: m.profileId,
                    name: m.name,
                    score: m.score,
                    reasons: m.reasons,
                  })),
                  suggestedCuisines: cluster.suggestedCuisines,
                  suggestedAreas: cluster.suggestedAreas,
                  nextStep:
                    "Use 'suggest_restaurants_for_group' or 'search_restaurants' to find a venue, then 'create_dining_event' to finalize.",
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error forming group: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── get_compatibility_score ──────────────────────────────────────

  server.tool(
    "get_compatibility_score",
    "Get a detailed compatibility breakdown between two profiles, including professional overlap, shared interests, and dining preference alignment.",
    {
      profileIdA: z.string().describe("First profile ID"),
      profileIdB: z.string().describe("Second profile ID"),
    },
    async ({ profileIdA, profileIdB }) => {
      try {
        const score = await computeCompatibility(db, profileIdA, profileIdB);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  overallScore: score.overall,
                  dimensions: {
                    professional: score.professional,
                    interests: score.interests,
                    diningPreferences: score.diningPreferences,
                  },
                  breakdown: score.breakdown,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error computing compatibility: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
