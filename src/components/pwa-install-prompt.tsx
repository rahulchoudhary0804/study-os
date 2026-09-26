"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "study-os-install-dismissed-at";
const DISMISS_DAYS = 7;
// Covers phones and tablets (including portrait iPad); desktop stays reactive-only.
const MOBILE_OR_TABLET_QUERY = "(max-width: 1024px)";

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  const isAppleTouchUA = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ reports as "MacIntel" but is touch-capable, unlike real Macs.
  const isIPadOS13Plus = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isAppleTouchUA || isIPadOS13Plus;
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

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPreparing(false);
      setVisible(true);
    }

    function onAppInstalled() {
      setVisible(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    // On phones/tablets, show the prompt right away instead of waiting on the
    // browser's own engagement heuristics for beforeinstallprompt to fire.
    if (window.matchMedia(MOBILE_OR_TABLET_QUERY).matches) {
      if (isIOS()) {
        // No install API exists on iOS Safari — show tap-through instructions instead.
        setIosMode(true);
        setVisible(true);
      } else {
        // Show immediately; the Install button waits for the real prompt to be ready.
        setPreparing(true);
        setVisible(true);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function install() {
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
    <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-80 z-50 flex items-start gap-3 rounded-xl border-2 border-border bg-popover backdrop-blur-lg shadow-nb p-4">
      <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary shrink-0 border-2 border-border">
        <Download className="size-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install Study OS</p>
        {iosMode ? (
          <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1">
            Tap <Share className="size-3.5 inline" /> Share, then &quot;Add to Home Screen&quot;.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5">
            Add it to your home screen for one-tap access, like a native app.
          </p>
        )}
        <div className="flex gap-2 mt-3">
          {!iosMode && (
            <Button size="sm" onClick={install} disabled={!deferredPrompt}>
              {preparing && !deferredPrompt ? "Preparing…" : "Install"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={dismiss}>
            {iosMode ? "Got it" : "Not now"}
          </Button>
        </div>
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground shrink-0">
        <X className="size-4" />
      </button>
    </div>
  );
}
