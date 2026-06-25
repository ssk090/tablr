import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from "zod";
import type { TablrDatabase } from '../db/database';
import { processDinnerIntent } from '../dinner/dinner-matching-flow';

export function registerDinnerIntentTools(server: McpServer, db: TablrDatabase): void {
  // ── looking_for_dinner ──────────────────────────────────────────

  server.tool(
    "looking_for_dinner",
    `Signal that you're available for dinner on a specific date.
The system will automatically:
1. Check if other compatible users are also looking for dinner that day
2. If matches found → form a group, suggest restaurants, create an event
3. If no matches yet → save your intent and notify when someone matches

This is the PRIMARY entry point for the Tablr flow.`,
    {
      profileId: z.string().describe("Your profile ID"),
      date: z.string().describe("Date you want to dine (YYYY-MM-DD)"),
      timeSlot: z.enum(["lunch", "dinner"]).optional().describe("Meal time (default: dinner)"),
      preferredArea: z.string().optional().describe("Preferred area (e.g., 'Koramangala')"),
      groupSize: z
        .union([z.number(), z.string()])
        .optional()
        .describe("Desired group size (default: 4)"),
    },
    async (rawArgs) => {
      try {
        const profileId = rawArgs.profileId;
        const date = rawArgs.date;
        const timeSlot = rawArgs.timeSlot ?? "dinner";
        const preferredArea = rawArgs.preferredArea;
        const groupSize = rawArgs.groupSize != null ? Number(rawArgs.groupSize) : 4;

        const result = await processDinnerIntent(db, {
          profileId,
          date,
          timeSlot,
          preferredArea,
          groupSize,
        });

        if (result.status === "profile_not_found") {
          return {
            content: [{ type: "text" as const, text: `Profile ${profileId} not found. Register first with register_profile.` }],
            isError: true,
          };
        }

        if (result.status === "waiting") {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                status: "waiting",
                intentId: result.intent.id,
                message: result.reason === "no_other_diners"
                  ? `${result.profile.name} is looking for ${timeSlot} on ${date}${preferredArea ? ` in ${preferredArea}` : ""}. No other diners available yet — you'll be matched when someone else signals availability.`
                  : `${result.profile.name} is looking for ${timeSlot} on ${date}. ${result.otherAvailable} other people are available but no strong compatibility matches. Lowering standards or waiting for more people may help.`,
                date,
                timeSlot,
                preferredArea: preferredArea ?? "any",
                otherAvailable: result.otherAvailable,
              }, null, 2),
            }],
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              status: "matched",
              intentId: result.intent.id,
              message: `🎉 Match found! ${result.matches.length} compatible diner(s) are also available on ${date}.`,
              group: {
                organizer: result.profile.name,
                members: result.matches.map((match) => ({
                  name: match.name,
                  compatibilityScore: match.score,
                  reasons: match.reasons,
                })),
              },
              suggestedRestaurant: result.restaurant
                ? {
                    name: result.restaurant.name,
                    area: result.restaurant.area,
                    cuisine: result.restaurant.cuisine,
                    rating: result.restaurant.rating,
                    costForTwo: `₹${result.restaurant.costForTwo}`,
                  }
                : null,
              event: result.event
                ? {
                    eventId: result.event.id,
                    date: result.event.scheduledDate,
                    time: result.event.scheduledTime,
                    restaurant: result.event.restaurantName,
                    status: result.event.status,
                  }
                : null,
              nextSteps: [
                result.event ? "Invited members should accept/decline, then both diners confirm booking before Dineout is triggered" : null,
                "Only trigger Swiggy Dineout after mutual acceptance and booking confirmation.",
              ].filter(Boolean),
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── check_dinner_matches ────────────────────────────────────────

  server.tool(
    "check_dinner_matches",
    "Check who else is looking for dinner on a specific date. Shows open intents and potential matches.",
    {
      date: z.string().describe("Date to check (YYYY-MM-DD)"),
      profileId: z.string().optional().describe("Your profile ID (for compatibility scoring)"),
    },
    async ({ date, profileId }) => {
      const intents = db.findOpenIntents(date);

      if (intents.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No one is looking for dinner on ${date} yet. Use 'looking_for_dinner' to signal your availability.`,
            },
          ],
        };
      }

      const intentDetails = intents.map((intent) => {
        const profile = db.getProfile(intent.profileId);
        return {
          name: profile?.name ?? "Unknown",
          profileId: intent.profileId,
          timeSlot: intent.timeSlot,
          preferredArea: intent.preferredArea ?? "flexible",
          groupSize: intent.groupSize,
        };
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                date,
                availableCount: intents.length,
                diners: intentDetails,
                tip: profileId
                  ? "Use 'looking_for_dinner' to automatically match with these diners."
                  : "Register a profile first, then use 'looking_for_dinner' to join.",
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
