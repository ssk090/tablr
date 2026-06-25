import { createOpenAI } from "@ai-sdk/openai";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@tablr/database";
import { streamText, convertToModelMessages, tool, zodSchema, stepCountIs } from "ai";
import { z } from "zod";
import { triggerMatching } from "../../actions/matching";
export const maxDuration = 30;

interface ProfilePreferences {
  readonly cuisines?: readonly string[];
  readonly preferredAreas?: readonly string[];
}

function parseProfilePreferences(value: unknown): ProfilePreferences {
  if (typeof value === "string") {
    try {
      return parseProfilePreferences(JSON.parse(value));
    } catch {
      return {};
    }
  }

  if (!value || typeof value !== "object") return {};
  const preferences = value as { cuisines?: unknown; preferredAreas?: unknown };
  return {
    cuisines: Array.isArray(preferences.cuisines) ? preferences.cuisines.filter((item): item is string => typeof item === "string") : [],
    preferredAreas: Array.isArray(preferences.preferredAreas) ? preferences.preferredAreas.filter((item): item is string => typeof item === "string") : [],
  };
}

function parseStringList(value: unknown): string[] {
  if (typeof value === "string") {
    try {
      return parseStringList(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function todayInIndia(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

function normalizeRelativeDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  const base = todayInIndia();
  const offset = normalized.includes("tomorrow") ? 1 : normalized.includes("tonight") || normalized === "today" ? 0 : undefined;
  if (offset === undefined) return value;
  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().slice(0, 10);
}

function normalizeTimeSlot(value: string | undefined): "LUNCH" | "DINNER" | undefined {
  if (!value) return undefined;
  return value.trim().toUpperCase() === "LUNCH" ? "LUNCH" : "DINNER";
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const json = await req.json();
    const { messages, id: chatId } = json;
    
    // Fetch user profile for context
    let profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      const user = await currentUser();
      const email = user?.emailAddresses[0]?.emailAddress;
      const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Tablr Guest";
      profile = await prisma.profile.upsert({
        where: { id: userId },
        update: { name, email },
        create: { id: userId, name, email, bio: "", diningPreferences: {} },
      });
    }

    console.log(`[Chat API] Received request for chat: ${chatId}, user: ${profile?.name}`);

    const modelMessages = await convertToModelMessages(messages);
    console.log("[Chat API] Model messages:", JSON.stringify(modelMessages, null, 2));
    
    const restaurantTool = tool({
      description: "Find restaurant spots in Bangalore by area/cuisine/vibe. Read-only; does not create dining intents.",
      inputSchema: zodSchema(z.object({
        area: z.string().optional().describe("Neighborhood or area"),
        query: z.string().optional().describe("Cuisine, restaurant name, or vibe such as romantic"),
      })),
      execute: async ({ area, query }: { area?: string; query?: string }) => {
        console.log(">>>> [Tool: findRestaurants] Called with params:", { area, query });
        try {
          const restaurants = await prisma.restaurant.findMany({ orderBy: { rating: "desc" }, take: 50 });
          const normalizedArea = area?.trim().toLowerCase();
          const normalizedQuery = query?.trim().toLowerCase();
          const filtered = restaurants.filter((restaurant) => {
            const areaMatches = normalizedArea ? restaurant.area.toLowerCase().includes(normalizedArea) : true;
            const searchable = [
              restaurant.name,
              restaurant.area,
              JSON.stringify(restaurant.cuisine),
              JSON.stringify(restaurant.ambiance),
              JSON.stringify(restaurant.highlights),
            ].join(" ").toLowerCase();
            const queryMatches = normalizedQuery ? searchable.includes(normalizedQuery) || normalizedQuery === "romantic" : true;
            return areaMatches && queryMatches;
          }).slice(0, 5);

          return {
            status: "success",
            count: filtered.length,
            message: filtered.length === 0
              ? `I couldn't find restaurant spots${area ? ` in ${area}` : ""}${query ? ` for ${query}` : ""}.`
              : `I found ${filtered.length} spot${filtered.length === 1 ? "" : "s"}${area ? ` in ${area}` : ""}.`,
            restaurants: filtered.map((restaurant) => ({
              id: restaurant.id,
              name: restaurant.name,
              area: restaurant.area,
              cuisine: restaurant.cuisine,
              rating: restaurant.rating,
              costForTwo: restaurant.costForTwo,
              ambiance: restaurant.ambiance,
              highlights: restaurant.highlights,
            })),
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(">>>> [Tool: findRestaurants] Failed:", error);
          return { status: "error", message: `Could not search restaurants: ${message}`, restaurants: [] };
        }
      },
    });

    const checkDinersTool = tool({
      description: "Read-only check for other open dinner intents. Use this when the user asks if anyone is looking/interested/available. Do not record the current user's interest.",
      inputSchema: zodSchema(z.object({
        area: z.string().optional().describe("Neighborhood or area to filter by"),
        date: z.string().optional().describe("Date to filter by. Leave empty for any upcoming date."),
        timeSlot: z.string().optional().describe("LUNCH or DINNER"),
        preferredTime: z.string().optional().describe("Exact preferred time, e.g. 20:00")
      })),
      execute: async ({ area, date, timeSlot, preferredTime }: { area?: string; date?: string; timeSlot?: string; preferredTime?: string }) => {
        console.log(">>>> [Tool: checkAvailableDiners] Called with params:", { area, date, timeSlot, preferredTime });

        try {
        const normalizedDate = normalizeRelativeDate(date);
        const normalizedArea = area?.trim().toLowerCase();
        const normalizedPreferredTime = preferredTime?.trim();

        try {
          const openIntents = await prisma.dinnerIntent.findMany({
            where: {
              profileId: { not: userId },
              status: "OPEN",
              ...(normalizedDate ? { date: normalizedDate } : {}),
              ...(timeSlot ? { timeSlot: normalizeTimeSlot(timeSlot) } : {}),
            },
            include: {
              profile: {
                select: {
                  id: true,
                  name: true,
                  professionalTitle: true,
                  company: true,
                  bio: true,
                  interests: true,
                  diningPreferences: true,
                  linkedinUrl: true,
                  githubUrl: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 25,
          });

          const intents = openIntents.filter((intent) => {
            const areaMatches = normalizedArea ? intent.preferredArea?.toLowerCase().includes(normalizedArea) : true;
            const timeMatches = normalizedPreferredTime ? intent.preferredTime === normalizedPreferredTime || !intent.preferredTime : true;
            return areaMatches && timeMatches;
          });
          const visibleIntents = intents.slice(0, 10);

          if (intents.length > 0) {
            return {
              status: "success",
              resultType: "open_intents",
              matchCount: intents.length,
              message: `I found ${intents.length} open diner${intents.length === 1 ? "" : "s"}${area ? ` in ${area}` : ""}${date ? ` on ${date}` : ""}.`,
              cards: visibleIntents.map((intent) => {
                const preferences = parseProfilePreferences(intent.profile.diningPreferences);
                return {
                  profileId: intent.profile.id,
                  name: intent.profile.name,
                  professionalTitle: intent.profile.professionalTitle,
                  company: intent.profile.company,
                  bio: intent.profile.bio,
                  interests: parseStringList(intent.profile.interests),
                  preferredCuisines: preferences.cuisines ?? [],
                  preferredNeighborhoods: preferences.preferredAreas ?? [],
                  diningIntent: {
                    date: intent.date,
                    timeSlot: intent.timeSlot,
                    preferredTime: intent.preferredTime,
                    preferredArea: intent.preferredArea,
                    groupSize: intent.groupSize,
                  },
                  linkedinUrl: intent.profile.linkedinUrl,
                  githubUrl: intent.profile.githubUrl,
                  profilePath: `/dashboard/profiles/${intent.profile.id}`,
                };
              }),
            };
          }
        } catch (error) {
          console.warn(">>>> [Tool: checkAvailableDiners] Open intent lookup failed; falling back to profiles:", error);
        }

        const activeProfiles = await prisma.profile.findMany({
          where: {
            id: { not: userId },
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            professionalTitle: true,
            company: true,
            bio: true,
            interests: true,
            diningPreferences: true,
            linkedinUrl: true,
            githubUrl: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 25,
        });

        const availableProfiles = activeProfiles.filter((candidate) => {
          if (!normalizedArea) return true;
          const preferences = parseProfilePreferences(candidate.diningPreferences);
          return (preferences.preferredAreas ?? []).some((candidateArea) => candidateArea.toLowerCase().includes(normalizedArea));
        }).slice(0, 10);

        return {
          status: "success",
          resultType: "profiles",
          matchCount: availableProfiles.length,
          message: availableProfiles.length === 0
            ? `No one else has an active profile${area ? ` around ${area}` : ""} yet, and there are no open dinner requests right now.`
            : `No one has an open dinner request right now, but I found ${availableProfiles.length} Tablr profile${availableProfiles.length === 1 ? "" : "s"}${area ? ` around ${area}` : ""} you may want to invite.`,
          cards: availableProfiles.map((candidate) => {
            const preferences = parseProfilePreferences(candidate.diningPreferences);
            return {
              profileId: candidate.id,
              name: candidate.name,
              professionalTitle: candidate.professionalTitle,
              company: candidate.company,
              bio: candidate.bio,
              interests: parseStringList(candidate.interests),
              preferredCuisines: preferences.cuisines ?? [],
              preferredNeighborhoods: preferences.preferredAreas ?? [],
              diningIntent: {
                date: "no open request",
                timeSlot: "profile",
                preferredArea: (preferences.preferredAreas ?? []).join(", ") || "flexible area",
              },
              linkedinUrl: candidate.linkedinUrl,
              githubUrl: candidate.githubUrl,
              profilePath: `/dashboard/profiles/${candidate.id}`,
            };
          }),
        };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(">>>> [Tool: checkAvailableDiners] Failed:", error);
          return { status: "error", message: `Could not check available diners: ${message}`, matchCount: 0, cards: [] };
        }
      },
    });

    const matchStatusTool = tool({
      description: "Check the current user's recorded dinner intents, matched events, and the DETAILS of who they've been matched with. Use this to show the user who their dining partner is. Always present the matched person's name, profession, company, and interests.",
      inputSchema: zodSchema(z.object({
        area: z.string().optional().describe("Optional neighborhood filter"),
      })),
      execute: async ({ area }: { area?: string }) => {
        console.log(">>>> [Tool: checkMyMatchStatus] Called with params:", { area });
        try {
          const [intents, memberships] = await Promise.all([
            prisma.dinnerIntent.findMany({
              where: { profileId: userId, status: { in: ["OPEN", "MATCHED"] } },
              orderBy: { createdAt: "desc" },
              take: 25,
            }),
            prisma.eventMember.findMany({
              where: { profileId: userId, event: { status: { in: ["FORMING", "CONFIRMED"] } } },
              orderBy: { joinedAt: "desc" },
              include: {
                event: {
                  include: {
                    members: {
                      include: {
                        profile: { select: { id: true, name: true, professionalTitle: true, company: true } },
                      },
                    },
                  },
                },
              },
            }),
          ]);
          const normalizedArea = area?.trim().toLowerCase();
          const filteredIntents = normalizedArea
            ? intents.filter((intent) => intent.preferredArea?.toLowerCase().includes(normalizedArea))
            : intents;
          const events = memberships
            .map((membership) => membership.event)
            .filter((event) => normalizedArea ? event.members.some((member) => member.profileId === userId) : true);

          return {
            status: "success",
            activeIntentCount: filteredIntents.length,
            matchedEventCount: events.length,
            message: events.length > 0
              ? `You have ${events.length} matched dinner event${events.length === 1 ? "" : "s"}.`
              : filteredIntents.length > 0
                ? "Your dinner interest is active, but no match has been formed yet."
                : "You do not have an active dinner interest right now.",
            intents: filteredIntents.map((intent) => ({
              id: intent.id,
              date: intent.date,
              timeSlot: intent.timeSlot,
              preferredArea: intent.preferredArea,
              preferredTime: intent.preferredTime,
              status: intent.status,
            })),
            events: events.map((event) => ({
              id: event.id,
              restaurantName: event.restaurantName,
              scheduledDate: event.scheduledDate,
              scheduledTime: event.scheduledTime,
              status: event.status,
              members: event.members.map((member) => ({
                profileId: member.profileId,
                name: member.profile.name,
                status: member.status,
                professionalTitle: member.profile.professionalTitle,
                company: member.profile.company,
              })),
            })),
            // Also return matched partner details in a flat format for easier AI extraction
            matchedPartner: events.length > 0
              ? (() => {
                  const firstEvent = events[0];
                  const otherMembers = firstEvent.members
                    .filter((m) => m.profileId !== userId)
                    .map((m) => ({
                      name: m.profile.name,
                      professionalTitle: m.profile.professionalTitle,
                      company: m.profile.company,
                      status: m.status,
                    }));
                  return otherMembers.length > 0 ? otherMembers[0] : null;
                })()
              : null,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(">>>> [Tool: checkMyMatchStatus] Failed:", error);
          return { status: "error", message: `Could not check your match status: ${message}` };
        }
      },
    });

    const diningTool = tool({
      description: "Record a user's intent to dine out. Use only when the user explicitly wants to join/create a dinner request, not when they are only checking availability.",
      inputSchema: zodSchema(z.object({
        area: z.string().describe("The neighborhood or area"),
        date: z.string().describe("The date of the dinner, preferably YYYY-MM-DD"),
        timeSlot: z.string().describe("LUNCH or DINNER"),
        preferredTime: z.string().optional().describe("Exact preferred time in HH:mm, e.g. 20:00")
      })),
      execute: async ({ area, date, timeSlot, preferredTime }: { area: string; date: string; timeSlot: string; preferredTime?: string }) => {
        console.log(">>>> [Tool: recordDiningIntent] Called with params:", { area, date, timeSlot, preferredTime });
        
        try {
          const normalizedDate = normalizeRelativeDate(date) ?? date;
          const normalizedTimeSlot = normalizeTimeSlot(timeSlot) ?? "DINNER";
          const restaurant = await prisma.restaurant.findFirst({
            where: { name: { contains: area, mode: "insensitive" } },
            select: { area: true, name: true },
          });
          const resolvedArea = restaurant?.area ?? area;
          const existingIntent = await prisma.dinnerIntent.findFirst({
            where: { profileId: userId, status: "OPEN", date: normalizedDate, timeSlot: normalizedTimeSlot },
            orderBy: { createdAt: "desc" },
          });
          const intent = existingIntent
            ? await prisma.dinnerIntent.update({
                where: { id: existingIntent.id },
                data: { preferredArea: resolvedArea || existingIntent.preferredArea || "Anywhere", preferredTime },
              })
            : await prisma.dinnerIntent.create({
                data: {
                  profileId: userId,
                  date: normalizedDate,
                  timeSlot: normalizedTimeSlot,
                  preferredArea: resolvedArea || "Anywhere",
                  preferredTime,
                  status: "OPEN",
                },
              });
          console.log(">>>> [Tool: recordDiningIntent] Successfully upserted intent:", intent.id);

          // Check if there are other open intents for the same slot to show to user immediately
          const otherOpenIntents = await prisma.dinnerIntent.findMany({
            where: {
              profileId: { not: userId },
              status: "OPEN",
              date: normalizedDate,
              timeSlot: normalizedTimeSlot,
            },
            include: {
              profile: {
                select: {
                  id: true,
                  name: true,
                  professionalTitle: true,
                  company: true,
                  bio: true,
                  interests: true,
                  diningPreferences: true,
                  linkedinUrl: true,
                  githubUrl: true,
                },
              },
            },
            take: 10,
          });

          const otherDiners = otherOpenIntents.map((oi) => {
            const prefs = parseProfilePreferences(oi.profile.diningPreferences);
            return {
              profileId: oi.profile.id,
              name: oi.profile.name,
              professionalTitle: oi.profile.professionalTitle,
              company: oi.profile.company,
              bio: oi.profile.bio,
              interests: parseStringList(oi.profile.interests),
              preferredCuisines: prefs.cuisines ?? [],
              preferredNeighborhoods: prefs.preferredAreas ?? [],
              preferredArea: oi.preferredArea,
              preferredTime: oi.preferredTime,
            };
          });

          // Trigger matching logic in the background
          triggerMatching(intent.id).catch(err => 
            console.error("[Chat API] Background matching failed:", err)
          );

          return {
            status: "success",
            message: `${existingIntent ? "Updated" : "Recorded"} your interest for ${normalizedDate} ${preferredTime ? `at ${preferredTime} ` : ""}${normalizedTimeSlot} in ${resolvedArea}${restaurant ? ` (${restaurant.name})` : ""}. Searching for partners now.`,
            intentId: intent.id,
            otherDinerCount: otherDiners.length,
            otherDiners: otherDiners.length > 0 ? otherDiners : undefined,
          };
        } catch (err) {
          console.error(">>>> [Tool: recordDiningIntent] Database error:", err);
          const message = err instanceof Error ? err.message : String(err);
          return { status: "error", message: `Could not record dining intent: ${message}` };
        }
      },
    });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const openai = createOpenAI({ apiKey });
    const result = streamText({
      model: openai("gpt-4o"),
      messages: modelMessages,
      system: `You are the Tablr Concierge, a sophisticated AI for a high-end social dining platform in Bangalore.
      
      TODAY'S DATE: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      
      USER CONTEXT:
      - Name: ${profile?.name || "Guest"}
      - Profession: ${profile?.professionalTitle || "Professional"}
      - Bio: ${profile?.bio || "No bio provided"}
      - City: ${profile?.city || "Bangalore"}
      
      CORE PRINCIPLES:
      - BREVITY IS LUXURY. Keep responses extremely short, clear, and to the point.
      - NO EXPLANATIONS. Do not explain your reasoning or the tools you use.
      - ALREADY INFORMED. You already know the user's name and professional details. Do not ask for them.
      - ACTION-ORIENTED. Help with restaurant discovery, availability checks, and recording dining interests.
      
      PRESENTING PEOPLE — UI RENDERS CARDS:
      - The chat UI automatically renders people as interactive cards with profile links and "Send Invite" buttons.
      - You do NOT need to format person details with bold/italic or line breaks.
      - Just write a short conversational intro line when the tool finds someone.
      
      Examples of good intro lines:
      - "I found 1 person looking for dinner in Indiranagar!"
      - "Great news — there's someone available who matches your preferences!"
      - "I found 2 people looking for dinner. Check them out below:"
      - End with a short call-to-action: "Would you like to join them?" or "Send an invite to connect!"
      - The person cards will appear below your text. You don't need to repeat their details.
      
      DO NOT manually output **Name** — Title or *Interests:* lists — the UI handles that.
      
      GUARDRAILS:
      - ONLY discuss social dining, restaurants, and professional networking. 
      - REJECT all non-dining related queries politely but firmly.
      
      READ VS WRITE:
      - If the user asks for a restaurant/spot/place (e.g. "romantic spot in Indiranagar"), call 'findRestaurants'. Do not record their interest.
      - If the user asks "is anyone looking/interested/available?", "anyone looking for dinner?", "show people searching", "find dining matches", or similar, this is READ-ONLY. Call 'checkAvailableDiners'. It first checks open dinner requests, then falls back to active Tablr profiles. Do not record their interest.
      - If the user asks "check if any matches found", "any update on my match", "where is my dinner", or asks about their already-recorded request, call 'checkMyMatchStatus'.
      - If the user says "I want to join", "record me", "I'm looking for dinner", "find me a match", or confirms they want to participate, this is WRITE. Then collect area, date, and timeSlot and call 'recordDiningIntent'.
      - If the user asks to change an exact clock time like 7pm to 8pm, call 'recordDiningIntent' with the same date/area context and preferredTime set to the new HH:mm time.

      AVAILABILITY CHECK EXTRACTION:
      For checkAvailableDiners, use whatever filters the user gave. Date is optional. Area is optional.
      Do not ask for missing area/date/time when the user is only checking. Call checkAvailableDiners immediately with empty filters if needed.
      If they say "anytime", omit date.

      DINING INTENT EXTRACTION:
      When a user explicitly wants to record their own dining availability, you MUST extract:
      - area: The neighborhood (e.g., HSR, Indiranagar, Koramangala).
      - date: The date (e.g., "2024-04-28" or "this Saturday").
      - timeSlot: MUST be either "LUNCH" or "DINNER". If the user mentions a specific time like "8pm", use "DINNER".
      - preferredTime: exact time in HH:mm when mentioned (e.g. 7pm -> 19:00, 8pm -> 20:00).

      Once you have these for an explicit write request, call 'recordDiningIntent' immediately.
      
      RESPONSE TRUTHFULNESS:
      - Never say there is a technical issue unless a tool result has status "error".
      - Never say you updated or recorded something unless the corresponding tool returned status "success".
      - If checkAvailableDiners returns 0, say no one else is currently looking. Do not call it a technical problem.

      AFTER RECORDING DINING INTENT:
      - The recordDiningIntent tool returns otherDiners if anyone else is available for the same date/timeSlot. If otherDiners is non-empty, ALWAYS present those person's details (name, profession, company, interests, cuisines) to the user immediately in the same response.
      - The match may happen in the background a moment later. If the user then asks "who matched?" or "show me the person", call checkMyMatchStatus to find the matched person's details.
      - When checkMyMatchStatus returns events with members, ALWAYS present the matched person's full details (name, profession, company, interests).
      
      MANDATORY RESPONSE:
      - YOU MUST ALWAYS PROVIDE A TEXT RESPONSE IN EVERY SINGLE TURN.
      - NEVER SEND AN EMPTY RESPONSE.
      - If you are calling a tool, you MUST provide an introductory text like "Looking for available diners..." or "Recording your interest for [area] on [date]..."
      - Once the tool call is complete, you MUST provide a final confirmation text summarizing the result.
      - If you have all the information, do not just call the tool; talk to the user as you do it.
      - YOUR PRIMARY GOAL IS TO BE CONVERSATIONAL. A tool call without text is a failure.`,
      stopWhen: stepCountIs(10),
      tools: {
        findRestaurants: restaurantTool,
        checkAvailableDiners: checkDinersTool,
        checkMyMatchStatus: matchStatusTool,
        recordDiningIntent: diningTool,
      },
      onStepFinish: (step) => {
        console.log(`[Chat API] Step finished. Reason: ${step.finishReason}, Tool calls: ${step.toolCalls.length}`);
      },
      onFinish: async (event) => {
        const { text, toolCalls, toolResults } = event;
        console.log(`[Chat API] Stream finished. Text length: ${text?.length}, Tool calls: ${toolCalls?.length}`);
        
        if (chatId) {
          try {
            // Save the user's last message
            const lastUserMessage = messages[messages.length - 1];
            if (lastUserMessage && lastUserMessage.role === "user") {
              const content = typeof lastUserMessage.content === "string" 
                ? lastUserMessage.content 
                : "";
              const userText = content || 
                (lastUserMessage.parts?.filter((p: { type: string; text?: string }) => p.type === "text").map((p: { text?: string }) => p.text).join("") ?? "");

              await prisma.message.create({
                data: {
                  chatId,
                  role: "user",
                  content: userText,
                  profileId: userId,
                },
              });
            }

            // Save the assistant's response
            // Fallback to a status message if text is empty but we have tool results
            const assistantContent = text || (toolResults.length > 0 ? "Ritual complete. I've recorded your dining interest." : "I'm ready to help with your dining plans.");
            
            await prisma.message.create({
              data: {
                chatId,
                role: "assistant",
                content: assistantContent,
                profileId: userId,
              },
            });
            console.log(`[Chat API] Saved messages for chat: ${chatId}`);
          } catch (error) {
            console.error("[Chat API] Error saving messages:", error);
          }
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
