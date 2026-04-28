import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function trigger() {
  const latestEvent = await prisma.diningEvent.findFirst({
    orderBy: { createdAt: "desc" },
    include: { members: true }
  });

  if (!latestEvent) {
    console.log("No events found to trigger notifications for.");
    return;
  }

  console.log(`Found event: ${latestEvent.id} at ${latestEvent.restaurantName}`);

  for (const member of latestEvent.members) {
    const notification = await prisma.notification.create({
      data: {
        profileId: member.profileId,
        type: "MATCH_FOUND",
        targetId: latestEvent.id,
        status: "PENDING"
      }
    });
    console.log(`Created notification ${notification.id} for profile ${member.profileId}`);
  }
}

trigger()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
