import { z } from "zod";

export const urlFormSchema = z.object({
  url: z
    .string()
    .min(1, { message: "Website URL is required" })
    .refine((val) => val.trim().length > 0, { message: "Website URL is required" })
    .refine(
      (val) => {
        const trimmed = val.trim();
        try {
          const url = new URL(trimmed);
          return ["http:", "https:"].includes(url.protocol);
        } catch {
          // If not a valid URL, check if it's a valid domain-like string
          // Requires at least one dot (e.g. example.com)
          const domainRegex =
            /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
          return domainRegex.test(trimmed);
        }
      },
      { message: "Please enter a valid URL (http/https) or domain name (e.g. example.com)." }
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
    .min(1, { message: "Website URL is required" })
    .refine((val) => val.trim().length > 0, { message: "Website URL is required" })
    .refine(
      (val) => {
        const trimmed = val.trim();
        try {
          const url = new URL(trimmed);
          return ["http:", "https:"].includes(url.protocol);
        } catch {
          // If not a valid URL, check if it's a valid domain-like string
          // Requires at least one dot (e.g. example.com)
          const domainRegex =
            /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
          return domainRegex.test(trimmed);
        }
      },
      { message: "Please enter a valid URL (http/https) or domain name (e.g. example.com)." }
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
