# Quick Start Guide

Get the web voice agent running in 5 minutes!

## 1. Set Up Supabase (2 minutes)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Enable Anonymous Authentication:
   - Settings → Authentication → Enable "Anonymous sign-ins"
3. Run the database schema:
   - SQL Editor → Copy/paste from `database/schema/supabase-schema.sql` → Run
4. Get your credentials:
   - Settings → API → Copy `Project URL` and `anon public` key

## 2. Set Up API Keys (2 minutes)

### Firecrawl (Web Scraping)
1. Go to [firecrawl.dev](https://firecrawl.dev) and sign up
2. Get your API key from the dashboard

### OpenRouter (AI Models)
1. Go to [openrouter.ai](https://openrouter.ai) and sign up
2. Get your API key from Settings
3. Add credits to your account ($5 minimum)

## 3. Configure Environment (1 minute)

Create `.env.local` file in the project root:

```env
# Supabase (Database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Firecrawl (Web Scraping)
FIRECRAWL_API_KEY=fc-your-api-key-here

# OpenRouter (AI Chat & Embeddings)
OPENROUTER_API_KEY=sk-or-your-api-key-here
```

## 4. Run the App (1 minute)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 5. Test It Out!

1. Enter a URL (e.g., `https://example.com`)
2. Select "Single URL" or "Full Platform"
3. Click "Generate Agent"
4. You'll be redirected to the playground!

## What You'll See

- **Left Sidebar:** All scrapes (yours + others)
- **Center:** Scrape details and all scraped pages
- **Right:** Chat interface (text + voice tabs)

### Try the Chat!

1. Click on any completed scrape in the sidebar
2. Go to the "Text Chat" tab on the right
3. Ask questions about the scraped content
4. Get AI-powered answers with context from the website!

## Common URLs to Test

- `https://example.com` - Simple single page
- `https://docs.python.org` - Multi-page documentation
- `https://news.ycombinator.com` - News site with many links

## Troubleshooting

### "Missing Supabase environment variables"
→ Make sure `.env.local` exists with correct values
→ Restart the dev server after adding env vars

### Database errors
→ Verify the SQL schema was executed successfully
→ Check that anonymous auth is enabled

### Firecrawl errors
→ Verify your API key is correct
→ Check your Firecrawl plan limits

## Next Steps

- Try scraping different websites
- Test re-scraping functionality
- Try scraping more pages
- Check out the sidebar to see all scrapes
- Chat with the AI about scraped content
- Have multi-turn conversations
- Test the RAG (Retrieval-Augmented Generation) system!

## Need Help?

Check out the detailed guides:
- `SETUP.md` - Complete setup instructions
- `IMPLEMENTATION_SUMMARY.md` - Technical details
- Database schema in `database/schema/supabase-schema.sql`

Happy scraping! 🚀

