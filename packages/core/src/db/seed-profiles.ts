import { embed } from '../ai/embeddings';
import type { TablrDatabase } from '../db/database';
import { upsertProfileVector } from '../db/qdrant';
import type { Profile } from '../types';

/**
 * Seed demo profiles into SQLite + Qdrant for local matchmaking.
 * Uses hardcoded semantic profiles (no LLM calls) and Ollama embeddings (free).
 * Skips if profiles already exist.
 */
export async function seedDemoProfiles(db: TablrDatabase): Promise<number> {
  const existing = db.getProfileCount();
  if (existing > 0) return 0;

  const demoProfiles = getDemoProfiles();
  let seeded = 0;

  for (const data of demoProfiles) {
    // Create in SQLite
    const profile = db.createProfile({
      ...data,
      isActive: true,
    });

    // Build embedding text and store in Qdrant (Ollama — free, local)
    const text = buildEmbeddingText(profile);
    const vector = await embed(text);
    await upsertProfileVector(profile.id, vector, {
      name: profile.name,
      city: profile.city,
      professionalTitle: profile.professionalTitle,
    });

    seeded++;
  }

  return seeded;
}

function buildEmbeddingText(profile: Profile): string {
  const parts: string[] = [];
  if (profile.professionalTitle) {
    parts.push(`${profile.professionalTitle} at ${profile.company || "unknown"}`);
  }
  if (profile.bio) parts.push(profile.bio);
  if (profile.interests.length > 0) {
    parts.push(`Interests: ${profile.interests.join(", ")}`);
  }
  if (profile.semanticProfile) {
    const sp = profile.semanticProfile;
    if (sp.professionalDomain) parts.push(`Domain: ${sp.professionalDomain}`);
    if (sp.skills?.length) parts.push(`Skills: ${sp.skills.join(", ")}`);
    if (sp.conversationTopics?.length) {
      parts.push(`Topics: ${sp.conversationTopics.join(", ")}`);
    }
  }
  const dp = profile.diningPreferences;
  if (dp.cuisines.length > 0) parts.push(`Cuisines: ${dp.cuisines.join(", ")}`);
  if (dp.preferredAreas.length > 0) parts.push(`Areas: ${dp.preferredAreas.join(", ")}`);
  return parts.join(". ");
}

type DemoProfile = Omit<Profile, "id" | "createdAt" | "updatedAt" | "isActive">;

function getDemoProfiles(): DemoProfile[] {
  return [
    {
      name: "Priya Sharma",
      bio: "Full-stack engineer at Flipkart. Passionate about distributed systems and weekend treks.",
      professionalTitle: "Senior Software Engineer",
      company: "Flipkart",
      interests: ["distributed systems", "trekking", "craft beer", "board games", "photography"],
      city: "Bangalore",
      diningPreferences: {
        cuisines: ["South Indian", "Japanese", "Italian"],
        dietaryRestrictions: [],
        budgetRange: "moderate",
        preferredAreas: ["Koramangala", "Indiranagar"],
        preferredGroupSize: 4,
        preferredDays: ["friday", "saturday"],
        preferredTimeSlots: ["dinner"],
      },
      semanticProfile: {
        professionalDomain: "Software Engineering",
        skills: ["distributed systems", "full-stack development", "system design"],
        interests: ["trekking", "craft beer", "photography"],
        conversationTopics: [
          "scalability challenges",
          "hiking trails near Bangalore",
          "indie board games",
        ],
        personalityTraits: ["analytical", "adventurous"],
      },
    },
    {
      name: "Arjun Menon",
      bio: "Product manager building fintech at Razorpay. Ex-McKinsey. Obsessed with behavioral economics.",
      professionalTitle: "Senior Product Manager",
      company: "Razorpay",
      interests: ["fintech", "behavioral economics", "specialty coffee", "running", "podcasts"],
      city: "Bangalore",
      diningPreferences: {
        cuisines: ["Continental", "Japanese", "Modern Indian"],
        dietaryRestrictions: [],
        budgetRange: "premium",
        preferredAreas: ["Indiranagar", "MG Road", "Koramangala"],
        preferredGroupSize: 5,
        preferredDays: ["thursday", "friday"],
        preferredTimeSlots: ["dinner"],
      },
      semanticProfile: {
        professionalDomain: "Product Management",
        skills: ["product strategy", "user research", "fintech payments"],
        interests: ["behavioral economics", "specialty coffee", "marathons"],
        conversationTopics: ["UPI ecosystem", "startup scaling", "nudge theory"],
        personalityTraits: ["strategic", "curious"],
      },
    },
    {
      name: "Sneha Reddy",
      bio: "UX designer at Google. Previously at Swiggy. Vegetarian foodie who judges restaurants by their paneer.",
      professionalTitle: "Senior UX Designer",
      company: "Google",
      interests: ["design systems", "accessibility", "anime", "yoga", "watercolor painting"],
      city: "Bangalore",
      diningPreferences: {
        cuisines: ["Italian", "South Indian", "Thai"],
        dietaryRestrictions: ["vegetarian"],
        budgetRange: "moderate",
        preferredAreas: ["HSR Layout", "Koramangala", "JP Nagar"],
        preferredGroupSize: 4,
        preferredDays: ["friday", "saturday"],
        preferredTimeSlots: ["dinner"],
      },
      semanticProfile: {
        professionalDomain: "UX Design",
        skills: ["design systems", "user research", "accessibility"],
        interests: ["anime", "yoga", "watercolor"],
        conversationTopics: ["inclusive design", "Miyazaki films", "Bangalore food scene"],
        personalityTraits: ["creative", "empathetic"],
      },
    },
    {
      name: "Vikram Joshi",
      bio: "ML engineer at Microsoft Research. PhD in NLP from IISc. Weekend guitarist and amateur astronomer.",
      professionalTitle: "Research Engineer",
      company: "Microsoft Research",
      interests: ["machine learning", "NLP", "guitar", "astronomy", "philosophy", "chess"],
      city: "Bangalore",
      diningPreferences: {
        cuisines: ["North Indian", "Chinese", "Continental"],
        dietaryRestrictions: [],
        budgetRange: "moderate",
        preferredAreas: ["Whitefield", "Indiranagar", "Koramangala"],
        preferredGroupSize: 5,
        preferredDays: ["saturday"],
        preferredTimeSlots: ["dinner"],
      },
      semanticProfile: {
        professionalDomain: "Machine Learning Research",
        skills: ["NLP", "deep learning", "research methodology"],
        interests: ["guitar", "astronomy", "chess"],
        conversationTopics: ["LLM advances", "philosophy of mind", "stargazing spots"],
        personalityTraits: ["intellectual", "introspective"],
      },
    },
    {
      name: "Ananya Krishnan",
      bio: "Venture capital analyst at Accel. I meet 50 founders a month. Avid reader and salsa dancer.",
      professionalTitle: "Investment Analyst",
      company: "Accel",
      interests: ["venture capital", "startups", "salsa dancing", "reading", "travel"],
      city: "Bangalore",
      diningPreferences: {
        cuisines: ["Hyderabadi", "Italian", "Modern Indian"],
        dietaryRestrictions: [],
        budgetRange: "premium",
        preferredAreas: ["MG Road", "Residency Road", "Indiranagar"],
        preferredGroupSize: 6,
        preferredDays: ["friday", "saturday"],
        preferredTimeSlots: ["dinner"],
      },
      semanticProfile: {
        professionalDomain: "Venture Capital",
        skills: ["deal sourcing", "financial modeling", "market analysis"],
        interests: ["salsa dancing", "non-fiction books", "travel"],
        conversationTopics: [
          "India startup ecosystem",
          "fundraising trends",
          "book recommendations",
        ],
        personalityTraits: ["outgoing", "perceptive"],
      },
    },
    {
      name: "Rohan Gupta",
      bio: "Backend architect at Zerodha. Building low-latency trading systems. Weekend marathon runner.",
      professionalTitle: "Principal Engineer",
      company: "Zerodha",
      interests: ["system architecture", "low-latency", "marathon running", "cooking", "investing"],
      city: "Bangalore",
      diningPreferences: {
        cuisines: ["Japanese", "Korean", "South Indian"],
        dietaryRestrictions: [],
        budgetRange: "moderate",
        preferredAreas: ["HSR Layout", "Sarjapur Road", "Koramangala"],
        preferredGroupSize: 4,
        preferredDays: ["saturday", "sunday"],
        preferredTimeSlots: ["lunch", "dinner"],
      },
      semanticProfile: {
        professionalDomain: "Systems Engineering",
        skills: ["low-latency systems", "Go", "infrastructure"],
        interests: ["marathon training", "home cooking", "personal finance"],
        conversationTopics: ["trading infrastructure", "running routes", "index investing"],
        personalityTraits: ["disciplined", "methodical"],
      },
    },
    {
      name: "Meera Iyer",
      bio: "Data scientist at Swiggy. Previously at Amazon. Passionate about sustainability and theater.",
      professionalTitle: "Lead Data Scientist",
      company: "Swiggy",
      interests: ["data science", "sustainability", "theater", "filter coffee", "classical music"],
      city: "Bangalore",
      diningPreferences: {
        cuisines: ["South Indian", "Mediterranean", "Thai"],
        dietaryRestrictions: ["vegetarian"],
        budgetRange: "moderate",
        preferredAreas: ["Basavanagudi", "Jayanagar", "Malleshwaram"],
        preferredGroupSize: 4,
        preferredDays: ["friday"],
        preferredTimeSlots: ["dinner"],
      },
      semanticProfile: {
        professionalDomain: "Data Science",
        skills: ["ML pipelines", "experimentation", "Python"],
        interests: ["sustainability", "Kannada theater", "filter coffee"],
        conversationTopics: ["recommendation systems", "urban sustainability", "Bangalore culture"],
        personalityTraits: ["thoughtful", "community-minded"],
      },
    },
    {
      name: "Kabir Shah",
      bio: "Founder of a climate-tech startup. Ex-Goldman Sachs. Thinks about carbon markets and renewable energy.",
      professionalTitle: "Founder & CEO",
      company: "GreenLedger",
      interests: ["climate tech", "renewable energy", "hiking", "wine", "economics"],
      city: "Bangalore",
      diningPreferences: {
        cuisines: ["Continental", "Modern Indian", "Italian"],
        dietaryRestrictions: [],
        budgetRange: "luxury",
        preferredAreas: ["MG Road", "Residency Road", "Indiranagar"],
        preferredGroupSize: 6,
        preferredDays: ["thursday", "friday"],
        preferredTimeSlots: ["dinner"],
      },
      semanticProfile: {
        professionalDomain: "Climate Tech / Entrepreneurship",
        skills: ["fundraising", "carbon markets", "financial strategy"],
        interests: ["renewable energy policy", "wine tasting", "Coorg weekends"],
        conversationTopics: ["carbon credit markets", "founder life", "ESG investing"],
        personalityTraits: ["visionary", "driven"],
      },
    },
  ];
}
