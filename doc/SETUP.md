# WebAgent - Setup Guide

This guide will help you set up and run the web voice agent with scraping, RAG, and AI chat capabilities.

## Prerequisites

- Node.js 18.17 or later
- A Supabase account ([supabase.com](https://supabase.com))
- A Firecrawl API key ([firecrawl.dev](https://firecrawl.dev))
- An OpenRouter API key ([openrouter.ai](https://openrouter.ai))

## Step 1: Set Up Supabase

1. **Create a new Supabase project** at [app.supabase.com](https://app.supabase.com)

2. **Enable Anonymous Authentication:**

   - Go to Authentication → Settings
   - Enable "Anonymous sign-ins" under "Anonymous Sign-ins"

3. **Run the database schema:**

   - Go to SQL Editor in your Supabase dashboard
   - Copy the contents of `database/schema/supabase-schema.sql` file
   - Paste and run the SQL script

4. **Get your credentials:**
   - Go to Project Settings → API
   - Copy your `Project URL` and `anon/public key`

## Step 2: Configure Environment Variables

1. **Copy the example file:**

   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your credentials in `.env.local`:**

   ```env
   # Supabase (Database & Vector Storage)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Firecrawl (Web Scraping)
   FIRECRAWL_API_KEY=your_firecrawl_api_key

   # OpenRouter (AI Chat & Embeddings)
   OPENROUTER_API_KEY=sk-or-your-api-key-here
   ```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app!

## How to Use

### 1. Scrape a Website

On the homepage:

- Enter a website URL
- Choose "Single URL" for just one page, or "Full Platform" to crawl multiple pages
- If "Full Platform" is selected, choose how many pages to crawl (10, 20, or 50)
- Click "Generate Agent"

### 2. View Scrape Results & Chat

After submission:

- You'll be redirected to `/playground/[id]`
- The left sidebar shows all scrapes (yours + others)
- The center panel shows scrape details and all scraped pages
- The right panel has two tabs:
  - **Text Chat:** AI-powered Q&A about the scraped content
  - **Voice Agent:** Voice interface (coming in Phase 3)

### 3. Re-scrape or Scrape More

On the playground page:

- **Scrape Again:** Creates a fresh scrape of the same URL
- **Scrape More:** (Only for full platform scrapes) Extends the crawl with additional pages

## Features

### ✅ Phase 1: Web Scraping (Complete)

- Firecrawl integration for web scraping
- Single URL and full platform crawling
- Supabase storage with anonymous auth
- Deduplication (checks if URL already scraped)
- Global + user-specific visibility
- Re-scraping functionality
- Extend scraping with more pages
- Real-time status updates
- Detailed scrape information
- List of all scraped pages

### ✅ Phase 2: RAG & Text Chat (Complete)

- Vector embeddings with OpenRouter
- Semantic text chunking
- pgvector similarity search
- AI-powered Q&A chat interface
- Context-aware responses from scraped content
- Multi-turn conversations with full history
- Streaming responses
- AI SDK v5 integration

### 🔜 Phase 3: Voice Agent (Coming Soon)

- OpenAI Realtime API integration
- Voice-to-voice conversations
- Tool calling for RAG integration
- Real-time audio streaming

## Database Schema

### `scrapes` table

Stores metadata about each scraping job:

- `id`: Unique identifier
- `url`: Website URL
- `crawl_type`: "single" or "full"
- `page_limit`: Max pages for full crawls
- `pages_scraped`: Number of pages actually scraped
- `status`: "pending", "processing", "completed", or "failed"
- `user_id`: Anonymous user ID
- `created_at`, `updated_at`: Timestamps

### `scraped_pages` table

Stores the actual scraped content:

- `id`: Unique identifier
- `scrape_id`: Reference to scrapes table
- `url`: Page URL
- `title`: Page title
- `content`: Page content (HTML)
- `markdown`: Page content in markdown format
- `metadata`: Additional page metadata
- `created_at`: Timestamp

## Troubleshooting

### "Missing Supabase environment variables" error

- Make sure you've created `.env.local` and filled in all required variables
- Restart the dev server after adding environment variables

### "FIRECRAWL_API_KEY is not set" error

- Add your Firecrawl API key to `.env.local`
- Get a key from [firecrawl.dev](https://firecrawl.dev)

### Database errors

- Make sure you've run the `database/schema/supabase-schema.sql` script in your Supabase dashboard
- Check that RLS policies are enabled
- Verify anonymous auth is enabled

### Scraping stuck on "processing"

- Check the browser console for errors
- The scraping happens server-side, so it may take time depending on the website size
- Check your Firecrawl API limits

## Architecture

The implementation follows this flow:

1. **User submits URL** → Form validates and checks for duplicates
2. **Server action** → Creates scrape record in Supabase
3. **Background job** → Firecrawl scrapes the website
4. **Store results** → Pages saved to Supabase
5. **Status updates** → Real-time polling shows progress
6. **View results** → User can browse scraped content

## Next Steps

To implement the chat feature in Phase 2:

1. Set up OpenAI Realtime API
2. Implement RAG using the scraped content
3. Build voice interface in `ChatInterface.tsx`
4. Connect voice to knowledge base

## Support

For issues or questions:

- Check the browser console for errors
- Verify all environment variables are set correctly
- Make sure the database schema is properly set up
- Check Supabase and Firecrawl service status
