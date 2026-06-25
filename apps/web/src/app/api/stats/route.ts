import { prisma } from "@tablr/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const [profileCount, eventCount, areas] = await Promise.all([
      prisma.profile.count(),
      prisma.diningEvent.count(),
      prisma.restaurant.findMany({ select: { area: true }, distinct: ["area"] }),
    ]);

    return NextResponse.json({
      diners: profileCount,
      dinnersHosted: eventCount,
      neighbourhoods: areas.filter((a) => a.area).length,
    });
  } catch (error) {
    console.error("[Stats API] Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch community stats" },
      { status: 500 },
    );
  }
}
