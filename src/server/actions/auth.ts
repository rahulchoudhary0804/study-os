"use server";

import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Creates an already-confirmed account with the service-role key.
 *
 * The project's "Confirm email" setting makes supabase.auth.signUp() send a
 * confirmation email, and Supabase's built-in mailer only allows a few emails
 * per hour — so real students were hitting "email rate limit exceeded" and
 * couldn't sign up at all. Creating the user server-side sends no email; the
 * client then signs in with the same password immediately.
 */
export async function signUpAction(input: SignupInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  const { email, password, fullName } = parsed.data;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { ok: false, error: "Sign-up isn't configured on the server." };

  const admin = createAdminClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      // Accounts created before this fix may be stuck unconfirmed (their confirmation
      // email never arrived). Re-signing up with the same email finishes that account.
      // Confirmed accounts are never touched.
      const rows = await prisma.$queryRaw<{ id: string; email_confirmed_at: Date | null }[]>`
        select id::text as id, email_confirmed_at from auth.users where lower(email) = ${email.trim().toLowerCase()} limit 1`;
      const existing = rows[0];
      if (existing && !existing.email_confirmed_at) {
        const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (!updErr) return { ok: true };
      }
      return { ok: false, error: "An account with this email already exists — log in instead." };
    }
    if (msg.includes("invalid")) return { ok: false, error: "Enter a valid email address." };
    if (msg.includes("password")) return { ok: false, error: error.message };
    console.error("signUpAction failed", error);
    return { ok: false, error: "Couldn't create your account — please try again." };
  }

  // The DB trigger normally creates the profile; make sure it exists with the name.
  if (data.user) {
    await prisma.profile
      .upsert({
        where: { id: data.user.id },
        update: { fullName },
        create: { id: data.user.id, email: data.user.email ?? email, fullName },
      })
      .catch((e) => console.error("profile upsert after signup failed", e));
  }
  return { ok: true };
}
