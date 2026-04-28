# Tablr — AI Social Dining Agent for Bangalore

Combat urban loneliness by matching professionals for communal dining experiences.

## How It Works

```
1. Register    →  Create your profile with interests, profession, food preferences
2. Signal      →  "I'm looking for dinner this Friday" (looking_for_dinner)
3. Auto-Match  →  System finds compatible people also available that day
4. Book        →  Suggests restaurants, books via Swiggy Dineout
5. Dine & Rate →  Post-dinner feedback loop
```

## Quick Start

### Prerequisites
- **Ollama** running locally with `nomic-embed-text` model
- **Qdrant** vector database on `localhost:6333`
- **Groq API key** (free at [console.groq.com](https://console.groq.com))

### Setup
```bash
pnpm install
cp .env.example .env    # Add your GROQ_API_KEY
pnpm build
```

### Run
```bash
# CLI Agent (interactive chat)
pnpm agent

# Smoke tests (validates Ollama → Qdrant → SQLite pipeline)
pnpm test:smoke
```

### Use via Cursor / Claude Desktop
Add to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "tablr": {
      "command": "node",
      "args": ["/path/to/tablr/dist/index.js"],
      "env": {
        "GROQ_API_KEY": "your-groq-api-key",
        "QDRANT_URL": "http://localhost:6333",
        "OLLAMA_URL": "http://localhost:11434"
      }
    },
    "swiggy-dineout": {
      "url": "https://mcp.swiggy.com/dineout"
    }
  }
}
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Cursor /    │────▶│  Tablr MCP   │────▶│  Ollama      │
│  CLI Agent   │     │  Server      │     │  Embeddings  │
└─────────────┘     └──────┬───────┘     └──────────────┘
       │                   │
       │            ┌──────┴───────┐
       │            │   SQLite     │──── Profiles, Events, Intents
       │            │   Qdrant     │──── Vector embeddings (768-dim)
       │            └──────────────┘
       │
       ▼
┌─────────────┐
│ Swiggy MCP  │──── Live restaurant search, slot checking, table booking
└─────────────┘
```

## MCP Tools

### 🎯 Core Flow (Start Here)
| Tool | Description |
|------|-------------|
| `register_profile` | Create your dining profile |
| `looking_for_dinner` | **Primary entry point** — signal availability, auto-match, suggest restaurants |
| `check_dinner_matches` | See who's available on a specific date |

### Profile Management
| Tool | Description |
|------|-------------|
| `get_profile` | View a profile |
| `update_profile` | Update profile details |
| `delete_profile` | Remove a profile |

### Matchmaking
| Tool | Description |
|------|-------------|
| `find_compatible_diners` | Find compatible dining partners |
| `form_dining_group` | Form optimal group of 4-6 people |
| `get_compatibility_score` | Detailed compatibility breakdown |

### Restaurants
| Tool | Description |
|------|-------------|
| `search_restaurants` | Search local restaurant database |
| `get_restaurant_details` | Full restaurant info |
| `suggest_restaurants_for_group` | AI suggestions for a group |

### Events
| Tool | Description |
|------|-------------|
| `create_dining_event` | Create a dining event |
| `get_event_status` | Check event details |
| `confirm_event` | Accept/decline/confirm/cancel |
| `list_upcoming_events` | List your events |
| `submit_feedback` | Post-event rating |

### Swiggy Dineout (Live Booking)
| Tool | Description |
|------|-------------|
| `search_restaurants_dineout` | Search live Bangalore restaurants |
| `get_restaurant_details` | Ratings, deals, timings |
| `get_available_slots` | Check slot availability |
| `book_table` | Reserve a table (FREE deals only) |
| `get_booking_status` | Check booking confirmation |
| `get_saved_locations` | Get user's saved addresses |

## End-to-End Flow

```
1. register_profile (Tablr)              → Create your profile
2. looking_for_dinner (Tablr)            → Signal "I'm free Friday"
   ↓ auto-matches with compatible users also available
   ↓ suggests restaurants based on group preferences
   ↓ creates dining event with invites
3. confirm_event (Tablr)                 → Matched users accept/decline
4. search_restaurants_dineout (Swiggy)   → Find live restaurants
5. get_available_slots (Swiggy)          → Check availability
6. book_table (Swiggy)                   → Reserve the table
7. submit_feedback (Tablr)               → Rate the experience
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM (Agent) | Groq — Llama 4 Scout |
| LLM (Profiler) | Groq — Llama 4 Scout |
| Embeddings | Ollama — nomic-embed-text (768-dim, local) |
| Vector DB | Qdrant (local) |
| Database | SQLite via better-sqlite3 |
| Agent Framework | Vercel AI SDK |
| MCP | @modelcontextprotocol/sdk |
| Live Booking | Swiggy Dineout MCP |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | ✅ | — | Groq API key |
| `GROQ_MODEL` | — | `meta-llama/llama-4-scout-17b-16e-instruct` | LLM model |
| `OLLAMA_URL` | — | `http://localhost:11434` | Ollama endpoint |
| `OLLAMA_EMBED_MODEL` | — | `nomic-embed-text` | Embedding model |
| `QDRANT_URL` | — | `http://localhost:6333` | Qdrant endpoint |
| `SWIGGY_TOKEN` | — | — | Swiggy OAuth token (auto via Cursor) |
