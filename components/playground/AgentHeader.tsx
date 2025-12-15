"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  PlusCircle,
  Globe,
  Calendar,
  FileText,
  MoreVertical,
  ExternalLink,
  Trash2,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ScrapeWithPages } from "@/types/scrape";
import { formatDistanceToNow } from "date-fns";
import { ScrapeRefreshDialog } from "./ScrapeRefreshDialog";
import { ScrapeMapDialog } from "./ScrapeMapDialog";

interface AgentHeaderProps {
  scrape: ScrapeWithPages;
  onClearChat?: () => void;
  onRefreshStart?: (
    promise: Promise<any>,
    selectedPages: { title?: string; url: string; id: string }[]
  ) => void;
}

export function AgentHeader({ scrape, onClearChat, onRefreshStart }: AgentHeaderProps) {
  const [isScrapeMoreOpen, setIsScrapeMoreOpen] = useState(false);
  const [showPagesDialog, setShowPagesDialog] = useState(false);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const router = useRouter();

  const hostname = new URL(scrape.url).hostname;

  return (
    <>
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b bg-white/80 backdrop-blur-sm z-20 sticky top-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">{hostname}</h2>
              <a
                href={scrape.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDistanceToNow(new Date(scrape.created_at), {
                  addSuffix: true,
                })}
              </span>
              <button
                onClick={() => setShowPagesDialog(true)}
                className="flex items-center gap-1 hover:text-blue-600 hover:underline transition-colors cursor-pointer"
              >
                <FileText className="w-3 h-3" />
                {scrape.pages_scraped} pages
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setShowPagesDialog(true)}
                className="cursor-pointer"
              >
                <List className="w-4 h-4 mr-2" />
                View Crawled Pages
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowRefreshDialog(true)}
                className="cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Pages
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsScrapeMoreOpen(true)}
                className="cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Map & Scrape More
              </DropdownMenuItem>
              {onClearChat && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onClearChat}
                    className="text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Chat History
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Scrape Refresh Dialog */}
      <ScrapeRefreshDialog
        scrape={scrape}
        open={showRefreshDialog}
        onOpenChange={setShowRefreshDialog}
        onRefreshStart={onRefreshStart}
      />

      {/* Map & Scrape Dialog */}
      <ScrapeMapDialog
        scrapeId={scrape.id}
        scrapeUrl={scrape.url}
        open={isScrapeMoreOpen}
        onOpenChange={setIsScrapeMoreOpen}
      />

      {/* Crawled Pages Dialog */}
      <Dialog open={showPagesDialog} onOpenChange={setShowPagesDialog}>
        <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Crawled Pages</DialogTitle>
            <DialogDescription>
              {scrape.scraped_pages.length} pages indexed from {hostname}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-4 pr-2 -mr-2">
            {scrape.scraped_pages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No pages scraped yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scrape.scraped_pages.map((page, index) => (
                  <div
                    key={page.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-100/50 transition-colors group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center mt-0.5">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate pr-4">
                          {page.title || "Untitled Page"}
                        </h4>
                        <p className="text-xs text-gray-500 truncate font-mono mt-0.5">
                          {page.url}
                        </p>
                      </div>
                    </div>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                      title="Open page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowPagesDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
