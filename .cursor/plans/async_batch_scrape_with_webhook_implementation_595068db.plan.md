---
name: Async Batch Scrape with Webhook Implementation
overview: Implement asynchronous batch scraping using Firecrawl webhooks to avoid Vercel timeouts and provide a consistent user experience. This involves updating the backend to initiate async jobs and handling the webhook callback to process results.
todos:
  - id: add-async-batch-scrape
    content: Add asyncBatchScrape function to lib/firecrawl.ts
    status: completed
  - id: update-refresh-action-async
    content: Update refreshSelectedPages in app/actions/scrape.ts to use async batch scrape with webhook
    status: completed
  - id: update-webhook-handler
    content: Update webhook handler in app/api/webhooks/firecrawl/route.ts to handle batch completion events
    status: completed
  - id: verify-frontend-polling
    content: Verify and adjust frontend polling behavior if necessary
    status: completed
---

