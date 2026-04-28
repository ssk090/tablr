"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@tablr/database";
import { generateProfileEmbedding, upsertProfileVector, ensureCollection, type Profile, type DiningPreferences, type SemanticProfile } from "@tablr/core";
import type { ProfileFormValues } from "./schema";

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

export async function saveProfile(userId: string, data: ProfileFormValues) {
  const { userId: authId } = await auth();
  if (authId !== userId) throw new Error("Unauthorized");

  const updatedProfile = await prisma.profile.update({
    where: { id: userId },
    data: {
      name: data.fullName,
      professionalTitle: data.professionalTitle,
      company: data.company,
      bio: data.bio,
      interests: data.cuisines,
      diningPreferences: {
        cuisines: data.cuisines,
        preferredAreas: data.preferredAreas,
      },
    },
  });

  // Generate and upsert embedding for matching
  try {
    // Convert Prisma model to the type expected by core
    const profileForEmbedding: Profile = {
      ...updatedProfile,
      professionalTitle: updatedProfile.professionalTitle ?? undefined,
      company: updatedProfile.company ?? undefined,
      email: updatedProfile.email ?? undefined,
      linkedinUrl: updatedProfile.linkedinUrl ?? undefined,
      interests: updatedProfile.interests as string[],
      city: updatedProfile.city ?? "Bangalore",
      diningPreferences: updatedProfile.diningPreferences as unknown as DiningPreferences,
      semanticProfile: updatedProfile.semanticProfile as unknown as SemanticProfile,
      isActive: updatedProfile.isActive ?? true,
      createdAt: updatedProfile.createdAt.toISOString(),
      updatedAt: updatedProfile.updatedAt.toISOString(),
    };
    
    const vector = await generateProfileEmbedding(profileForEmbedding);
    await ensureCollection();
    await upsertProfileVector(userId, vector, {
      name: updatedProfile.name,
      title: updatedProfile.professionalTitle,
    });
    console.log(`[Onboarding] Upserted vector for user: ${userId}`);
  } catch (err) {
    console.error("[Onboarding] Failed to update vector:", err);
    // Don't fail the whole request if Qdrant/Ollama is down
  }

  return { success: true };
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
    bio: profile.bio || "",
    cuisines: preferences?.cuisines || [],
    preferredAreas: preferences?.preferredAreas || [],
  } as ProfileFormValues;
}
