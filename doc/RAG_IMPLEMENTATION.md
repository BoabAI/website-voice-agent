# RAG Implementation & Optimizations

## Overview

This document describes the Retrieval-Augmented Generation (RAG) system implemented in the web voice agent application, focusing on the performance optimizations for the ingestion pipeline and the Agentic RAG architecture.

## Performance Optimization: Ingestion Pipeline

### The Problem

Initial implementation was slow due to inefficient API usage:

- **Small Batches**: Processing chunks in small groups of 10 items.
- **Sequential Processing**: Waiting for each batch to complete before starting the next.
- **Token Underutilization**: Requests used ~2k tokens but paid overhead for a 300k token capacity.
- **Rate Limits**: Risk of hitting requests-per-minute limits despite low token usage.

### The Solution: Dynamic Batching & Parallelism

We implemented a high-throughput pipeline that maximizes OpenAI's API capabilities.

#### 1. Dynamic Batching

Instead of a fixed item count, we dynamically fill batches up to optimal limits:

- **Max Items**: 100 items per batch
- **Max Tokens**: 200,000 tokens per batch (safe buffer under the 300k limit)
- **Chunk Size Limit**: Strict 25,000 char limit per chunk to stay under 8,192 token input limit

**Benefits**:

- Drastic reduction in total API requests (100 chunks → 1 request instead of 10).
- Better network efficiency.

#### 2. Parallel Processing

We process batches concurrently using `Promise.all`:

- **Concurrency Limit**: 5 parallel requests at a time.
- **Result**: 5x throughput improvement for large scrapes.

**Code Strategy**:

```typescript
// 1. Collect & Validate Chunks
// ... chunking logic ...

// 2. Create Optimized Batches
for (const chunk of allChunks) {
  if (currentBatchTokens + chunkTokens > 200000 || currentBatch.length >= 100) {
    batches.push(currentBatch);
    // start new batch
  }
  currentBatch.push(chunk);
}

// 3. Parallel Execution
for (let i = 0; i < batches.length; i += 5) {
  const parallelGroup = batches.slice(i, i + 5);
  await Promise.all(parallelGroup.map(processBatch));
}
```

## Agentic RAG Architecture

### Evolution

**Before (Naive RAG)**:

- Every user message triggered a blocking search.
- High latency (2s+) even for greetings.
- Wasted cost on irrelevant queries.

**After (Agentic RAG)**:

- The LLM decides _when_ to search via **Tool Calling**.
- Instant responses for general chat.
- Search only triggered for specific website queries.

### Implementation Details

#### 1. Knowledge Base (Supabase)

- **Storage**: `scrape_embeddings` table with `vector(1536)` column.
- **Indexing**: IVFFlat index for fast similarity search.
- **Search**: RPC function `match_scrape_embeddings` using cosine similarity.

#### 2. Embedding Model

- **Provider**: OpenRouter / OpenAI
- **Model**: `text-embedding-3-small`
- **Dimensions**: 1536
- **Cost**: Very low per million tokens

#### 3. Chat Route (`app/api/chat/route.ts`)

- Uses Vercel AI SDK `streamText` with `tool` definitions.
- **Tool**: `search_knowledge_base`
- **System Prompt**: Instructions to use the tool only for website-specific questions.

```typescript
const result = streamText({
  model: openrouter("openai/gpt-4o-mini"),
  tools: {
    search_knowledge_base: tool({
      description: "Search the scraped website content...",
      execute: async ({ query }) => {
        // Semantic search logic
      },
    }),
  },
  stopWhen: stepCountIs(5), // Allow multi-step reasoning
});
```

## Key Limits & Safety

| Constraint               | Limit   | Our Handling                                 |
| ------------------------ | ------- | -------------------------------------------- |
| **Max Tokens / Input**   | 8,192   | Hard cap chunks at 25,000 chars (~6k tokens) |
| **Max Tokens / Request** | 300,000 | Dynamic batching caps at 200,000 tokens      |
| **Max Requests / Min**   | Varies  | Concurrency limit of 5 requests              |

## Monitoring & Debugging

The system logs extensive details to the server console:

- **Scraping**: `[StartScraping]`, `[Firecrawl]` logs.
- **Batching**: `[ProcessEmbeddings] Created X optimized batches`.
- **Progress**: `[ProcessEmbeddings] Processing Batch Y: Z items, ~T tokens`.
- **Errors**: `[ProcessEmbeddings] ❌ Batch failed`, with automatic serial fallback.

## Future Improvements

- **Hybrid Search**: Combine keyword search (BM25) with vector search for specific terms.
- **Re-ranking**: Use a reranker model to sort search results for higher relevance.
- **Incremental Updates**: Only re-scrape changed pages instead of full site re-scrapes.
