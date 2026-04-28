#!/usr/bin/env tsx
/**
 * Smoke test — verifies each component of the Tablr pipeline:
 * 1. Ollama embeddings
 * 2. Qdrant vector storage
 * 3. SQLite database
 * 4. Profile creation → embedding → search
 */

import { randomUUID } from "node:crypto";
import { embed, generateProfileEmbedding } from '../ai/embeddings';
import { TablrDatabase } from '../db/database';
import {
  ensureCollection,
  getVectorCount,
  searchSimilarProfiles,
  upsertProfileVector,
} from '../db/qdrant';
import type { Profile } from '../types';

// Force config to load with defaults
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || "test-not-needed-for-smoke";

async function test(name: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`  ❌ ${name}: ${msg}`);
    return false;
  }
}

async function main(): Promise<void> {
  console.log("\n🧪 Tablr Smoke Test\n");
  let passed = 0;
  let total = 0;

  // 1. Ollama
  console.log("1️⃣  Ollama Embeddings");
  total++;
  if (
    await test("Generate embedding for text", async () => {
      const vec = await embed("Software engineer who loves hiking");
      if (vec.length !== 768) throw new Error(`Expected 768 dims, got ${vec.length}`);
    })
  )
    passed++;

  // 2. Qdrant
  console.log("\n2️⃣  Qdrant Vector DB");
  total++;
  if (
    await test("Create/ensure collection", async () => {
      await ensureCollection();
    })
  )
    passed++;

  total++;
  if (
    await test("Upsert a test vector", async () => {
      const vec = await embed("Test profile for smoke test");
      await upsertProfileVector(randomUUID(), vec, { name: "Smoke Test" });
    })
  )
    passed++;

  total++;
  if (
    await test("Search similar vectors", async () => {
      const vec = await embed("Engineer who likes technology");
      const results = await searchSimilarProfiles(vec, { limit: 5 });
      if (results.length === 0) throw new Error("No results returned");
    })
  )
    passed++;

  total++;
  if (
    await test("Get vector count", async () => {
      const count = await getVectorCount();
      if (count < 1) throw new Error(`Expected >= 1, got ${count}`);
    })
  )
    passed++;

  // 3. SQLite
  console.log("\n3️⃣  SQLite Database");
  const db = new TablrDatabase(":memory:");

  total++;
  if (
    await test("Create profile", () => {
      const profile = db.createProfile({
        name: "Test User",
        bio: "Engineer at TestCo",
        professionalTitle: "Software Engineer",
        company: "TestCo",
        interests: ["coding", "hiking"],
        city: "Bangalore",
        diningPreferences: {
          cuisines: ["Italian"],
          dietaryRestrictions: [],
          budgetRange: "moderate",
          preferredAreas: ["Koramangala"],
          preferredGroupSize: 4,
          preferredDays: [],
          preferredTimeSlots: ["dinner"],
        },
        isActive: true,
      });
      if (!profile.id) throw new Error("No profile ID");
      return Promise.resolve();
    })
  )
    passed++;

  total++;
  if (
    await test("Query active profiles", () => {
      const profiles = db.getActiveProfiles();
      if (profiles.length !== 1) throw new Error(`Expected 1 profile, got ${profiles.length}`);
      return Promise.resolve();
    })
  )
    passed++;

  // 4. Full pipeline
  console.log("\n4️⃣  Full Pipeline (Profile → Embed → Qdrant)");
  total++;
  const pipelineId = randomUUID();
  if (
    await test("Create profile + embed + upsert", async () => {
      const profile: Profile = {
        id: pipelineId,
        name: "Priya Test",
        bio: "Product manager passionate about fintech",
        professionalTitle: "PM",
        company: "Razorpay",
        interests: ["fintech", "running"],
        city: "Bangalore",
        diningPreferences: {
          cuisines: ["Japanese"],
          dietaryRestrictions: [],
          budgetRange: "premium",
          preferredAreas: ["Indiranagar"],
          preferredGroupSize: 4,
          preferredDays: [],
          preferredTimeSlots: ["dinner"],
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const vec = await generateProfileEmbedding(profile);
      if (vec.length !== 768) throw new Error(`Bad dim: ${vec.length}`);
      await upsertProfileVector(pipelineId, vec, { name: profile.name });
    })
  )
    passed++;

  total++;
  if (
    await test("Search finds pipeline profile", async () => {
      const vec = await embed("fintech product manager");
      const results = await searchSimilarProfiles(vec, { limit: 5 });
      const found = results.some((r) => r.id === pipelineId);
      if (!found) throw new Error("Pipeline profile not found in search results");
    })
  )
    passed++;

  // Summary
  console.log(`\n${"━".repeat(40)}`);
  console.log(`Result: ${passed}/${total} passed`);

  if (passed === total) {
    console.log("\n🎉 All systems operational! Run the agent:");
    console.log("   pnpm agent\n");
  } else {
    console.log("\n⚠️  Some tests failed. Check the services above.\n");
  }

  db.close();
  process.exit(passed === total ? 0 : 1);
}

main();
