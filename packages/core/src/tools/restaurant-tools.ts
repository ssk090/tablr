import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from "zod";
import type { TablrDatabase } from '../db/database';
import { searchLocalRestaurants, suggestRestaurantsForGroup } from '../restaurants/discovery';
import { createMCPClient, createMcpTransport } from "@ai-sdk/mcp";
import { prisma as sharedPrisma } from "@tablr/database";

// Default Bangalore center (Koramangala)
const DEFAULT_LAT = 12.9352;
const DEFAULT_LNG = 77.6245;

export function registerRestaurantTools(server: McpServer, db: TablrDatabase): void {
  server.tool(
    "search_restaurants",
    "Search restaurants. If SWIGGY_TOKEN is available, fetches live data from Swiggy Food. Otherwise fallbacks to local database.",
    {
      query: z.string().optional().describe("Search query (e.g. 'Biryani', 'Pizza')"),
      cuisine: z.string().optional().describe("Cuisine type"),
      area: z.string().optional().describe("Area in Bangalore"),
      addressId: z.string().optional().describe("Swiggy address ID (optional fallback used if missing)"),
    },
    async (args) => {
      const swiggyToken = process.env.SWIGGY_TOKEN;
      const swiggyUrl = process.env.SWIGGY_FOOD_URL || "https://mcp.swiggy.com/food";

      if (swiggyToken) {
        try {
          const transport = createMcpTransport({
            type: "http",
            url: swiggyUrl,
            headers: { Authorization: `Bearer ${swiggyToken}` },
          });
          const client = await createMCPClient({ transport });
          
          console.log(`[Swiggy] Searching for: ${args.query || args.cuisine || args.area}`);
          
          // 1. Get address or use default
          let addressId = args.addressId;
          if (!addressId) {
            try {
              const addresses = await (client as any).callTool("get_addresses", {});
              addressId = (addresses as any).content?.[0]?.addressId;
            } catch (e) {
              console.log("[Swiggy] No addresses found, using fallback search parameters.");
            }
          }

          // 2. Search Swiggy
          const searchResult = await (client as any).callTool("search_restaurants", {
            addressId: addressId || "default", // Some MCPs might handle 'default' or similar
            query: args.query || args.cuisine || args.area || "restaurants",
          });

          const content = (searchResult as any).content?.[0]?.text;
          if (content) {
            const data = JSON.parse(content);
            const swiggyRestaurants = data.restaurants || [];
            
            // 3. Upsert into local DB AND Shared Postgres DB
            for (const r of swiggyRestaurants) {
              const restaurantData = {
                id: r.restaurantId || r.id,
                name: r.name,
                cuisine: Array.isArray(r.cuisines) ? r.cuisines : [r.cuisine || "Multi-cuisine"],
                area: r.areaName || r.area || args.area || "Bangalore",
                address: r.address || "Bangalore",
                rating: Number(r.avgRating || r.rating || 4.0),
                costForTwo: Number((r.costForTwo || "₹400").replace(/[^\d]/g, "")) || 400,
                groupFriendly: true,
                maxGroupSize: 8,
                highlights: r.highlights || [],
                lat: r.lat || DEFAULT_LAT,
                lng: r.lng || DEFAULT_LNG,
              };

              // Local SQLite
              db.upsertRestaurant(restaurantData);

              // Shared Postgres (Prisma)
              try {
                await sharedPrisma.restaurant.upsert({
                  where: { id: restaurantData.id },
                  update: {
                    ...restaurantData,
                    cuisine: restaurantData.cuisine as any,
                    highlights: restaurantData.highlights as any,
                    ambiance: [] as any,
                  },
                  create: {
                    ...restaurantData,
                    cuisine: restaurantData.cuisine as any,
                    highlights: restaurantData.highlights as any,
                    ambiance: [] as any,
                  },
                });
              } catch (prismaError) {
                console.error("[Swiggy] Failed to upsert to Postgres:", prismaError);
              }
            }

            await client.close();
            return {
              content: [{ type: "text", text: content }],
            };
          }
          await client.close();
        } catch (error) {
          console.error("[Swiggy] Error calling Swiggy Food MCP:", error);
        }
      }

      // Fallback to local search
      const localResults = searchLocalRestaurants(db, {
        cuisine: args.cuisine,
        area: args.area,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              source: "local_database",
              restaurants: localResults,
              tip: "Connect Swiggy for live data."
            }, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "get_restaurant_details",
    "Get details about a restaurant from local data.",
    { restaurantId: z.string().describe("Restaurant ID") },
    async ({ restaurantId }) => {
      const r = db.getRestaurant(restaurantId);
      if (!r) {
        return {
          content: [{ type: "text" as const, text: `Restaurant ${restaurantId} not found.` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ ...r, costForTwo: `₹${r.costForTwo}` }, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "suggest_restaurants_for_group",
    "AI-powered restaurant suggestions based on a group's collective preferences.",
    { profileIds: z.array(z.string()).min(2).describe("Profile IDs in the group") },
    async ({ profileIds }) => {
      try {
        const suggestions = suggestRestaurantsForGroup(db, profileIds);
        if (suggestions.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No matches found. Try manual search." }],
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  groupSize: profileIds.length,
                  suggestions: suggestions.map((r) => ({
                    id: r.id,
                    name: r.name,
                    cuisine: r.cuisine,
                    area: r.area,
                    rating: r.rating,
                    costForTwo: `₹${r.costForTwo}`,
                    highlights: r.highlights,
                  })),
                  nextStep:
                    "Use 'create_dining_event' or connect Swiggy Dineout MCP for live booking.",
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
