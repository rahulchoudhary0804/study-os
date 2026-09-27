"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const APK_URL = "/downloads/study-os.apk";

const DISMISS_KEY = "study-os-install-dismissed-at";
const DISMISS_DAYS = 7;
// Covers phones and tablets (including portrait iPad); desktop stays reactive-only.
const MOBILE_OR_TABLET_QUERY = "(max-width: 1024px)";

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  const isAppleTouchUA = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ reports as "MacIntel" but is touch-capable, unlike real Macs.
  const isIPadOS13Plus = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isAppleTouchUA || isIPadOS13Plus;
}

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const dismissedAt = raw ? Number(raw) : null;
    return !!dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400_000;
  } catch {
    return false;
  }
}

type Platform = "android" | "ios" | "other";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;
    const p: Platform = isAndroid() ? "android" : isIOS() ? "ios" : "other";
    setPlatform(p);

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function onAppInstalled() {
      setVisible(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    // Phones/tablets see the prompt right away: Android gets the APK download
    // (works immediately, no browser heuristics), iOS gets Add-to-Home-Screen steps.
    if (p !== "other" && window.matchMedia(MOBILE_OR_TABLET_QUERY).matches) setVisible(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function installPwa() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore — worst case the prompt just reappears next visit
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-80 z-50 flex items-start gap-3 rounded-xl border-2 border-border bg-popover shadow-nb p-4">
      <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary shrink-0 border-2 border-border">
        {platform === "android" ? <Smartphone className="size-4.5" /> : <Download className="size-4.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install Study OS</p>
        {platform === "ios" ? (
          <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1">
            Tap <Share className="size-3.5 inline" /> Share, then &quot;Add to Home Screen&quot;.
          </p>
        ) : platform === "android" ? (
          <p className="text-xs text-muted-foreground mt-0.5">
            Download the Android app, open the file, and tap Install. (Allow &quot;install unknown apps&quot; for your
            browser if asked.)
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5">
            Add it to your device for one-click access, like a native app.
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {platform === "android" && (
            <Button size="sm" asChild>
              <a href={APK_URL} download="StudyOS.apk" onClick={() => setTimeout(dismiss, 500)}>
                <Download className="size-3.5" /> Download App (APK)
              </a>
            </Button>
          )}
          {deferredPrompt && (
            <Button size="sm" variant={platform === "android" ? "outline" : "default"} onClick={installPwa}>
              {platform === "android" ? "Install web app" : "Install"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={dismiss}>
            {platform === "ios" ? "Got it" : "Not now"}
          </Button>
        </div>
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground shrink-0">
        <X className="size-4" />
      </button>
    </div>
  );
}
