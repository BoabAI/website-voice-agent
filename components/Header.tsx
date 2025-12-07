"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mic, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Header() {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm py-3"
          : "bg-transparent py-5"
      )}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          {/* Left side: Logo + Desktop Nav */}
          <div className="flex items-center gap-12">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 bg-linear-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 group-hover:scale-105 transition-all duration-300">
                <Mic className="w-5 h-5 text-white z-10" />
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">
                WebAgent
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="#features"
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors relative group"
              >
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full" />
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors relative group"
              >
                How it Works
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full" />
              </Link>
            </nav>
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center gap-4">
            {/* CTA Button */}
            <Button
              asChild
              size="sm"
              className="hidden md:inline-flex rounded-full px-6 font-semibold bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300"
            >
              <Link href="/playground">Playground</Link>
            </Button>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden hover:bg-slate-100/50"
                >
                  <Menu className="w-6 h-6 text-slate-700" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col gap-8 mt-8">
                  <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative w-10 h-10 bg-linear-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-blue-500/20">
                      <Mic className="w-5 h-5 text-white z-10" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-slate-900">
                      WebAgent
                    </span>
                  </Link>
                  <nav className="flex flex-col gap-4">
                    <Link
                      href="#features"
                      className="text-lg font-medium text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      Features
                    </Link>
                    <Link
                      href="#how-it-works"
                      className="text-lg font-medium text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      How it Works
                    </Link>
                    <Link
                      href="/playground"
                      className="text-lg font-semibold text-blue-600"
                    >
                      Playground
                    </Link>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
