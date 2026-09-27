import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, VT323, Press_Start_2P, Fredoka } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { STYLE_BOOT_SCRIPT } from "@/components/theme-style";
import { SEO_KEYWORDS, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fonts for the optional visual styles (themes.css). preload: false — they
// only download when a student actually switches to that style.
const pixelFont = VT323({ variable: "--font-pixel", weight: "400", subsets: ["latin"], preload: false });
const pixelHeadingFont = Press_Start_2P({
  variable: "--font-pixel-heading",
  weight: "400",
  subsets: ["latin"],
  preload: false,
});
const vectorFont = Fredoka({ variable: "--font-vector", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "education",
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  verification: {
    // Paste the tokens from Google Search Console / Bing Webmaster into these env vars.
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4338ca",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${pixelFont.variable} ${pixelHeadingFont.variable} ${vectorFont.variable} h-full antialiased`}
    >
      <head>
        {/* Applies the saved theme style before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: STYLE_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider delayDuration={200}>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
            >
              Skip to main content
            </a>
            {children}
            <Toaster richColors position="top-right" />
            <PwaRegister />
            <PwaInstallPrompt />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
