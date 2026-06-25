"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@tablr/database";

export interface InviteResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

export async function sendDinnerInvite(targetProfileId: string): Promise<InviteResult> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };
  if (userId === targetProfileId) return { success: false, error: "Cannot invite yourself" };

  try {
    // Find a restaurant to associate with the event
    const restaurant = await prisma.restaurant.findFirst();
    const today = new Date().toISOString().slice(0, 10);

    // Check if an event already exists between these two users in "forming" state
    const existingEvent = await prisma.diningEvent.findFirst({
      where: {
        status: "FORMING",
        createdBy: userId,
        members: {
          some: { profileId: targetProfileId },
        },
      },
    });

    if (existingEvent) {
      return { success: true, eventId: existingEvent.id };
    }

    // Create a new dining event
    const event = await prisma.diningEvent.create({
      data: {
        restaurantId: restaurant?.id ?? "unknown",
        restaurantName: restaurant?.name ?? "TBD",
        status: "FORMING",
        scheduledDate: today,
        guestCount: 2,
        createdBy: userId,
        members: {
          create: [
            { profileId: userId, status: "ACCEPTED" },
            { profileId: targetProfileId, status: "INVITED" },
          ],
        },
      },
    });

    // Create notification for the target
    await prisma.notification.create({
      data: {
        profileId: targetProfileId,
        type: "MATCH_FOUND",
        targetId: event.id,
        status: "PENDING",
      },
    });

    return { success: true, eventId: event.id };
  } catch (error) {
    console.error("[Invite] Failed to send invite:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to send invite" };
  }
}
