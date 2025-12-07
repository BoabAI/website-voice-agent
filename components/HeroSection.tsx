"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { scrapeFormSchema, type ScrapeFormValues } from "@/lib/validations";
import { startScraping, checkExistingScrape } from "@/app/actions/scrape";

import { HeroBackground } from "@/components/HeroBackground";

export function HeroSection() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<ScrapeFormValues>({
    resolver: zodResolver(scrapeFormSchema),
    defaultValues: {
      url: "",
      crawlType: "full",
      pageLimit: 10,
    },
  });

  const crawlType = form.watch("crawlType");

  async function onSubmit(data: ScrapeFormValues) {
    setIsLoading(true);

    try {
      // Check if URL already exists
      const existing = await checkExistingScrape(data.url);

      if (existing.exists && existing.scrape) {
        toast.info("This URL has already been scraped!", {
          description: "Redirecting to existing scrape...",
        });
        router.push(`/playground/${existing.scrape.id}`);
        setIsLoading(false);
        return;
      }

      // Start scraping
      const result = await startScraping(data);

      if (result.success) {
        if (result.existingScrapeId) {
          toast.info("This URL has already been scraped!", {
            description: "Redirecting to existing scrape...",
          });
          router.push(`/playground/${result.existingScrapeId}`);
        } else if (result.scrapeId) {
          toast.success("Scraping started!", {
            description: "Processing your website...",
          });
          router.push(`/playground/${result.scrapeId}`);
        }
      } else {
        toast.error("Failed to start scraping", {
          description: result.error || "Unknown error",
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Something went wrong", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden">
      <HeroBackground />

      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-white/60 backdrop-blur-xl px-4 py-2 text-sm font-medium text-blue-700 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-shadow"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>New: Real-time Chat History & Multi-modal Support</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl mb-8 leading-[1.1]"
          >
            Transform Your Website
            <br />
            <span className="relative inline-block mt-2">
              <span className="bg-linear-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                into a WebAgent
              </span>
              <Sparkles className="absolute -top-2 -right-10 w-8 h-8 text-amber-400 hidden sm:block animate-pulse" />
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-600 max-w-3xl mb-12 leading-relaxed font-medium"
          >
            Instantly ingest your content and deploy a{" "}
            <span className="text-blue-600 font-semibold">
              real-time voice AI
            </span>{" "}
            that knows your business inside out.{" "}
            <span className="text-slate-500">No coding required.</span>
          </motion.p>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full max-w-3xl"
          >
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-linear-to-r from-blue-600 via-violet-600 to-purple-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />

              {/* Card */}
              <div className="relative p-8 md:p-10 bg-white/90 backdrop-blur-2xl border border-slate-200/60 rounded-3xl shadow-2xl shadow-slate-500/10">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col gap-6"
                  >
                    <FormField
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-slate-700">
                            Website URL
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://your-website.com"
                              className="h-14 text-base bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="crawlType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-slate-700">
                            Crawl Type
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-3"
                            >
                              <div className="flex items-center space-x-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer">
                                <RadioGroupItem value="single" id="single" />
                                <Label
                                  htmlFor="single"
                                  className="font-medium cursor-pointer flex-1"
                                >
                                  <span className="text-slate-900">
                                    Single URL
                                  </span>
                                  <span className="block text-sm text-slate-500 font-normal mt-0.5">
                                    Scrape only this specific page
                                  </span>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer">
                                <RadioGroupItem value="full" id="full" />
                                <Label
                                  htmlFor="full"
                                  className="font-medium cursor-pointer flex-1"
                                >
                                  <span className="text-slate-900">
                                    Full Platform
                                  </span>
                                  <span className="block text-sm text-slate-500 font-normal mt-0.5">
                                    Crawl multiple pages from the website
                                  </span>
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {crawlType === "full" && (
                      <FormField
                        control={form.control}
                        name="pageLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-slate-700">
                              Page Limit
                            </FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(Number(value))
                              }
                              defaultValue={String(field.value)}
                            >
                              <FormControl>
                                <SelectTrigger className="h-14 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                                  <SelectValue placeholder="Select page limit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="10">10 pages</SelectItem>
                                <SelectItem value="20">20 pages</SelectItem>
                                <SelectItem value="50">50 pages</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      className="h-14 px-8 text-base font-semibold rounded-xl bg-linear-to-r from-blue-600 via-violet-600 to-purple-600 hover:from-blue-700 hover:via-violet-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Generate WebAgent
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>

            <p className="mt-6 text-sm text-slate-500 text-center flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 font-medium border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Free during beta
              </span>
              <span className="text-slate-400">·</span>
              <span>No credit card required</span>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
