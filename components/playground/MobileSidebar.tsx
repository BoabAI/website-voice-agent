"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Globe } from "lucide-react";
import { SidebarList } from "./SidebarList";
import type { Scrape } from "@/types/scrape";
import { TooltipProvider } from "@/components/ui/tooltip";

interface MobileSidebarProps {
  scrapes: Scrape[];
  isLoading: boolean;
  currentScrapeId?: string;
}

export function MobileSidebar({
  scrapes,
  isLoading,
  currentScrapeId,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden -ml-2">
          <Menu className="w-5 h-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 w-[280px] flex flex-col bg-white"
      >
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Navigate through your playground agents and history
        </SheetDescription>

        <div className="h-16 flex items-center px-4 border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-linear-to-r from-blue-600 via-violet-600 to-purple-600 text-white flex items-center justify-center mr-2.5 shadow-lg shadow-blue-500/20">
            <Globe className="w-4 h-4" />
          </div>
          <span className="font-semibold text-base text-gray-900 tracking-tight">
            WebAgent
          </span>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <TooltipProvider>
            <SidebarList
              scrapes={scrapes}
              isLoading={isLoading}
              currentScrapeId={currentScrapeId}
              isCollapsed={false}
              onNavigate={() => setOpen(false)}
            />
          </TooltipProvider>
        </div>
      </SheetContent>
    </Sheet>
  );
}
