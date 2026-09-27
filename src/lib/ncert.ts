/**
 * Picks the NCERT chapter PDF(s) a *topic* belongs to.
 *
 * Several syllabus chapters span two NCERT chapters (JEE "Electrostatics" =
 * Electric Charges & Fields + Electrostatic Potential & Capacitance, "Atoms
 * and Nuclei", "Matrices and Determinants", Class 11 + 12 halves of a unit…).
 * Opening both PDFs — or the wrong one first — for a topic like "Capacitors"
 * is confusing, so each NCERT PDF (by its file code, e.g. "leph102") gets a
 * keyword list and a topic is matched to the PDF(s) whose keywords its name
 * contains. Codes/titles were verified against the actual ncert.nic.in PDFs.
 */
export interface NcertLink {
  title: string;
  url: string;
}

const KEYWORDS: Record<string, string[]> = {
  // Physics — Class 11
  keph102: ["straight line", "one dimension", "1d motion", "v-t", "x-t", "equations of motion"],
  keph103: ["projectile", "plane", "circular", "relative velocity"],
  keph201: ["stress", "strain", "young", "elastic", "modulus"],
  keph202: ["fluid", "bernoulli", "viscosity", "viscous", "surface tension", "continuity", "terminal", "stokes", "pressure", "capillar"],
  keph206: ["shm", "harmonic", "pendulum", "spring", "oscillat"],
  keph207: ["wave", "superposition", "standing", "sound", "beats", "string", "pipe"],
  // Physics — Class 12
  leph101: ["coulomb", "charge", "electric field", "flux", "gauss", "dipole", "field lines"],
  leph102: ["potential", "capacit", "dielectric", "equipotential", "conductor", "shielding"],
  leph104: ["biot", "ampere", "lorentz", "current loop", "galvanometer", "moving", "cyclotron", "charge in", "parallel current", "solenoid", "torque on"],
  leph105: ["matter", "material", "bar magnet", "dia", "para", "ferro", "earth", "hysteresis", "susceptib", "magnetisation"],
  leph106: ["faraday", "lenz", "induction", "inductance", "motional", "eddy", "flux", "generator"],
  leph107: ["lcr", "rms", "reactance", "impedance", "resonance", "power factor", "wattless", "transformer", "phasor", "alternating", "\\bac\\b"],
  leph201: ["lens", "mirror", "prism", "refraction", "reflection", "tir", "optical instrument", "microscope", "telescope", "dispersion", "sign convention"],
  leph202: ["ydse", "young", "double slit", "interference", "diffraction", "polari", "coherent", "huygens", "wavefront", "fringe"],
  leph204: ["bohr", "hydrogen", "spectr", "rutherford", "scattering"],
  leph205: ["nucle", "radioactiv", "decay", "binding", "mass defect", "fission", "fusion", "half-life"],
  // Chemistry
  kech201: ["redox", "oxidation number", "balancing"],
  lech102: ["nernst", "cell", "electrolysis", "conductance", "conductivity", "kohlrausch", "faraday", "gibbs", "emf", "electrode", "batter", "corrosion"],
  // Mathematics — Class 11
  kemh101: ["sets", "venn"],
  kemh102: ["domain", "range", "types of functions", "cartesian product"],
  kemh103: ["trigonometric equation", "general solution", "identities", "ratio", "triangle", "heights"],
  kemh109: ["straight line", "pair of lines", "angle between them", "slope"],
  kemh110: ["circle", "parabola", "ellipse", "hyperbola", "conic", "chord"],
  kemh112: ["limit", "indeterminate"],
  kemh113: ["mean", "variance", "standard deviation", "grouped", "statistic"],
  // Mathematics — Class 12
  lemh101: ["equivalence", "one-one", "onto", "bijective", "types of relations", "composition", "invertible"],
  lemh102: ["inverse trigonometric", "principal"],
  lemh103: ["matrix properties", "special matrices", "transpose", "symmetric", "operations"],
  lemh104: ["determinant", "cofactor", "minor", "area of triangle", "cramer", "system of linear", "consistency", "adjoint"],
  lemh105: ["continuity", "differentiab", "differentiation", "chain rule", "implicit", "parametric", "logarithmic"],
  lemh106: ["maxima", "minima", "tangent", "normal", "rate of change", "increasing", "decreasing", "monoton"],
  lemh201: ["integra", "partial fraction", "substitution", "by parts", "king", "fundamental theorem"],
  lemh202: ["area"],
  lemh205: ["line", "plane", "direction", "shortest", "skew"],
  lemh207: ["conditional", "bayes", "random variable", "distribution", "independent", "multiplication"],
};

function codeOf(url: string): string {
  return url.split("/").pop()?.replace(/\.pdf$/i, "") ?? url;
}

function score(topic: string, code: string): number {
  const keys = KEYWORDS[code];
  if (!keys) return 0;
  return keys.reduce((n, k) => {
    const hit = k.startsWith("\\b") ? new RegExp(k, "i").test(topic) : topic.includes(k);
    return n + (hit ? 1 : 0);
  }, 0);
}

/**
 * The NCERT PDF(s) for one topic: the best-matching chapter PDF(s) of its
 * syllabus chapter. Falls back to all of the chapter's PDFs only when the
 * topic name doesn't point at any one of them.
 */
export function ncertLinksForTopic(topicName: string, chapterLinks: NcertLink[]): NcertLink[] {
  if (chapterLinks.length <= 1) return chapterLinks;
  const topic = topicName.toLowerCase();
  const scored = chapterLinks.map((l) => ({ l, s: score(topic, codeOf(l.url)) }));
  const best = Math.max(...scored.map((x) => x.s));
  if (best === 0) return chapterLinks;
  return scored.filter((x) => x.s === best).map((x) => x.l);
}
