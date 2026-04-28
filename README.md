# Tablr | Technical Architecture Note

## Project Overview
Tablr is an AI-native social dining agent designed to mitigate urban loneliness in Bangalore. The platform acts as an autonomous coordinator that matches individuals based on professional and personal interests, facilitating communal dining experiences through automated coordination with Swiggy’s infrastructure.

---

## Core Architecture Layers

### 1. Intelligence & Matchmaking Layer
This layer serves as the "brain" of the agent, processing raw user data into social clusters.

- **Semantic Profiling**  
  Utilizing OpenAI GPT-4o for high-fidelity intent extraction from user bios and LinkedIn profiles.

- **Vector Engine**  
  Professional and personal interest data is converted into high-dimensional embeddings.

- **Matchmaking Logic**  
  A cosine similarity algorithm identifies clusters of 4–6 individuals with high compatibility scores, ensuring meaningful social friction reduction.

---

### 2. Integration Layer (Model Context Protocol)

The system leverages the MCP TypeScript SDK to interface with Swiggy’s ecosystem.

- **MCP Client Implementation**  
  Tablr acts as a host that consumes the Swiggy Dineout MCP Server.

- **Tool Call Execution**  
  The agent autonomously calls tools such as `get_restaurant_inventory` and `book_table` once a cluster is finalized.

- **Real-time Inventory**  
  Direct integration ensures the agent only suggests venues with live availability for large group bookings.

---

### 3. Data & State Management

- **Primary Database**  
  Used for storing persistent user profiles and historical match data.

- **State Machine**  
  Manages the lifecycle of a "Dining Event" from cluster formation to booking confirmation and post-event feedback.

---

## Technical Stack Detail

| Component       | Technology                              |
|----------------|------------------------------------------|
| Language        | TypeScript (Node.js runtime)            |
| AI Framework    | OpenAI GPT-4o & MCP TypeScript SDK      |
| Matchmaking     | Vector Embeddings (Cosine Similarity)   |
| External APIs   | Swiggy Dineout MCP Server               |
| Deployment      | TBD - Development Phase                 |

---

## Operational Flow

1. **Ingestion**  
   User connects LinkedIn/Portfolio via Person and provides dining preferences.

2. **Clustering**  
   The AI agent monitors the pool of active users in Bangalore, identifying compatible groups.

3. **Venue Discovery**  
   The agent queries the Swiggy Dineout MCP server for highly-rated venues matching the group's collective profile.

4. **Autonomous Booking**  
   Upon cluster confirmation, the agent executes the reservation via the Swiggy API.

5. **Notifications**  
   Users receive event details and calendar invites.

---

## Security & Scalability

- **Authentication**  
  TBD - Development Phase

- **Request Volume**  
  Optimized for < 1,000 requests per day during the initial pilot phase in Bangalore.

- **Data Privacy**  
  All professional profile data is processed through secure embedding pipelines to ensure user anonymity during the matchmaking phase.

---

## Metadata

- **Submitted By:** Shivananda Sai  
- **Date:** _TBD_
