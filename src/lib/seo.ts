/**
 * Single source of truth for search/answer-engine metadata (SEO + AEO + GEO).
 *
 * Note on keywords: Google ignores <meta name="keywords"> and penalises
 * stuffing, so relevance comes from real content (the public /syllabus pages,
 * headings, FAQs and JSON-LD). The list below is kept focused and genuinely
 * relevant — it still helps Bing/Yandex and gives AI crawlers context.
 */
export const SITE_NAME = "Smart Padhai";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://smartpadhai.vercel.app").replace(/\/$/, "");
export const SITE_TAGLINE = "AI Study Planner for JEE Main 2027 & RBSE Class 12 Board";
export const SITE_DESCRIPTION =
  "Smart Padhai is a free AI study planner for JEE Main 2027 and RBSE Class 12 (Rajasthan Board) students — priority-wise chapters with marks and question weightage, NCERT PDFs, AI practice questions, notes, spaced revision, daily study plans, streaks and progress analytics for Physics, Chemistry and Maths.";

export const SEO_KEYWORDS = [
  // brand
  "Smart Padhai", "smart padhai app", "smartpadhai", "smart padhai jee", "smart padhai rbse",
  // JEE
  "JEE Main 2027", "JEE Main 2027 syllabus", "JEE Main syllabus", "JEE Main chapter wise weightage",
  "JEE Main important chapters", "JEE Main preparation", "JEE Main study plan", "JEE Main timetable",
  "JEE Main PYQ", "JEE Main previous year questions", "JEE Main practice questions", "JEE Main mock test",
  "JEE Main physics chapter wise weightage", "JEE Main chemistry chapter wise weightage",
  "JEE Main maths chapter wise weightage", "JEE Main high weightage chapters", "JEE Main priority chapters",
  "JEE Main 2027 preparation strategy", "JEE Main revision plan", "JEE Main 100 days plan", "JEE Mains",
  "JEE Mains 2027", "IIT JEE preparation", "NTA JEE Main", "JEE Main class 12 chapters", "JEE Main class 11 chapters",
  "how to crack JEE Main", "JEE Main self study", "JEE Main study app", "free JEE preparation app",
  // RBSE
  "RBSE Class 12", "RBSE Class 12 syllabus 2026-27", "RBSE Class 12 syllabus 2027", "RBSE 12th syllabus",
  "Rajasthan Board Class 12", "RBSE Class 12 marking scheme", "RBSE Class 12 blueprint", "RBSE chapter wise marks",
  "RBSE Class 12 Physics", "RBSE Class 12 Chemistry", "RBSE Class 12 Maths", "RBSE Class 12 important questions",
  "RBSE board exam 2027", "RBSE model paper 2026", "Rajasthan Board 12th science", "BSER Ajmer Class 12",
  "RBSE 12th physics chapter wise marks", "RBSE 12th chemistry chapter wise marks", "RBSE 12th maths chapter wise marks",
  "RBSE practical marks", "RBSE board preparation", "RBSE toppers strategy",
  // Hindi / Hinglish
  "राजस्थान बोर्ड कक्षा 12", "आरबीएसई 12वीं सिलेबस", "जेईई मेन 2027", "जेईई मेन सिलेबस", "12वीं भौतिक विज्ञान",
  "12वीं रसायन विज्ञान", "12वीं गणित", "board exam ki taiyari", "JEE ki taiyari kaise kare", "padhai kaise kare",
  "smart study tips", "study plan in hindi", "RBSE 12th ki taiyari",
  // NCERT / board
  "NCERT Class 12 Physics PDF", "NCERT Class 12 Chemistry PDF", "NCERT Class 12 Maths PDF", "NCERT Class 11 PDF",
  "NCERT solutions", "CBSE Class 12", "Class 12 board exam", "Class 12 science", "PCM",
  // features
  "AI study planner", "AI tutor", "AI doubt solver", "AI study assistant", "study tracker", "study timer",
  "pomodoro timer for students", "spaced repetition", "revision tracker", "daily study plan", "study streak",
  "study analytics", "weak topic analysis", "AI generated questions", "AI notes", "formula sheet PDF",
  "study app for class 12", "best study app India", "free study planner app",
  // physics chapters
  "Electric Charges and Fields", "Electrostatic Potential and Capacitance", "Current Electricity",
  "Moving Charges and Magnetism", "Magnetism and Matter", "Electromagnetic Induction", "Alternating Current",
  "Electromagnetic Waves", "Ray Optics and Optical Instruments", "Wave Optics", "Dual Nature of Radiation and Matter",
  "Atoms", "Nuclei", "Semiconductor Electronics", "Rotational Motion", "Laws of Motion", "Thermodynamics",
  "Kinematics", "Gravitation", "Oscillations and Waves",
  // chemistry chapters
  "Solutions chemistry", "Electrochemistry", "Chemical Kinetics", "d and f Block Elements", "Coordination Compounds",
  "Haloalkanes and Haloarenes", "Alcohols Phenols and Ethers", "Aldehydes Ketones and Carboxylic Acids", "Amines",
  "Biomolecules", "Chemical Bonding", "Equilibrium", "GOC organic chemistry", "Hydrocarbons", "p Block Elements",
  // maths chapters
  "Relations and Functions", "Inverse Trigonometric Functions", "Matrices", "Determinants",
  "Continuity and Differentiability", "Application of Derivatives", "Integrals", "Application of Integrals",
  "Differential Equations", "Vector Algebra", "Three Dimensional Geometry", "Linear Programming", "Probability",
  "Complex Numbers", "Sequence and Series", "Binomial Theorem", "Permutations and Combinations", "Conic Sections",
];

/** Serialises JSON-LD safely for a <script type="application/ld+json"> tag (no `</script>` injection). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const ORGANIZATION_LD = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icons/icon-512.png`,
};

export const WEBSITE_LD = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  alternateName: ["SmartPadhai", "Smart Padhai App"],
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: ["en-IN", "hi-IN"],
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export const APP_LD = {
  "@type": ["WebApplication", "MobileApplication"],
  "@id": `${SITE_URL}/#app`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Android, Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  audience: { "@type": "EducationalAudience", educationalRole: "student", audienceType: "Class 11–12, JEE Main aspirants" },
  downloadUrl: `${SITE_URL}/downloads/smart-padhai.apk`,
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export const HOME_FAQ: { q: string; a: string }[] = [
  {
    q: "What is Smart Padhai?",
    a: "Smart Padhai is a free AI study planner for JEE Main 2027 and RBSE Class 12 students. It ranks every chapter by priority (marks and question weightage), builds daily study plans, generates practice questions and notes with AI, links the exact NCERT chapter PDF for every topic, and tracks revision, streaks and progress.",
  },
  {
    q: "Which chapters carry the most marks in RBSE Class 12 2026-27?",
    a: "As per the RBSE 2026–27 syllabus: Maths — Integrals (12 marks), Continuity & Differentiability, 3D Geometry and Probability (8 each); Physics — Ray Optics and Semiconductor Electronics (6 each); Chemistry — Aldehydes, Ketones & Carboxylic Acids (7), then Solutions, Electrochemistry, Chemical Kinetics, Haloalkanes and Alcohols (6 each).",
  },
  {
    q: "Which are the highest weightage chapters for JEE Main 2027?",
    a: "Based on 2024–2026 papers: Physics — Electrostatics, Current Electricity, Magnetism, EMI & AC, Optics and Rotational Motion (≈2 questions each); Chemistry — Coordination Compounds, Chemical Bonding, Equilibrium, GOC, Electrochemistry and Aldehydes-Ketones (≈2 each); Maths — Calculus, Coordinate Geometry (≈3 each), Matrices, Complex Numbers, Sequences, 3D and Probability (≈2 each). Each question carries 4 marks.",
  },
  {
    q: "Is the JEE Main 2027 syllabus released?",
    a: "NTA publishes the JEE Main syllabus in the information bulletin. Until the 2027 bulletin is out, the latest official (2026) Paper-1 syllabus applies; Smart Padhai follows it and will update when NTA releases changes.",
  },
  {
    q: "Can I prepare for RBSE board and JEE Main together?",
    a: "Yes. Most Class 12 chapters overlap. Smart Padhai shows both the RBSE marks and the JEE question weightage for each chapter, so you can study the concept once and practise board-style answers and JEE-style MCQs together.",
  },
  {
    q: "Is Smart Padhai free and available on Android?",
    a: "Yes — it's free to use in the browser and as an Android app (APK download), and works on phones, tablets and laptops.",
  },
];
