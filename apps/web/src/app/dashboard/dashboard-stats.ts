import type { Prisma } from "@tablr/database";

export interface DashboardStats {
  readonly activeRequests: number;
  readonly confirmedDinners: number;
  readonly favoriteArea: string;
  readonly diningPartners: number;
  readonly pendingInvites: number;
  readonly acceptedMatches: number;
  readonly connectedPeople: readonly ConnectedPerson[];
}

export interface ConnectedPerson {
  readonly status: string;
  readonly event: {
    readonly id: string;
    readonly restaurantName: string;
    readonly scheduledDate: string | null;
  };
  readonly profile: {
    readonly id: string;
    readonly name: string;
    readonly professionalTitle: string | null;
    readonly company: string | null;
    readonly linkedinUrl: string | null;
  };
}

export const EMPTY_DASHBOARD_STATS: DashboardStats = {
  activeRequests: 0,
  confirmedDinners: 0,
  favoriteArea: "Not set",
  diningPartners: 0,
  pendingInvites: 0,
  acceptedMatches: 0,
  connectedPeople: [],
};

export function getFavoriteArea(diningPreferences: Prisma.JsonValue | null | undefined): string {
  const parsed = parseDiningPreferences(diningPreferences);
  return parsed.preferredAreas[0] ?? "Not set";
}

function parseDiningPreferences(value: Prisma.JsonValue | null | undefined): { readonly preferredAreas: readonly string[] } {
  if (typeof value === "string") {
    try {
      return parseDiningPreferences(JSON.parse(value) as Prisma.JsonValue);
    } catch {
      return { preferredAreas: [] };
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { preferredAreas: [] };
  }

  const preferences = value as { readonly preferredAreas?: unknown };
  return {
    preferredAreas: Array.isArray(preferences.preferredAreas)
      ? preferences.preferredAreas.filter((area): area is string => typeof area === "string")
      : [],
  };
}
