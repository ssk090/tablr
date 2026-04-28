import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { TablrDatabase } from '../db/database';

export function registerResources(server: McpServer, db: TablrDatabase): void {
  server.resource(
    "pool-stats",
    "tablr://pool/stats",
    { description: "Active user pool statistics — total users, popular interests, top areas" },
    async () => {
      const profiles = db.getActiveProfiles();
      const interestCounts = new Map<string, number>();
      const areaCounts = new Map<string, number>();
      const cuisineCounts = new Map<string, number>();

      for (const p of profiles) {
        for (const i of p.interests) {
          interestCounts.set(i, (interestCounts.get(i) ?? 0) + 1);
        }
        for (const a of p.diningPreferences.preferredAreas) {
          areaCounts.set(a, (areaCounts.get(a) ?? 0) + 1);
        }
        for (const c of p.diningPreferences.cuisines) {
          cuisineCounts.set(c, (cuisineCounts.get(c) ?? 0) + 1);
        }
      }

      const topN = (map: Map<string, number>, n: number) =>
        [...map.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, n)
          .map(([k, v]) => ({ name: k, count: v }));

      return {
        contents: [
          {
            uri: "tablr://pool/stats",
            mimeType: "application/json",
            text: JSON.stringify(
              {
                totalActiveUsers: profiles.length,
                topInterests: topN(interestCounts, 5),
                topAreas: topN(areaCounts, 5),
                topCuisines: topN(cuisineCounts, 5),
                restaurantsInDB: db.getRestaurantCount(),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.resource(
    "bangalore-areas",
    "tablr://areas",
    { description: "Supported Bangalore neighborhoods with coordinates for Swiggy Dineout search" },
    async () => ({
      contents: [
        {
          uri: "tablr://areas",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              areas: [
                { name: "Koramangala", lat: 12.9352, lng: 77.6245 },
                { name: "Indiranagar", lat: 12.9784, lng: 77.6408 },
                { name: "HSR Layout", lat: 12.9116, lng: 77.6389 },
                { name: "Whitefield", lat: 12.9698, lng: 77.7499 },
                { name: "JP Nagar", lat: 12.9107, lng: 77.5852 },
                { name: "Malleshwaram", lat: 13.0035, lng: 77.5687 },
                { name: "Basavanagudi", lat: 12.9436, lng: 77.5712 },
                { name: "Sarjapur Road", lat: 12.9087, lng: 77.6791 },
                { name: "Residency Road", lat: 12.9722, lng: 77.6085 },
                { name: "MG Road", lat: 12.9758, lng: 77.6045 },
                { name: "Jayanagar", lat: 12.925, lng: 77.5938 },
                { name: "Electronic City", lat: 12.8399, lng: 77.677 },
              ],
              tip: "Use these coordinates with Swiggy Dineout search_restaurants_dineout(latitude, longitude, query)",
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.resource(
    "swiggy-dineout-guide",
    "tablr://guide/swiggy-dineout",
    { description: "How to use Tablr with Swiggy Dineout MCP for live restaurant booking" },
    async () => ({
      contents: [
        {
          uri: "tablr://guide/swiggy-dineout",
          mimeType: "text/markdown",
          text: [
            "# Using Tablr with Swiggy Dineout MCP",
            "",
            "## Recommended Flow",
            "1. **Register profiles** → `register_profile` (Tablr)",
            "2. **Form a dining group** → `form_dining_group` (Tablr)",
            "3. **Find a restaurant** → `search_restaurants_dineout` (Swiggy Dineout)",
            "4. **Check availability** → `get_available_slots` (Swiggy Dineout)",
            "5. **Book the table** → `book_table` (Swiggy Dineout)",
            "6. **Track the event** → `create_dining_event` (Tablr)",
            "7. **Feedback** → `submit_feedback` (Tablr)",
            "",
            "## Swiggy Dineout: POST mcp.swiggy.com/dineout",
            "Auth: OAuth 2.1 with PKCE (phone + OTP)",
          ].join("\n"),
        },
      ],
    }),
  );
}
