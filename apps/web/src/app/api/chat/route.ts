import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@tablr/database";
import { streamText, convertToModelMessages, tool, zodSchema, stepCountIs } from "ai";
import { z } from "zod";
import { triggerMatching } from "../../actions/matching";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const json = await req.json();
    const { messages, id: chatId } = json;
    
    // Fetch user profile for context
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    console.log(`[Chat API] Received request for chat: ${chatId}, user: ${profile?.name}`);

    const modelMessages = await convertToModelMessages(messages);
    console.log("[Chat API] Model messages:", JSON.stringify(modelMessages, null, 2));
    
    const diningTool = tool({
      description: "Record a user's intent to dine out.",
      inputSchema: zodSchema(z.object({
        area: z.string().describe("The neighborhood or area"),
        date: z.string().describe("The date of the dinner"),
        timeSlot: z.string().describe("LUNCH or DINNER")
      })),
      execute: async ({ area, date, timeSlot }: { area: string; date: string; timeSlot: string }) => {
        console.log(">>>> [Tool: recordDiningIntent] Called with params:", { area, date, timeSlot });
        
        try {
          const intent = await prisma.dinnerIntent.create({
            data: {
              profileId: userId,
              date,
              timeSlot: timeSlot.toUpperCase() as "LUNCH" | "DINNER",
              preferredArea: area || "Anywhere",
              status: "OPEN",
            },
          });
          console.log(">>>> [Tool: recordDiningIntent] Successfully recorded intent:", intent.id);
          
          // Trigger matching logic in the background
          triggerMatching(intent.id).catch(err => 
            console.error("[Chat API] Background matching failed:", err)
          );
          
          return {
            status: "success",
            message: `Recorded your interest for ${date} ${timeSlot} in ${area}. Searching for partners now.`,
            intentId: intent.id
          };
        } catch (err) {
          console.error(">>>> [Tool: recordDiningIntent] Database error:", err);
          return { status: "error", message: "Database failure" };
        }
      },
    });

    const result = streamText({
      model: openai("gpt-4o"), // Upgrade to gpt-4o for better multi-step reasoning
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
      - ACTION-ORIENTED. Focus solely on helping find dining partners based on area, date, and time.
      
      GUARDRAILS:
      - ONLY discuss social dining, restaurants, and professional networking. 
      - REJECT all non-dining related queries politely but firmly.
      
      DINING INTENT EXTRACTION:
      When a user wants to dine out, you MUST extract:
      - area: The neighborhood (e.g., HSR, Indiranagar, Koramangala).
      - date: The date (e.g., "2024-04-28" or "this Saturday").
      - timeSlot: MUST be either "LUNCH" or "DINNER". If the user mentions a specific time like "8pm", use "DINNER".

      Once you have these, call 'recordDiningIntent' immediately.
      
      MANDATORY RESPONSE:
      - YOU MUST ALWAYS PROVIDE A TEXT RESPONSE IN EVERY SINGLE TURN.
      - NEVER SEND AN EMPTY RESPONSE.
      - If you are calling a tool, you MUST provide an introductory text like "Recording your interest for [area] on [date]..." 
      - Once the tool call is complete, you MUST provide a final confirmation text summarizing the result.
      - If you have all the information, do not just call the tool; talk to the user as you do it.
      - YOUR PRIMARY GOAL IS TO BE CONVERSATIONAL. A tool call without text is a failure.`,
      stopWhen: stepCountIs(10),
      tools: {
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
