# WebAgent Demo

Transform any website into an interactive AI agent. Simply provide a URL, and the system scrapes the content, creates a knowledge base, and enables AI-powered chat and voice conversations about that website.

## ✨ Features

- **Async Web Scraping**: Webhook-based scraping that works even if you close your browser
- **AI Chat**: Ask questions about scraped content with RAG-powered responses
- **Voice Agent**: Real-time voice conversations powered by OpenAI Realtime API
- **Real-time Progress**: Live status tracking during scraping
- **Anonymous Access**: No signup required

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/BoabAI/website-voice-agent.git
cd web-voice-agent
npm install
```

### 2. Set Up Services

- **Supabase**: Create project at [supabase.com](https://supabase.com), enable Anonymous Auth, run `database/schema/supabase-schema.sql`
- **Firecrawl**: Get API key from [firecrawl.dev](https://firecrawl.dev)
- **OpenAI**: Get API key from [openai.com](https://platform.openai.com)
- **OpenRouter**: Get API key from [openrouter.ai](https://openrouter.ai)

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SECRET_API_KEY=sb_secret_your_key  # or SUPABASE_SERVICE_ROLE_KEY

# APIs
FIRECRAWL_API_KEY=fc-your_key
OPENAI_API_KEY=sk-your_key
OPENROUTER_API_KEY=sk-or-your_key

# Webhook URL (ngrok for local dev, Vercel URL for production)
NEXT_PUBLIC_APP_URL=https://your-url.ngrok-free.app
```

### 4. Run

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🔧 Local Development with Webhooks

Firecrawl requires webhooks for async scraping. For local development:

```bash
# Install ngrok
brew install ngrok/ngrok/ngrok

# Start tunnel
ngrok http 3000

# Copy the HTTPS URL to NEXT_PUBLIC_APP_URL in .env.local
```

## 📁 Project Structure

```
web-voice-agent/
├── app/
│   ├── actions/           # Server actions
│   ├── api/webhooks/      # Webhook handlers
│   └── playground/        # Agent interface
├── components/
│   └── playground/        # UI components
├── lib/
│   ├── db/               # Database helpers
│   ├── firecrawl.ts      # Scraping
│   ├── processing.ts     # Embeddings
│   └── supabase.ts       # Database client
└── database/             # SQL schemas
```

## 🏗️ Architecture

```
User → Submit URL → Create Record → Firecrawl (async)
                                         ↓
                    Webhook ← crawl.started (status: crawling)
                    Webhook ← crawl.page (save page, generate embeddings)
                    Webhook ← crawl.completed (status: completed)
                                         ↓
                              UI polls and shows progress
```

## 📊 Environment Variables

| Variable                        | Required | Description                    |
| ------------------------------- | -------- | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅       | Supabase project URL           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅       | Supabase anon key              |
| `SUPABASE_SECRET_API_KEY`       | ✅       | Server-side key (bypasses RLS) |
| `FIRECRAWL_API_KEY`             | ✅       | Firecrawl API key              |
| `OPENAI_API_KEY`                | ✅       | OpenAI API key (embeddings)    |
| `OPENROUTER_API_KEY`            | ✅       | OpenRouter API key (chat)      |
| `NEXT_PUBLIC_APP_URL`           | ✅       | Webhook URL (ngrok/Vercel)     |
| `DEBUG_WEBHOOKS`                | ❌       | Set to "true" for verbose logs |

## 🧪 Debug Mode

Enable verbose webhook logs:

```env
DEBUG_WEBHOOKS=true
```

Log output:

```
🚀 Starting scrape: example.com (full, 10 pages)
   📝 Created agent: fd072420
   ✓ Crawl started → waiting for webhooks

🔄 [fd072420] Crawl started
📄 [fd072420] +1 page: https://example.com/ (16 vectors)
✅ [fd072420] Complete! 10 pages (45.2s)
```

## 🚀 Deployment

### Vercel

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL
5. Deploy!

Note: Webhook handler has `maxDuration: 300` (5 minutes) for embedding generation.

## 📚 Documentation

- **[doc/SETUP.md](doc/SETUP.md)** - Complete setup guide
- **[doc/SUPABASE_SETUP.md](doc/SUPABASE_SETUP.md)** - Database setup

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: Supabase (PostgreSQL + pgvector)
- **Scraping**: Firecrawl API (webhook-based)
- **Embeddings**: OpenAI text-embedding-3-small
- **Chat**: OpenRouter (multiple models)
- **Voice**: OpenAI Realtime API

## 📄 License

MIT License

---

**Built with Next.js, Supabase, Firecrawl, and OpenAI**
