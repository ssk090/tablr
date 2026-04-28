import type { z } from "zod";
import type {
  DiningEventSchema,
  DiningPreferencesSchema,
  DinnerIntentSchema,
  FeedbackSchema,
  ProfileSchema,
  RestaurantSchema,
  SemanticProfileSchema,
} from './db/schema';

// ── Profile ──────────────────────────────────────────────────────────

export type Profile = z.infer<typeof ProfileSchema>;
export type SemanticProfile = z.infer<typeof SemanticProfileSchema>;
export type DiningPreferences = z.infer<typeof DiningPreferencesSchema>;

// ── Matchmaking ──────────────────────────────────────────────────────

export interface Match {
  readonly profileId: string;
  readonly name: string;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface DiningCluster {
  readonly id: string;
  readonly members: readonly Match[];
  readonly averageScore: number;
  readonly suggestedCuisines: readonly string[];
  readonly suggestedAreas: readonly string[];
}

export interface CompatibilityScore {
  readonly overall: number;
  readonly professional: number;
  readonly interests: number;
  readonly diningPreferences: number;
  readonly breakdown: readonly string[];
}

// ── Restaurant ───────────────────────────────────────────────────────

export type Restaurant = z.infer<typeof RestaurantSchema>;

export interface RestaurantSearchCriteria {
  readonly cuisine?: string;
  readonly area?: string;
  readonly minRating?: number;
  readonly maxBudget?: number;
  readonly groupSize?: number;
}

// ── Dining Events ────────────────────────────────────────────────────

export const EVENT_STATUSES = ["forming", "confirmed", "completed", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export type DiningEvent = z.infer<typeof DiningEventSchema>;

export interface EventMember {
  readonly eventId: string;
  readonly profileId: string;
  readonly status: "invited" | "accepted" | "declined";
  readonly joinedAt: string;
}

// ── Feedback ─────────────────────────────────────────────────────────

export type Feedback = z.infer<typeof FeedbackSchema>;

// ── Embeddings ───────────────────────────────────────────────────────

export interface StoredEmbedding {
  readonly profileId: string;
  readonly vector: readonly number[];
  readonly model: string;
  readonly createdAt: string;
}

// ── Dinner Intent ────────────────────────────────────────────────────

export type DinnerIntent = z.infer<typeof DinnerIntentSchema>;
