import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from "zod";
import { generateProfileEmbedding } from '../ai/embeddings';
import { buildRawProfileInput, extractSemanticProfile } from '../ai/profiler';
import type { TablrDatabase } from '../db/database';
import { deleteProfileVector, upsertProfileVector } from '../db/qdrant';

export function registerProfileTools(server: McpServer, db: TablrDatabase): void {
  // ── register_profile ─────────────────────────────────────────────

  server.tool(
    "register_profile",
    "Register a new user profile for social dining matchmaking. Provide personal and professional details. The AI will automatically extract a semantic profile and generate embeddings for matching.",
    {
      name: z.string().describe("Full name"),
      bio: z
        .string()
        .optional()
        .describe("A short bio about yourself — what you do, what you enjoy, what drives you"),
      professionalTitle: z
        .string()
        .optional()
        .describe("Job title (e.g., 'Senior Product Manager')"),
      company: z.string().optional().describe("Current company or organization"),
      email: z.string().optional().describe("Email address for notifications"),
      linkedinUrl: z.string().optional().describe("LinkedIn profile URL"),
      interests: z
        .array(z.string())
        .optional()
        .describe("List of personal interests (e.g., ['hiking', 'sci-fi books', 'craft coffee'])"),
      city: z.string().optional().default("Bangalore").describe("City (defaults to Bangalore)"),
      cuisines: z
        .array(z.string())
        .optional()
        .describe("Preferred cuisines (e.g., ['Italian', 'Japanese', 'South Indian'])"),
      budgetRange: z
        .enum(["budget", "moderate", "premium", "luxury"])
        .optional()
        .describe("Dining budget preference"),
      preferredAreas: z
        .array(z.string())
        .optional()
        .describe("Preferred Bangalore areas (e.g., ['Koramangala', 'Indiranagar'])"),
      dietaryRestrictions: z
        .array(z.string())
        .optional()
        .describe("Dietary restrictions (e.g., ['vegetarian', 'gluten-free'])"),
    },
    async (args) => {
      try {
        // 1. Extract semantic profile from raw input
        const rawInput = buildRawProfileInput({
          name: args.name,
          bio: args.bio,
          professionalTitle: args.professionalTitle,
          company: args.company,
          interests: args.interests,
          linkedinUrl: args.linkedinUrl,
        });

        const semanticProfile = rawInput.trim()
          ? await extractSemanticProfile(rawInput)
          : undefined;

        // 2. Create the profile
        const profile = db.createProfile({
          name: args.name,
          bio: args.bio ?? "",
          professionalTitle: args.professionalTitle ?? "",
          company: args.company ?? "",
          email: args.email,
          linkedinUrl: args.linkedinUrl || undefined,
          interests: args.interests ?? [],
          city: args.city ?? "Bangalore",
          diningPreferences: {
            cuisines: args.cuisines ?? [],
            dietaryRestrictions: args.dietaryRestrictions ?? [],
            budgetRange: args.budgetRange ?? "moderate",
            preferredAreas: args.preferredAreas ?? [],
            preferredGroupSize: 4,
            preferredDays: [],
            preferredTimeSlots: ["dinner"],
          },
          semanticProfile,
          isActive: true,
        });

        // 3. Generate and store embedding in Qdrant
        const vector = await generateProfileEmbedding(profile);
        await upsertProfileVector(profile.id, vector, {
          name: profile.name,
          city: profile.city,
          professionalTitle: profile.professionalTitle,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "success",
                  profileId: profile.id,
                  name: profile.name,
                  semanticProfile: profile.semanticProfile,
                  message: `Profile created and embedding generated. ${profile.name} is now in the matchmaking pool.`,
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
              text: `Error registering profile: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── get_profile ──────────────────────────────────────────────────

  server.tool(
    "get_profile",
    "Retrieve a user profile by ID.",
    {
      profileId: z.string().describe("Profile ID"),
    },
    async ({ profileId }) => {
      const profile = db.getProfile(profileId);
      if (!profile) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Profile ${profileId} not found.`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(profile, null, 2),
          },
        ],
      };
    },
  );

  // ── update_profile ───────────────────────────────────────────────

  server.tool(
    "update_profile",
    "Update an existing user profile. Only provided fields will be updated. Automatically re-generates the semantic profile and embedding.",
    {
      profileId: z.string().describe("Profile ID to update"),
      name: z.string().optional().describe("Updated name"),
      bio: z.string().optional().describe("Updated bio"),
      professionalTitle: z.string().optional().describe("Updated job title"),
      company: z.string().optional().describe("Updated company"),
      interests: z.array(z.string()).optional().describe("Updated interests list"),
      cuisines: z.array(z.string()).optional().describe("Updated cuisines"),
      budgetRange: z
        .enum(["budget", "moderate", "premium", "luxury"])
        .optional()
        .describe("Updated budget range"),
      preferredAreas: z.array(z.string()).optional().describe("Updated preferred areas"),
    },
    async (args) => {
      try {
        const existing = db.getProfile(args.profileId);
        if (!existing) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Profile ${args.profileId} not found.`,
              },
            ],
            isError: true,
          };
        }

        const updates: Record<string, unknown> = {};
        if (args.name) updates.name = args.name;
        if (args.bio) updates.bio = args.bio;
        if (args.professionalTitle) updates.professionalTitle = args.professionalTitle;
        if (args.company) updates.company = args.company;
        if (args.interests) updates.interests = args.interests;

        if (args.cuisines || args.budgetRange || args.preferredAreas) {
          updates.diningPreferences = {
            ...existing.diningPreferences,
            ...(args.cuisines && { cuisines: args.cuisines }),
            ...(args.budgetRange && { budgetRange: args.budgetRange }),
            ...(args.preferredAreas && { preferredAreas: args.preferredAreas }),
          };
        }

        // Re-extract semantic profile if content changed
        const hasContentChange = args.name || args.bio || args.professionalTitle || args.interests;
        if (hasContentChange) {
          const merged = { ...existing, ...updates };
          const rawInput = buildRawProfileInput({
            name: merged.name as string,
            bio: merged.bio as string,
            professionalTitle: merged.professionalTitle as string,
            company: merged.company as string,
            interests: merged.interests as string[],
          });
          updates.semanticProfile = await extractSemanticProfile(rawInput);
        }

        const updated = db.updateProfile(args.profileId, updates);
        if (!updated) {
          return {
            content: [{ type: "text" as const, text: "Failed to update profile." }],
            isError: true,
          };
        }

        // Re-generate embedding in Qdrant
        const vector = await generateProfileEmbedding(updated);
        await upsertProfileVector(updated.id, vector, {
          name: updated.name,
          city: updated.city,
          professionalTitle: updated.professionalTitle,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "success",
                  profileId: updated.id,
                  message: "Profile updated and re-embedded.",
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
              text: `Error updating profile: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── delete_profile ───────────────────────────────────────────────

  server.tool(
    "delete_profile",
    "Delete a user profile and all associated data.",
    {
      profileId: z.string().describe("Profile ID to delete"),
    },
    async ({ profileId }) => {
      await deleteProfileVector(profileId).catch(() => {});
      const deleted = db.deleteProfile(profileId);
      return {
        content: [
          {
            type: "text" as const,
            text: deleted
              ? `Profile ${profileId} deleted successfully.`
              : `Profile ${profileId} not found.`,
          },
        ],
        ...(deleted ? {} : { isError: true }),
      };
    },
  );
}
