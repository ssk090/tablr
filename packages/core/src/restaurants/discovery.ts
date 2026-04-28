import type { TablrDatabase } from '../db/database';
import type { Restaurant, RestaurantSearchCriteria } from '../types';
import { BANGALORE_RESTAURANTS } from './seed-data';

/**
 * Seed the database with Bangalore restaurant data if empty.
 */
export function seedRestaurantsIfEmpty(db: TablrDatabase): void {
  const count = db.getRestaurantCount();
  if (count > 0) return;

  for (const restaurant of BANGALORE_RESTAURANTS) {
    db.upsertRestaurant(restaurant);
  }
}

/**
 * Search restaurants in the local database.
 * This is the fallback when Swiggy Dineout MCP is not available.
 */
export function searchLocalRestaurants(
  db: TablrDatabase,
  criteria: RestaurantSearchCriteria,
): Restaurant[] {
  return db.searchRestaurants({
    cuisine: criteria.cuisine,
    area: criteria.area,
    minRating: criteria.minRating,
    maxBudget: criteria.maxBudget,
    groupSize: criteria.groupSize,
  });
}

/**
 * Suggest restaurants based on a group's collective preferences.
 * Aggregates dining preferences from all group members and finds
 * the best matching venues.
 */
export function suggestRestaurantsForGroup(db: TablrDatabase, profileIds: string[]): Restaurant[] {
  const cuisineCounts = new Map<string, number>();
  const areaCounts = new Map<string, number>();
  let totalBudget = 0;
  let budgetCount = 0;
  const maxGroupSize = profileIds.length;

  for (const profileId of profileIds) {
    const profile = db.getProfile(profileId);
    if (!profile) continue;

    const dp = profile.diningPreferences;

    for (const cuisine of dp.cuisines) {
      cuisineCounts.set(cuisine.toLowerCase(), (cuisineCounts.get(cuisine.toLowerCase()) ?? 0) + 1);
    }

    for (const area of dp.preferredAreas) {
      areaCounts.set(area.toLowerCase(), (areaCounts.get(area.toLowerCase()) ?? 0) + 1);
    }

    const budgetMap = { budget: 500, moderate: 1000, premium: 2000, luxury: 3500 } as const;
    totalBudget += budgetMap[dp.budgetRange];
    budgetCount++;
  }

  const avgBudget = budgetCount > 0 ? totalBudget / budgetCount : 1500;

  // Try most popular cuisine first
  const topCuisine = [...cuisineCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const topArea = [...areaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  // Search with progressively relaxed criteria
  let results = db.searchRestaurants({
    cuisine: topCuisine,
    area: topArea,
    maxBudget: avgBudget * 2,
    groupSize: maxGroupSize,
  });

  if (results.length === 0 && topCuisine) {
    results = db.searchRestaurants({
      cuisine: topCuisine,
      maxBudget: avgBudget * 2,
      groupSize: maxGroupSize,
    });
  }

  if (results.length === 0) {
    results = db.searchRestaurants({
      groupSize: maxGroupSize,
    });
  }

  return results;
}
