"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  Globe,
  XCircle,
  FileText,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScrapeWithPages } from "@/types/scrape";
import { cn } from "@/lib/utils";

interface AgentProgressViewProps {
  scrape: ScrapeWithPages;
}

export function AgentProgressView({ scrape }: AgentProgressViewProps) {
  const router = useRouter();

  // Poll for updates
  useEffect(() => {
    if (scrape.status === "processing" || scrape.status === "pending") {
      const interval = setInterval(() => {
        router.refresh();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [scrape.status, router]);

  const domain = new URL(scrape.url).hostname;
  const isProcessing = scrape.status === "processing";
  const isFailed = scrape.status === "failed";
  // Treat pending as processing for UI purposes
  const isActive =
    scrape.status === "processing" || scrape.status === "pending";
  const pagesProcessed = scrape.pages_scraped || 0;

  // Get current URL from metadata
  const currentUrl =
    (scrape.metadata as any)?.current_processing_url ||
    (scrape.metadata as any)?.current_page_url ||
    scrape.url;

  // Get recently processed pages (last 5)
  const recentPages = [...(scrape.scraped_pages || [])]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  if (isFailed) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-8 bg-gray-50/50">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Creation Failed
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              {scrape.error_message || "Unable to process this website"}
            </p>
          </div>
          <Button
            onClick={() => router.push("/playground")}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 md:p-12 bg-gray-50/50 font-sans">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header Status */}
        <div className="text-center space-y-6">
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
            <div className="relative w-20 h-20 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
              Training Your Agent
            </h2>
            <p className="text-gray-500 text-lg">
              <span>
                Learning from{" "}
                <span className="text-gray-900 font-medium">{domain}</span>
              </span>
            </p>
          </div>
        </div>

        {/* Current Activity Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm shadow-gray-100/50"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
              <Globe className="w-5 h-5 text-blue-600 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">
                  Processing Page
                </p>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <p className="text-sm text-gray-500 font-mono truncate bg-gray-50/50 p-2 rounded-lg border border-gray-100/50">
                {currentUrl}
              </p>
              <div className="flex items-center gap-2 pt-1">
                {scrape.current_step === "generating_embeddings" ? (
                  <>
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    <span className="text-xs text-purple-600 font-medium">
                      Generating Knowledge...
                    </span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-blue-600 font-medium">
                      Extracting Content...
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Live Progress Feed */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-sm font-medium text-gray-600">
                Processed Pages ({pagesProcessed})
              </p>
            </div>
          </div>

          <div className="space-y-2 relative min-h-[100px]">
            <AnimatePresence mode="popLayout">
              {recentPages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl"
                >
                  Waiting for first page...
                </motion.div>
              ) : (
                recentPages.map((page) => (
                  <motion.div
                    key={page.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-blue-100/50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate group-hover:text-gray-900 transition-colors">
                        {page.title || "Untitled Page"}
                      </p>
                      <p className="text-xs text-gray-400 truncate font-mono mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        {new URL(page.url).pathname}
                      </p>
                    </div>
                    <span className="text-xs text-gray-300 font-mono tabular-nums">
                      {new Date(page.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {pagesProcessed > 5 && (
            <p className="text-center text-xs text-gray-400 pt-2">
              + {pagesProcessed - 5} more pages processed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
