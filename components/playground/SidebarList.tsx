"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Scrape } from "@/types/scrape";

interface SidebarListProps {
  scrapes: Scrape[];
  isLoading: boolean;
  currentScrapeId?: string;
  isCollapsed: boolean;
  onNavigate?: () => void;
}

export function SidebarList({
  scrapes,
  isLoading,
  currentScrapeId,
  isCollapsed,
  onNavigate,
}: SidebarListProps) {
  return (
    <>
      {/* New Agent Button */}
      <div className="p-3 pb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/playground" className="block" onClick={onNavigate}>
              <Button
                variant={isCollapsed ? "ghost" : "default"}
                className={cn(
                  "w-full justify-start gap-2 transition-all duration-200",
                  isCollapsed
                    ? "px-0 justify-center h-10 w-10 rounded-xl"
                    : "bg-linear-to-r from-blue-600 via-violet-600 to-purple-600 hover:from-blue-700 hover:via-violet-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/20 h-10 rounded-lg font-medium"
                )}
              >
                <Plus
                  className={cn(
                    "w-4 h-4",
                    isCollapsed ? "text-gray-900" : "text-white"
                  )}
                />
                {!isCollapsed && <span>New Agent</span>}
              </Button>
            </Link>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">New Agent</TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Recent Agents List */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden flex flex-col mt-2">
          <div className="px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span>Your Agents</span>
            <div className="h-px bg-gray-100 flex-1" />
          </div>

          <ScrollArea className="flex-1">
            <div className="px-3 space-y-1 pb-4">
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-9 bg-gray-100 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : scrapes.length === 0 ? (
                <div className="px-2 py-8 text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Globe className="w-5 h-5 text-gray-300" />
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    No agents yet
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Create one to get started
                  </p>
                </div>
              ) : (
                scrapes.map((scrape) => {
                  const isActive = scrape.id === currentScrapeId;
                  const domain = new URL(scrape.url).hostname.replace(
                    "www.",
                    ""
                  );

                  return (
                    <Link
                      key={scrape.id}
                      href={`/playground/${scrape.id}`}
                      onClick={onNavigate}
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all group relative",
                          isActive
                            ? "bg-blue-50 text-blue-800 font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <div
                          className={cn(
                            "flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors border",
                            isActive
                              ? "bg-blue-500 border-blue-400 text-white"
                              : "bg-gray-50 border-gray-200 text-gray-500 group-hover:bg-gray-100 group-hover:border-gray-300 group-hover:text-gray-700"
                          )}
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm truncate transition-colors"
                            title={domain}
                          >
                            {domain}
                          </p>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </>
  );
}
