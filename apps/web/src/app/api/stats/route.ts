import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const connString = process.env.DATABASE_URL;
  if (!connString) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const pool = new Pool({
      connectionString: connString,
      idleTimeoutMillis: 5000,
    });

    const [profilesResult, eventsResult, areasResult] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM profiles"),
      pool.query("SELECT COUNT(*)::int AS count FROM dining_events"),
      pool.query("SELECT DISTINCT area FROM restaurants WHERE area IS NOT NULL AND area != ''"),
    ]);

    await pool.end();

    return NextResponse.json({
      diners: profilesResult.rows[0]?.count ?? 0,
      dinnersHosted: eventsResult.rows[0]?.count ?? 0,
      neighbourhoods: areasResult.rows.length,
    });
  } catch (error) {
    console.error("[Stats API] Failed to fetch stats:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch community stats" },
      { status: 500 },
    );
  }
}
