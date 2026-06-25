"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@tablr/database";
import { EMPTY_DASHBOARD_STATS, getFavoriteArea } from "./dashboard-stats";

export async function getDashboardStats() {
  const { userId } = await auth();
  if (!userId) return EMPTY_DASHBOARD_STATS;

  try {

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
            status: { in: ["ACCEPTED", "BOOKING_CONFIRMED"] },
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

  const [pendingInvites, acceptedMatches, connectedPeople] = await Promise.all([
    prisma.eventMember.count({ where: { profileId: userId, status: "INVITED" } }),
    prisma.eventMember.count({ where: { profileId: userId, status: { in: ["ACCEPTED", "BOOKING_CONFIRMED"] } } }),
    prisma.eventMember.findMany({
      where: { profileId: { not: userId }, event: { members: { some: { profileId: userId } } } },
      select: {
        status: true,
        event: { select: { id: true, restaurantName: true, scheduledDate: true } },
        profile: { select: { id: true, name: true, professionalTitle: true, company: true, linkedinUrl: true } },
      },
      take: 6,
    }),
  ]);

  const favoriteArea = getFavoriteArea(profile?.diningPreferences);

  return {
    activeRequests,
    confirmedDinners,
    favoriteArea,
    diningPartners: partners.length,
    pendingInvites,
    acceptedMatches,
    connectedPeople,
  };
  } catch (error) {
    console.error("[Dashboard] Failed to load dashboard stats:", error);
    return EMPTY_DASHBOARD_STATS;
  }
}
