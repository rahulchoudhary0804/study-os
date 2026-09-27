/** Copy for the public syllabus pages, keyed by exam slug. */
export const EXAM_INFO: Record<
  string,
  { title: string; short: string; year: string; intro: string; pattern: string[]; unit: "marks" | "questions" }
> = {
  "rbse-class-12": {
    title: "RBSE Class 12 Syllabus 2026-27",
    short: "RBSE Class 12",
    year: "Board Exam 2027",
    intro:
      "Complete Rajasthan Board (BSER Ajmer) Class 12 Science syllabus for the 2027 board exam — every chapter ranked by priority with its official chapter-wise marks, important topics, derivations and the NCERT chapter PDF.",
    pattern: [
      "Physics & Chemistry: 56-mark theory paper + 14 sessional + 30 practical = 100 marks.",
      "Mathematics: 80-mark theory paper + 20 sessional = 100 marks.",
      "Objective (MCQ/fill-in) → 1.5-mark short answers → 3–4 mark derivations and numericals, with internal choice.",
    ],
    unit: "marks",
  },
  "jee-main": {
    title: "JEE Main 2027 Syllabus",
    short: "JEE Main",
    year: "2027",
    intro:
      "Full JEE Main 2027 Paper-1 syllabus (Class 11 + 12) with chapter-wise weightage — how many questions each chapter typically gets, its priority, important topics and the NCERT chapter PDF.",
    pattern: [
      "Paper 1 (B.E./B.Tech): 75 questions — 25 each in Physics, Chemistry and Mathematics.",
      "+4 for a correct answer, −1 for a wrong MCQ; 300 marks in total.",
      "NTA does not publish chapter weightage — the question counts here are averages from 2024–2026 papers; any single shift can differ.",
    ],
    unit: "questions",
  },
};

export const PRIORITY_LABEL: Record<number, string> = {
  1: "Priority 1 — Must do",
  2: "Priority 2 — Very important",
  3: "Priority 3 — Important",
  4: "Priority 4 — Lower",
};
