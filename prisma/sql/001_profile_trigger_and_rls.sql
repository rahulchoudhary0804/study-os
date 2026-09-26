-- Study OS — run this in the Supabase SQL Editor AFTER `npx prisma migrate dev`
-- has created the tables below. This wires Supabase Auth to our `profiles`
-- table and locks every user-data table down with Row Level Security so a
-- user can only ever read/write their own rows (defense in depth — the
-- Next.js server also scopes every query by the authenticated user id).

-- 1. Auto-create a profiles row whenever someone signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, "createdAt", "updatedAt")
  values (new.id, new.email, now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Row Level Security — user-owned tables (only the owner can read/write).
alter table public.profiles            enable row level security;
alter table public.topic_progress      enable row level security;
alter table public.study_sessions      enable row level security;
alter table public.study_day_logs      enable row level security;
alter table public.daily_targets       enable row level security;
alter table public.daily_target_items  enable row level security;
alter table public.revisions           enable row level security;
alter table public.revision_history    enable row level security;
alter table public.question_attempts   enable row level security;
alter table public.notes               enable row level security;
alter table public.flashcards          enable row level security;
alter table public.flashcard_reviews   enable row level security;
alter table public.ai_conversations    enable row level security;
alter table public.ai_messages         enable row level security;
alter table public.ai_generations      enable row level security;
alter table public.streaks             enable row level security;
alter table public.user_achievements   enable row level security;

create policy "own profile"            on public.profiles            for all using (auth.uid() = id);
create policy "own topic progress"     on public.topic_progress      for all using (auth.uid() = "userId");
create policy "own study sessions"     on public.study_sessions      for all using (auth.uid() = "userId");
create policy "own study day logs"     on public.study_day_logs      for all using (auth.uid() = "userId");
create policy "own daily targets"      on public.daily_targets       for all using (auth.uid() = "userId");
create policy "own daily target items" on public.daily_target_items  for all using (
  exists (select 1 from public.daily_targets dt where dt.id = "dailyTargetId" and dt."userId" = auth.uid())
);
create policy "own revisions"          on public.revisions           for all using (auth.uid() = "userId");
create policy "own revision history"   on public.revision_history    for all using (
  exists (select 1 from public.revisions r where r.id = "revisionId" and r."userId" = auth.uid())
);
create policy "own question attempts"  on public.question_attempts   for all using (auth.uid() = "userId");
create policy "own notes"              on public.notes               for all using (auth.uid() = "userId");
create policy "own flashcards"         on public.flashcards          for all using (auth.uid() = "userId");
create policy "own flashcard reviews"  on public.flashcard_reviews   for all using (
  exists (select 1 from public.flashcards f where f.id = "flashcardId" and f."userId" = auth.uid())
);
create policy "own ai conversations"   on public.ai_conversations    for all using (auth.uid() = "userId");
create policy "own ai messages"        on public.ai_messages         for all using (
  exists (select 1 from public.ai_conversations c where c.id = "conversationId" and c."userId" = auth.uid())
);
create policy "own ai generations"     on public.ai_generations      for all using (auth.uid() = "userId");
create policy "own streak"             on public.streaks             for all using (auth.uid() = "userId");
create policy "own achievements"       on public.user_achievements   for all using (auth.uid() = "userId");

-- 3. Syllabus/content tables — readable by any authenticated user, writable
--    only via the service-role key (admin CMS server actions use the service
--    role client, which bypasses RLS entirely, so no write policy is added).
alter table public.exams        enable row level security;
alter table public.subjects     enable row level security;
alter table public.chapters     enable row level security;
alter table public.topics       enable row level security;
alter table public.subtopics    enable row level security;
alter table public.questions    enable row level security;
alter table public.achievements enable row level security;

create policy "read exams"        on public.exams        for select using (true);
create policy "read subjects"     on public.subjects     for select using (true);
create policy "read chapters"     on public.chapters     for select using (true);
create policy "read topics"       on public.topics       for select using (true);
create policy "read subtopics"    on public.subtopics    for select using (true);
create policy "read questions"    on public.questions    for select using (true);
create policy "read achievements" on public.achievements for select using (true);

-- Users may also create their own USER_CREATED questions.
create policy "insert own questions" on public.questions for insert with check (auth.uid() = "createdByUserId");
