"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Loader2, Globe, User, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getAllScrapesAction } from "@/app/actions/scrape";
import type { Scrape } from "@/types/scrape";
import { cn } from "@/lib/utils";

export function ScrapesSidebar({ currentScrapeId }: { currentScrapeId: string }) {
  const [scrapes, setScrapes] = useState<Scrape[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    loadScrapes();
  }, [pathname]); // Refresh on navigation only

  async function loadScrapes() {
    try {
      const result = await getAllScrapesAction();
      if (result.success && result.data) {
        setScrapes(result.data);
      }
    } catch (error) {
      console.error("Failed to load scrapes:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 dark:text-green-400";
      case "processing":
        return "text-blue-600 dark:text-blue-400";
      case "pending":
        return "text-yellow-600 dark:text-yellow-400";
      case "failed":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="w-80 border-r bg-muted/30 p-4 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-80 border-r bg-muted/30 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          All Scrapes
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {scrapes.length} {scrapes.length === 1 ? "scrape" : "scrapes"} total
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {scrapes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No scrapes yet. Start by scraping a website!
          </div>
        ) : (
          scrapes.map((scrape) => {
            const isActive = scrape.id === currentScrapeId;
            const domain = new URL(scrape.url).hostname;

            return (
              <Link key={scrape.id} href={`/playground/${scrape.id}`}>
                <Card
                  className={cn(
                    "p-3 cursor-pointer transition-all hover:shadow-md",
                    isActive
                      ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                      : "hover:bg-accent"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getStatusIcon(scrape.status)}</div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate" title={domain}>
                        {domain}
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        {scrape.crawl_type === "single" ? (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            Single page
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {scrape.pages_scraped} pages
                          </span>
                        )}
                      </div>

                      <div className={cn("text-xs mt-1 capitalize", getStatusColor(scrape.status))}>
                        {scrape.status}
                      </div>

                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(scrape.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

