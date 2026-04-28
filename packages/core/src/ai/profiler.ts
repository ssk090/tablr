import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { getConfig } from '../config';
import type { Profile } from '../types';

/**
 * Extract a semantic profile from raw text using Groq (Llama 3.3 70B).
 */
export async function extractSemanticProfile(
  rawInput: string,
): Promise<Profile["semanticProfile"]> {
  const config = getConfig();

  const { text } = await generateText({
    model: groq(config.GROQ_MODEL),
    prompt: `Analyze this person's profile and extract structured information.
Return ONLY a valid JSON object (no markdown, no backticks) with these fields:
{
  "professionalDomain": "their primary professional domain",
  "skills": ["list of 3-5 key professional skills"],
  "interests": ["3-5 personal interests"],
  "conversationTopics": ["3-5 topics they'd enjoy discussing at dinner"],
  "personalityTraits": ["2-3 personality traits inferred from their profile"]
}

Profile:
${rawInput}`,
  });

  const jsonStr = text
    .trim()
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  try {
    return JSON.parse(jsonStr) as Profile["semanticProfile"];
  } catch {
    return {
      professionalDomain: "Unknown",
      skills: [],
      interests: [],
      conversationTopics: [],
      personalityTraits: [],
    };
  }
}

/**
 * Build raw text input from profile fields for semantic profiling.
 */
export function buildRawProfileInput(data: {
  name: string;
  bio?: string;
  professionalTitle?: string;
  company?: string;
  interests?: string[];
  linkedinUrl?: string;
}): string {
  const parts: string[] = [];

  if (data.name) parts.push(`Name: ${data.name}`);
  if (data.professionalTitle) {
    parts.push(`Title: ${data.professionalTitle}${data.company ? ` at ${data.company}` : ""}`);
  }
  if (data.bio) parts.push(`Bio: ${data.bio}`);
  if (data.interests?.length) parts.push(`Interests: ${data.interests.join(", ")}`);
  if (data.linkedinUrl) parts.push(`LinkedIn: ${data.linkedinUrl}`);

  return parts.join("\n");
}
