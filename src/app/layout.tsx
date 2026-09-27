import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, VT323, Press_Start_2P, Fredoka } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { STYLE_BOOT_SCRIPT } from "@/components/theme-style";

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
  title: "Study OS — AI-Powered JEE Main + RBSE Class 12 Study Tracker",
  description: "Plan. Study. Practice. Improve.",
  manifest: "/manifest.json",
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
      lang="en"
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
