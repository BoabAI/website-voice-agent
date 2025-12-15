"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  PlusCircle,
  Globe,
  Search,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMappablePagesAction,
  scrapeSelectedPagesAction,
} from "@/app/actions/scrape";
import { useRouter } from "next/navigation";
import type { MappedUrl } from "@/types/scrape";

interface ScrapeMapDialogProps {
  scrapeId: string;
  scrapeUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper to clean URL for display
function formatUrl(url: string) {
  try {
    // If URL is a JSON string, try to parse it
    if (url.startsWith("{") && url.endsWith("}")) {
      try {
        const parsed = JSON.parse(url);
        if (parsed.url) {
          return {
            domain: new URL(parsed.url).hostname,
            path: parsed.title || new URL(parsed.url).pathname,
            full: parsed.url,
            description: parsed.description,
          };
        }
      } catch (e) {
        // ignore parse error
      }
    }

    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;
    return {
      domain: urlObj.hostname,
      path: path.length > 1 ? path : "/",
      full: url,
    };
  } catch {
    return { domain: "", path: url, full: url };
  }
}

function PageCard({ 
  page, 
  isSelected, 
  onToggle 
}: { 
  page: MappedUrl; 
  isSelected: boolean; 
  onToggle: () => void 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const formatted = formatUrl(page.url);

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-lg border transition-all relative cursor-pointer
        ${isSelected 
          ? "bg-primary/5 border-primary ring-1 ring-primary" 
          : "bg-card hover:bg-accent/50 hover:border-primary/50"
        }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-3">
         <div className="flex-1 min-w-0">
           <div className="font-medium text-sm text-foreground mb-1 break-words">
             {formatted.path}
           </div>
           <div className="flex items-center gap-1.5 text-xs text-muted-foreground break-all">
             <Globe className="w-3 h-3 flex-shrink-0" />
             <span>{formatted.full}</span>
           </div>
         </div>
         <Checkbox
           checked={isSelected}
           onCheckedChange={onToggle}
           className="mt-1 flex-shrink-0"
         />
      </div>
      
      {formatted.description && (
        <div className="mt-1 border-t pt-2 border-border/50">
          <div className={`text-xs text-muted-foreground ${!isExpanded && "line-clamp-2"}`}>
            {formatted.description}
          </div>
          {formatted.description.length > 150 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-[10px] text-primary hover:underline mt-1 font-medium"
            >
              {isExpanded ? "Show Less" : "Read More"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ScrapeMapDialog({
  scrapeId,
  scrapeUrl,
  open,
  onOpenChange,
}: ScrapeMapDialogProps) {
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [mappablePages, setMappablePages] = useState<MappedUrl[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const router = useRouter();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPage(1);
      setMappablePages([]);
      setSelectedPages([]);
      setSearchQuery("");
      loadPages(1, "");
    }
  }, [open, scrapeId]);

  const loadPages = async (pageNum: number, search: string) => {
    setIsLoading(true);
    try {
      const result = await getMappablePagesAction(scrapeId, pageNum, search);
      if (result.success && result.data) {
        if (pageNum === 1) {
          setMappablePages(result.data.pages);
        } else {
          setMappablePages((prev) => [...prev, ...result.data!.pages]);
        }
        setHasMore(result.data.hasMore);
        setTotalCount(result.data.total);
      } else {
        toast.error("Failed to load pages", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Something went wrong loading pages");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent | React.ChangeEvent<HTMLInputElement>) => {
    if ((e as React.ChangeEvent).target) {
      setSearchQuery((e as React.ChangeEvent<HTMLInputElement>).target.value);
      // Debounce search here could be added for better performance
      return;
    }
    
    e.preventDefault();
    setPage(1);
    loadPages(1, searchQuery);
  };

  // Add debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadPages(1, searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPages(nextPage, searchQuery);
  };

  const handleSelectAll = () => {
    if (selectedPages.length === mappablePages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(mappablePages.map((p) => p.url));
    }
  };

  const handleTogglePage = (url: string) => {
    if (selectedPages.includes(url)) {
      setSelectedPages(selectedPages.filter((u) => u !== url));
    } else {
      setSelectedPages([...selectedPages, url]);
    }
  };

  const handleScrapeSelected = async () => {
    if (selectedPages.length === 0) return;

    setIsScraping(true);
    try {
      // Need to extract the actual URL if it's stored as JSON
      const realUrls = selectedPages.map(pageUrl => {
         try {
           if (pageUrl.startsWith("{") && pageUrl.endsWith("}")) {
             const parsed = JSON.parse(pageUrl);
             return parsed.url || pageUrl;
           }
         } catch (e) {}
         return pageUrl;
      });

      const result = await scrapeSelectedPagesAction(scrapeId, realUrls);
      if (result.success) {
        toast.success(
          `Started scraping ${result.count} page${result.count === 1 ? "" : "s"}`,
          {
            description: "The agent is now learning from the new pages.",
          }
        );
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error("Failed to start scraping", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Map & Scrape More Pages</DialogTitle>
          <DialogDescription>
            Discover and select additional pages from {new URL(scrapeUrl).hostname} to add to your agent's knowledge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pages..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              {isLoading && page === 1 ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Mapping website...
                </span>
              ) : (
                <span>
                  Found {totalCount} new pages • {selectedPages.length} selected
                </span>
              )}
            </div>
          </div>

          <div className="border rounded-md bg-muted/20">
            <ScrollArea className="h-[500px] p-4">
              {mappablePages.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                  <p>No new pages found</p>
                  <p className="text-xs">Try a different search or the site might be fully scraped.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {mappablePages.map((page) => (
                    <PageCard
                      key={page.id}
                      page={page}
                      isSelected={selectedPages.includes(page.url)}
                      onToggle={() => handleTogglePage(page.url)}
                    />
                  ))}
                  
                  {isLoading && page > 1 && (
                    <div className="col-span-full flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {!isLoading && hasMore && (
                    <div className="col-span-full pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleLoadMore}
                      >
                        Load More Pages
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isScraping}
          >
            Cancel
          </Button>
          <Button
            onClick={handleScrapeSelected}
            disabled={isScraping || selectedPages.length === 0}
            className="min-w-[140px]"
          >
            {isScraping ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4 mr-2" />
                Scrape Selected ({selectedPages.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
