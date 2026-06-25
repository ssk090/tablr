import type { DiningEvent, DinnerIntent, EventMember, Profile, Restaurant } from "../types";

export interface ProfileLookupPort {
  getProfile(id: string): Profile | undefined;
}

export interface DinnerIntentEventPort extends ProfileLookupPort {
  createDinnerIntent(data: {
    readonly profileId: string;
    readonly date: string;
    readonly timeSlot?: string;
    readonly preferredArea?: string;
    readonly groupSize?: number;
  }): DinnerIntent;
  findOpenIntents(date: string, excludeProfileId?: string): DinnerIntent[];
  updateIntentStatus(intentId: string, status: string, matchedEventId?: string): void;
  createEvent(data: Omit<DiningEvent, "id" | "createdAt" | "updatedAt">): DiningEvent;
  addEventMember(member: EventMember): void;
  createNotification(data: {
    readonly profileId: string;
    readonly type: "match_found" | "event_invite" | "event_reminder";
    readonly targetId: string;
  }): void;
}

export interface RestaurantDiscoveryPort extends ProfileLookupPort {
  searchRestaurants(criteria: {
    readonly cuisine?: string;
    readonly area?: string;
    readonly minRating?: number;
    readonly maxBudget?: number;
    readonly groupSize?: number;
  }): Restaurant[];
}
