import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headless Chromium for PDF export must not be bundled by Next — it's loaded
  // from node_modules at runtime (see src/server/pdf/puppeteer.ts).
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "puppeteer"],
  outputFileTracingIncludes: {
    "/api/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  experimental: {
    // Tree-shake icon/UI barrel imports so each page ships less JS.
    optimizePackageImports: ["lucide-react", "radix-ui", "date-fns", "recharts"],
  },
};

export default nextConfig;
