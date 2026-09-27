import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Profile } from "@prisma/client";

/**
 * Reads the admin allowlist from the environment — never hardcoded in source.
 * Set ADMIN_EMAILS in .env as a comma-separated list, e.g.
 *   ADMIN_EMAILS=you@example.com,teammate@example.com
 */
function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/**
 * Returns the Supabase auth user + our Profile row, or null if signed out.
 *
 * Wrapped in React `cache()` so the layout, the page and any nested server
 * components share ONE auth check + profile query per request instead of
 * repeating it for each caller.
 */
export const getCurrentUser = cache(
  async (): Promise<{ authId: string; email: string; profile: Profile } | null> => {
    const supabase = await createClient();
    // Verifies the JWT locally with asymmetric signing keys (falls back to a
    // network check on legacy projects) — far cheaper than getUser().
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) return null;

    const userId = claims.sub;
    const email = typeof claims.email === "string" ? claims.email : "";

    // The trigger in prisma/sql/001_profile_trigger_and_rls.sql creates this row
    // automatically on signup; create it here only if it's genuinely missing.
    let profile =
      (await prisma.profile.findUnique({ where: { id: userId } })) ??
      (await prisma.profile.upsert({ where: { id: userId }, update: {}, create: { id: userId, email } }));

    // Auto-promote to admin if this email is listed in ADMIN_EMAILS — re-checked
    // on every request so removing an email from the env var also revokes access,
    // without ever writing an email address into source code.
    const shouldBeAdmin = isAdminEmail(email || profile.email);
    if (profile.isAdmin !== shouldBeAdmin) {
      profile = await prisma.profile.update({ where: { id: profile.id }, data: { isAdmin: shouldBeAdmin } });
    }

    return { authId: userId, email: email || profile.email, profile };
  }
);

/** Same as getCurrentUser but redirects to /login if signed out. Use in pages/layouts. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Use in server actions — throws instead of redirecting (actions can't redirect a fetch call). */
export async function requireUserAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
