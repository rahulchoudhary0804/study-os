/**
 * One-off dev utility: creates (or updates) a pre-confirmed Supabase Auth user.
 * Useful when local/dev email delivery isn't configured, so the normal
 * signup + email-confirmation flow can't complete.
 *
 * Usage — set these in .env.local (or export them in your own shell right
 * before running; never pass a password as a CLI argument, since that puts
 * it in shell history and process listings):
 *   SEED_USER_EMAIL=you@example.com
 *   SEED_USER_PASSWORD=your-password
 * Then:
 *   node scripts/create-user.js
 *
 * Every value here — including the target account's own email/password —
 * comes only from environment variables. Nothing is hardcoded in this file.
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const email = process.env.SEED_USER_EMAIL;
const password = process.env.SEED_USER_PASSWORD;
if (!email || !password) {
  console.error("Set SEED_USER_EMAIL and SEED_USER_PASSWORD in .env.local, then run: node scripts/create-user.js");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

(async () => {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error && error.message.toLowerCase().includes("already been registered")) {
    console.log("User already exists — updating password instead.");
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list.users.find((u) => u.email === email);
    if (!existing) throw new Error("Could not find existing user to update");
    const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updateErr) throw updateErr;
    console.log("Password updated for", email, "( id:", existing.id, ")");
    return;
  }

  if (error) throw error;
  console.log("Created confirmed user:", created.user.id, created.user.email);
})().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
