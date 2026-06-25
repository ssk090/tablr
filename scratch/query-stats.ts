import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const connectionString = "postgresql://postgres:zlsf4a7OXRICbIGo@db.anjcwwsldyabmowezlcp.supabase.co:5432/postgres";
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const [profiles, events, areas] = await Promise.all([
    prisma.profile.count(),
    prisma.diningEvent.count(),
    prisma.restaurant.findMany({ select: { area: true }, distinct: ["area"] }),
  ]);
  console.log(JSON.stringify({ profiles, events, uniqueAreas: areas.length, areaNames: areas.map(a => a.area).filter(Boolean) }));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
