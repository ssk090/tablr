import { prisma } from "@tablr/database";
import { generateProfileEmbedding, searchSimilarProfiles, ensureCollection, type Profile, type DiningPreferences, type SemanticProfile } from "@tablr/core";

export async function triggerMatching(intentId: string) {
  console.log(`[Matching] Triggering for intent: ${intentId}`);
  
  const intent = await prisma.dinnerIntent.findUnique({
    where: { id: intentId },
    include: { profile: true }
  });

  if (!intent || intent.status !== "OPEN") return;

  const { date, timeSlot, profileId } = intent;

  // 1. Find other open intents for the same date and time slot
  const otherIntents = await prisma.dinnerIntent.findMany({
    where: {
      date,
      timeSlot,
      status: "OPEN",
      profileId: { not: profileId }
    },
    include: { profile: true }
  });

  if (otherIntents.length === 0) {
    console.log(`[Matching] No other diners found for ${date} ${timeSlot}`);
    return;
  }

  console.log(`[Matching] Found ${otherIntents.length} potential partners`);

  // 2. Perform semantic search to find the most compatible partners
  try {
    const profile = intent.profile;
    console.log(`[Matching] Generating embedding for user: ${profile.name}`);
    
    // Convert Prisma model to the type expected by core
    const profileForEmbedding: Profile = {
      ...profile,
      professionalTitle: profile.professionalTitle ?? undefined,
      company: profile.company ?? undefined,
      email: profile.email ?? undefined,
      linkedinUrl: profile.linkedinUrl ?? undefined,
      interests: profile.interests as string[],
      city: profile.city ?? "Bangalore",
      diningPreferences: profile.diningPreferences as unknown as DiningPreferences,
      semanticProfile: profile.semanticProfile as unknown as SemanticProfile,
      isActive: profile.isActive ?? true,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };

    const vector = await generateProfileEmbedding(profileForEmbedding);
    console.log(`[Matching] Successfully generated embedding for ${profile.name}`);
    
    await ensureCollection();
    const results = await searchSimilarProfiles(vector, {
      limit: 10,
      minScore: 0.1, // Low threshold to encourage matches in small pools
      excludeId: profileId
    });

    console.log(`[Matching] Qdrant search returned ${results.length} results`);

    // 3. Filter results to only those who have open intents for this slot
    const otherProfileIds = new Set(otherIntents.map(i => i.profileId));
    const matchedPartners = results.filter(r => otherProfileIds.has(r.id));

    console.log(`[Matching] Found ${matchedPartners.length} compatible partners with open intents`);

    if (matchedPartners.length === 0) {
      console.log("[Matching] No compatible partners found among available intents. Falling back to simple match.");
      // FALLBACK: Just take the first available intent if semantic search returned nothing
      const fallbackPartner = otherIntents[0];
      if (fallbackPartner) {
        console.log(`[Matching] Fallback match: ${profile.name} + ${fallbackPartner.profile.name}`);
        await createMatch(intent, fallbackPartner);
      }
      return;
    }

    // 4. Form a group (semantic match)
    const topMatch = matchedPartners[0];
    const partnerIntent = otherIntents.find(i => i.profileId === topMatch.id);

    if (!partnerIntent) {
      console.log("[Matching] Partner intent not found for top match. Falling back.");
      const fallbackPartner = otherIntents[0];
      if (fallbackPartner) await createMatch(intent, fallbackPartner);
      return;
    }

    console.log(`[Matching] Semantic match found! ${profile.name} + ${partnerIntent.profile.name} (Score: ${topMatch.score})`);
    await createMatch(intent, partnerIntent);
    
  } catch (error) {
    console.error("[Matching] Error during matching process:", error);
    // FALLBACK: Even if AI/Qdrant fails, try to match by simple filters in Dev
    console.log("[Matching] Attempting emergency fallback match...");
    const fallbackPartner = otherIntents[0];
    if (fallbackPartner) {
      await createMatch(intent, fallbackPartner).catch(e => console.error("[Matching] Fallback match failed:", e));
    }
  }
}

/**
 * Helper to create the actual match records
 */
async function createMatch(intent: any, partnerIntent: any) {
  const profileId = intent.profileId;
  const date = intent.date;
  const timeSlot = intent.timeSlot;

  // 5. Fetch a valid restaurant for the event
  const restaurant = await prisma.restaurant.findFirst();
  if (!restaurant) {
    console.error("[Matching] No restaurants found in database. Cannot create event.");
    return;
  }

  console.log(`[Matching] Creating event at ${restaurant.name}`);

  // 6. Create a Dining Event
  const event = await prisma.diningEvent.create({
    data: {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      status: "FORMING",
      scheduledDate: date,
      scheduledTime: timeSlot === "DINNER" ? "19:30" : "12:30",
      guestCount: 2,
      createdBy: profileId,
      members: {
        create: [
          { profileId: profileId, status: "JOINED" },
          { profileId: partnerIntent.profileId, status: "INVITED" }
        ]
      },
      intents: {
        connect: [
          { id: intent.id },
          { id: partnerIntent.id }
        ]
      }
    }
  });

  // 7. Update intent statuses
  await prisma.dinnerIntent.updateMany({
    where: {
      id: { in: [intent.id, partnerIntent.id] }
    },
    data: {
      status: "MATCHED",
      matchedEventId: event.id
    }
  });

  // 7. Create Notifications for both users
  console.log(`[Matching] Creating notifications for profiles: ${profileId} and ${partnerIntent.profileId}`);
  await prisma.notification.createMany({
    data: [
      {
        profileId: profileId,
        type: "MATCH_FOUND",
        targetId: event.id,
        status: "PENDING"
      },
      {
        profileId: partnerIntent.profileId,
        type: "MATCH_FOUND",
        targetId: event.id,
        status: "PENDING"
      }
    ]
  });

  console.log(`[Matching] Successfully formed event ${event.id} and created notifications for both participants`);
}

