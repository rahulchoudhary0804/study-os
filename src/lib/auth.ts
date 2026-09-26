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

/** Returns the Supabase auth user + our Profile row, or null if signed out. */
export async function getCurrentUser(): Promise<{ authId: string; email: string; profile: Profile } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const email = user.email ?? "";

  // The trigger in prisma/sql/001_profile_trigger_and_rls.sql creates this row
  // automatically on signup, but we upsert defensively in case it hasn't run
  // yet (e.g. local dev before the SQL migration was applied).
  let profile = await prisma.profile.upsert({
    where: { id: user.id },
    update: {},
    create: { id: user.id, email },
  });

  // Auto-promote to admin if this email is listed in ADMIN_EMAILS — re-checked
  // on every request so removing an email from the env var also revokes access,
  // without ever writing an email address into source code.
  const shouldBeAdmin = isAdminEmail(email);
  if (profile.isAdmin !== shouldBeAdmin) {
    profile = await prisma.profile.update({ where: { id: profile.id }, data: { isAdmin: shouldBeAdmin } });
  }

  return { authId: user.id, email, profile };
}

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
