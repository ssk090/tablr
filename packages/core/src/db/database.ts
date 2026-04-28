import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import type {
  DiningEvent,
  DinnerIntent,
  EventMember,
  Feedback,
  Profile,
  Restaurant,
  StoredEmbedding,
} from "../types";
import { CREATE_TABLES_SQL } from "./schema";

export class TablrDatabase {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.exec(CREATE_TABLES_SQL);

    // Simple migration: ensure email column exists in profiles
    const tableInfo = this.db.prepare("PRAGMA table_info(profiles)").all() as Array<{
      name: string;
    }>;
    if (!tableInfo.some((col) => col.name === "email")) {
      this.db.exec("ALTER TABLE profiles ADD COLUMN email TEXT");
    }
  }

  // ── Profiles ─────────────────────────────────────────────────────

  createProfile(data: Omit<Profile, "id" | "createdAt" | "updatedAt">): Profile {
    const id = randomUUID();
    const now = new Date().toISOString();
    const profile: Profile = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO profiles (id, name, bio, professional_title, company, email, linkedin_url, interests, city, dining_preferences, semantic_profile, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        profile.id,
        profile.name,
        profile.bio,
        profile.professionalTitle,
        profile.company,
        profile.email ?? null,
        profile.linkedinUrl ?? null,
        JSON.stringify(profile.interests),
        profile.city,
        JSON.stringify(profile.diningPreferences),
        profile.semanticProfile ? JSON.stringify(profile.semanticProfile) : null,
        profile.isActive ? 1 : 0,
        profile.createdAt,
        profile.updatedAt,
      );

    return profile;
  }

  getProfile(id: string): Profile | undefined {
    const row = this.db.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;

    return row ? this.rowToProfile(row) : undefined;
  }

  updateProfile(id: string, data: Partial<Omit<Profile, "id" | "createdAt">>): Profile | undefined {
    const existing = this.getProfile(id);
    if (!existing) return undefined;

    const updated: Profile = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.db
      .prepare(
        `UPDATE profiles SET name = ?, bio = ?, professional_title = ?, company = ?, email = ?, linkedin_url = ?, interests = ?, city = ?, dining_preferences = ?, semantic_profile = ?, is_active = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        updated.name,
        updated.bio,
        updated.professionalTitle,
        updated.company,
        updated.email ?? null,
        updated.linkedinUrl ?? null,
        JSON.stringify(updated.interests),
        updated.city,
        JSON.stringify(updated.diningPreferences),
        updated.semanticProfile ? JSON.stringify(updated.semanticProfile) : null,
        updated.isActive ? 1 : 0,
        updated.updatedAt,
        id,
      );

    return updated;
  }

  deleteProfile(id: string): boolean {
    const result = this.db.prepare("DELETE FROM profiles WHERE id = ?").run(id);
    return result.changes > 0;
  }

  getActiveProfiles(city?: string): Profile[] {
    const query = city
      ? "SELECT * FROM profiles WHERE is_active = 1 AND city = ?"
      : "SELECT * FROM profiles WHERE is_active = 1";

    const rows = city
      ? (this.db.prepare(query).all(city) as Record<string, unknown>[])
      : (this.db.prepare(query).all() as Record<string, unknown>[]);

    return rows.map((r) => this.rowToProfile(r));
  }

  getProfileCount(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM profiles WHERE is_active = 1")
      .get() as { count: number };
    return row.count;
  }

  // ── Embeddings ───────────────────────────────────────────────────

  upsertEmbedding(embedding: StoredEmbedding): void {
    this.db
      .prepare(
        `INSERT INTO embeddings (profile_id, vector, model, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(profile_id) DO UPDATE SET vector = ?, model = ?, created_at = ?`,
      )
      .run(
        embedding.profileId,
        JSON.stringify(embedding.vector),
        embedding.model,
        embedding.createdAt,
        JSON.stringify(embedding.vector),
        embedding.model,
        embedding.createdAt,
      );
  }

  getEmbedding(profileId: string): StoredEmbedding | undefined {
    const row = this.db.prepare("SELECT * FROM embeddings WHERE profile_id = ?").get(profileId) as
      | Record<string, unknown>
      | undefined;

    if (!row) return undefined;

    return {
      profileId: row.profile_id as string,
      vector: JSON.parse(row.vector as string) as number[],
      model: row.model as string,
      createdAt: row.created_at as string,
    };
  }

  getAllEmbeddings(): StoredEmbedding[] {
    const rows = this.db
      .prepare(
        `SELECT e.* FROM embeddings e
         JOIN profiles p ON e.profile_id = p.id
         WHERE p.is_active = 1`,
      )
      .all() as Record<string, unknown>[];

    return rows.map((row) => ({
      profileId: row.profile_id as string,
      vector: JSON.parse(row.vector as string) as number[],
      model: row.model as string,
      createdAt: row.created_at as string,
    }));
  }

  // ── Restaurants ──────────────────────────────────────────────────

  upsertRestaurant(restaurant: Restaurant): void {
    this.db
      .prepare(
        `INSERT INTO restaurants (id, name, cuisine, area, address, rating, cost_for_two, group_friendly, max_group_size, ambiance, highlights, lat, lng)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = ?, cuisine = ?, area = ?, address = ?, rating = ?, cost_for_two = ?, group_friendly = ?, max_group_size = ?, ambiance = ?, highlights = ?, lat = ?, lng = ?`,
      )
      .run(
        restaurant.id,
        restaurant.name,
        JSON.stringify(restaurant.cuisine),
        restaurant.area,
        restaurant.address,
        restaurant.rating,
        restaurant.costForTwo,
        restaurant.groupFriendly ? 1 : 0,
        restaurant.maxGroupSize,
        JSON.stringify(restaurant.ambiance),
        JSON.stringify(restaurant.highlights),
        restaurant.lat ?? null,
        restaurant.lng ?? null,
        restaurant.name,
        JSON.stringify(restaurant.cuisine),
        restaurant.area,
        restaurant.address,
        restaurant.rating,
        restaurant.costForTwo,
        restaurant.groupFriendly ? 1 : 0,
        restaurant.maxGroupSize,
        JSON.stringify(restaurant.ambiance),
        JSON.stringify(restaurant.highlights),
        restaurant.lat ?? null,
        restaurant.lng ?? null,
      );
  }

  searchRestaurants(criteria: {
    cuisine?: string;
    area?: string;
    minRating?: number;
    maxBudget?: number;
    groupSize?: number;
  }): Restaurant[] {
    let query = "SELECT * FROM restaurants WHERE 1=1";
    const params: unknown[] = [];

    if (criteria.cuisine) {
      query += " AND cuisine LIKE ?";
      params.push(`%${criteria.cuisine}%`);
    }
    if (criteria.area) {
      query += " AND area LIKE ?";
      params.push(`%${criteria.area}%`);
    }
    if (criteria.minRating) {
      query += " AND rating >= ?";
      params.push(criteria.minRating);
    }
    if (criteria.maxBudget) {
      query += " AND cost_for_two <= ?";
      params.push(criteria.maxBudget);
    }
    if (criteria.groupSize) {
      query += " AND group_friendly = 1 AND max_group_size >= ?";
      params.push(criteria.groupSize);
    }

    query += " ORDER BY rating DESC LIMIT 10";

    const rows = this.db.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.rowToRestaurant(r));
  }

  getRestaurant(id: string): Restaurant | undefined {
    const row = this.db.prepare("SELECT * FROM restaurants WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;

    return row ? this.rowToRestaurant(row) : undefined;
  }

  getRestaurantCount(): number {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM restaurants").get() as {
      count: number;
    };
    return row.count;
  }

  // ── Dining Events ────────────────────────────────────────────────

  createEvent(data: Omit<DiningEvent, "id" | "createdAt" | "updatedAt">): DiningEvent {
    const id = randomUUID();
    const now = new Date().toISOString();
    const event: DiningEvent = { ...data, id, createdAt: now, updatedAt: now };

    this.db
      .prepare(
        `INSERT INTO dining_events (id, restaurant_id, restaurant_name, status, scheduled_date, scheduled_time, guest_count, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        event.id,
        event.restaurantId,
        event.restaurantName,
        event.status,
        event.scheduledDate,
        event.scheduledTime,
        event.guestCount,
        event.createdBy,
        event.createdAt,
        event.updatedAt,
      );

    return event;
  }

  getEvent(id: string): DiningEvent | undefined {
    const row = this.db.prepare("SELECT * FROM dining_events WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;

    return row ? this.rowToEvent(row) : undefined;
  }

  updateEventStatus(id: string, status: DiningEvent["status"]): DiningEvent | undefined {
    const now = new Date().toISOString();
    this.db
      .prepare("UPDATE dining_events SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, now, id);
    return this.getEvent(id);
  }

  getUpcomingEvents(profileId: string): DiningEvent[] {
    const rows = this.db
      .prepare(
        `SELECT de.* FROM dining_events de
         JOIN event_members em ON de.id = em.event_id
         WHERE em.profile_id = ? AND de.status IN ('forming', 'confirmed')
         ORDER BY de.scheduled_date ASC`,
      )
      .all(profileId) as Record<string, unknown>[];

    return rows.map((r) => this.rowToEvent(r));
  }

  // ── Event Members ────────────────────────────────────────────────

  addEventMember(member: EventMember): void {
    this.db
      .prepare(
        `INSERT INTO event_members (event_id, profile_id, status, joined_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(event_id, profile_id) DO UPDATE SET status = ?`,
      )
      .run(member.eventId, member.profileId, member.status, member.joinedAt, member.status);
  }

  getEventMembers(eventId: string): EventMember[] {
    const rows = this.db
      .prepare("SELECT * FROM event_members WHERE event_id = ?")
      .all(eventId) as Record<string, unknown>[];

    return rows.map((row) => ({
      eventId: row.event_id as string,
      profileId: row.profile_id as string,
      status: row.status as EventMember["status"],
      joinedAt: row.joined_at as string,
    }));
  }

  // ── Feedback ─────────────────────────────────────────────────────

  createFeedback(data: Omit<Feedback, "id" | "createdAt">): Feedback {
    const id = randomUUID();
    const now = new Date().toISOString();
    const feedback: Feedback = { ...data, id, createdAt: now };

    this.db
      .prepare(
        `INSERT INTO feedback (id, event_id, profile_id, rating, comment, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        feedback.id,
        feedback.eventId,
        feedback.profileId,
        feedback.rating,
        feedback.comment,
        feedback.createdAt,
      );

    return feedback;
  }

  // ── Row Converters ───────────────────────────────────────────────

  private rowToProfile(row: Record<string, unknown>): Profile {
    return {
      id: row.id as string,
      name: row.name as string,
      bio: row.bio as string,
      professionalTitle: row.professional_title as string,
      company: row.company as string,
      email: row.email as string | undefined,
      linkedinUrl: row.linkedin_url as string | undefined,
      interests: JSON.parse(row.interests as string) as string[],
      city: (row.city as string) || "Bangalore",
      diningPreferences: JSON.parse((row.dining_preferences as string) || "{}"),
      semanticProfile: row.semantic_profile
        ? JSON.parse(row.semantic_profile as string)
        : undefined,
      isActive: row.is_active === 1,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private rowToRestaurant(row: Record<string, unknown>): Restaurant {
    return {
      id: row.id as string,
      name: row.name as string,
      cuisine: JSON.parse((row.cuisine as string) || "[]") as string[],
      area: row.area as string,
      address: row.address as string,
      rating: row.rating as number,
      costForTwo: row.cost_for_two as number,
      groupFriendly: row.group_friendly === 1,
      maxGroupSize: row.max_group_size as number,
      ambiance: JSON.parse((row.ambiance as string) || "[]") as string[],
      highlights: JSON.parse((row.highlights as string) || "[]") as string[],
      lat: (row.lat as number) ?? undefined,
      lng: (row.lng as number) ?? undefined,
    };
  }

  private rowToEvent(row: Record<string, unknown>): DiningEvent {
    return {
      id: row.id as string,
      restaurantId: row.restaurant_id as string,
      restaurantName: row.restaurant_name as string,
      status: row.status as DiningEvent["status"],
      scheduledDate: row.scheduled_date as string,
      scheduledTime: row.scheduled_time as string,
      guestCount: row.guest_count as number,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  // ── Dinner Intents ───────────────────────────────────────────────

  createDinnerIntent(data: {
    profileId: string;
    date: string;
    timeSlot?: string;
    preferredArea?: string;
    groupSize?: number;
  }): DinnerIntent {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(`
      INSERT INTO dinner_intents (id, profile_id, date, time_slot, preferred_area, group_size, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
    `)
      .run(
        id,
        data.profileId,
        data.date,
        data.timeSlot ?? "dinner",
        data.preferredArea ?? null,
        data.groupSize ?? 4,
        now,
      );

    return {
      id,
      profileId: data.profileId,
      date: data.date,
      timeSlot: (data.timeSlot ?? "dinner") as "lunch" | "dinner",
      preferredArea: data.preferredArea,
      groupSize: data.groupSize ?? 4,
      status: "open",
      createdAt: now,
    };
  }

  findOpenIntents(date: string, excludeProfileId?: string): DinnerIntent[] {
    const rows = this.db
      .prepare(`
      SELECT * FROM dinner_intents
      WHERE date = ? AND status = 'open'
      ${excludeProfileId ? "AND profile_id != ?" : ""}
      ORDER BY created_at ASC
    `)
      .all(...(excludeProfileId ? [date, excludeProfileId] : [date])) as Record<string, unknown>[];

    return rows.map((row) => ({
      id: row.id as string,
      profileId: row.profile_id as string,
      date: row.date as string,
      timeSlot: row.time_slot as string as "lunch" | "dinner",
      preferredArea: row.preferred_area as string | undefined,
      groupSize: row.group_size as number,
      status: row.status as DinnerIntent["status"],
      matchedEventId: row.matched_event_id as string | undefined,
      createdAt: row.created_at as string,
    }));
  }

  updateIntentStatus(intentId: string, status: string, matchedEventId?: string): void {
    this.db
      .prepare(`
      UPDATE dinner_intents SET status = ?, matched_event_id = ? WHERE id = ?
    `)
      .run(status, matchedEventId ?? null, intentId);
  }

  // ── Notifications ───────────────────────────────────────────────

  createNotification(data: {
    profileId: string;
    type: "match_found" | "event_invite" | "event_reminder";
    targetId: string;
  }): void {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(`
      INSERT INTO notifications (id, profile_id, type, target_id, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `)
      .run(id, data.profileId, data.type, data.targetId, now);
  }

  getPendingNotifications(): Array<{
    id: string;
    profileId: string;
    type: string;
    targetId: string;
  }> {
    const rows = this.db
      .prepare(`
      SELECT * FROM notifications WHERE status = 'pending'
    `)
      .all() as Record<string, unknown>[];

    return rows.map((row) => ({
      id: row.id as string,
      profileId: row.profile_id as string,
      type: row.type as string,
      targetId: row.target_id as string,
    }));
  }

  markNotificationSent(id: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(`
      UPDATE notifications SET status = 'sent', sent_at = ? WHERE id = ?
    `)
      .run(now, id);
  }

  getDinnerIntent(id: string): DinnerIntent | undefined {
    const row = this.db.prepare("SELECT * FROM dinner_intents WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return undefined;
    return {
      id: row.id as string,
      profileId: row.profile_id as string,
      date: row.date as string,
      timeSlot: row.time_slot as string as "lunch" | "dinner",
      preferredArea: row.preferred_area as string | undefined,
      groupSize: row.group_size as number,
      status: row.status as DinnerIntent["status"],
      matchedEventId: row.matched_event_id as string | undefined,
      createdAt: row.created_at as string,
    };
  }

  close(): void {
    this.db.close();
  }
}
