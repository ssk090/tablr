import { z } from "zod";

// ── Profile ──────────────────────────────────────────────────────────

export const DiningPreferencesSchema = z.object({
  cuisines: z.array(z.string()).default([]),
  dietaryRestrictions: z.array(z.string()).default([]),
  budgetRange: z.enum(["budget", "moderate", "premium", "luxury"]).default("moderate"),
  preferredAreas: z.array(z.string()).default([]),
  preferredGroupSize: z.number().int().min(2).max(10).default(4),
  preferredDays: z.array(z.string()).default([]),
  preferredTimeSlots: z.array(z.enum(["breakfast", "lunch", "dinner"])).default(["dinner"]),
});

export const SemanticProfileSchema = z.object({
  professionalDomain: z.string(),
  skills: z.array(z.string()),
  interests: z.array(z.string()),
  conversationTopics: z.array(z.string()),
  personalityTraits: z.array(z.string()),
});

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  bio: z.string().describe("Short bio or introduction"),
  professionalTitle: z.string().optional().describe("e.g. Software Engineer, Designer"),
  company: z.string().optional().describe("Current company or organization"),
  email: z.string().email().optional().describe("Contact email for notifications"),
  linkedinUrl: z.string().optional().describe("LinkedIn profile URL"),
  interests: z.array(z.string()).default([]),
  city: z.string().default("Bangalore"),
  diningPreferences: DiningPreferencesSchema.default({}),
  semanticProfile: SemanticProfileSchema.optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ── Restaurant ───────────────────────────────────────────────────────

export const RestaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  cuisine: z.array(z.string()),
  area: z.string(),
  address: z.string(),
  rating: z.number().min(0).max(5),
  costForTwo: z.number(),
  groupFriendly: z.boolean(),
  maxGroupSize: z.number().int(),
  ambiance: z.array(z.string()),
  highlights: z.array(z.string()),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

// ── Dining Event ─────────────────────────────────────────────────────

export const DiningEventSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string(),
  restaurantName: z.string(),
  status: z.enum(["forming", "confirmed", "completed", "cancelled"]),
  scheduledDate: z.string(),
  scheduledTime: z.string(),
  guestCount: z.number().int().min(2),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ── Feedback ─────────────────────────────────────────────────────────

export const FeedbackSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  profileId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().default(""),
  createdAt: z.string().datetime(),
});

// ── Dinner Intent ────────────────────────────────────────────────────

export const DinnerIntentSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  date: z.string().describe("YYYY-MM-DD"),
  timeSlot: z.enum(["lunch", "dinner"]).default("dinner"),
  preferredArea: z.string().optional(),
  groupSize: z.number().int().min(2).max(10).default(4),
  status: z.enum(["open", "matched", "expired", "cancelled"]).default("open"),
  matchedEventId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
});

// ── Notifications ───────────────────────────────────────────────────

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  type: z.enum(["match_found", "event_invite", "event_reminder"]),
  targetId: z.string().describe("ID of the related event or intent"),
  status: z.enum(["pending", "sent", "failed"]).default("pending"),
  sentAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

// ── SQL Schema ───────────────────────────────────────────────────────

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bio TEXT DEFAULT '',
    professional_title TEXT DEFAULT '',
    company TEXT DEFAULT '',
    email TEXT,
    linkedin_url TEXT,
    interests TEXT DEFAULT '[]',
    city TEXT DEFAULT 'Bangalore',
    dining_preferences TEXT DEFAULT '{}',
    semantic_profile TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS embeddings (
    profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    vector TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cuisine TEXT DEFAULT '[]',
    area TEXT NOT NULL,
    address TEXT NOT NULL,
    rating REAL DEFAULT 0,
    cost_for_two REAL DEFAULT 0,
    group_friendly INTEGER DEFAULT 0,
    max_group_size INTEGER DEFAULT 6,
    ambiance TEXT DEFAULT '[]',
    highlights TEXT DEFAULT '[]',
    lat REAL,
    lng REAL
  );

  CREATE TABLE IF NOT EXISTS dining_events (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    restaurant_name TEXT NOT NULL,
    status TEXT DEFAULT 'forming',
    scheduled_date TEXT,
    scheduled_time TEXT,
    guest_count INTEGER DEFAULT 4,
    created_by TEXT NOT NULL REFERENCES profiles(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS event_members (
    event_id TEXT NOT NULL REFERENCES dining_events(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'invited',
    joined_at TEXT NOT NULL,
    PRIMARY KEY (event_id, profile_id)
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES dining_events(id),
    profile_id TEXT NOT NULL REFERENCES profiles(id),
    rating INTEGER NOT NULL,
    comment TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);
  CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
  CREATE INDEX IF NOT EXISTS idx_events_status ON dining_events(status);
  CREATE INDEX IF NOT EXISTS idx_events_date ON dining_events(scheduled_date);
  CREATE INDEX IF NOT EXISTS idx_event_members_profile ON event_members(profile_id);

  CREATE TABLE IF NOT EXISTS dinner_intents (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time_slot TEXT DEFAULT 'dinner',
    preferred_area TEXT,
    group_size INTEGER DEFAULT 4,
    status TEXT DEFAULT 'open',
    matched_event_id TEXT REFERENCES dining_events(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    sent_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_intents_date_status ON dinner_intents(date, status);
  CREATE INDEX IF NOT EXISTS idx_intents_profile ON dinner_intents(profile_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
`;
