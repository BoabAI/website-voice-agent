import { z } from "zod";

export const urlFormSchema = z.object({
  url: z
    .string()
    .refine(
      (val) => {
        if (!val.trim()) return false;
        // If it's already a valid URL, accept it
        try {
          new URL(val);
          return true;
        } catch {
          // If not a valid URL, check if it's a valid domain-like string
          const domainRegex =
            /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
          return domainRegex.test(val.trim());
        }
      },
      { message: "Please enter a valid URL or domain name." }
    )
    .transform((val) => {
      // Normalize the URL
      const trimmed = val.trim();
      try {
        new URL(trimmed);
        return trimmed;
      } catch {
        // If no protocol, add https://
        return `https://${trimmed}`;
      }
    }),
});

export type UrlFormValues = z.infer<typeof urlFormSchema>;

export const scrapeFormSchema = z.object({
  url: z
    .string()
    .refine(
      (val) => {
        if (!val.trim()) return false;
        // If it's already a valid URL, accept it
        try {
          new URL(val);
          return true;
        } catch {
          // If not a valid URL, check if it's a valid domain-like string
          const domainRegex =
            /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
          return domainRegex.test(val.trim());
        }
      },
      { message: "Please enter a valid URL or domain name." }
    )
    .transform((val) => {
      // Normalize the URL
      const trimmed = val.trim();
      try {
        new URL(trimmed);
        return trimmed;
      } catch {
        // If no protocol, add https://
        return `https://${trimmed}`;
      }
    }),
  crawlType: z.enum(["single", "full"], {
    message: "Please select a crawl type.",
  }),
  pageLimit: z.number().int().min(1).max(100),
});

export type ScrapeFormValues = z.infer<typeof scrapeFormSchema>;
