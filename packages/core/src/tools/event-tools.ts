import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from "zod";
import type { TablrDatabase } from '../db/database';

export function registerEventTools(server: McpServer, db: TablrDatabase): void {
  server.tool(
    "create_dining_event",
    "Create a dining event for a group. After forming a group and picking a restaurant, use this to finalize the plan. For live Swiggy Dineout booking, use get_available_slots → book_table from the Swiggy Dineout MCP server.",
    {
      restaurantId: z.string().describe("Restaurant ID"),
      restaurantName: z.string().describe("Restaurant name"),
      scheduledDate: z.string().describe("Date (YYYY-MM-DD)"),
      scheduledTime: z.string().describe("Time (HH:MM)"),
      guestCount: z.union([z.number(), z.string()]).describe("Number of guests (2-20)"),
      createdBy: z.string().describe("Profile ID of the organizer"),
      memberIds: z.array(z.string()).describe("Profile IDs of all members"),
    },
    async (args) => {
      try {
        const guestCount = Number(args.guestCount);
        const organizer = db.getProfile(args.createdBy);
        if (!organizer) {
          return {
            content: [
              { type: "text" as const, text: `Organizer profile ${args.createdBy} not found.` },
            ],
            isError: true,
          };
        }

        const event = db.createEvent({
          restaurantId: args.restaurantId,
          restaurantName: args.restaurantName,
          status: "forming",
          scheduledDate: args.scheduledDate,
          scheduledTime: args.scheduledTime,
          guestCount,
          createdBy: args.createdBy,
        });

        const now = new Date().toISOString();
        db.addEventMember({
          eventId: event.id,
          profileId: args.createdBy,
          status: "accepted",
          joinedAt: now,
        });
        for (const memberId of args.memberIds) {
          if (memberId !== args.createdBy) {
            db.addEventMember({
              eventId: event.id,
              profileId: memberId,
              status: "invited",
              joinedAt: now,
            });
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "success",
                  eventId: event.id,
                  restaurant: event.restaurantName,
                  date: event.scheduledDate,
                  time: event.scheduledTime,
                  guests: event.guestCount,
                  members: args.memberIds.length,
                  swiggyTip:
                    "To book via Swiggy Dineout: get_available_slots → book_table (mcp.swiggy.com/dineout)",
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

  server.tool(
    "get_event_status",
    "Get the status and details of a dining event.",
    { eventId: z.string().describe("Event ID") },
    async ({ eventId }) => {
      const event = db.getEvent(eventId);
      if (!event) {
        return {
          content: [{ type: "text" as const, text: `Event ${eventId} not found.` }],
          isError: true,
        };
      }
      const members = db.getEventMembers(eventId);
      const memberDetails = members.map((m) => {
        const p = db.getProfile(m.profileId);
        return { name: p?.name ?? "Unknown", status: m.status };
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ ...event, members: memberDetails }, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "confirm_event",
    "Confirm attendance or update event status.",
    {
      eventId: z.string().describe("Event ID"),
      profileId: z.string().describe("Profile ID confirming"),
      action: z
        .enum(["accept", "decline", "confirm_event", "cancel_event"])
        .describe("Action to take"),
    },
    async ({ eventId, profileId, action }) => {
      const event = db.getEvent(eventId);
      if (!event) {
        return {
          content: [{ type: "text" as const, text: `Event ${eventId} not found.` }],
          isError: true,
        };
      }

      if (action === "accept" || action === "decline") {
        db.addEventMember({
          eventId,
          profileId,
          status: action === "accept" ? "accepted" : "declined",
          joinedAt: new Date().toISOString(),
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `${action === "accept" ? "Accepted" : "Declined"} event ${eventId}.`,
            },
          ],
        };
      }

      if (action === "confirm_event" && profileId === event.createdBy) {
        db.updateEventStatus(eventId, "confirmed");
        return { content: [{ type: "text" as const, text: `Event ${eventId} confirmed!` }] };
      }

      if (action === "cancel_event" && profileId === event.createdBy) {
        db.updateEventStatus(eventId, "cancelled");
        return { content: [{ type: "text" as const, text: `Event ${eventId} cancelled.` }] };
      }

      return {
        content: [{ type: "text" as const, text: "Only the organizer can confirm/cancel events." }],
        isError: true,
      };
    },
  );

  server.tool(
    "list_upcoming_events",
    "List upcoming dining events for a user.",
    { profileId: z.string().describe("Profile ID") },
    async ({ profileId }) => {
      const events = db.getUpcomingEvents(profileId);
      if (events.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No upcoming events. Use 'form_dining_group' to start one!",
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
                count: events.length,
                events: events.map((e) => ({
                  id: e.id,
                  restaurant: e.restaurantName,
                  date: e.scheduledDate,
                  time: e.scheduledTime,
                  status: e.status,
                  guests: e.guestCount,
                })),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "submit_feedback",
    "Submit feedback after a dining event.",
    {
      eventId: z.string().describe("Event ID"),
      profileId: z.string().describe("Your profile ID"),
      rating: z.union([z.number(), z.string()]).describe("Rating 1-5"),
      comment: z.string().optional().describe("Optional comment"),
    },
    async ({ eventId, profileId, rating, comment }) => {
      try {
        const numRating = Number(rating);
        const _feedback = db.createFeedback({
          eventId,
          profileId,
          rating: numRating,
          comment: comment ?? "",
        });
        db.updateEventStatus(eventId, "completed");
        return {
          content: [
            {
              type: "text" as const,
              text: `Feedback submitted! Rating: ${rating}/5. Thank you for dining with Tablr.`,
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
}
