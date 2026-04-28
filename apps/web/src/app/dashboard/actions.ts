"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@tablr/database";

export async function getDashboardStats() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [activeRequests, confirmedDinners, profile] = await Promise.all([
    prisma.dinnerIntent.count({
      where: {
        profileId: userId,
        status: "OPEN",
      },
    }),
    prisma.diningEvent.count({
      where: {
        status: "CONFIRMED",
        members: {
          some: {
            profileId: userId,
            status: "JOINED",
          },
        },
      },
    }),
    prisma.profile.findUnique({
      where: { id: userId },
      select: {
        diningPreferences: true,
      },
    }),
  ]);

  // Get unique dining partners
  const partners = await prisma.eventMember.findMany({
    where: {
      profileId: { not: userId },
      event: {
        members: {
          some: { profileId: userId },
        },
      },
    },
    select: {
      profileId: true,
    },
    distinct: ["profileId"],
  });

  const diningPreferences = profile?.diningPreferences as { preferredAreas?: string[] } | null;
  const favoriteArea = diningPreferences?.preferredAreas?.[0] || "Not set";

  return {
    activeRequests,
    confirmedDinners,
    favoriteArea,
    diningPartners: partners.length,
  };
}
