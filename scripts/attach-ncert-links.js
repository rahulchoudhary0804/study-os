/**
 * One-off / idempotent data script: attaches official NCERT Class 12 chapter
 * PDF links to matching chapters already in the database.
 *
 * Every URL below was independently verified (HTTP 200, Content-Type:
 * application/pdf) directly against ncert.nic.in before being added here —
 * none are guessed or pattern-extrapolated. Chapters with no current NCERT
 * Class 12 equivalent (Class 11 topics, or content NCERT itself removed in
 * its own rationalization — e.g. p-Block Elements, Polymers, Surface
 * Chemistry, Solid State, Chemistry in Everyday Life, Isolation of Elements)
 * are intentionally left unlinked rather than guessed.
 *
 * Run with: node scripts/attach-ncert-links.js
 */
require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const NCERT = {
  // Physics Part I
  charges: { title: "Electric Charges and Fields", url: "https://ncert.nic.in/textbook/pdf/leph101.pdf" },
  potential: { title: "Electrostatic Potential and Capacitance", url: "https://ncert.nic.in/textbook/pdf/leph102.pdf" },
  current: { title: "Current Electricity", url: "https://ncert.nic.in/textbook/pdf/leph103.pdf" },
  moving: { title: "Moving Charges and Magnetism", url: "https://ncert.nic.in/textbook/pdf/leph104.pdf" },
  magnetism: { title: "Magnetism and Matter", url: "https://ncert.nic.in/textbook/pdf/leph105.pdf" },
  emi: { title: "Electromagnetic Induction", url: "https://ncert.nic.in/textbook/pdf/leph106.pdf" },
  ac: { title: "Alternating Current", url: "https://ncert.nic.in/textbook/pdf/leph107.pdf" },
  emwaves: { title: "Electromagnetic Waves", url: "https://ncert.nic.in/textbook/pdf/leph108.pdf" },
  // Physics Part II
  rayoptics: { title: "Ray Optics and Optical Instruments", url: "https://ncert.nic.in/textbook/pdf/leph201.pdf" },
  waveoptics: { title: "Wave Optics", url: "https://ncert.nic.in/textbook/pdf/leph202.pdf" },
  dualnature: { title: "Dual Nature of Radiation and Matter", url: "https://ncert.nic.in/textbook/pdf/leph203.pdf" },
  atoms: { title: "Atoms", url: "https://ncert.nic.in/textbook/pdf/leph204.pdf" },
  nuclei: { title: "Nuclei", url: "https://ncert.nic.in/textbook/pdf/leph205.pdf" },
  semiconductor: { title: "Semiconductor Electronics", url: "https://ncert.nic.in/textbook/pdf/leph206.pdf" },
  // Chemistry Part I
  solutions: { title: "Solutions", url: "https://ncert.nic.in/textbook/pdf/lech101.pdf" },
  electrochem: { title: "Electrochemistry", url: "https://ncert.nic.in/textbook/pdf/lech102.pdf" },
  kinetics: { title: "Chemical Kinetics", url: "https://ncert.nic.in/textbook/pdf/lech103.pdf" },
  dfblock: { title: "d- and f-Block Elements", url: "https://ncert.nic.in/textbook/pdf/lech104.pdf" },
  coordination: { title: "Coordination Compounds", url: "https://ncert.nic.in/textbook/pdf/lech105.pdf" },
  // Chemistry Part II
  haloalkanes: { title: "Haloalkanes and Haloarenes", url: "https://ncert.nic.in/textbook/pdf/lech201.pdf" },
  alcohols: { title: "Alcohols, Phenols and Ethers", url: "https://ncert.nic.in/textbook/pdf/lech202.pdf" },
  aldehydes: { title: "Aldehydes, Ketones and Carboxylic Acids", url: "https://ncert.nic.in/textbook/pdf/lech203.pdf" },
  amines: { title: "Amines", url: "https://ncert.nic.in/textbook/pdf/lech204.pdf" },
  biomolecules: { title: "Biomolecules", url: "https://ncert.nic.in/textbook/pdf/lech205.pdf" },
  // Maths Part I
  relations: { title: "Relations and Functions", url: "https://ncert.nic.in/textbook/pdf/lemh101.pdf" },
  invtrig: { title: "Inverse Trigonometric Functions", url: "https://ncert.nic.in/textbook/pdf/lemh102.pdf" },
  matrices: { title: "Matrices", url: "https://ncert.nic.in/textbook/pdf/lemh103.pdf" },
  determinants: { title: "Determinants", url: "https://ncert.nic.in/textbook/pdf/lemh104.pdf" },
  continuity: { title: "Continuity and Differentiability", url: "https://ncert.nic.in/textbook/pdf/lemh105.pdf" },
  aod: { title: "Application of Derivatives", url: "https://ncert.nic.in/textbook/pdf/lemh106.pdf" },
  // Maths Part II
  integrals: { title: "Integrals", url: "https://ncert.nic.in/textbook/pdf/lemh201.pdf" },
  aoi: { title: "Application of Integrals", url: "https://ncert.nic.in/textbook/pdf/lemh202.pdf" },
  diffeq: { title: "Differential Equations", url: "https://ncert.nic.in/textbook/pdf/lemh203.pdf" },
  vectors: { title: "Vector Algebra", url: "https://ncert.nic.in/textbook/pdf/lemh204.pdf" },
  threed: { title: "Three Dimensional Geometry", url: "https://ncert.nic.in/textbook/pdf/lemh205.pdf" },
  lpp: { title: "Linear Programming", url: "https://ncert.nic.in/textbook/pdf/lemh206.pdf" },
  probability: { title: "Probability", url: "https://ncert.nic.in/textbook/pdf/lemh207.pdf" },
};

// chapter name (exact, as seeded) -> array of NCERT keys it corresponds to
const MAP = {
  // JEE + RBSE Physics
  "Electrostatics": ["charges", "potential"],
  "Electric Charges and Fields": ["charges"],
  "Electrostatic Potential and Capacitance": ["potential"],
  "Current Electricity": ["current"],
  "Magnetic Effects of Current & Magnetism": ["moving", "magnetism"],
  "Moving Charges and Magnetism": ["moving"],
  "Magnetism and Matter": ["magnetism"],
  "Electromagnetic Induction & Alternating Current": ["emi", "ac"],
  "Electromagnetic Induction": ["emi"],
  "Alternating Current": ["ac"],
  "Electromagnetic Waves": ["emwaves"],
  "Ray Optics and Wave Optics": ["rayoptics", "waveoptics"],
  "Ray Optics and Optical Instruments": ["rayoptics"],
  "Wave Optics": ["waveoptics"],
  "Dual Nature of Radiation and Matter": ["dualnature"],
  "Atoms and Nuclei": ["atoms", "nuclei"],
  "Atoms": ["atoms"],
  "Nuclei": ["nuclei"],
  "Semiconductor Electronics": ["semiconductor"],

  // JEE + RBSE Chemistry
  "Solutions": ["solutions"],
  "Redox Reactions and Electrochemistry": ["electrochem"],
  "Electrochemistry": ["electrochem"],
  "Chemical Kinetics": ["kinetics"],
  "d- and f-Block Elements": ["dfblock"],
  "Coordination Compounds": ["coordination"],
  "Haloalkanes and Haloarenes": ["haloalkanes"],
  "Alcohols, Phenols and Ethers": ["alcohols"],
  "Aldehydes, Ketones and Carboxylic Acids": ["aldehydes"],
  "Amines": ["amines"],
  "Biomolecules": ["biomolecules"],

  // JEE Maths
  "Sets, Relations and Functions": ["relations"],
  "Matrices and Determinants": ["matrices", "determinants"],
  "Limits, Continuity, Differentiability & Applications of Derivatives": ["continuity", "aod"],
  "Integral Calculus (Indefinite, Definite & Area under Curve)": ["integrals", "aoi"],
  "Differential Equations": ["diffeq"],
  "Three Dimensional Geometry": ["threed"],
  "Vector Algebra": ["vectors"],
  "Statistics and Probability": ["probability"],
  "Trigonometry (Ratios, Identities & Equations)": ["invtrig"],

  // RBSE Maths (unit-named chapters)
  "Relations and Functions": ["relations"],
  "Algebra (Matrices & Determinants)": ["matrices", "determinants"],
  "Calculus — Continuity, Differentiability & Applications of Derivatives": ["continuity", "aod"],
  "Calculus — Integrals & Applications of Integrals": ["integrals", "aoi"],
  "Vectors and Three-Dimensional Geometry": ["vectors", "threed"],
  "Linear Programming": ["lpp"],
  "Probability": ["probability"],
};

(async () => {
  let matched = 0;
  let missed = [];

  for (const [chapterName, keys] of Object.entries(MAP)) {
    const links = keys.map((k) => NCERT[k]);
    const result = await prisma.chapter.updateMany({
      where: { name: chapterName },
      data: { ncertLinks: links },
    });
    if (result.count > 0) matched += result.count;
    else missed.push(chapterName);
  }

  console.log(`Attached NCERT links to ${matched} chapter rows.`);
  if (missed.length) console.log("No chapter matched these names (check spelling):", missed);
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
