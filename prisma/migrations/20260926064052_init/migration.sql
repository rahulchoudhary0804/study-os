-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('NOT_STARTED', 'LEARNING', 'PRACTICING', 'COMPLETED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('FOCUS', 'SHORT_BREAK', 'LONG_BREAK');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('DUE', 'SNOOZED', 'DONE');

-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('AI_GENERATED', 'USER_CREATED', 'PYQ_METADATA');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'NUMERICAL', 'SUBJECTIVE');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "FlashcardRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "AIGenerationType" AS ENUM ('NOTES', 'QUESTIONS', 'PLAN', 'EXPLAIN', 'FLASHCARDS');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "targetExamId" UUID,
    "examDate" TIMESTAMP(3),
    "dailyHourGoal" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "minStreakMinutes" INTEGER NOT NULL DEFAULT 25,
    "preferredStudyTime" TEXT,
    "aiProviderOverride" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "examDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "description" TEXT,
    "importance" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "sourceRef" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "pyqTrend" JSONB,
    "mustKnow" JSONB,
    "questionPatterns" JSONB,
    "commonMistakes" JSONB,
    "prerequisites" JSONB,
    "connectedChapters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL,
    "chapterId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "formulae" JSONB,
    "concepts" JSONB,
    "questionPatterns" JSONB,
    "pyqTrend" JSONB,
    "mustKnow" JSONB,
    "commonMistakes" JSONB,
    "prerequisites" JSONB,
    "connectedTopics" JSONB,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtopics" (
    "id" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subtopics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_progress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "confidence" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "subjectId" UUID,
    "chapterId" UUID,
    "topicId" UUID,
    "sessionType" "SessionType" NOT NULL DEFAULT 'FOCUS',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_day_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "targetMet" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "study_day_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_targets" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "generatedByAI" BOOLEAN NOT NULL DEFAULT false,
    "aiRationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_target_items" (
    "id" UUID NOT NULL,
    "dailyTargetId" UUID NOT NULL,
    "subjectId" UUID,
    "chapterId" UUID,
    "topicId" UUID,
    "label" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_target_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'DUE',
    "lastRevisedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_history" (
    "id" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "revisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accuracyAtReview" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "revision_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "source" "QuestionSource" NOT NULL,
    "examYear" INTEGER,
    "questionText" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT,
    "explanation" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "marks" INTEGER,
    "conceptTested" TEXT,
    "sourceRef" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_attempts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "isCorrect" BOOLEAN,
    "userAnswer" TEXT,
    "timeTakenSeconds" INTEGER,
    "notes" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "topicId" UUID,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isAIGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcards" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "topicId" UUID,
    "noteId" UUID,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_reviews" (
    "id" UUID NOT NULL,
    "flashcardId" UUID NOT NULL,
    "rating" "FlashcardRating" NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextDueAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flashcard_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "contextTopicId" UUID,
    "title" TEXT NOT NULL DEFAULT 'New conversation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "AIGenerationType" NOT NULL,
    "topicId" UUID,
    "prompt" TEXT NOT NULL,
    "responseJson" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streaks" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "achievementId" UUID NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "exams_slug_key" ON "exams"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_examId_slug_key" ON "subjects"("examId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_subjectId_slug_key" ON "chapters"("subjectId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "topics_chapterId_slug_key" ON "topics"("chapterId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "topic_progress_userId_topicId_key" ON "topic_progress"("userId", "topicId");

-- CreateIndex
CREATE INDEX "study_sessions_userId_startedAt_idx" ON "study_sessions"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "study_day_logs_userId_date_key" ON "study_day_logs"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_targets_userId_date_key" ON "daily_targets"("userId", "date");

-- CreateIndex
CREATE INDEX "revisions_userId_dueDate_idx" ON "revisions"("userId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "revisions_userId_topicId_key" ON "revisions"("userId", "topicId");

-- CreateIndex
CREATE INDEX "questions_topicId_idx" ON "questions"("topicId");

-- CreateIndex
CREATE INDEX "question_attempts_userId_questionId_idx" ON "question_attempts"("userId", "questionId");

-- CreateIndex
CREATE INDEX "notes_userId_idx" ON "notes"("userId");

-- CreateIndex
CREATE INDEX "ai_generations_userId_type_topicId_idx" ON "ai_generations"("userId", "type", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "streaks_userId_key" ON "streaks"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_key_key" ON "achievements"("key");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "user_achievements"("userId", "achievementId");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_targetExamId_fkey" FOREIGN KEY ("targetExamId") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtopics" ADD CONSTRAINT "subtopics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_day_logs" ADD CONSTRAINT "study_day_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_targets" ADD CONSTRAINT "daily_targets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_target_items" ADD CONSTRAINT "daily_target_items_dailyTargetId_fkey" FOREIGN KEY ("dailyTargetId") REFERENCES "daily_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_target_items" ADD CONSTRAINT "daily_target_items_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_history" ADD CONSTRAINT "revision_history_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_contextTopicId_fkey" FOREIGN KEY ("contextTopicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
