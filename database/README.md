# Database

This folder contains all database-related files for the Web Voice Agent project.

## Folder Structure

### `schema/`

Contains the main database schema files:

- `supabase-schema.sql` - Complete database schema with tables, indexes, RLS policies, and views

### `migrations/`

Contains database migration files:

- `001_initial_schema.sql` - Initial migration for the scraping feature

## Schema Overview

The database consists of two main tables:

### `scrapes`

Stores metadata about website scraping jobs:

- `id` (UUID, Primary Key)
- `url` (TEXT) - Website URL
- `crawl_type` (TEXT) - 'single' or 'full'
- `page_limit` (INTEGER) - Max pages for full crawl
- `pages_scraped` (INTEGER) - Actual pages scraped
- `status` (TEXT) - 'pending', 'processing', 'completed', 'failed'
- `current_step` (TEXT) - 'analyzing', 'crawling', 'processing_pages', 'generating_embeddings', 'completed'
- `error_message` (TEXT) - Error details if failed
- `user_id` (UUID) - Anonymous user ID
- `metadata` (JSONB) - Additional data
- `created_at`, `updated_at` (TIMESTAMPTZ)

### `scraped_pages`

Stores the actual scraped content:

- `id` (UUID, Primary Key)
- `scrape_id` (UUID, Foreign Key) - References scrapes
- `url` (TEXT) - Page URL
- `title` (TEXT) - Page title
- `content` (TEXT) - Raw HTML content
- `markdown` (TEXT) - Markdown version
- `metadata` (JSONB) - Additional page data
- `created_at` (TIMESTAMPTZ)

## Security

- **Row Level Security (RLS)** enabled on all tables
- **Anonymous authentication** support
- Global read access, user-specific write access
- Cascading deletes for data integrity

## Views

- `scrapes_with_counts` - Scrapes with total page counts

## Usage

### Setting up Supabase

1. Create a Supabase project
2. Enable Anonymous Authentication
3. Run the schema from `schema/supabase-schema.sql`
4. Configure environment variables

### Development

For local development with Supabase CLI:

```bash
supabase start
supabase db push
```

For production deployments, run the migration in the Supabase dashboard.
