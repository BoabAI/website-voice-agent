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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw, Globe } from "lucide-react";
import { toast } from "sonner";
import { refreshSelectedPages } from "@/app/actions/scrape";
import type { ScrapeWithPages } from "@/types/scrape";
import { useRouter } from "next/navigation";

interface ScrapeRefreshDialogProps {
  scrape: ScrapeWithPages;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefreshStart?: (
    promise: Promise<any>,
    selectedPages: { title?: string; url: string; id: string }[]
  ) => void;
}

export function ScrapeRefreshDialog({
  scrape,
  open,
  onOpenChange,
  onRefreshStart,
}: ScrapeRefreshDialogProps) {
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  // Reset selection when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setSelectedPages([]);
        setIsRefreshing(false);
      }, 300); // Wait for animation to finish
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSelectAll = () => {
    if (selectedPages.length === scrape.scraped_pages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(scrape.scraped_pages.map((p) => p.id));
    }
  };

  const handleTogglePage = (pageId: string) => {
    if (selectedPages.includes(pageId)) {
      setSelectedPages(selectedPages.filter((id) => id !== pageId));
    } else {
      setSelectedPages([...selectedPages, pageId]);
    }
  };

  const handleRefresh = async () => {
    if (selectedPages.length === 0) return;

    // Get selected pages details
    const pagesToRefresh = scrape.scraped_pages
      .filter((p) => selectedPages.includes(p.id))
      .map((p) => ({
        id: p.id,
        title: p.title || undefined,
        url: p.url,
      }));

    // Create the refresh promise
    const refreshPromise = (async () => {
      setIsRefreshing(true);
      try {
        const result = await refreshSelectedPages(scrape.id, selectedPages);
        if (result.success) {
          toast.success(
            `Refreshing ${result.count} page${result.count === 1 ? "" : "s"}...`
          );
          setSelectedPages([]);
          router.refresh();
          // We don't reset isRefreshing here to prevent UI flash
          // The parent component will handle the state or unmounting
        } else {
          toast.error("Failed to refresh pages", {
            description: result.error,
          });
          setIsRefreshing(false); // Only reset on failure
        }
      } catch (error) {
        toast.error("Something went wrong");
        setIsRefreshing(false); // Only reset on error
      }
    })();

    // Pass promise and selected pages to parent to track state
    onRefreshStart?.(refreshPromise, pagesToRefresh);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Refresh Knowledge Base</DialogTitle>
          <DialogDescription>
            Select pages to re-scrape and update. This will fetch fresh content
            and update the agent's knowledge.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-4 border-b">
          <div className="text-sm text-muted-foreground">
            {selectedPages.length} selected of {scrape.scraped_pages.length}{" "}
            pages
          </div>
          <Button variant="ghost" size="sm" onClick={handleSelectAll}>
            {selectedPages.length === scrape.scraped_pages.length
              ? "Deselect All"
              : "Select All"}
          </Button>
        </div>

        {/* Simple overflow-y-auto instead of ScrollArea */}
        <div className="flex-1 min-h-[300px] overflow-y-auto pr-4">
          <div className="space-y-2 py-2">
            {scrape.scraped_pages.map((page) => (
              <div
                key={page.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => handleTogglePage(page.id)}
              >
                <Checkbox
                  checked={selectedPages.includes(page.id)}
                  onCheckedChange={() => handleTogglePage(page.id)}
                  className="mt-1 flex-shrink-0"
                />
                {/* Horizontally scrollable content area */}
                <div 
                  className="flex-1 min-w-0 overflow-x-auto scrollbar-thin"
                >
                  <div className="w-max pr-4">
                    <h4 className="text-sm font-medium leading-none mb-1.5 whitespace-nowrap">
                      {page.title || "Untitled Page"}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                      <Globe className="w-3 h-3 flex-shrink-0" />
                      <span>{page.url}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRefreshing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing || selectedPages.length === 0}
            className="min-w-[140px]"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Selected
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
