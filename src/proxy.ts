import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip Next internals, static files and PWA assets. manifest.json / sw.js /
    // assetlinks.json MUST stay public — if they redirect to /login the browser
    // never considers the app installable (the "Preparing…" install button).
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|\\.well-known|icons/|downloads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|apk|json|txt|xml|woff2?)$).*)",
  ],
};
