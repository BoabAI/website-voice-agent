# WebAgent - Setup Guide

This guide will help you set up and run the web voice agent with async scraping, RAG, and AI chat capabilities.

## Prerequisites

- Node.js 18.17 or later
- A Supabase account ([supabase.com](https://supabase.com))
- A Firecrawl API key ([firecrawl.dev](https://firecrawl.dev))
- An OpenAI API key (for embeddings)
- An OpenRouter API key ([openrouter.ai](https://openrouter.ai)) for chat

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
   - Copy your `service_role` key (for server-side operations)

## Step 2: Configure Environment Variables

1. **Copy the example file:**

   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your credentials in `.env.local`:**

   ```env
   # Supabase (Database & Vector Storage)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

   # Supabase Admin Key (bypasses RLS - required for webhooks!)
   # Option 1: New Secret API Key (format: sb_secret_...)
   SUPABASE_SECRET_API_KEY=sb_secret_your_key_here
   # Option 2: Legacy Service Role Key (JWT format: eyJ...)
   # SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Firecrawl (Web Scraping)
   FIRECRAWL_API_KEY=fc-your_firecrawl_api_key

   # OpenAI (Embeddings)
   OPENAI_API_KEY=sk-your_openai_api_key

   # OpenRouter (AI Chat)
   OPENROUTER_API_KEY=sk-or-your-api-key

   # Webhook URL (Required for async scraping)
   # Production: Your deployed URL (e.g., https://your-app.vercel.app)
   # Development: Your ngrok tunnel URL
   NEXT_PUBLIC_APP_URL=https://your-url.vercel.app

   # Optional: Enable verbose webhook logs
   # DEBUG_WEBHOOKS=true
   ```

## Step 3: Set Up Local Development with Webhooks

Firecrawl uses webhooks to notify your app when scraping is complete. For local development, you need a public URL:

### Using ngrok (Recommended)

1. **Install ngrok:**

   ```bash
   brew install ngrok/ngrok/ngrok
   ```

2. **Authenticate ngrok:**

   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

3. **Start ngrok:**

   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`) and add it to `.env.local`:
   ```env
   NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app
   ```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app!

## How It Works

### Async Scraping Architecture

The scraping process uses **webhooks** for reliable async processing:

```
1. User submits URL
2. Server creates scrape record (status: "pending")
3. Firecrawl starts crawling in background
4. Firecrawl sends webhooks as pages are scraped:
   - crawl.started → status: "processing", step: "crawling"
   - crawl.page    → step: "processing_pages" → "generating_embeddings"
   - crawl.completed → status: "completed"
5. UI polls for updates and shows real-time progress
```

### Log Format

Clean, emoji-based logs for easy debugging:

```
🚀 Starting scrape: example.com (full, 10 pages)
   📝 Created agent: fd072420
   ✓ Crawl started → waiting for webhooks

🔄 [fd072420] Crawl started
📄 [fd072420] +1 page: https://example.com/ (16 vectors)
📄 [fd072420] +1 page: https://example.com/about (8 vectors)
✅ [fd072420] Complete! 10 pages (45.2s)
```

Enable verbose logs with `DEBUG_WEBHOOKS=true` for full details.

## Features

### ✅ Web Scraping

- Async webhook-based scraping (handles browser close)
- Firecrawl integration
- Single URL and full platform crawling
- Real-time progress tracking
- Page-by-page status updates

### ✅ RAG & Text Chat

- Vector embeddings with OpenAI
- Semantic text chunking
- pgvector similarity search
- AI-powered Q&A chat
- Streaming responses

### ✅ Voice Agent

- OpenAI Realtime API integration
- Voice-to-voice conversations
- Tool calling for RAG

## Database Schema

### `scrapes` table

- `id`: Unique identifier
- `url`: Website URL
- `crawl_type`: "single" or "full"
- `status`: "pending", "processing", "completed", "failed"
- `current_step`: "analyzing", "crawling", "processing_pages", "generating_embeddings", "completed"
- `pages_scraped`: Number of pages scraped
- `user_id`: Anonymous user ID

### `scraped_pages` table

- `id`: Unique identifier
- `scrape_id`: Reference to scrapes table
- `url`: Page URL
- `title`: Page title
- `content`: HTML content
- `markdown`: Markdown content

### `scrape_embeddings` table

- `id`: Unique identifier
- `scrape_id`: Reference to scrapes table
- `content`: Text chunk
- `embedding`: Vector embedding (1536 dimensions)

## Troubleshooting

### "Scrape stuck on pending/crawling"

- Check that `NEXT_PUBLIC_APP_URL` is set correctly
- For local dev, ensure ngrok is running and URL is updated
- Check Firecrawl dashboard for webhook delivery status

### "Row Level Security policy" errors

- Ensure `SUPABASE_SECRET_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` is set
- This key is required for webhook operations that bypass RLS

### "Missing environment variables" error

- Create `.env.local` from `.env.example`
- Restart the dev server after adding variables

### Webhooks not being received locally

- Start ngrok: `ngrok http 3000`
- Update `NEXT_PUBLIC_APP_URL` with the ngrok URL
- Restart the dev server

## Deployment (Vercel)

1. Push to GitHub
2. Connect to Vercel
3. Add all environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SECRET_API_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
   - `FIRECRAWL_API_KEY`
   - `OPENAI_API_KEY`
   - `OPENROUTER_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL)
4. Deploy!

The webhook route has `maxDuration: 300` (5 minutes) for Vercel Pro/Enterprise plans.
