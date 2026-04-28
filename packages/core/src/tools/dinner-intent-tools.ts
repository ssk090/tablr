import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from "zod";
import { findMatches } from '../ai/matchmaker';
import type { TablrDatabase } from '../db/database';
import { searchLocalRestaurants, suggestRestaurantsForGroup } from '../restaurants/discovery';

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

        // Validate profile exists
        const profile = db.getProfile(profileId);
        if (!profile) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Profile ${profileId} not found. Register first with register_profile.`,
              },
            ],
            isError: true,
          };
        }

        // Save the dinner intent
        const intent = db.createDinnerIntent({
          profileId,
          date,
          timeSlot,
          preferredArea,
          groupSize,
        });

        // Check for other open intents on the same date
        const otherIntents = db.findOpenIntents(date, profileId);

        if (otherIntents.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    status: "waiting",
                    intentId: intent.id,
                    message: `${profile.name} is looking for ${timeSlot} on ${date}${preferredArea ? ` in ${preferredArea}` : ""}. No other diners available yet — you'll be matched when someone else signals availability.`,
                    date,
                    timeSlot,
                    preferredArea: preferredArea ?? "any",
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // There are other people looking! Find the most compatible ones
        const matches = await findMatches(db, profileId, {
          limit: groupSize - 1,
          minScore: 0.2,
        });

        // Filter matches to only those who have open intents for this date
        const intentProfileIds = new Set(otherIntents.map((i) => i.profileId));
        const availableMatches = matches.filter((m) => intentProfileIds.has(m.profileId));

        if (availableMatches.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    status: "waiting",
                    intentId: intent.id,
                    message: `${profile.name} is looking for ${timeSlot} on ${date}. ${otherIntents.length} other people are available but no strong compatibility matches. Lowering standards or waiting for more people may help.`,
                    date,
                    otherAvailable: otherIntents.length,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // We have matches! Suggest restaurants based on the group
        const allProfileIds = [profileId, ...availableMatches.map((m) => m.profileId)];
        const suggestedRestaurants = suggestRestaurantsForGroup(db, allProfileIds);

        // Find area-specific restaurants if preferred
        const areaRestaurants = preferredArea
          ? searchLocalRestaurants(db, { area: preferredArea, groupSize: allProfileIds.length })
          : [];

        const restaurants =
          suggestedRestaurants.length > 0 ? suggestedRestaurants : areaRestaurants;

        // Create a dining event automatically
        const topRestaurant = restaurants[0];
        let event = null;

        if (topRestaurant) {
          event = db.createEvent({
            restaurantId: topRestaurant.id,
            restaurantName: topRestaurant.name,
            status: "forming",
            scheduledDate: date,
            scheduledTime: timeSlot === "dinner" ? "19:30" : "12:30",
            guestCount: allProfileIds.length,
            createdBy: profileId,
          });

          // Add all members — organizer accepted, others invited
          const now = new Date().toISOString();
          db.addEventMember({ eventId: event.id, profileId, status: "accepted", joinedAt: now });
          for (const match of availableMatches) {
            db.addEventMember({
              eventId: event.id,
              profileId: match.profileId,
              status: "invited",
              joinedAt: now,
            });
          }

          // Mark all intents as matched
          db.updateIntentStatus(intent.id, "matched", event.id);
          db.createNotification({ profileId, type: "match_found", targetId: event.id });

          for (const otherIntent of otherIntents) {
            if (availableMatches.some((m) => m.profileId === otherIntent.profileId)) {
              db.updateIntentStatus(otherIntent.id, "matched", event.id);
              db.createNotification({
                profileId: otherIntent.profileId,
                type: "match_found",
                targetId: event.id,
              });
            }
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "matched",
                  intentId: intent.id,
                  message: `🎉 Match found! ${availableMatches.length} compatible diner(s) are also available on ${date}.`,
                  group: {
                    organizer: profile.name,
                    members: availableMatches.map((m) => ({
                      name: m.name,
                      compatibilityScore: m.score,
                      reasons: m.reasons,
                    })),
                  },
                  suggestedRestaurant: topRestaurant
                    ? {
                        name: topRestaurant.name,
                        area: topRestaurant.area,
                        cuisine: topRestaurant.cuisine,
                        rating: topRestaurant.rating,
                        costForTwo: `₹${topRestaurant.costForTwo}`,
                      }
                    : null,
                  event: event
                    ? {
                        eventId: event.id,
                        date: event.scheduledDate,
                        time: event.scheduledTime,
                        restaurant: event.restaurantName,
                        status: event.status,
                      }
                    : null,
                  nextSteps: [
                    event ? "Invited members should use 'confirm_event' to accept/decline" : null,
                    "Use Swiggy Dineout tools to book a real table: search_restaurants_dineout → get_available_slots → book_table",
                    "Once all members confirm, the event status will be updated to 'confirmed'",
                  ].filter(Boolean),
                },
                null,
                2,
              ),
            },
          ],
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
