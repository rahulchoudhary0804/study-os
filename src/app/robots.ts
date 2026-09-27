import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/** Public marketing + syllabus pages are crawlable; the logged-in app and APIs are not. */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = [
    "/api/", "/dashboard", "/plan", "/planner", "/study", "/subjects", "/ncert", "/notes", "/practice",
    "/revision", "/analytics", "/streak", "/assistant", "/export", "/settings", "/admin", "/auth/",
  ];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      // Answer engines / AI search crawlers are explicitly welcome on public pages (GEO).
      { userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Claude-SearchBot", "Google-Extended", "Bingbot", "Applebot"], allow: "/", disallow: privatePaths },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
