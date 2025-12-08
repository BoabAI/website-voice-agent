# Supabase Setup Guide

There are three ways to set up your Supabase database:

## Option 1: Using Supabase MCP Tool (Recommended for Cursor)

If you're using Cursor IDE with the Supabase MCP server configured:

### Prerequisites

- Supabase project created
- Service role key (from Supabase Dashboard → Settings → API)

### Steps

1. **Configure Supabase MCP in Cursor:**

   - Open Cursor Settings
   - Go to MCP Servers
   - Configure Supabase with your project details

2. **I can then run the migrations for you automatically!**

Just provide your Supabase credentials and I'll set everything up.

---

## Option 2: Using Supabase Dashboard (Easiest)

### Step 1: Create a Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details and wait for it to initialize

### Step 2: Enable Anonymous Authentication

1. Go to **Authentication** → **Providers**
2. Scroll down to **Anonymous Sign-ins**
3. Toggle to enable it
4. Click **Save**

### Step 3: Run the Database Migrations

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**

#### Migration 1: Initial Schema

3. Copy the entire contents of `database/migrations/001_initial_schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)

You should see: ✓ Success. No rows returned

#### Migration 2: Chat History

6. Click **New Query** again
7. Copy the entire contents of `database/migrations/002_chat_history.sql`
8. Paste it into the SQL Editor
9. Click **Run** (or press Cmd/Ctrl + Enter)

You should see: ✓ Success. No rows returned

### Step 4: Verify Tables Created

1. Go to **Table Editor**
2. You should see these tables:
   - `scrapes`
   - `scraped_pages`
   - `scrape_embeddings`
   - `chat_messages` (new!)

### Step 5: Get Your Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (starts with https://xxx.supabase.co)
   - **anon public** key (under Project API keys)

### Step 6: Configure Environment

Create `.env.local` in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
# Optional: Service role key for admin tasks (needed for webhooks to bypass RLS)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
FIRECRAWL_API_KEY=your-firecrawl-key-here
```

---

## Option 3: Using Supabase CLI

### Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Docker running locally

### Steps

1. **Initialize Supabase:**

   ```bash
   supabase init
   ```

2. **Start local Supabase:**

   ```bash
   supabase start
   ```

3. **Link to your project:**

   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Apply migration:**
   ```bash
   supabase db push
   ```

---

## Verify Setup

After setup, verify everything is working:

### 1. Check Tables

Run this in SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

You should see: `scrapes`, `scraped_pages`, `scrape_embeddings`, and `chat_messages`

### 2. Check RLS Policies

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

You should see policies for all tables including `chat_messages`.

### 3. Check Anonymous Auth

- Go to Authentication → Settings
- "Anonymous sign-ins" should be enabled

### 4. Test Chat Messages Table (Optional)

```sql
-- Check the structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'chat_messages';

-- This should show: id, scrape_id, user_id, role, content, created_at
```

---

## Troubleshooting

### "relation 'scrapes' does not exist"

→ The migration didn't run successfully
→ Go to SQL Editor and run the migration again

### "permission denied for table scrapes"

→ RLS policies not set up correctly
→ Make sure you ran ALL of the migration SQL
→ Check that anonymous auth is enabled

### "function auth.uid() does not exist"

→ You're not running as an authenticated user
→ This is normal in SQL Editor - the app will work fine

### Anonymous auth not working

→ Go to Authentication → Providers → Anonymous Sign-ins
→ Make sure it's toggled ON
→ Save changes

---

## Database Schema Overview

### `scrapes` Table

Stores scraping job metadata:

- `id` (UUID, Primary Key)
- `url` (TEXT) - Website URL
- `crawl_type` (TEXT) - 'single' or 'full'
- `page_limit` (INTEGER) - Max pages for full crawl
- `pages_scraped` (INTEGER) - Actual pages scraped
- `status` (TEXT) - 'pending', 'processing', 'completed', 'failed'
- `error_message` (TEXT) - Error if failed
- `user_id` (UUID) - Anonymous user ID
- `metadata` (JSONB) - Additional data
- `created_at`, `updated_at` (TIMESTAMPTZ)

### `scraped_pages` Table

Stores scraped content:

- `id` (UUID, Primary Key)
- `scrape_id` (UUID, Foreign Key) - References scrapes
- `url` (TEXT) - Page URL
- `title` (TEXT) - Page title
- `content` (TEXT) - Page content
- `markdown` (TEXT) - Markdown version
- `metadata` (JSONB) - Additional data
- `created_at` (TIMESTAMPTZ)

### `scrape_embeddings` Table

Stores vector embeddings for RAG:

- `id` (UUID, Primary Key)
- `scrape_id` (UUID, Foreign Key) - References scrapes
- `content` (TEXT) - Text chunk
- `embedding` (vector(1536)) - Embedding vector
- `created_at` (TIMESTAMPTZ)

### `chat_messages` Table

Stores user chat history:

- `id` (TEXT, Primary Key) - Message ID from AI SDK
- `scrape_id` (UUID, Foreign Key) - References scrapes
- `user_id` (UUID) - Anonymous user ID
- `role` (TEXT) - 'user', 'assistant', 'system', 'data'
- `content` (JSONB) - Message content `{ text: "..." }`
- `created_at` (TIMESTAMPTZ)

### Indexes

- `idx_scrapes_url` - Fast URL lookups
- `idx_scrapes_user_id` - User's scrapes
- `idx_scrapes_status` - Filter by status
- `idx_scrapes_created_at` - Sort by date
- `idx_scraped_pages_scrape_id` - Get pages for a scrape
- `idx_chat_messages_scrape_id` - Get messages for an agent
- `idx_chat_messages_user_id` - Get user's messages
- `idx_chat_messages_created_at` - Sort messages by time

### RLS Policies

#### `scrapes` & `scraped_pages`

- **Read:** Everyone can read all scrapes and pages (global visibility)
- **Write:** Only authenticated users can insert
- **Update/Delete:** Only on own scrapes (user_id = auth.uid())

#### `chat_messages`

- **Read:** Users can only read their own messages
- **Insert:** Users can only insert messages as themselves
- **Update:** Users can only update their own messages
- **Delete:** Users can only delete their own messages

---

## Next Steps

After Supabase is set up:

1. ✅ Database configured
2. ✅ Anonymous auth enabled
3. ✅ Environment variables set
4. → Get Firecrawl API key from [firecrawl.dev](https://firecrawl.dev)
5. → Run `npm install`
6. → Run `npm run dev`
7. → Test scraping at http://localhost:3000

---

## Need Help?

Common issues:

- **Tables not created?** Run the migration SQL in SQL Editor
- **Can't connect?** Check your environment variables
- **RLS errors?** Make sure anonymous auth is enabled
- **No data showing?** Check browser console for errors

For more help, check:

- `SETUP.md` - Full setup guide
- `QUICKSTART.md` - 5-minute quick start
- `IMPLEMENTATION_SUMMARY.md` - Technical details
