import { findMatches } from "../ai/matchmaker";
import type { DinnerIntentEventPort, RestaurantDiscoveryPort } from "../db/domain-ports";
import { searchLocalRestaurants, suggestRestaurantsForGroup } from "../restaurants/discovery";
import type { DiningEvent, DinnerIntent, Match, Profile, Restaurant } from "../types";

export interface ProcessDinnerIntentInput {
  readonly profileId: string;
  readonly date: string;
  readonly timeSlot?: "lunch" | "dinner";
  readonly preferredArea?: string;
  readonly groupSize?: number;
}

export type DinnerIntentFlowResult =
  | {
      readonly status: "profile_not_found";
      readonly profileId: string;
    }
  | {
      readonly status: "waiting";
      readonly intent: DinnerIntent;
      readonly profile: Profile;
      readonly otherAvailable: number;
      readonly reason: "no_other_diners" | "no_compatible_diners";
    }
  | {
      readonly status: "matched";
      readonly intent: DinnerIntent;
      readonly profile: Profile;
      readonly matches: readonly Match[];
      readonly restaurant?: Restaurant;
      readonly event?: DiningEvent;
    };

export async function processDinnerIntent(
  db: DinnerIntentEventPort & RestaurantDiscoveryPort,
  input: ProcessDinnerIntentInput,
): Promise<DinnerIntentFlowResult> {
  const timeSlot = input.timeSlot ?? "dinner";
  const groupSize = input.groupSize ?? 4;
  const profile = db.getProfile(input.profileId);
  if (!profile) return { status: "profile_not_found", profileId: input.profileId };

  const intent = db.createDinnerIntent({
    profileId: input.profileId,
    date: input.date,
    timeSlot,
    preferredArea: input.preferredArea,
    groupSize,
  });

  const otherIntents = db.findOpenIntents(input.date, input.profileId);
  if (otherIntents.length === 0) {
    return { status: "waiting", intent, profile, otherAvailable: 0, reason: "no_other_diners" };
  }

  const matches = await findMatches(db, input.profileId, { limit: groupSize - 1, minScore: 0.2 });
  const intentProfileIds = new Set(otherIntents.map((otherIntent) => otherIntent.profileId));
  const availableMatches = matches.filter((match) => intentProfileIds.has(match.profileId));

  if (availableMatches.length === 0) {
    return {
      status: "waiting",
      intent,
      profile,
      otherAvailable: otherIntents.length,
      reason: "no_compatible_diners",
    };
  }

  const allProfileIds = [input.profileId, ...availableMatches.map((match) => match.profileId)];
  const suggestedRestaurants = suggestRestaurantsForGroup(db, allProfileIds);
  const areaRestaurants = input.preferredArea
    ? searchLocalRestaurants(db, { area: input.preferredArea, groupSize: allProfileIds.length })
    : [];
  const restaurant = (suggestedRestaurants.length > 0 ? suggestedRestaurants : areaRestaurants)[0];

  let event: DiningEvent | undefined;
  if (restaurant) {
    event = db.createEvent({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      status: "forming",
      scheduledDate: input.date,
      scheduledTime: timeSlot === "dinner" ? "19:30" : "12:30",
      guestCount: allProfileIds.length,
      createdBy: input.profileId,
    });

    const now = new Date().toISOString();
    db.addEventMember({ eventId: event.id, profileId: input.profileId, status: "accepted", joinedAt: now });
    for (const match of availableMatches) {
      db.addEventMember({ eventId: event.id, profileId: match.profileId, status: "invited", joinedAt: now });
    }

    db.updateIntentStatus(intent.id, "matched", event.id);
    db.createNotification({ profileId: input.profileId, type: "match_found", targetId: event.id });
    for (const otherIntent of otherIntents) {
      if (availableMatches.some((match) => match.profileId === otherIntent.profileId)) {
        db.updateIntentStatus(otherIntent.id, "matched", event.id);
        db.createNotification({ profileId: otherIntent.profileId, type: "match_found", targetId: event.id });
      }
    }
  }

  return { status: "matched", intent, profile, matches: availableMatches, restaurant, event };
}
