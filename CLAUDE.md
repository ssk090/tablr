# Tablr — Project Conventions

## Overview
Tablr is an MCP server (TypeScript, Node.js) that acts as an AI-native social dining agent for Bangalore.

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
