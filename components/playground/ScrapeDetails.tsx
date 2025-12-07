"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { ScrapeWithPages, ScrapedPage } from "@/types/scrape";
import { reScrapeSite, scrapMore } from "@/app/actions/scrape";
import { cn } from "@/lib/utils";
import { ChatInterface } from "./ChatInterface";

interface ScrapeDetailsProps {
  scrape: ScrapeWithPages;
}

export function ScrapeDetails({ scrape }: ScrapeDetailsProps) {
  const [isReScraping, setIsReScraping] = useState(false);
  const [isScrapingMore, setIsScrapingMore] = useState(false);
  const [additionalPages, setAdditionalPages] = useState("10");
  const [selectedPage, setSelectedPage] = useState<ScrapedPage | null>(null);
  const router = useRouter();

  // Auto-refresh when scrape is processing or pending
  useEffect(() => {
    if (scrape.status === "processing" || scrape.status === "pending") {
      console.log("[ScrapeDetails] Status is", scrape.status, "- setting up polling");
      const interval = setInterval(() => {
        console.log("[ScrapeDetails] Refreshing data...");
        router.refresh();
      }, 3000); // Poll every 3 seconds

      return () => {
        console.log("[ScrapeDetails] Clearing polling interval");
        clearInterval(interval);
      };
    }
  }, [scrape.status, router]);

  const handleReScrape = async () => {
    setIsReScraping(true);
    try {
      const result = await reScrapeSite(scrape.id);
      if (result.success && result.scrapeId) {
        toast.success("Re-scraping started!", {
          description: "Creating a new scrape with the same URL...",
        });
        router.push(`/playground/${result.scrapeId}`);
        router.refresh();
      } else {
        toast.error("Failed to re-scrape", {
          description: result.error || "Unknown error",
        });
      }
    } catch (error) {
      toast.error("Something went wrong", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsReScraping(false);
    }
  };

  const handleScrapMore = async () => {
    setIsScrapingMore(true);
    try {
      const result = await scrapMore(scrape.id, Number(additionalPages));
      if (result.success && result.scrapeId) {
        toast.success("Scraping more pages started!", {
          description: `Crawling ${additionalPages} additional pages...`,
        });
        router.push(`/playground/${result.scrapeId}`);
        router.refresh();
      } else {
        toast.error("Failed to scrape more", {
          description: result.error || "Unknown error",
        });
      }
    } catch (error) {
      toast.error("Something went wrong", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsScrapingMore(false);
    }
  };

  const getStatusBadge = () => {
    switch (scrape.status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Processing
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Column: Scrape Info & Pages List */}
      <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto pr-2">
        {/* Header Card */}
        <Card className="p-6 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <Globe className="w-6 h-6 text-primary" />
                <div>
                  <h1 className="text-xl font-bold truncate max-w-[200px]">{new URL(scrape.url).hostname}</h1>
                  <a
                    href={scrape.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mt-1 truncate max-w-[200px]"
                  >
                    {scrape.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Status:</span>
                  {getStatusBadge()}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Pages:</span>
                  <span className="font-medium">{scrape.pages_scraped}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={handleReScrape}
              disabled={isReScraping || scrape.status === "processing"}
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
            >
              {isReScraping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Scrape Again
            </Button>

            {scrape.crawl_type === "full" && scrape.status === "completed" && (
              <div className="flex gap-2">
                <Select value={additionalPages} onValueChange={setAdditionalPages}>
                  <SelectTrigger className="w-[100px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">+10 pages</SelectItem>
                    <SelectItem value="20">+20 pages</SelectItem>
                    <SelectItem value="50">+50 pages</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={handleScrapMore}
                  disabled={isScrapingMore}
                  variant="outline"
                  size="sm"
                  className="flex-1 justify-start gap-2"
                >
                  {isScrapingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlusCircle className="w-4 h-4" />
                  )}
                  Scan More
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Scraped Pages List */}
        <Card className="flex-1 p-4 flex flex-col min-h-0">
          <h2 className="text-sm font-semibold mb-4">
            Scraped Pages ({scrape.scraped_pages.length})
          </h2>

          <div className="flex-1 overflow-y-auto min-h-[200px]">
            {scrape.scraped_pages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                {scrape.status === "processing" ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <p>Scraping in progress...</p>
                  </div>
                ) : (
                  <p>No pages scraped yet.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {scrape.scraped_pages.map((page, index) => (
                  <div
                    key={page.id}
                    onClick={() => setSelectedPage(page)}
                    className="flex items-start gap-2 p-2 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium mt-0.5">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {page.title && (
                        <div className="font-medium text-xs mb-0.5 truncate">{page.title}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground truncate">
                        {page.url}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Right Column: Chat Interface */}
      <div className="lg:col-span-2 h-full min-h-0">
        <ChatInterface scrapeId={scrape.id} />
      </div>

      {/* Content Viewer Dialog */}
      <Dialog open={!!selectedPage} onOpenChange={(open) => !open && setSelectedPage(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedPage?.title || "Scraped Content"}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <a
                href={selectedPage?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                {selectedPage?.url}
                <ExternalLink className="w-3 h-3" />
              </a>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-4">
            {selectedPage?.markdown ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-lg">
                  {selectedPage.markdown}
                </pre>
              </div>
            ) : selectedPage?.content ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div 
                  className="text-xs"
                  dangerouslySetInnerHTML={{ __html: selectedPage.content.slice(0, 50000) }}
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No content available
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              {selectedPage?.content?.length.toLocaleString()} characters total
            </div>
            <Button onClick={() => setSelectedPage(null)} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
