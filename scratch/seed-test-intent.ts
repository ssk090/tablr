import { prisma } from "@tablr/database";

async function seedTestIntent() {
  // 1. Create a dummy profile if it doesn't exist
  const dummyId = "dummy-user-id-for-testing";
  await prisma.profile.upsert({
    where: { id: dummyId },
    update: {},
    create: {
      id: dummyId,
      name: "Test Partner",
      email: "test@example.com",
      bio: "I am a test partner created to help verify matchmaking.",
      professionalTitle: "QA Engineer",
      company: "Tablr Testing",
      interests: ["Italian", "Tech"],
      diningPreferences: {
        cuisines: ["Italian"],
        preferredAreas: ["Indiranagar"],
      }
    }
  });

  // 2. Create an open intent for today for this dummy user
  const today = new Date().toISOString().split('T')[0];
  await prisma.dinnerIntent.create({
    data: {
      profileId: dummyId,
      date: today,
      timeSlot: "DINNER",
      preferredArea: "Indiranagar",
      status: "OPEN",
    }
  });

  console.log("✅ Created test intent for 'Test Partner' on", today);
}

seedTestIntent().catch(console.error);
