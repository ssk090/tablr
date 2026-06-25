import { createOpenAI } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@tablr/database";
import { generateText, Output } from "ai";
import { z } from "zod";

const SuggestionMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  text: z.string().max(2_000),
});

const SuggestionsRequestSchema = z.object({
  messages: z.array(SuggestionMessageSchema).max(12),
});

const SuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string().min(3).max(80)).length(4),
});

const FALLBACK_SUGGESTIONS = [
  "did you find any match ?",
  "anyone looking for dinner ?",
  "where is my dinner ?",
  "cancel my request",
] as const;

export async function POST(req: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = SuggestionsRequestSchema.parse(await req.json());
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    const conversation = body.messages
      .map((message) => `${message.role}: ${message.text}`)
      .join("\n");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ suggestions: FALLBACK_SUGGESTIONS });

    const openai = createOpenAI({ apiKey });
    const { output } = await generateText({
      model: openai("gpt-4o-mini"),
      output: Output.object({ schema: SuggestionsOutputSchema }),
      system: `You generate quick-reply chips for Tablr, a Bangalore social dining concierge.
Return exactly 4 short user messages the user may want to send next.
Make suggestions contextual to the latest assistant reply and conversation state.
Prefer actionable dining companion intents: find matches, clarify area/date/time, accept/cancel requests, check status.
Use casual lowercase phrasing. Do not include numbering, quotes, emojis, or punctuation-heavy text.`, 
      prompt: `User context:
- Name: ${profile?.name || "Guest"}
- City: ${profile?.city || "Bangalore"}

Recent conversation:
${conversation || "No conversation yet."}`,
    });

    return Response.json(output);
  } catch (error) {
    console.error("Suggestions API error:", error);
    return Response.json({ suggestions: FALLBACK_SUGGESTIONS });
  }
}
