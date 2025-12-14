# WebAgent - Technical Architecture

## Overview

The WebAgent is a Next.js application that enables users to interact with website content through both **Text Chat** and **Realtime Voice**. It uses RAG (Retrieval-Augmented Generation) to provide accurate, context-aware responses based on scraped website data.

---

## System Architecture

```
┌─────────────┐
│   Browser   │
│             │
│  Chat UI    │ ──────────► OpenRouter (Text Chat)
│  Voice UI   │ ──────────► OpenAI Realtime API (Voice)
└─────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│       Next.js Backend (Node.js)     │
│                                     │
│  • Server Actions (Scraping)        │
│  • API Routes (Chat, Voice Token)   │
│  • RAG Service (Unified Search)     │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│    Supabase (PostgreSQL + pgvector) │
│                                     │
│  • scrapes (metadata)               │
│  • scraped_pages (content)          │
│  • scrape_embeddings (vectors)      │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│          External Services          │
│                                     │
│  • Firecrawl (Web Scraping)         │
│  • OpenRouter (LLM + Embeddings)    │
│  • OpenAI (Realtime Voice API)      │
└─────────────────────────────────────┘
```

---

## Phase 1: Web Scraping & Storage

### Data Flow

1.  User enters a URL on the homepage
2.  Backend validates URL and checks for duplicates
3.  Firecrawl API scrapes the website (single page or full crawl) via webhooks
4.  Webhooks process pages incrementally (insert + generate embeddings)
5.  Content is stored in `scrapes`, `scraped_pages`, and `scrape_embeddings` tables
6.  User is redirected to playground page

### Page Refresh Flow

1.  User selects pages to refresh in the dialog
2.  Backend stores refresh state in `scrapes.metadata`:
    - `is_refreshing: true`
    - `refreshing_pages: [{id, title, url}, ...]`
3.  Old page records are deleted (cascades to embeddings)
4.  Async batch scrape initiated with `type=batch` webhook URL
5.  UI shows "Refreshing Content" loading screen
6.  Webhooks process each page (without updating status to prevent race conditions)
7.  `batch_scrape.completed` event clears metadata and sets status to "completed"
8.  UI transitions back to chat interface

### Webhook Events

| Event | Handler Action |
| :--- | :--- |
| `crawl.started` / `batch_scrape.started` | Set status to "processing" |
| `crawl.page` | Insert page, generate embeddings, update status |
| `batch_scrape.page` | Insert page, generate embeddings (no status update) |
| `crawl.completed` / `batch_scrape.completed` | Set status to "completed", clear refresh metadata |

### Key Components

- **`HeroSection.tsx`**: Form for URL submission
- **`app/actions/scrape.ts`**: Server actions for scraping
- **`lib/firecrawl.ts`**: Firecrawl API integration
- **`lib/db/scrapes.ts`**: Database CRUD operations

---

## Phase 2: RAG & AI Agents

### RAG Architecture

**Goal**: Build a "brain" that both Chat and Voice agents can query.

#### 1. Ingestion Pipeline

```
Website Content (Markdown)
    ↓
Chunking (lib/chunking.ts)
    ↓
Batching (Dynamic Batching Strategy)
    ↓
Embedding (lib/embeddings.ts via OpenRouter)
    ↓
Storage (Supabase scrape_embeddings table)
```

**Chunking Strategy**:

- Split by Markdown headers (`#`, `##`, `###`) first
- Then by paragraphs (`\n\n`)
- **Strict Limit**: Max 25,000 chars per chunk to stay under input token limits
- Preserves semantic meaning

**Batching & Concurrency Strategy**:

- **Dynamic Batching**: Fills requests up to 100 items or 200,000 tokens (whichever comes first)
- **Parallel Processing**: Processes 5 batch requests concurrently
- **Benefits**: Reduces total API calls by ~90%, 5x faster throughput

**Embedding Model**:

- `openai/text-embedding-3-small` (via OpenRouter)
- 1536 dimensions
- Cost: $0.02 per 1M tokens

#### 2. Search Function

**Location**: `lib/rag.ts`

```typescript
searchKnowledgeBase(query, scrapeId, topK=5)
  ↓
1. Convert query to vector (embedding)
  ↓
2. Call Supabase function: match_scrape_embeddings()
  ↓
3. Cosine similarity search (pgvector)
  ↓
4. Return top K most relevant chunks
```

**Database Function**:

```sql
match_scrape_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_scrape_id uuid
)
```

---

### Text Chat Agent

**Flow**:

1.  User types message in `ChatInterface.tsx`
2.  Frontend calls `/api/chat` with message + `scrapeId` via `DefaultChatTransport`
3.  Backend:
    - Extracts query from UIMessage parts
    - Cleans messages (removes reasoning parts)
    - Calls OpenRouter with `gpt-4o-mini` and tool definitions
    - **Agentic Decision**: LLM decides if it needs to call `search_knowledge_base` tool
    - If tool called: Executes search, returns context, LLM generates final answer
    - Streams response back
4.  Frontend displays streaming text in real-time with parts structure

**Tech Stack**:

- **Frontend**: Vercel AI SDK v5 (`@ai-sdk/react`) with `useChat` hook
- **Backend**: `streamText()` from `ai` package
- **Provider**: OpenRouter (official provider via `@openrouter/ai-sdk-provider`)

**Code Flow**:

```typescript
// Frontend (ChatInterface.tsx)
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const { messages, sendMessage } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/chat",
    body: { scrapeId },
  }),
});

// Send message
sendMessage({ text: input });

// Render with parts structure
{
  messages.map((m) =>
    m.parts?.map((part) => {
      if (part.type === "text") {
        return <span>{part.text}</span>;
      }
    })
  );
}

// Backend (app/api/chat/route.ts)
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const result = streamText({
  model: openrouter("openai/gpt-4o-mini"),
  messages: cleanedMessages,
  stopWhen: stepCountIs(5),
  tools: {
    search_knowledge_base: tool({
      description: "Search website content...",
      execute: async ({ query }) => {
        return await searchKnowledgeBase(query, scrapeId);
      },
    }),
  },
});

return result.toUIMessageStreamResponse();
```

---

### Voice Agent

**Flow**:

1.  User clicks "Start Conversation" in `VoiceChat.tsx`
2.  Frontend requests ephemeral token from `/api/voice/token`
3.  Frontend establishes WebRTC connection to OpenAI Realtime API
4.  Voice Agent is configured with a **Tool**: `search_knowledge_base`
5.  When user asks a question:
    - Agent detects it needs information
    - Calls `search_knowledge_base` tool
    - Frontend executes `getInformationAction(query, scrapeId)`
    - Returns context to the AI
    - AI speaks the answer

**Tech Stack**:

- **Protocol**: WebRTC (low-latency, bidirectional audio)
- **Model**: `gpt-realtime-mini-2025-10-06`
- **Tool Calling**: Function calling via Data Channel

**Session Configuration**:

```json
{
  "model": "gpt-realtime-mini-2025-10-06",
  "modalities": ["audio", "text"],
  "voice": "verse",
  "turn_detection": {
    "type": "server_vad",
    "threshold": 0.5,
    "silence_duration_ms": 500
  },
  "tools": [
    {
      "name": "search_knowledge_base",
      "description": "Search website content",
      "parameters": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        }
      }
    }
  ]
}
```

---

## AI SDK v5 Implementation Details

### Message Format Changes

AI SDK v5 uses a new message structure with `parts` arrays instead of simple `content` strings:

```typescript
// UIMessage structure (frontend)
{
  id: string,
  role: "user" | "assistant",
  parts: [
    { type: "text", text: "Hello" },
    { type: "reasoning", text: "Internal thinking..." },
    { type: "step-start", ... }
  ]
}

// ModelMessage structure (backend)
{
  role: "user" | "assistant",
  content: "Hello"  // Simple string
}
```

### Transport System

AI SDK v5 introduced a transport-based architecture for `useChat`:

```typescript
// Old (v4)
useChat({ api: "/api/chat", body: { scrapeId } });

// New (v5)
useChat({
  transport: new DefaultChatTransport({
    api: "/api/chat",
    body: { scrapeId },
  }),
});
```

### Message Cleaning Strategy

To ensure compatibility with OpenRouter, we implement message cleaning:

1. **Extract text parts**: Filter `part.type === "text"` from messages
2. **Remove reasoning**: Skip `reasoning`, `step-start`, and other metadata parts
3. **Convert to simple format**: Transform to `{ role, content }` strings
4. **Preserve history**: All messages maintained for context

This prevents OpenRouter API errors while maintaining full conversation history.

---

## Database Schema

### Tables

#### `scrapes`

Stores scraping job metadata.

| Column                     | Type        | Description                                    |
| :------------------------- | :---------- | :--------------------------------------------- |
| `id`                       | UUID        | Primary key                                    |
| `url`                      | TEXT        | Website URL                                    |
| `crawl_type`               | TEXT        | 'single' or 'full'                             |
| `page_limit`               | INTEGER     | Max pages (full crawl only)                    |
| `pages_scraped`            | INTEGER     | Actual pages scraped                           |
| `status`                   | TEXT        | 'pending', 'processing', 'completed', 'failed' |
| `current_step`             | TEXT        | Current processing step                        |
| `error_message`            | TEXT        | Error if failed                                |
| `user_id`                  | UUID        | Anonymous user ID                              |
| `metadata`                 | JSONB       | Additional data (refresh state, etc.)          |
| `created_at`, `updated_at` | TIMESTAMPTZ | Timestamps                                     |

**Metadata Fields** (stored in `metadata` JSONB):
- `is_refreshing: boolean` - True during page refresh operation
- `refreshing_pages: Array<{id, title, url}>` - Pages being refreshed
- `current_processing_url: string` - URL currently being processed

#### `scraped_pages`

Stores scraped page content.

| Column       | Type        | Description             |
| :----------- | :---------- | :---------------------- |
| `id`         | UUID        | Primary key             |
| `scrape_id`  | UUID        | Foreign key → `scrapes` |
| `url`        | TEXT        | Page URL                |
| `title`      | TEXT        | Page title              |
| `content`    | TEXT        | HTML content            |
| `markdown`   | TEXT        | Markdown version        |
| `metadata`   | JSONB       | Additional data         |
| `created_at` | TIMESTAMPTZ | Creation timestamp      |
| `updated_at` | TIMESTAMPTZ | Last update timestamp   |

#### `scrape_embeddings`

Stores vector embeddings for RAG.

| Column      | Type         | Description             |
| :---------- | :----------- | :---------------------- |
| `id`        | UUID         | Primary key             |
| `scrape_id` | UUID         | Foreign key → `scrapes` |
| `content`   | TEXT         | Text chunk              |
| `embedding` | vector(1536) | Embedding vector        |

#### `chat_messages`

Stores user chat history for each agent.

| Column       | Type        | Description                           |
| :----------- | :---------- | :------------------------------------ |
| `id`         | TEXT        | Message ID from AI SDK                |
| `scrape_id`  | UUID        | Foreign key → `scrapes`               |
| `user_id`    | UUID        | Anonymous user ID                     |
| `role`       | TEXT        | 'user', 'assistant', 'system', 'data' |
| `content`    | JSONB       | Message content `{ text: "..." }`     |
| `created_at` | TIMESTAMPTZ | Timestamp                             |

**Indexes**: `scrape_id`, `user_id`, `created_at DESC`

**RLS Policies**: Users can only access their own messages (filtered by `user_id = auth.uid()`)

---

## Key Files & Responsibilities

### Frontend Components

| File                                            | Purpose                                    |
| :---------------------------------------------- | :----------------------------------------- |
| `components/playground/ModernChatInterface.tsx` | Text + Voice UI with chat history          |
| `components/playground/VoiceChat.tsx`           | Voice agent WebRTC client                  |
| `components/playground/AgentHeader.tsx`         | Agent metadata & actions (with clear chat) |
| `components/playground/AgentProgressView.tsx`   | Loading/progress view for scraping         |
| `components/playground/ScrapeRefreshDialog.tsx` | Page selection dialog for refresh          |
| `components/playground/ScrapeDetails.tsx`       | Scrape info & page list                    |

### Backend

| File                                  | Purpose                                |
| :------------------------------------ | :------------------------------------- |
| `app/api/chat/route.ts`               | Text chat API with message persistence |
| `app/api/voice/token/route.ts`        | Voice token generation (OpenAI)        |
| `app/api/webhooks/firecrawl/route.ts` | Firecrawl webhook handler              |
| `app/actions/scrape.ts`               | Scraping server actions                |
| `app/actions/voice.ts`                | Voice tool server action               |
| `app/actions/chat.ts`                 | Chat history server actions            |

### Libraries

| File                | Purpose                            |
| :------------------ | :--------------------------------- |
| `lib/rag.ts`        | Unified RAG search function        |
| `lib/embeddings.ts` | Generate embeddings via OpenRouter |
| `lib/chunking.ts`   | Semantic text chunking             |
| `lib/firecrawl.ts`  | Firecrawl API client               |
| `lib/db/scrapes.ts` | Database operations                |
| `lib/supabase.ts`   | Supabase client & anonymous auth   |

### Types

| File              | Purpose              |
| :---------------- | :------------------- |
| `types/scrape.ts` | Scrape-related types |
| `types/chat.ts`   | Chat history types   |

---

## AI Models Used

| Purpose            | Provider      | Model                           | Cost                                |
| :----------------- | :------------ | :------------------------------ | :---------------------------------- |
| **Embeddings**     | OpenRouter    | `openai/text-embedding-3-small` | $0.02/1M tokens                     |
| **Text Chat**      | OpenRouter    | `openai/gpt-4o-mini`            | ~$0.15/1M tokens                    |
| **WebAgent Voice** | OpenAI Direct | `gpt-4o-realtime-preview`       | $5/$20 per 1M tokens (audio in/out) |

---

## Security & Authentication

### Supabase RLS Policies

#### `scrapes` Table

- **Read**: Anyone can view all scrapes (global visibility)
- **Write**: Only authenticated users can create scrapes
- **Update/Delete**: Users can only modify their own scrapes

#### `chat_messages` Table

- **Read**: Users can only read their own messages (`user_id = auth.uid()`)
- **Insert**: Users can only insert messages as themselves
- **Update**: Users can only update their own messages
- **Delete**: Users can only delete their own messages

### Anonymous Auth

- Users auto-login on first visit via `ensureAnonymousSession()`
- Persistent session across page reloads (stored in browser)
- No email/password required
- Each anonymous user gets a unique UUID
- Chat history is private per user

### Authentication Flow

1. **First Visit**: `ensureAnonymousSession()` creates anonymous user
2. **API Calls**: Access token passed in Authorization header
3. **Database**: RLS policies filter data by `auth.uid()`
4. **Chat History**: Automatically scoped to current user

---

## Performance Considerations

1.  **Background Scraping**: Scraping runs asynchronously to avoid blocking
2.  **Optimized Ingestion**: Dynamic batching (up to 200k tokens) and parallel processing (5x concurrent requests)
3.  **Real-time Updates**: Playground polls every 3 seconds during processing
4.  **Efficient Queries**: Database indexes on `url`, `user_id`, `status`, `scrape_id`
5.  **Vector Search**: `pgvector` uses HNSW index for fast similarity search
6.  **Streaming**: Both Chat and Voice stream responses for perceived speed

---

## Future Enhancements

- **Caching**: Cache embeddings to avoid regenerating for duplicate URLs
- **Pagination**: Paginate scrapes list and search results
- **Custom Voices**: Allow users to select voice (alloy, echo, fable, etc.)
- **Analytics**: Track usage, costs, and popular websites
- **Export**: Export chat transcripts and scraped data
- **Hybrid Search**: Combine vector search with keyword search
- **Conversation Sharing**: Share chat history URLs with others
- **Message Reactions**: Allow users to rate AI responses
