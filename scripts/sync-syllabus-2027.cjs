/**
 * Aligns the syllabus with the two 2026-27 priority handbooks:
 *   - "RBSE Class 12 Board — Complete Chapter & Topic Priority Guide"
 *     (official 2026–27 syllabus marks per chapter + board question formats)
 *   - "JEE Main — Class 12 Complete Chapter & Topic Priority Guide"
 *     (P1–P4 per chapter/topic from NTA 2026 syllabus + 2026 shift analyses)
 *
 * Idempotent and non-destructive:
 *   - chapters/topics are matched by slug (or listed aliases) and updated in place;
 *   - missing ones are created; nothing is hard-deleted;
 *   - RBSE Maths combined chapters are split into the official per-chapter
 *     units by MOVING their topics (so student progress is kept), then the
 *     empty combined chapter is soft-deleted (isDeleted = true);
 *   - chapters removed from the 2026–27 RBSE syllabus are soft-deleted.
 *
 *   node scripts/sync-syllabus-2027.cjs            # apply
 *   node scripts/sync-syllabus-2027.cjs --dry-run  # print what would change
 */
require("dotenv").config({ path: ".env.local", quiet: true });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry-run");

const slugify = (s) =>
  s
    .normalize("NFKD") // K₂Cr₂O₇ → K2Cr2O7
    .toLowerCase()
    .replace(/['".,()&]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const RBSE_SRC =
  "RBSE 2026–27 Class 12 syllabus (examination year 2027) chapter marks, cross-checked with the official 2025 and 2026 annual papers. Marks are syllabus allocation, not a fixed question count.";
const JEE_SRC =
  "NTA JEE Main 2026 Paper-1 syllabus + 2026 January/April shift analyses (Careers360, IITianForum, Competishun). Priority is a study-order aid, not official NTA weightage.";

const ncert = (code, title) => ({ title, url: `https://ncert.nic.in/textbook/pdf/${code}.pdf` });

// Board answer formats shared by every RBSE chapter.
const RBSE_FORMAT = {
  physics:
    "MCQ/fill-in (1 mark) for definitions, units & graphs · 1.5-mark short answers for compact numericals/diagrams · 3–4 mark derivations, multi-step numericals and labelled diagrams.",
  chemistry:
    "MCQ/fill-in (1 mark) for facts & formulae · 1.5-mark numericals, naming, structures, reasoning · 3–4 mark mechanisms, reactions and integrated numericals.",
  mathematics:
    "MCQ / 1-mark direct identities · 2-mark proofs & short calculations · long questions (internal choice) for multi-step calculus, vectors/3D, probability, LPP graphs.",
};

// ---------------------------------------------------------------------------
// RBSE CLASS 12 — official 2026–27 marks
// ---------------------------------------------------------------------------
const RBSE = {
  physics: [
    { slug: "electric-charges-and-fields", priority: 1, marks: 4,
      trend: "2025: flux unit, Coulomb-law dependence and dipole field (objective/short). 2026: charge–force ratio, flux/field concepts and dipole/Gauss-law derivations.",
      derivations: ["Dipole field on axial/equatorial line", "Gauss's law → field of infinite plane sheet", "Gauss's law → field of spherical shell / infinite wire"],
      mustKnow: ["Coulomb's law & superposition", "Electric flux and Gauss's law statement", "Dipole moment direction; axial vs equatorial field", "Charge properties & SI units"],
      mistakes: ["Units and powers of ten", "Sign/direction conventions for fields", "Writing a formula without defining symbols", "Skipping a requested diagram"],
      topics: [
        ["Coulomb's Law & Superposition of Forces", 1, "Numerical + concept — vector addition of forces from several charges."],
        ["Electric Field & Field Lines", 1, "Derivation + diagram — field of a point charge/system; field-line properties."],
        ["Electric Flux & Gauss's Law", 2, "Numerical — flux through surfaces, statement and use of Gauss's law.", ["gausss-law-applications"]],
        ["Electric Dipole — Axial & Equatorial Field", 2, "Diagram/derivation — field on axis & equator, torque in uniform field.", ["electric-dipole"]],
        ["Gauss's Law Applications — Wire, Plane Sheet, Spherical Shell", 1, "3–4 mark derivation — pick the correct Gaussian surface."],
      ] },
    { slug: "electrostatic-potential-and-capacitance", priority: 2, marks: 3,
      trend: "2026: capacitor-network numerical (1.5 marks); objective questions on dielectric and equipotential surfaces.",
      derivations: ["Potential energy of a system of charges", "Series/parallel capacitance", "Capacitance with a dielectric slab"],
      mustKnow: ["Potential difference & equipotentials", "Capacitance C = ε₀A/d", "Dielectric constant", "U = ½CV² and when to use Q²/2C"],
      mistakes: ["Treating potential as a vector", "Forgetting whether the battery stays connected"],
      topics: [
        ["Potential due to Point Charge, Dipole & System", 1, "Numerical + concept — scalar addition of potentials.", ["potential-due-to-a-system-of-charges"]],
        ["Equipotential Surfaces & E–V Relation", 1, "Derivation + diagram — E = −dV/dr, equipotential sketches."],
        ["Potential Energy of a System of Charges", 2, "Numerical — work done in assembling charges."],
        ["Conductors & Electrostatic Shielding", 2, "Concept — field inside a conductor is zero."],
        ["Capacitors — Series/Parallel, Dielectric & Energy Stored", 1, "Circuit numerical — equivalent C, charge/voltage split, U = ½CV².", ["capacitors-series-parallel-energy-stored"]],
      ] },
    { slug: "current-electricity", priority: 1, marks: 3,
      trend: "2025: drift velocity, galvanometer conversion, Wheatstone bridge/Kirchhoff. 2026: circuit-current fill-in, cell & internal-resistance questions.",
      derivations: ["Wheatstone bridge balance condition via Kirchhoff's laws", "Drift velocity & resistivity relation", "Temperature dependence of resistance (graph)"],
      mustKnow: ["Ohm's law; resistance vs resistivity", "EMF vs terminal voltage", "Kirchhoff sign convention", "Series/parallel cells"],
      mistakes: ["Inconsistent loop direction/sign", "Using EMF as terminal voltage under load"],
      topics: [
        ["Ohm's Law & I–V Characteristics", 1, "Numerical + graph — ohmic vs non-ohmic."],
        ["Drift Velocity, Mobility & Resistivity", 1, "Derivation — I = neAv_d, ρ = m/(ne²τ)."],
        ["Temperature Dependence of Resistance", 2, "Numerical/graph — ρ = ρ₀(1 + αΔT)."],
        ["Electrical Energy & Power", 2, "Numerical — P = VI = I²R = V²/R."],
        ["Cells, EMF & Internal Resistance", 2, "Numerical — cells in series/parallel, terminal voltage."],
        ["Kirchhoff's Laws & Circuit Numericals", 1, "3–4 mark multi-loop numericals.", ["kirchhoffs-laws-circuit-numericals"]],
        ["Wheatstone Bridge & Meter Bridge", 1, "Derivation + numerical — balance condition P/Q = R/S.", ["wheatstone-bridge-meter-bridge"]],
      ] },
    { slug: "moving-charges-and-magnetism", priority: 1, marks: 5,
      trend: "2025: galvanometer→ammeter conversion and magnetic-field numericals; 2026: objective/short questions on motion in B and magnetic force.",
      derivations: ["Biot–Savart → field on axis of a circular loop", "Ampere's law → field of a long wire / solenoid", "Moving-coil galvanometer & conversion"],
      mustKnow: ["Lorentz force F = q(v × B)", "Biot–Savart law", "Ampere's circuital law", "Magnetic moment m = NIA", "Galvanometer sensitivity"],
      mistakes: ["Right-hand-rule direction errors", "Wrong shunt vs series resistor in conversion"],
      topics: [
        ["Lorentz Force & Motion in a Magnetic Field", 1, "Numerical + concept — circular/helical path, r = mv/qB."],
        ["Biot–Savart Law & Field on Axis of a Circular Loop", 1, "3–4 mark derivation.", ["biot-savart-law-field-of-a-circular-loop"]],
        ["Ampere's Circuital Law & Solenoid", 2, "Derivation — long wire, solenoid B = μ₀nI."],
        ["Force Between Two Parallel Currents", 2, "Derivation + definition of the ampere.", ["force-between-two-parallel-conductors"]],
        ["Torque on a Current Loop / Magnetic Dipole", 2, "Numerical — τ = m × B."],
        ["Moving-Coil Galvanometer (Ammeter/Voltmeter Conversion)", 1, "Numerical + diagram — shunt / series resistance."],
      ] },
    { slug: "magnetism-and-matter", priority: 3, marks: 3,
      trend: "2025: paramagnetic susceptibility fill-in; 2026: magnetic materials and B/H/M concepts.",
      derivations: ["Relation among B, H and M", "Comparison of dia/para/ferromagnetic materials"],
      mustKnow: ["Magnetic Gauss law", "Susceptibility & permeability", "Properties of dia/para/ferro materials"],
      mistakes: ["Reversing material properties", "Mixing axial and equatorial expressions"],
      topics: [
        ["Bar Magnet & Magnetic Field Lines", 1, "Concept + diagram — bar magnet as equivalent solenoid.", ["bar-magnet-earths-magnetism"]],
        ["Magnetic Dipole in a Uniform Field", 1, "Derivation — torque & potential energy U = −m·B."],
        ["Gauss's Law for Magnetism", 2, "One-line — net magnetic flux through a closed surface is zero."],
        ["Magnetisation, Magnetic Intensity (H) & B", 2, "Concept — B = μ₀(H + M), susceptibility."],
        ["Dia-, Para- & Ferromagnetism", 2, "Definitions/comparison — classification with examples.", ["classification-of-magnetic-materials"]],
      ] },
    { slug: "electromagnetic-induction", priority: 1, marks: 4,
      trend: "2025: induced-EMF relation and mutual-inductance numerical; 2026: mutual inductance / flux-linkage numerical.",
      derivations: ["Faraday's law / induced EMF", "Motional EMF e = Blv", "Mutual inductance of two solenoids", "AC generator principle"],
      mustKnow: ["Magnetic flux Φ = B·A", "Lenz's law & energy conservation", "Self & mutual inductance"],
      mistakes: ["Lenz-law direction errors", "Unit/sign confusion for L and M"],
      topics: [
        ["Faraday & Henry Experiments; Magnetic Flux", 1, "Concept — observations and flux definition."],
        ["Faraday's & Lenz's Laws", 1, "Numerical + direction reasoning.", ["faradays-lenzs-laws"]],
        ["Motional EMF", 2, "Derivation + numerical — rod moving in a field."],
        ["Self & Mutual Inductance", 2, "Numerical — L of a solenoid, M of coaxial solenoids.", ["self-mutual-inductance"]],
        ["AC Generator", 3, "Diagram + principle."],
      ] },
    { slug: "alternating-current", priority: 1, marks: 5,
      trend: "2025: phase angle/power factor; 2026: RMS relation, wattless current, power factor and LCR/transformer derivations.",
      derivations: ["Series LCR impedance (phasor method)", "Resonance condition", "Transformer turns/voltage/current relation"],
      mustKnow: ["RMS vs peak", "X_L = ωL, X_C = 1/ωC", "Impedance Z", "Power factor cos φ", "Wattless current"],
      mistakes: ["Confusing peak and RMS", "Forgetting cos φ in average power"],
      topics: [
        ["AC through R, L and C; RMS Values", 1, "Numerical + phasor — phase relations."],
        ["Phasors", 1, "Diagram — phasor diagrams for R, L, C and LCR."],
        ["Series LCR Circuit & Impedance", 1, "3–4 mark derivation + numerical.", ["lcr-series-circuit-resonance"]],
        ["Resonance", 2, "Numerical — ω₀ = 1/√LC, sharpness."],
        ["Power in AC & Power Factor", 2, "Numerical/definition — wattless current."],
        ["Transformer", 2, "Derivation + numerical — turns ratio, losses.", ["transformer"]],
      ] },
    { slug: "electromagnetic-waves", priority: 4, marks: 2,
      trend: "2025: characteristics of EM waves (1.5 marks); 2026: remote-control infrared and displacement current.",
      derivations: ["Conceptual description of EM waves", "Spectrum/application comparison"],
      mustKnow: ["Displacement current", "Transverse nature, E₀ = cB₀", "Spectrum order and uses"],
      mistakes: ["Wrong spectrum order", "Treating displacement current as conduction current"],
      topics: [
        ["Displacement Current", 1, "Concept — why Maxwell modified Ampere's law."],
        ["Nature & Properties of EM Waves", 1, "Short answer — transverse, speed c = 1/√(μ₀ε₀)."],
        ["EM Spectrum — Radio to Gamma (Uses)", 1, "1-mark ordering/uses questions.", ["em-spectrum-uses"]],
      ] },
    { slug: "ray-optics-and-optical-instruments", priority: 1, marks: 6,
      trend: "Highest Physics allocation. 2025: mirror numerical, refraction speed/frequency, Huygens. 2026: apparent depth and prism graph.",
      derivations: ["Mirror & lens formula applications", "Refraction at a spherical surface / lens maker", "Prism: minimum deviation", "Microscope & telescope magnifying power"],
      mustKnow: ["Cartesian sign convention", "Mirror/lens formulae and power", "TIR conditions", "Optical instruments"],
      mistakes: ["Sign-convention errors", "Normal-adjustment formula in the wrong case"],
      topics: [
        ["Spherical Mirrors & Sign Convention", 1, "Numerical + ray diagram.", ["lens-mirror-formula-magnification"]],
        ["Refraction & Total Internal Reflection", 1, "Derivation + numerical — apparent depth, critical angle, optical fibre."],
        ["Prism — Deviation & Dispersion", 2, "Numerical/graph — minimum deviation.", ["refraction-through-a-prism"]],
        ["Refraction at Spherical Surfaces & Lens Maker's Formula", 2, "Derivation."],
        ["Lens Formula, Power & Combination of Lenses", 1, "Numerical — lenses in contact."],
        ["Microscope & Telescope", 2, "Ray diagram + magnifying power.", ["optical-instruments-microscope-telescope"]],
      ] },
    { slug: "wave-optics", priority: 1, marks: 5,
      trend: "2025: Huygens/refraction directly asked; 2026: wavefront phase, diffraction definition and uses of polaroids.",
      derivations: ["Snell's law using Huygens' principle", "YDSE fringe width", "Polarisation (Malus's law)"],
      mustKnow: ["Coherent sources", "Path difference conditions", "Fringe width β = λD/d", "Polarisation & polaroids"],
      mistakes: ["Mixing fringe width with fringe position", "Using interference formula for diffraction"],
      topics: [
        ["Huygens' Principle & Wavefronts", 1, "Derivation + diagram — reflection/refraction of plane waves."],
        ["Coherent & Incoherent Addition of Waves", 2, "Concept — sustained interference conditions."],
        ["Young's Double Slit Experiment", 1, "Bright/dark fringe conditions, fringe width.", ["youngs-double-slit-experiment"]],
        ["Diffraction (Single Slit, Qualitative)", 2, "Definition + central maximum width.", ["diffraction-polarisation"]],
        ["Polarisation & Polaroids", 2, "Short answer — Malus's law, uses of polaroids."],
      ] },
    { slug: "dual-nature-of-radiation-and-matter", priority: 2, marks: 4,
      trend: "2026: work-function/kinetic-energy numerical and a de Broglie question.",
      derivations: ["Einstein's photoelectric equation", "Photoelectric graphs & observations"],
      mustKnow: ["Work function & threshold frequency", "Stopping potential", "λ = h/p"],
      mistakes: ["Linking intensity to stopping potential", "eV ↔ J conversion"],
      topics: [
        ["Photoelectric Effect — Observations & Graphs", 1, "Graph/concept — I–V, V₀ vs ν.", ["photoelectric-effect"]],
        ["Einstein's Photoelectric Equation", 1, "Numerical — K_max = hν − φ₀."],
        ["de Broglie Wavelength", 2, "Numerical — λ = h/√(2meV).", ["de-broglie-wavelength"]],
      ] },
    { slug: "atoms", priority: 2, marks: 4,
      trend: "2025: an atomic-orbit numerical; 2026: Rutherford scattering source and Bohr/de Broglie concepts.",
      derivations: ["Bohr radius & energy of the nth orbit", "Rutherford model limitations"],
      mustKnow: ["Bohr's postulates", "r_n ∝ n², E_n = −13.6/n² eV", "Hydrogen spectral series"],
      mistakes: ["Wrong n dependence", "Mixing emission and absorption"],
      topics: [
        ["Rutherford's α-Scattering & Nuclear Model", 1, "Concept + limitations."],
        ["Bohr Model — Radius & Energy Levels", 1, "Derivation + numerical.", ["bohr-model-of-hydrogen-atom"]],
        ["Hydrogen Spectrum (Line Series)", 2, "Numerical — Rydberg formula, series names."],
        ["de Broglie's Explanation of Bohr's Quantisation", 3, "Short answer — 2πr = nλ."],
      ] },
    { slug: "nuclei", priority: 3, marks: 2,
      trend: "2025: binding-energy equivalence and BE/A graph; 2026: binding energy per nucleon and radioactivity definitions.",
      derivations: ["Binding energy from mass defect", "BE/A curve interpretation"],
      mustKnow: ["Mass defect", "1 u = 931.5 MeV", "Fission vs fusion"],
      mistakes: ["Unit conversion in mass defect", "Confusing fission with fusion"],
      topics: [
        ["Nuclear Composition & Size", 2, "One-liners — R = R₀A^(1/3)."],
        ["Mass Defect & Binding Energy (BE/A Curve)", 1, "Numerical + graph.", ["binding-energy-mass-defect"]],
        ["Nuclear Force", 3, "Properties — short answer."],
        ["Radioactivity & Decay Law", 2, "Definitions + half-life.", ["radioactive-decay-law"]],
        ["Nuclear Fission & Fusion", 3, "Concept + energy released."],
      ] },
    { slug: "semiconductor-electronics", priority: 1, marks: 6,
      trend: "2025: n-type majority carriers, intrinsic conductivity (objective). 2026: band-gap comparison, intrinsic/extrinsic definitions and rectifier diagram.",
      derivations: ["Energy-band diagrams", "p–n junction formation & barrier potential", "Full-wave rectifier circuit & waveforms"],
      mustKnow: ["Intrinsic vs extrinsic", "Majority carriers", "Depletion region", "Rectification"],
      mistakes: ["Reversing forward/reverse bias", "Unlabelled rectifier waveforms"],
      topics: [
        ["Conductors, Semiconductors & Insulators (Energy Bands)", 1, "Diagram + comparison."],
        ["Intrinsic & Extrinsic (n-type / p-type) Semiconductors", 1, "Definitions + carrier concentration."],
        ["p–n Junction Formation", 2, "Diagram — depletion layer, barrier potential."],
        ["Diode in Forward & Reverse Bias (I–V)", 2, "Graph + explanation.", ["p-n-junction-diode-rectifiers"]],
        ["Half-wave & Full-wave Rectifier", 1, "Circuit diagram + input/output waveforms."],
        ["Logic Gates (Basic)", 3, "Truth tables — may appear as objective.", ["logic-gates"]],
      ] },
  ],

  chemistry: [
    { slug: "solutions", priority: 1, marks: 6,
      trend: "2026: ideal solution, van't Hoff factor, molal elevation constant, gas solubility and a molarity numerical.",
      derivations: ["Colligative-property formula applications", "Raoult's & Henry's law"],
      mustKnow: ["Molarity vs molality", "Raoult's law", "ΔT_b = iK_bm, ΔT_f = iK_fm, π = iCRT", "van't Hoff factor"],
      mistakes: ["Missing units in numerical answers", "Using volume of solution for molality"],
      topics: [
        ["Concentration Terms", 1, "Numerical — molarity, molality, mole fraction, ppm."],
        ["Solubility & Henry's Law", 1, "Short answer + numerical."],
        ["Raoult's Law & Vapour Pressure", 2, "Numerical/direct."],
        ["Ideal & Non-ideal Solutions (Azeotropes)", 2, "Concept + graph — positive/negative deviation."],
        ["Colligative Properties", 1, "Numerical — ΔT_b, ΔT_f, osmotic pressure.", ["colligative-properties"]],
        ["Osmosis & Reverse Osmosis", 3, "Short answer."],
        ["Abnormal Molar Mass & van't Hoff Factor", 2, "Numerical — association/dissociation.", ["vant-hoff-factor"]],
      ] },
    { slug: "electrochemistry", priority: 1, marks: 6,
      trend: "2026: mercury-cell anode, electrolysis/conductivity and a 4-mark electrochemistry numerical with diagram.",
      derivations: ["Nernst equation", "Kohlrausch's law numericals", "Faraday's laws of electrolysis"],
      mustKnow: ["Anode/cathode conventions", "E°cell", "ΔG° = −nFE°", "Conductivity units"],
      mistakes: ["Sign errors in E°cell", "Confusing κ and Λm"],
      topics: [
        ["Galvanic Cells & Electrode Potential", 1, "Diagram + cell notation, SHE."],
        ["Nernst Equation & Equilibrium Constant", 1, "Numerical.", ["nernst-equation-emf-of-a-cell"]],
        ["Gibbs Energy & Cell Potential", 2, "Numerical — ΔG = −nFE."],
        ["Conductance, Molar Conductivity & Kohlrausch's Law", 1, "Numerical + graph."],
        ["Electrolysis & Faraday's Laws", 2, "Numerical — mass deposited.", ["faradays-laws-of-electrolysis"]],
        ["Batteries, Fuel Cells & Corrosion", 3, "Diagram/short answer."],
      ] },
    { slug: "chemical-kinetics", priority: 1, marks: 6,
      trend: "2026: order from units, half-life numerical and a long-answer derivation of zero/first-order integrated rate equations.",
      derivations: ["Integrated rate equation — zero order", "Integrated rate equation — first order", "Half-life expressions"],
      mustKnow: ["Units of k by order", "Order vs molecularity", "t½ = 0.693/k", "Arrhenius equation"],
      mistakes: ["ln vs log (2.303) errors", "Taking order from stoichiometry"],
      topics: [
        ["Rate of Reaction & Rate Law", 1, "Numerical — rate expression, units of k."],
        ["Order & Molecularity", 1, "Short answer — differences."],
        ["Integrated Rate Equations (Zero & First Order)", 1, "3–4 mark derivation + numerical.", ["integrated-rate-law-half-life"]],
        ["Half-life", 2, "Numerical."],
        ["Temperature Dependence & Arrhenius Equation", 2, "Numerical — Ea from two temperatures.", ["arrhenius-equation"]],
        ["Collision Theory", 3, "Short answer."],
      ] },
    { slug: "d-and-f-block-elements", priority: 2, marks: 5,
      trend: "2026: transition-series radius comparison, least enthalpy of atomisation and magnetic-moment objective questions.",
      derivations: ["Transition-element trends", "KMnO₄ / K₂Cr₂O₇ preparation & reactions", "Lanthanoid contraction"],
      mustKnow: ["Oxidation-state exceptions", "Spin-only μ = √n(n+2) BM", "Lanthanoid contraction"],
      mistakes: ["Wrong oxidation state before counting d-electrons", "Wrong medium/product for KMnO₄"],
      topics: [
        ["Position & Electronic Configuration", 1, "Short answer — exceptions (Cr, Cu)."],
        ["General Trends of Transition Elements", 1, "Radii, ionisation enthalpy, atomisation enthalpy."],
        ["Oxidation States", 2, "Reasoning questions.", ["variable-oxidation-states-colour"]],
        ["Magnetic Properties & Coloured Ions", 2, "Numerical — spin-only magnetic moment.", ["magnetic-properties"]],
        ["Catalytic Properties, Interstitial Compounds & Alloys", 3, "Short answer."],
        ["K₂Cr₂O₇ and KMnO₄", 2, "Preparation + oxidising reactions."],
        ["Lanthanoids & Lanthanoid Contraction", 2, "Causes and consequences."],
        ["Actinoids & Comparison with Lanthanoids", 3, "Short answer."],
      ] },
    { slug: "coordination-compounds", priority: 1, marks: 5,
      trend: "2026: IUPAC naming and octahedral d-orbital splitting (1.5 marks each); spin-only magnetic moment and low-spin complexes.",
      derivations: ["IUPAC nomenclature", "Isomerism", "CFT splitting in octahedral field", "Magnetic behaviour"],
      mustKnow: ["Ligand charge & denticity", "Coordination number", "High-spin vs low-spin", "Spectrochemical series"],
      mistakes: ["Wrong ligand order/charge in names", "Confusing strong and weak field ligands"],
      topics: [
        ["Werner's Theory & Definitions", 1, "Short answer — primary/secondary valency."],
        ["IUPAC Nomenclature", 1, "1.5-mark naming questions.", ["iupac-nomenclature"]],
        ["Isomerism (Geometrical, Optical, Linkage, Ionisation…)", 2, "Identification + structures.", ["isomerism-in-coordination-compounds"]],
        ["Valence Bond Theory & Magnetic Properties", 2, "Hybridisation, spin-only μ."],
        ["Crystal Field Theory & Colour", 1, "Diagram — octahedral splitting.", ["crystal-field-theory"]],
        ["Metal Carbonyls & Applications", 3, "Short answer — synergic bonding."],
      ] },
    { slug: "haloalkanes-and-haloarenes", priority: 2, marks: 6,
      trend: "2026: SN2 reactivity ordering, Finkelstein reaction and KCN vs AgCN product comparison.",
      derivations: ["SN1/SN2 mechanisms & reactivity", "KCN vs AgCN products", "Finkelstein / Swarts / Wurtz reactions"],
      mustKnow: ["Leaving-group ability", "Substrate order for SN1/SN2", "Optical rotation & racemisation"],
      mistakes: ["Wrong mechanism for substrate/solvent", "Products without conditions"],
      topics: [
        ["Classification & Nomenclature", 2, "Short answer."],
        ["Nature of C–X Bond", 2, "Reasoning."],
        ["Methods of Preparation", 2, "Reactions with conditions."],
        ["SN1 & SN2 Mechanisms", 1, "Mechanism + reactivity order.", ["sn1-vs-sn2-mechanism"]],
        ["Optical Rotation & Stereochemistry", 3, "Inversion vs racemisation."],
        ["Reactions of Haloarenes", 2, "Electrophilic substitution; low reactivity to nucleophiles."],
        ["Polyhalogen Compounds (CHCl₃, CHI₃, Freons, DDT)", 3, "Uses & environmental effects."],
      ] },
    { slug: "alcohols-phenols-and-ethers", priority: 2, marks: 6,
      trend: "2026: secondary-alcohol identification, heated-copper oxidation of ethanol and ether/dehydration mechanism.",
      derivations: ["Acid-catalysed dehydration mechanism", "Phenol acidity (resonance)", "Williamson synthesis & ether cleavage"],
      mustKnow: ["1°/2°/3° alcohol tests", "Dehydration conditions", "Phenol acidity trends"],
      mistakes: ["Wrong oxidation product", "Directing-effect errors in phenol"],
      topics: [
        ["Classification, Nomenclature & Preparation of Alcohols", 1, "Reactions with reagents."],
        ["Properties of Alcohols (Primary Alcohols)", 1, "Oxidation, esterification, Lucas test.", ["distinguishing-tests-acidity-order"]],
        ["Mechanism of Dehydration", 2, "3-mark mechanism."],
        ["Uses of Methanol & Ethanol", 3, "One-liners."],
        ["Phenols — Acidity & Electrophilic Substitution", 1, "Reasoning + reactions (Reimer–Tiemann, Kolbe)."],
        ["Ethers — Preparation, Properties & Uses", 2, "Williamson synthesis, cleavage by HI."],
      ] },
    { slug: "aldehydes-ketones-and-carboxylic-acids", priority: 1, marks: 7,
      trend: "Highest Chemistry allocation. 2026: aldehyde vs ketone reactivity, structural formulae, reaction completion and named-source facts.",
      derivations: ["Nucleophilic addition mechanism", "Aldol, Cannizzaro, Clemmensen, Wolff–Kishner, HVZ", "Acidity of carboxylic acids"],
      mustKnow: ["Carbonyl polarity", "Aldehyde vs ketone reactivity", "α-hydrogen reactions", "Tests (Tollens', Fehling's)"],
      mistakes: ["Aldol on a compound with no α-H", "Wrong reagent/product"],
      topics: [
        ["Carbonyl Group — Structure & Reactivity", 1, "Reasoning — aldehydes > ketones."],
        ["Preparation & Properties of Aldehydes/Ketones", 1, "Reactions with conditions."],
        ["Nucleophilic Addition Mechanism", 1, "3-mark mechanism.", ["nucleophilic-addition-reactivity-order"]],
        ["Reactions due to α-Hydrogen & Named Reactions", 1, "Aldol, Cannizzaro, haloform.", ["named-reactions-aldol-cannizzaro-haloform"]],
        ["Carboxylic Acids — Acidity, Preparation & Properties", 2, "Substituent effects, HVZ, decarboxylation."],
      ] },
    { slug: "amines", priority: 2, marks: 5,
      trend: "2026: diazonium formula, methylamine→isocyanide conversion and aniline resonance.",
      derivations: ["Basicity comparison", "Diazonium preparation & reactions", "Aniline resonance structures"],
      mustKnow: ["Basicity factors (aqueous)", "Carbylamine & Hinsberg tests", "Diazonium salt general formula"],
      mistakes: ["Gas-phase basicity order in aqueous questions", "Wrong temperature for diazotisation"],
      topics: [
        ["Classification, Structure & Nomenclature", 2, "Short answer."],
        ["Preparation of Amines", 1, "Hofmann bromamide, Gabriel, reduction."],
        ["Physical & Chemical Properties", 2, "Carbylamine, Hinsberg, acylation."],
        ["Basic Character of Amines", 1, "Comparison with reasoning.", ["basicity-order-diazonium-salt-reactions"]],
        ["Diazonium Salts & Aromatic Synthesis", 2, "Sandmeyer, coupling, conversions."],
      ] },
    { slug: "biomolecules", priority: 3, marks: 4,
      trend: "2026: polysaccharide, essential amino acid, vitamin deficiency, DNA/RNA difference and protein denaturation.",
      derivations: ["Carbohydrate classification", "Protein denaturation", "DNA vs RNA", "Vitamin deficiency diseases"],
      mustKnow: ["Essential amino acids", "Vitamins & deficiencies", "DNA/RNA differences", "Reducing sugars"],
      mistakes: ["Mixing constituent monosaccharides", "Confusing fat/water-soluble vitamins"],
      topics: [
        ["Carbohydrates (Glucose, Fructose, Disaccharides, Polysaccharides)", 1, "Structure + classification.", ["carbohydrates-proteins"]],
        ["Proteins, Amino Acids & Peptide Bond", 1, "Structure levels."],
        ["Protein Structure & Denaturation", 2, "Short answer."],
        ["Enzymes", 3, "One-liners."],
        ["Vitamins", 2, "Deficiency diseases — objective.", ["vitamins-nucleic-acids"]],
        ["Nucleic Acids (DNA & RNA)", 2, "Differences — objective/short."],
        ["Hormones (Basic Idea)", 3, "One-liners."],
      ] },
  ],

  mathematics: [
    { slug: "relations-and-functions", priority: 2, marks: 3,
      trend: "2025: range of a relation, function composition; 2026: function composition again.",
      derivations: ["Checking reflexive/symmetric/transitive", "One-one/onto proofs"],
      mustKnow: ["Equivalence relation", "One-one, onto, bijective tests"], mistakes: ["Not checking every ordered pair"],
      topics: [
        ["Types of Relations & Equivalence Relations", 1, "Proof-type 2-mark questions.", ["equivalence-relations"]],
        ["One-one & Onto Functions", 1, "Proof/computation."],
      ],
      moveOut: [["inverse-trigonometric-functions", "inverse-trigonometric-functions"]] },
    { slug: "inverse-trigonometric-functions", priority: 2, marks: 5,
      trend: "2025: principal value and a proof using inverse-tan identities.",
      derivations: ["Principal-value identities", "Domain/range manipulation"],
      mustKnow: ["Principal-value branches", "Standard identities with valid domains"], mistakes: ["Ignoring principal ranges"],
      topics: [
        ["Definition, Domain, Range & Principal Values", 1, "Direct computation.", ["inverse-trigonometric-functions"]],
        ["Graphs of Inverse Trigonometric Functions", 2, "Sketch principal branches."],
        ["Properties & Identities", 1, "2-mark proofs."],
      ] },
    { slug: "matrices", name: "Matrices", priority: 1, marks: 5, from: "algebra-matrices-determinants", ncert: [ncert("lemh103", "Matrices")],
      trend: "Matrix order/types, operations and inverse-related objective/short questions in 2025 and 2026.",
      derivations: ["Matrix operations", "Symmetric/skew-symmetric decomposition"],
      mustKnow: ["Order compatibility", "(AB)ᵀ = BᵀAᵀ", "Invertibility"], mistakes: ["Invalid multiplication dimensions"],
      topics: [
        ["Concept, Order & Types of Matrices", 1, "Objective."],
        ["Operations on Matrices", 1, "Addition, multiplication, scalar multiple."],
        ["Transpose, Symmetric & Skew-symmetric Matrices", 2, "Proof/computation."],
        ["Invertible Matrices", 2, "Concept + elementary checks."],
      ] },
    { slug: "determinants", name: "Determinants", priority: 1, marks: 5, from: "algebra-matrices-determinants", ncert: [ncert("lemh104", "Determinants")],
      trend: "2025: area of a triangle via determinant (2 marks); determinant/inverse topics recur in objective and short sections.",
      derivations: ["3×3 evaluation", "Area of triangle", "Inverse via adjoint & solving linear systems"],
      mustKnow: ["Cofactor signs", "|adj A| = |A|ⁿ⁻¹", "Consistency conditions"], mistakes: ["Cofactor sign errors", "Absolute value in area"],
      topics: [
        ["Determinants of Order up to 3", 1, "Direct computation.", ["properties-of-determinants"]],
        ["Minors & Cofactors", 1, "Computation."],
        ["Area of a Triangle", 2, "2-mark application."],
        ["Adjoint & Inverse of a Matrix", 1, "Long computation."],
        ["Solving Linear Equations by Matrix Method", 1, "Long question — consistency.", ["inverse-of-a-matrix-system-of-equations"]],
      ] },
    { slug: "continuity-and-differentiability", name: "Continuity and Differentiability", priority: 1, marks: 8,
      from: "calculus-continuity-differentiability-applications-of-derivatives", ncert: [ncert("lemh105", "Continuity and Differentiability")],
      trend: "2025: continuity condition for a piecewise function and derivative questions; calculus stays the largest section.",
      derivations: ["Piecewise continuity", "Chain, implicit, parametric, log differentiation", "Second-order derivatives"],
      mustKnow: ["Continuity vs differentiability", "Standard derivatives", "Chain rule"], mistakes: ["Checking only one side of a limit"],
      topics: [
        ["Continuity & Differentiability", 1, "Piecewise functions.", ["continuity-differentiability-of-piecewise-functions"]],
        ["Chain Rule & Composite Functions", 1, "Computation."],
        ["Derivatives of Inverse Trigonometric Functions", 2, "Computation."],
        ["Implicit Differentiation", 2, "Computation."],
        ["Logarithmic & Exponential Differentiation", 2, "x^x-type questions."],
        ["Parametric Differentiation", 2, "Computation."],
        ["Second-order Derivatives", 2, "Proof-type."],
      ] },
    { slug: "applications-of-derivatives", name: "Applications of Derivatives", priority: 1, marks: 5,
      from: "calculus-continuity-differentiability-applications-of-derivatives", ncert: [ncert("lemh106", "Application of Derivatives")],
      trend: "Calculus objective/short questions around derivatives and their applications in 2025.",
      derivations: ["Monotonicity intervals", "Local maxima/minima (first & second derivative tests)", "Rate-of-change problems"],
      mustKnow: ["Critical points", "First derivative test", "Increasing/decreasing"], mistakes: ["Missing endpoint checks"],
      topics: [
        ["Rate of Change of Quantities", 1, "Application numerical.", ["tangent-normal-rate-of-change"]],
        ["Increasing & Decreasing Functions", 1, "Sign chart."],
        ["Maxima & Minima", 1, "Long optimisation question.", ["maxima-minima-applications-of-derivatives"]],
      ] },
    { slug: "integrals", name: "Integrals", priority: 1, marks: 12,
      from: "calculus-integrals-applications-of-integrals", ncert: [ncert("lemh201", "Integrals")],
      trend: "Largest single Maths allocation (12 marks). 2025: definite integral and integration MCQs.",
      derivations: ["Substitution", "Integration by parts", "Partial fractions", "Definite-integral properties"],
      mustKnow: ["Standard integrals", "ILATE for by-parts", "∫₀ᵃ f(x)dx = ∫₀ᵃ f(a−x)dx"], mistakes: ["Dropping the constant of integration"],
      topics: [
        ["Integration as Inverse of Differentiation", 1, "Direct computation."],
        ["Integration by Substitution", 1, "Computation.", ["integration-techniques-by-parts-substitution-partial-fractions"]],
        ["Integration by Partial Fractions", 1, "Long calculation."],
        ["Integration by Parts", 1, "Long calculation."],
        ["Special Standard Integrals", 2, "Formula-based."],
        ["Fundamental Theorem of Calculus", 2, "Definite integrals."],
        ["Definite Integrals by Substitution", 2, "Computation."],
        ["Properties of Definite Integrals", 1, "Property-based simplification.", ["definite-integral-properties"]],
      ] },
    { slug: "applications-of-integrals", name: "Applications of Integrals", priority: 2, marks: 4,
      from: "calculus-integrals-applications-of-integrals", ncert: [ncert("lemh202", "Application of Integrals")],
      trend: "2025: area bounded by the axes and a cosine curve (1-mark objective).",
      derivations: ["Region identification", "Intersection points", "Upper-minus-lower setup"],
      mustKnow: ["Correct limits", "Area is always positive"], mistakes: ["Wrong upper/lower curve"],
      topics: [
        ["Area under Simple Curves", 1, "Direct computation.", ["area-bounded-by-curves"]],
        ["Area Bounded by Lines, Circles, Parabolas & Ellipses", 1, "Graph + long calculation."],
      ] },
    { slug: "differential-equations", priority: 2, marks: 6,
      trend: "2025: order/degree, particular solution and differential-equation questions.",
      derivations: ["Order & degree", "Variable separable", "Homogeneous", "Linear DE with integrating factor"],
      mustKnow: ["Order vs degree", "IF = e^∫P dx", "Using the initial condition"], mistakes: ["Dropping constants"],
      topics: [
        ["Definition, Order & Degree", 1, "Direct."],
        ["General & Particular Solutions", 1, "Computation."],
        ["Variables Separable Method", 2, "Computation."],
        ["Homogeneous Differential Equations", 2, "Substitution y = vx.", ["homogeneous-differential-equations"]],
        ["Linear Differential Equations", 1, "Integrating factor.", ["linear-first-order-de-integrating-factor"]],
      ] },
    { slug: "vectors", name: "Vectors", priority: 1, marks: 6, from: "vectors-and-three-dimensional-geometry", ncert: [ncert("lemh204", "Vector Algebra")],
      trend: "2025: vector angle and cross-product style objective questions.",
      derivations: ["Dot product — angle & projection", "Cross product — area & perpendicular vector", "Section formula"],
      mustKnow: ["a·b = |a||b|cos θ", "|a×b| = area of parallelogram", "Direction ratios"], mistakes: ["Scalar vs vector confusion"],
      topics: [
        ["Magnitude, Direction & Types of Vectors", 1, "Direct computation."],
        ["Direction Cosines & Ratios of a Vector", 1, "Computation."],
        ["Addition & Components of a Vector", 2, "Computation."],
        ["Section Formula", 2, "Formula-based."],
        ["Scalar (Dot) Product & Projection", 1, "Computation.", ["dot-cross-product-applications"]],
        ["Vector (Cross) Product", 1, "Area / perpendicular vector."],
      ] },
    { slug: "three-dimensional-geometry", name: "Three-dimensional Geometry", priority: 1, marks: 8,
      from: "vectors-and-three-dimensional-geometry", ncert: [ncert("lemh205", "Three Dimensional Geometry")],
      trend: "2025: line equation and direction-cosine questions in objective/short sections.",
      derivations: ["Line equations (vector & Cartesian)", "Angle between lines", "Shortest distance between skew lines"],
      mustKnow: ["DR vs DC", "Line through two points", "Shortest-distance formula"], mistakes: ["Using the coplanar formula for skew lines"],
      topics: [
        ["Direction Cosines & Direction Ratios of a Line", 1, "Computation."],
        ["Equation of a Line (Vector & Cartesian)", 1, "Long computation."],
        ["Angle between Two Lines", 2, "Computation."],
        ["Skew Lines & Shortest Distance", 1, "Long calculation.", ["shortest-distance-between-two-skew-lines"]],
      ],
      // Planes were rationalised out of the RBSE/NCERT Class 12 syllabus.
      retire: ["equation-of-a-plane"] },
    { slug: "linear-programming", priority: 3, marks: 5,
      trend: "Graph-based scoring chapter; narrow and procedural.",
      derivations: ["Feasible region", "Corner-point method"], mustKnow: ["Inequality shading", "Checking every corner point"],
      mistakes: ["Missing a feasible vertex"],
      topics: [
        ["Constraints & Objective Function", 1, "Formulation."],
        ["Graphical Method & Feasible Region", 1, "Long graph question.", ["graphical-method-for-lpp"]],
        ["Optimal Feasible Solution", 2, "Corner-point evaluation."],
      ] },
    { slug: "probability", priority: 1, marks: 8,
      trend: "2025: conditional-probability calculation as a 1-mark item; Bayes-type long questions are standard.",
      derivations: ["Conditional probability", "Multiplication theorem", "Total probability & Bayes' theorem"],
      mustKnow: ["P(A|B)", "Independent events", "Bayes denominator"], mistakes: ["Swapping conditional events"],
      topics: [
        ["Conditional Probability", 1, "Computation.", ["conditional-probability-bayes-theorem"]],
        ["Multiplication Theorem", 1, "Computation."],
        ["Independent Events", 2, "Computation."],
        ["Total Probability & Bayes' Theorem", 1, "Long calculation."],
        ["Random Variable & Probability Distribution", 2, "Mean of a distribution.", ["probability-distribution"]],
      ] },
  ],
};

// Chapters removed from the rationalised 2026–27 RBSE Class 12 Chemistry syllabus.
const RBSE_RETIRED_CHEMISTRY = [
  "solid-state",
  "surface-chemistry",
  "general-principles-and-processes-of-isolation-of-elements",
  "p-block-elements",
  "polymers",
  "chemistry-in-everyday-life",
];
const RBSE_RETIRED_COMBINED = [
  "algebra-matrices-determinants",
  "calculus-continuity-differentiability-applications-of-derivatives",
  "calculus-integrals-applications-of-integrals",
  "vectors-and-three-dimensional-geometry",
];

// ---------------------------------------------------------------------------
// JEE MAIN — priority updates + missing topics (Class 12 chapters)
// ---------------------------------------------------------------------------
const JEE = {
  physics: [
    { slug: "electrostatics", priority: 1, topics: [
      ["Coulomb's Law & Superposition", 1, "Multi-charge vector numericals. Trap: mixing field with force."],
      ["Electric Dipole — Field, Torque & Energy", 2, "Axial/equatorial field, torque, PE. Trap: field direction on axis vs equator."],
      ["Electrostatic Potential & Equipotential Surfaces", 1, "Point charge, dipole, system of charges. Trap: treating potential as a vector."],
    ] },
    { slug: "current-electricity", priority: 1, topics: [
      ["Ohm's Law, Resistivity & Drift Velocity", 1, "R = ρL/A, temperature dependence, I–V graphs."],
      ["Wheatstone Bridge & Meter Bridge", 2, "Balance condition and bridge numericals."],
    ] },
    { slug: "magnetic-effects-of-current-magnetism", priority: 1, topics: [
      ["Moving-Coil Galvanometer & Conversion", 2, "Shunt for ammeter, series resistance for voltmeter."],
      ["Magnetism & Matter — Dipole, Materials", 3, "Bar magnet dipole relations; dia/para/ferro properties (P2 chapter per JEE guide)."],
    ] },
    { slug: "electromagnetic-induction-alternating-current", priority: 1, topics: [
      ["Motional EMF", 1, "BLv for moving rods. Trap: geometry not perpendicular."],
      ["RMS Values, Reactance & Impedance", 1, "X_L, X_C, Z and phase. Trap: peak vs RMS."],
      ["Power Factor, Wattless Current & Transformer", 2, "cos φ, average power, turns ratio."],
      ["Eddy Currents", 3, "Causes, effects, applications."],
    ] },
    { slug: "electromagnetic-waves", priority: 3, topics: [] },
    { slug: "ray-optics-and-wave-optics", priority: 1, topics: [
      ["Optical Instruments — Microscope & Telescope", 2, "Magnifying power formulae. Trap: normal adjustment case."],
      ["Coherent Sources & Interference Conditions", 2, "Sustained interference requirements."],
    ] },
    { slug: "dual-nature-of-radiation-and-matter", priority: 1, topics: [
      ["Photoelectric Graphs (I–V, V₀–ν, K_max–ν)", 1, "Slope = h/e, intercepts. Trap: intensity vs stopping potential."],
    ] },
    { slug: "atoms-and-nuclei", priority: 2, topics: [
      ["Hydrogen Spectrum & Spectral Series", 2, "Rydberg formula; emission vs absorption."],
      ["Nuclear Fission & Fusion", 2, "Energy released; BE/A curve reasoning."],
    ] },
    { slug: "semiconductor-electronics", priority: 1, topics: [
      ["Special Diodes — LED, Photodiode, Solar Cell", 2, "Device functions and I–V characteristics."],
    ] },
  ],
  chemistry: [
    { slug: "solutions", priority: 1, topics: [["Concentration Terms (Molarity, Molality, Mole Fraction)", 1, "Unit/volume traps."]] },
    { slug: "redox-reactions-and-electrochemistry", priority: 1, topics: [["Gibbs Energy & Cell Potential (ΔG = −nFE)", 2, "Sign and n errors."]] },
    { slug: "chemical-kinetics", priority: 1, topics: [["Rate Law, Order & Molecularity", 1, "Order is experimental, not stoichiometric."]] },
    { slug: "d-and-f-block-elements", priority: 1, topics: [["KMnO₄ & K₂Cr₂O₇ — Preparation & Reactions", 1, "Medium-dependent products."]] },
    { slug: "coordination-compounds", priority: 1, topics: [["Colour, Magnetic Moment & VBT", 2, "d–d transitions, spin-only μ."]] },
    { slug: "haloalkanes-and-haloarenes", priority: 2, topics: [["Elimination (E1/E2) & Major Product", 2, "Base/temperature decides."]] },
    { slug: "alcohols-phenols-and-ethers", priority: 2, topics: [["Reactions of Alcohols (Oxidation, Dehydration)", 1, "1°/2°/3° behaviour."], ["Phenol Reactions (Reimer–Tiemann, Kolbe)", 1, "Directing effects."]] },
    { slug: "aldehydes-ketones-and-carboxylic-acids", priority: 1, topics: [["Grignard Addition to Carbonyls", 1, "Acidic work-up gives alcohols."], ["Clemmensen & Wolff–Kishner Reductions", 2, "C=O → CH₂."]] },
    { slug: "amines", priority: 1, topics: [["Preparation & Reactions of Amines", 1, "Hofmann bromamide, Gabriel, carbylamine, Hinsberg."]] },
    { slug: "biomolecules", priority: 2, topics: [] },
  ],
  mathematics: [
    { slug: "matrices-and-determinants", priority: 1, topics: [["Properties & Evaluation of Determinants", 1, "Row/column operations, 3×3 evaluation."], ["Area of Triangle using Determinants", 2, "Absolute value."]] },
    { slug: "limits-continuity-differentiability-applications-of-derivatives", priority: 1, topics: [["Increasing & Decreasing Functions", 1, "Sign of f′ on intervals."], ["Methods of Differentiation (Implicit, Parametric, Log)", 1, "Chain rule applications."]] },
    { slug: "integral-calculus-indefinite-definite-area-under-curve", priority: 1, topics: [["Partial Fractions & Standard Integrals", 1, "Technique selection."], ["Fundamental Theorem of Calculus", 2, "Leibniz rule style questions."]],
      retire: ["note-integral-as-limit-of-a-sum-is-officially-deleted"] },
    { slug: "vector-algebra", priority: 1, topics: [["Vector Operations, Section Formula & Unit Vectors", 1, "Direct numericals."], ["Projection & Angle between Vectors", 1, "Dot-product relation."]] },
    { slug: "three-dimensional-geometry", priority: 1, topics: [["Equation of a Line in 3D (Vector & Cartesian)", 1, "DR/DC conventions."]] },
    { slug: "differential-equations", priority: 2, topics: [["Order & Degree", 2, "Remove radicals before reading degree."]] },
    { slug: "statistics-and-probability", priority: 2, topics: [["Random Variable & Probability Distribution", 2, "Mean/variance of a distribution."]],
      retire: ["note-bernoulli-trials-binomial-distribution-officially-deleted"] },
    { slug: "sets-relations-and-functions", priority: 2, topics: [["Types of Relations (Equivalence)", 2, "Check all three properties."]] },
    { slug: "trigonometry-ratios-identities-equations", priority: 3, topics: [["Inverse Trigonometric Functions — Principal Values & Identities", 2, "P2 per JEE Class 12 guide."]] },
  ],
};

// JEE chapter → NCERT PDFs (Class 11 + 12). Every code was checked against
// the chapter title inside the actual ncert.nic.in PDF (2026 edition).
// p-Block has no current NCERT chapter (rationalised out), so it stays empty.
const JEE_NCERT = {
  physics: {
    "units-and-measurements": [["keph101", "Units and Measurement (Class 11)"]],
    kinematics: [["keph102", "Motion in a Straight Line (Class 11)"], ["keph103", "Motion in a Plane (Class 11)"]],
    "laws-of-motion": [["keph104", "Laws of Motion (Class 11)"]],
    "work-energy-and-power": [["keph105", "Work, Energy and Power (Class 11)"]],
    "rotational-motion-system-of-particles": [["keph106", "Systems of Particles and Rotational Motion (Class 11)"]],
    gravitation: [["keph107", "Gravitation (Class 11)"]],
    "mechanical-properties-of-solids-fluids": [["keph201", "Mechanical Properties of Solids (Class 11)"], ["keph202", "Mechanical Properties of Fluids (Class 11)"]],
    thermodynamics: [["keph204", "Thermodynamics (Class 11)"]],
    "kinetic-theory-of-gases": [["keph205", "Kinetic Theory (Class 11)"]],
    "oscillations-and-waves": [["keph206", "Oscillations (Class 11)"], ["keph207", "Waves (Class 11)"]],
  },
  chemistry: {
    "some-basic-concepts-in-chemistry": [["kech101", "Some Basic Concepts of Chemistry (Class 11)"]],
    "atomic-structure": [["kech102", "Structure of Atom (Class 11)"]],
    "classification-of-elements-periodicity": [["kech103", "Classification of Elements and Periodicity in Properties (Class 11)"]],
    "chemical-bonding-and-molecular-structure": [["kech104", "Chemical Bonding and Molecular Structure (Class 11)"]],
    "chemical-thermodynamics": [["kech105", "Thermodynamics (Class 11)"]],
    "equilibrium-chemical-ionic": [["kech106", "Equilibrium (Class 11)"]],
    "redox-reactions-and-electrochemistry": [["kech201", "Redox Reactions (Class 11)"], ["lech102", "Electrochemistry"]],
    "purification-characterisation-basic-principles-of-organic-chemistry-goc": [["kech202", "Organic Chemistry – Some Basic Principles and Techniques (Class 11)"]],
    hydrocarbons: [["kech203", "Hydrocarbons (Class 11)"]],
  },
  mathematics: {
    "sets-relations-and-functions": [["kemh101", "Sets (Class 11)"], ["kemh102", "Relations and Functions (Class 11)"], ["lemh101", "Relations and Functions"]],
    "complex-numbers-and-quadratic-equations": [["kemh104", "Complex Numbers and Quadratic Equations (Class 11)"]],
    "permutations-and-combinations": [["kemh106", "Permutations and Combinations (Class 11)"]],
    "binomial-theorem": [["kemh107", "Binomial Theorem (Class 11)"]],
    "sequence-and-series": [["kemh108", "Sequences and Series (Class 11)"]],
    "limits-continuity-differentiability-applications-of-derivatives": [["kemh112", "Limits and Derivatives (Class 11)"], ["lemh105", "Continuity and Differentiability"], ["lemh106", "Application of Derivatives"]],
    "coordinate-geometry-straight-lines-circle-parabola-ellipse-hyperbola": [["kemh109", "Straight Lines (Class 11)"], ["kemh110", "Conic Sections (Class 11)"]],
    "three-dimensional-geometry": [["kemh111", "Introduction to Three Dimensional Geometry (Class 11)"], ["lemh205", "Three Dimensional Geometry"]],
    "statistics-and-probability": [["kemh113", "Statistics (Class 11)"], ["kemh114", "Probability (Class 11)"], ["lemh207", "Probability"]],
    "trigonometry-ratios-identities-equations": [["kemh103", "Trigonometric Functions (Class 11)"], ["lemh102", "Inverse Trigonometric Functions"]],
  },
};

// ---------------------------------------------------------------------------
const log = [];
const note = (s) => log.push(s);

async function upsertTopics(chapterId, specs, { baseOrder = 0 } = {}) {
  const existing = await prisma.topic.findMany({ where: { chapterId } });
  const bySlug = new Map(existing.map((t) => [t.slug, t]));
  for (let i = 0; i < specs.length; i++) {
    const [name, priority, desc, aliases = []] = specs[i];
    const slug = slugify(name);
    const match = bySlug.get(slug) ?? aliases.map((a) => bySlug.get(a)).find(Boolean);
    if (match) {
      note(`  ~ topic ${match.slug} → P${priority}`);
      if (!DRY)
        await prisma.topic.update({
          where: { id: match.id },
          data: {
            priority,
            order: baseOrder + i,
            isDeleted: false,
            // Matched through an alias → adopt the official name (the slug/URL stays the same).
            ...(match.slug !== slug ? { name } : {}),
            ...(desc && !match.description ? { description: desc } : {}),
          },
        });
    } else {
      note(`  + topic ${slug} (P${priority})`);
      if (!DRY)
        await prisma.topic.create({ data: { chapterId, slug, name, priority, description: desc, order: baseOrder + i } });
    }
  }
}

async function moveTopic(topicSlug, fromChapterId, toChapterId) {
  const t = await prisma.topic.findFirst({ where: { chapterId: fromChapterId, slug: topicSlug } });
  if (!t) return;
  const clash = await prisma.topic.findFirst({ where: { chapterId: toChapterId, slug: topicSlug } });
  note(`  → move topic ${topicSlug}${clash ? " (target exists, retiring source)" : ""}`);
  if (DRY) return;
  if (clash) await prisma.topic.update({ where: { id: t.id }, data: { isDeleted: true } });
  else await prisma.topic.update({ where: { id: t.id }, data: { chapterId: toChapterId } });
}

async function syncRbse() {
  const exam = await prisma.exam.findUniqueOrThrow({ where: { slug: "rbse-class-12" } });
  for (const [subjectSlug, chapters] of Object.entries(RBSE)) {
    const subject = await prisma.subject.findUniqueOrThrow({ where: { examId_slug: { examId: exam.id, slug: subjectSlug } } });
    note(`RBSE ${subjectSlug}`);
    for (let ci = 0; ci < chapters.length; ci++) {
      const c = chapters[ci];
      const total = subjectSlug === "mathematics" ? 80 : 56;
      const pyqTrend = {
        marks: `${c.marks} marks`,
        freq: `${c.marks} of ${total} theory marks in the official 2026–27 RBSE syllabus (allocation, not a fixed question count).`,
        historical: c.trend,
        pattern: RBSE_FORMAT[subjectSlug],
        difficulty: c.priority === 1 ? "High return — master first" : c.priority === 2 ? "Main study cycle" : "Fast scoring revision",
      };
      const data = {
        priority: c.priority,
        order: ci,
        isDeleted: false,
        importance: `P${c.priority} — ${c.marks} of ${total} theory marks in the 2026–27 RBSE syllabus. ${c.trend}`,
        pyqTrend,
        mustKnow: c.mustKnow,
        questionPatterns: c.derivations,
        commonMistakes: c.mistakes,
        sourceRef: RBSE_SRC,
      };

      let chapter = await prisma.chapter.findUnique({ where: { subjectId_slug: { subjectId: subject.id, slug: c.slug } } });
      if (chapter) {
        note(` ~ chapter ${c.slug} → P${c.priority}, ${c.marks} marks`);
        if (!DRY) chapter = await prisma.chapter.update({ where: { id: chapter.id }, data });
      } else {
        note(` + chapter ${c.slug} (P${c.priority}, ${c.marks} marks)`);
        if (!DRY)
          chapter = await prisma.chapter.create({
            data: { ...data, subjectId: subject.id, slug: c.slug, name: c.name, ncertLinks: c.ncert ?? [] },
          });
      }

      // Move topics out of the combined chapter this one was split from.
      if (c.from && chapter) {
        const src = await prisma.chapter.findUnique({ where: { subjectId_slug: { subjectId: subject.id, slug: c.from } } });
        if (src) for (const t of c.topics) for (const alias of t[3] ?? []) await moveTopic(alias, src.id, chapter.id);
      }
      for (const [topicSlug, targetSlug] of c.moveOut ?? []) {
        const target = await prisma.chapter.findUnique({ where: { subjectId_slug: { subjectId: subject.id, slug: targetSlug } } });
        if (target && chapter) await moveTopic(topicSlug, chapter.id, target.id);
      }
      for (const slug of c.retire ?? []) {
        note(`  - retire topic ${slug}`);
        if (!DRY && chapter) await prisma.topic.updateMany({ where: { chapterId: chapter.id, slug }, data: { isDeleted: true } });
      }
      if (chapter) await upsertTopics(chapter.id, c.topics);
    }

    const retired = subjectSlug === "chemistry" ? RBSE_RETIRED_CHEMISTRY : subjectSlug === "mathematics" ? RBSE_RETIRED_COMBINED : [];
    for (const slug of retired) {
      note(` - retire chapter ${slug}`);
      if (!DRY)
        await prisma.chapter.updateMany({
          where: { subjectId: subject.id, slug },
          data: {
            isDeleted: true,
            order: 100,
            importance:
              subjectSlug === "chemistry"
                ? "Not in the rationalised 2026–27 RBSE Class 12 syllabus — kept only for reference."
                : "Split into the official per-chapter units of the 2026–27 RBSE syllabus.",
          },
        });
    }
  }
}

async function syncJee() {
  const exam = await prisma.exam.findUniqueOrThrow({ where: { slug: "jee-main" } });
  for (const [subjectSlug, chapters] of Object.entries(JEE)) {
    const subject = await prisma.subject.findUniqueOrThrow({ where: { examId_slug: { examId: exam.id, slug: subjectSlug } } });
    note(`JEE ${subjectSlug}`);
    for (const c of chapters) {
      const chapter = await prisma.chapter.findUnique({ where: { subjectId_slug: { subjectId: subject.id, slug: c.slug } } });
      if (!chapter) {
        note(` ! missing chapter ${c.slug}`);
        continue;
      }
      note(` ~ chapter ${c.slug} P${chapter.priority} → P${c.priority}`);
      if (!DRY)
        await prisma.chapter.update({
          where: { id: chapter.id },
          data: { priority: c.priority, sourceRef: JEE_SRC },
        });
      for (const slug of c.retire ?? []) {
        note(`  - retire topic ${slug}`);
        if (!DRY) await prisma.topic.updateMany({ where: { chapterId: chapter.id, slug }, data: { isDeleted: true } });
      }
      const count = await prisma.topic.count({ where: { chapterId: chapter.id } });
      await upsertTopics(chapter.id, c.topics, { baseOrder: count });
    }
  }
}

async function syncJeeNcert() {
  const exam = await prisma.exam.findUniqueOrThrow({ where: { slug: "jee-main" } });
  for (const [subjectSlug, chapters] of Object.entries(JEE_NCERT)) {
    const subject = await prisma.subject.findUniqueOrThrow({ where: { examId_slug: { examId: exam.id, slug: subjectSlug } } });
    for (const [slug, links] of Object.entries(chapters)) {
      note(`JEE ncert ${slug}: ${links.map((l) => l[0]).join(", ")}`);
      if (DRY) continue;
      const res = await prisma.chapter.updateMany({
        where: { subjectId: subject.id, slug },
        data: { ncertLinks: links.map(([code, title]) => ncert(code, title)) },
      });
      if (res.count === 0) note(` ! missing chapter ${slug}`);
    }
  }
}

(async () => {
  await syncRbse();
  await syncJee();
  await syncJeeNcert();
  console.log(log.join("\n"));
  console.log(DRY ? "\n(dry run — nothing written)" : "\nSyllabus synced.");
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
