# Tablr — Project Conventions

## Overview
Tablr is an MCP server (TypeScript, Node.js) that acts as an AI-native social dining agent for Bangalore.

## Product Purpose

Tablr is a social dining concierge for Bangalore. Users sign up, create a profile, and share preference and identity details such as:

- Name
- Profession
- Company
- About/bio
- Personal interests and likes
- Preferred cuisines
- Preferred Bangalore neighborhoods

The concierge finds like-minded people around the user based on overlapping tastes, interests, cuisines, and neighborhood preferences. For example, if one user wants Japanese food near Indiranagar and another compatible user wants Japanese food around HSR, the system should surface compatible people and allow an invite to be sent.

The core flow is:

1. A user searches for dining companions by cuisine, neighborhood, and preferences.
2. The agent lists compatible people with similar tastes or interests.
3. The user can send an invite to a selected person.
4. The invite is delivered by email.
5. Both users must accept the invite.
6. Both users must confirm they want to proceed with a table booking.
7. Only after mutual acceptance and booking confirmation, the Swiggy Dineout MCP agent is triggered.

The Swiggy Dineout MCP agent acts as the booking orchestrator. It should find suitable restaurants, coordinate booking confirmation when needed, and book the table only after both matched users have accepted and confirmed.

The goal is people-first social dining: discover compatible dining companions first, coordinate mutual interest, then complete the restaurant reservation through the Swiggy Dineout agent.

## Tech Stack
- **Runtime**: Node.js 20+, ESM modules
- **Language**: TypeScript 5.7+ with strict mode
- **MCP SDK**: `@modelcontextprotocol/sdk` v1.x (stable)
- **AI**: OpenAI SDK (GPT-4o for profiling, text-embedding-3-small for vectors)
- **Vector DB**: Qdrant (cosine similarity search)
- **Database**: SQLite via better-sqlite3 (profiles, events, restaurants)
- **Validation**: Zod schemas

## Coding Standards
- Use explicit return types on all exported functions
- Use `import type` for type-only imports
- Validate all external input with Zod schemas
- Handle errors with contextual messages — never swallow errors
- Use `const` by default; `readonly` for immutable data
- Prefer interfaces over type intersections
- Exhaustive switch with `never` checks

## File Organization
- One module per concern (max ~200 lines)
- Colocate types with their domain module
- All MCP tools go in `src/tools/`
- All AI logic in `src/ai/`
- Database layer in `src/db/`

## Commands
- `pnpm dev` — run with tsx (development)
- `pnpm build` — compile TypeScript
- `pnpm start` — run compiled output
