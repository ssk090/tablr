"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@tablr/database";

export async function getPublicProfile(profileId: string, eventId?: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [profile, membership] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        name: true,
        bio: true,
        professionalTitle: true,
        company: true,
        linkedinUrl: true,
        githubUrl: true,
        interests: true,
        diningPreferences: true,
      },
    }),
    eventId
      ? prisma.eventMember.findUnique({ where: { eventId_profileId: { eventId, profileId: userId } } })
      : null,
  ]);

  if (!profile) throw new Error("Profile not found");
  return { profile, viewerMembership: membership };
}

export async function acceptInvite(eventId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await prisma.eventMember.update({
    where: { eventId_profileId: { eventId, profileId: userId } },
    data: { status: "ACCEPTED" },
  });

  return { success: true };
}

export async function confirmBooking(eventId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await prisma.eventMember.update({
    where: { eventId_profileId: { eventId, profileId: userId } },
    data: { status: "BOOKING_CONFIRMED" },
  });

  const members = await prisma.eventMember.findMany({ where: { eventId } });
  const dineoutReady = members.length >= 2 && members.every((member) => member.status === "BOOKING_CONFIRMED");

  return { success: true, dineoutReady };
}
