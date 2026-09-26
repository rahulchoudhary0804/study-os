"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "study-os-install-dismissed-at";
const DISMISS_DAYS = 7;

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();

      let dismissedAt: number | null = null;
      try {
        const raw = localStorage.getItem(DISMISS_KEY);
        dismissedAt = raw ? Number(raw) : null;
      } catch {
        // localStorage unavailable (private mode etc.) — just show the prompt.
      }
      const recentlyDismissed = dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400_000;
      if (recentlyDismissed) return;

      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function onAppInstalled() {
      setVisible(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
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
        <p className="text-xs text-muted-foreground mt-0.5">
          Add it to your home screen for one-tap access, like a native app.
        </p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={install}>
            Install
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            Not now
          </Button>
        </div>
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground shrink-0">
        <X className="size-4" />
      </button>
    </div>
  );
}
