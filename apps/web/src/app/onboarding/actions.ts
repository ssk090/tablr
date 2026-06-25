"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@tablr/database";
import { syncProfileVectorFromProfile, type DiningPreferences } from "@tablr/core";
import { type ProfileFormValues, profileSchema } from "./schema";

export async function syncProfile() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await currentUser();
  if (!user) throw new Error("User not found");

  const email = user.emailAddresses[0]?.emailAddress;
  const name = `${user.firstName} ${user.lastName}`.trim();

  // Upsert the base profile in Supabase
  await prisma.profile.upsert({
    where: { id: userId },
    update: {
      name,
      email,
    },
    create: {
      id: userId,
      name,
      email,
      bio: "",
      diningPreferences: {},
    },
  });
}

function nullableUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isMissingSocialColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("linkedin_url") || message.includes("github_url");
}

export async function saveProfile(userId: string, data: ProfileFormValues) {
  const { userId: authId } = await auth();
  if (authId !== userId) throw new Error("Unauthorized");

  const profile = profileSchema.parse(data);
  const baseProfileData = {
    name: profile.fullName,
    professionalTitle: profile.professionalTitle,
    company: profile.company,
    bio: profile.bio,
    interests: profile.cuisines,
    diningPreferences: {
      cuisines: profile.cuisines,
      preferredAreas: profile.preferredAreas,
    },
  };

  let socialLinksSaved = true;
  let updatedProfile;
  try {
    updatedProfile = await prisma.profile.update({
      where: { id: userId },
      data: {
        ...baseProfileData,
        linkedinUrl: nullableUrl(profile.linkedinUrl),
        githubUrl: nullableUrl(profile.githubUrl),
      },
    });
  } catch (error) {
    if (!isMissingSocialColumnError(error)) {
      throw error;
    }

    socialLinksSaved = false;
    console.error(
      "[Profile] Social link columns are missing in the database. Run `pnpm --filter @tablr/database db:push` to persist LinkedIn/GitHub URLs.",
      error,
    );

    updatedProfile = await prisma.profile.update({
      where: { id: userId },
      data: baseProfileData,
    });
  }

  const vectorSync = await syncProfileVectorFromProfile(updatedProfile);
  if (vectorSync.status === "synced") {
    console.log(`[Onboarding] Upserted vector for user: ${userId}`);
  } else {
    console.error("[Onboarding] Failed to update vector:", vectorSync.error);
  }

  return {
    success: true,
    socialLinksSaved,
    warning: socialLinksSaved
      ? undefined
      : "Profile saved, but LinkedIn/GitHub URLs need a database migration before they can be stored.",
  };
}

export async function getProfile() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
  });

  if (!profile) return null;

  const preferences = profile.diningPreferences as unknown as DiningPreferences;

  return {
    fullName: profile.name || "",
    professionalTitle: profile.professionalTitle || "",
    company: profile.company || "",
    linkedinUrl: profile.linkedinUrl || "",
    githubUrl: profile.githubUrl || "",
    bio: profile.bio || "",
    cuisines: preferences?.cuisines || [],
    preferredAreas: preferences?.preferredAreas || [],
  } as ProfileFormValues;
}
