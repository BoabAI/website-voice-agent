"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarList } from "./SidebarList";
import type { Scrape } from "@/types/scrape";

interface ModernSidebarProps {
  scrapes: Scrape[];
  isLoading: boolean;
  currentScrapeId?: string;
  className?: string;
}

export function ModernSidebar({
  scrapes,
  isLoading,
  currentScrapeId,
  className,
}: ModernSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <motion.div
        initial={false}
        animate={{
          width: isCollapsed ? "60px" : "260px",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "relative h-full bg-white border-r border-gray-200 flex flex-col z-20 overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-50">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-linear-to-r from-blue-600 via-violet-600 to-purple-600 text-white flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <span className="font-semibold text-base text-gray-900 tracking-tight">
                  WebAgent
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "h-7 w-7 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all",
              isCollapsed ? "mx-auto" : ""
            )}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </Button>
        </div>

        <SidebarList
          scrapes={scrapes}
          isLoading={isLoading}
          currentScrapeId={currentScrapeId}
          isCollapsed={isCollapsed}
        />

        {/* Footer User/Profile (Optional) */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-100 mt-auto">
            {/* Placeholder for user profile or settings if needed */}
          </div>
        )}
      </motion.div>
    </TooltipProvider>
  );
}
