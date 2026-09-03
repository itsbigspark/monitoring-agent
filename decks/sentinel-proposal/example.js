#!/usr/bin/env node
/**
 * bigspark-slides example deck — page layer.
 *
 * Demonstrates variable-count layouts by randomising 3–5 items per slide.
 * Each run exercises different code paths in the layout engine.
 *
 * Run:
 *   node scripts/example.js
 *
 * Produces: bigspark_example.pptx
 */
const pptxgen = require("pptxgenjs");
const { W, H } = require("./theme");
const slides = require("./slides");

// ---- RANDOMISATION HELPERS ----------------------------------------------

/** Random integer between min and max inclusive. */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick n random items from an array (without replacement). */
function pick(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ---- CONTENT POOLS (pick from these) ------------------------------------

const ALL_AGENDA = [
  ["01", "The Problem", "Why this matters now"],
  ["02", "Our Approach", "How we solve it"],
  ["03", "Key Numbers", "Scale and performance"],
  ["04", "Next Steps", "From here to production"],
  ["05", "Architecture", "How the system fits together"],
  ["06", "Security", "Trust model and compliance"],
  ["07", "Timeline", "Phases and milestones"],
  ["08", "Team", "Who delivers and how"],
];

const ALL_STATS = [
  ["55%", "Reduction in manual effort"],
  ["3x", "Faster time to production"],
  ["£2M", "Annual savings identified"],
  ["98%", "Model accuracy on production data"],
  ["40ms", "Average inference latency"],
];

const ALL_CAPABILITIES = [
  { title: "Data Platform", lines: ["Lakehouse architecture", "Streaming pipelines"] },
  { title: "ML Engineering", lines: ["Model training", "MLOps deployment"] },
  { title: "Agentic Systems", lines: ["Multi-agent orchestration", "Tool-use and MCP"] },
  { title: "Operations", lines: ["Production monitoring", "Drift detection"] },
  { title: "Security", lines: ["Threat modelling", "Compliance automation"] },
];

const ALL_STATEMENTS = [
  ["We ", "build production AI", ": not prototypes that gather dust."],
  ["We ", "embed with your teams", ": knowledge transfer is the deliverable."],
  ["We ", "measure what matters", ": outcomes over activity, always."],
  ["We ", "ship incrementally", ": value in weeks, not quarters."],
  ["We ", "own the outcome", ": accountability from design to production."],
];

const ALL_FOLLOWUPS = [
  ["Deep-dive", "Architecture patterns"],
  ["Case studies", "Sector proof points"],
  ["Engagement", "Timelines and team shape"],
  ["Pricing", "Fixed-price and T&M options"],
  ["References", "Client testimonials"],
];

const ALL_PHASES = [
  { title: "Foundation", duration: "3 weeks", body: "Data sources joined to a unified spine. Historical analysis identifies highest-impact levers.", gate: "Gate: evidenced go/no-go with prioritised use cases backed by ROI.", price: "£26k" },
  { title: "Proof of Value", duration: "3–5 weeks", body: "Models built and validated against held-out data. True-cost model quantifies cost per lever.", gate: "Gate: model accuracy and explainability sign-off.", price: "TBC" },
  { title: "Go Live", duration: "4–5 weeks", body: "System recommends daily targets. Team reviews, adjusts, approves. Live updates throughout the day.", gate: "Gate: target adoption and outcome tracking over trial period.", price: "TBC" },
  { title: "Supervised Autonomy", duration: "2–4 weeks", body: "Approved settings written back. Tighten toward real-time cadence within safety bounds.", gate: "Gate: KPIs vs. pre-engagement baseline.", price: "TBC" },
  { title: "Full Autonomy", duration: "Ongoing", body: "System operates independently with human oversight for exceptions and drift detection.", gate: "Gate: sustained performance above threshold for 30 days.", price: "TBC" },
];

// ---- RANDOMISE COUNTS ---------------------------------------------------
const agendaCount = randInt(4, 8);
const statCount = randInt(3, 5);
const capCount = randInt(3, 5);
const phaseCount = randInt(3, 5);
const statementCount = randInt(1, 3);
const followupCount = randInt(3, 5);

// Random footers — each slide independently may or may not have one
const FOOTER_POOL = [
  "Source: internal benchmarks, Q2 2026. Results may vary by engagement.",
  "All figures based on production deployments across 12+ enterprise clients.",
  "Phase 1 pricing confirmed. Phases 2+ scoped after each gate.",
  "Timelines assume dedicated team allocation and client data access within week 1.",
  "Metrics validated against held-out test sets; confidence intervals available on request.",
];
const statsFooter = Math.random() > 0.5 ? FOOTER_POOL[randInt(0, 1)] : undefined;
const capsFooter = Math.random() > 0.5 ? FOOTER_POOL[randInt(2, 3)] : undefined;
const roadmapFooter = Math.random() > 0.5 ? FOOTER_POOL[randInt(2, 4)] : undefined;

console.log(`Randomised layout: ${agendaCount} agenda, ${statCount} stats, ${capCount} capabilities, ${phaseCount} phases, ${statementCount} statements, ${followupCount} follow-ups`);
console.log(`Footers: stats=${!!statsFooter}, caps=${!!capsFooter}, roadmap=${!!roadmapFooter}`);

// ---- BUILD DECK ---------------------------------------------------------
const pres = new pptxgen();
pres.defineLayout({ name: "BIGSPARK", width: W, height: H });
pres.layout = "BIGSPARK";

// ---- SLIDE 1: COVER (4–8 agenda items) ----------------------------------
slides.cover(pres, {
  title: "Deck Title\nGoes Here",
  subtitle: "How we do the thing in under a second",
  label: "EXAMPLE DECK",
  agenda: ALL_AGENDA.slice(0, agendaCount),
  notes: `Slide type: cover. Random choices: ${agendaCount} agenda items (range 4–8).`,
});

// ---- SLIDE 2: EXECUTIVE SUMMARY -----------------------------------------
const execFooter = Math.random() > 0.5 ? "Private and confidential. Do not distribute." : undefined;
slides.executiveSummary(pres, {
  label: "EXECUTIVE SUMMARY",
  headline: "AI-driven real-time decision making — increase yields and decrease costs",
  lead: "Your system generates the right signals but no single platform turns them into action at the pace conditions change to optimise yield and reduce costs.",
  paragraphs: [
    "We will build an AI-backed process enabling operations teams to make intra-day decisions, potentially every 10 minutes. Automated AI-backed actions drive increased yield and decreased costs.",
    "In the foundation phase, we take historical data and validate the business case for future phases. The team will work closely with management and finance to create ROI-backed next steps, including a proposed technical architecture and plan.",
    "We bring best-in-class AI Engineering capabilities to deliver this foundation phase in 3 weeks. Our team will leverage learnings from prior engagements and AI technical ideation work already completed.",
  ],
  footer: execFooter,
  notes: `Slide type: executiveSummary. Random choices: footer=${!!execFooter}.`,
});

// ---- SLIDE 3: STATS (3–5 stat cards) ------------------------------------
slides.stats(pres, {
  label: "KEY METRICS",
  headline: "Quantified outcome headline.",
  stats: pick(ALL_STATS, statCount),
  insight: {
    title: "Key Insight",
    body: "Insight body text explaining the numbers above.",
  },
  footer: statsFooter,
  notes: `Slide type: stats. Random choices: ${statCount} stat cards (range 3–5), footer=${!!statsFooter}.`,
});

// ---- SLIDE 4: SECTION DIVIDER -------------------------------------------
slides.sectionDivider(pres, {
  num: "01",
  title: "Capabilities",
  sub: "What we build and how we deliver",
  notes: "Slide type: sectionDivider. No random choices.",
});

// ---- SLIDE 5: NARRATIVE + CARDS (3–5 capability cards) ------------------
slides.narrativeCards(pres, {
  label: "CAPABILITIES",
  headline: "Full-stack AI delivery, from platform to production.",
  headlineFontSize: 22,
  narrative: {
    title: "Narrative headline",
    body: "Every engagement covers the complete path from raw data to live system.",
  },
  cards: pick(ALL_CAPABILITIES, capCount),
  cardOpts: { bodySize: 9.5 },
  footer: capsFooter,
  notes: `Slide type: narrativeCards. Random choices: ${capCount} capability cards (range 3–5), footer=${!!capsFooter}.`,
});

// ---- SLIDE 6: ROADMAP (3–5 phase columns) -------------------------------
slides.roadmap(pres, {
  label: "DELIVERY ROADMAP",
  headline: "Foundation phase unlocks the business case for future improvements.",
  phases: ALL_PHASES.slice(0, phaseCount),
  footer: roadmapFooter,
  notes: `Slide type: roadmap. Random choices: ${phaseCount} phases (range 3–5), footer=${!!roadmapFooter}.`,
});

// ---- SLIDE 7: CLOSING — DISCUSSION PROMPT (1–3 statements, 3–5 follow-up cards)
slides.closingDiscussionPrompt(pres, {
  statements: pick(ALL_STATEMENTS, statementCount),
  followups: pick(ALL_FOLLOWUPS, followupCount),
  notes: `Slide type: closingDiscussionPrompt. Random choices: ${statementCount} statements (range 1–3), ${followupCount} follow-up cards (range 3–5).`,
});

// ---- SLIDE 8: CLOSING — NEXT STEPS (3–5 action items) -------------------
const ALL_NEXT_STEPS = [
  { action: "Schedule data access workshop", owner: "Sarah Chen", deadline: "Week 1" },
  { action: "Provision sandbox environment", owner: "Platform team", deadline: "Week 1" },
  { action: "Deliver historical data extract", owner: "Client DBA", deadline: "Week 2" },
  { action: "Run baseline model validation", owner: "bigspark ML", deadline: "Week 3" },
  { action: "Present go/no-go to steering group", owner: "Joint", deadline: "Week 4" },
];
const nextStepCount = randInt(3, 5);

slides.closingNextSteps(pres, {
  headline: "Next Steps",
  actions: ALL_NEXT_STEPS.slice(0, nextStepCount),
  notes: `Slide type: closingNextSteps. Random choices: ${nextStepCount} actions (range 3–5).`,
});

// ---- SLIDE 9: CLOSING — KEY TAKEAWAYS (3–5 items) -----------------------
const ALL_TAKEAWAYS = [
  "The model is validated: 55% cost reduction is achievable within the existing data estate.",
  "No new infrastructure required: the platform runs on your current Databricks investment.",
  "Phase 1 pays for itself: ROI positive within 8 weeks of go-live.",
  "The team transfers knowledge by design: your engineers pair with ours from day one.",
  "Regulatory obligations are met: PRISM governance baked into every deliverable.",
];
const takeawayCount = randInt(3, 5);

slides.closingTakeaways(pres, {
  headline: "Key Takeaways",
  takeaways: ALL_TAKEAWAYS.slice(0, takeawayCount),
  notes: `Slide type: closingTakeaways. Random choices: ${takeawayCount} takeaways (range 3–5).`,
});

// ---- SLIDE 10: CLOSING — THE ASK ----------------------------------------
slides.closingAsk(pres, {
  context: "We have validated the model on 18 months of historical data and confirmed a 55% reduction in manual processing cost.",
  ask: "Approve £180k for Phase 2 build-out and production deployment.",
  consequence: "Every week of delay costs £22k in unrealised savings. The team disbands on 22 Aug if we don't proceed.",
  nextStep: "Sign the SOW by Friday 8 Aug. Kick-off meeting Monday 11 Aug with the full delivery squad.",
  notes: "Slide type: closingAsk. No random choices (fixed content for this variant).",
});

// ---- SLIDE 11: COMPARISON TABLE (4–8 rows) -------------------------------
const ALL_COMPARISON_ROWS = [
  ["No clear business intent or KPIs", "Intention workshop — structured translation of AI ambition into measurable goals and governance requirements"],
  ["Model behaviour unpredictable in real-world conditions", "Sandbox ROI build and technical evaluation in safe environments before any production commitment"],
  ["Regulatory and legal obligations unclear or unmet", "Legal and business evaluation aligned to FCA, GDPR and EU AI Act obligations, with PRISM governance baked in"],
  ["Brittle data pipelines and untrusted data lineage", "MLOps accelerator with automated lineage capture, drift detection and PII tracing"],
  ["No deployment path from model to production", "Production readiness framework: deployment automation, monitoring and incident management"],
  ["No AI inventory, ownership or control traceability", "PRISM onboarding: AI inventory, control mapping and EU AI Act compliance baseline"],
  ["AI literacy gap preventing business sponsor engagement", "Design and ontology sprint: shared vocabulary, decision model and stakeholder alignment"],
  ["Vendor lock-in from off-the-shelf AI tooling", "Architecture review and migration path: open standards, internal capability building"],
];

const compRowCount = randInt(4, 8);
const compFooter = Math.random() > 0.6 ? "Based on patterns observed across 50+ enterprise AI engagements." : undefined;

slides.comparisonTable(pres, {
  label: "FROM TRIAL TO PRODUCTION",
  headline: "Where AI stalls: and how we unblock it.",
  leftHeader: "Typical Blocker",
  rightHeader: "How Bigspark Bridges It",
  rows: ALL_COMPARISON_ROWS.slice(0, compRowCount),
  footer: compFooter,
  notes: `Slide type: comparisonTable. Random choices: ${compRowCount} rows (range 4–8), footer=${!!compFooter}.`,
});

// ---- SLIDE 12: PROCESS GRID (6–10 steps) ---------------------------------
const ALL_PROCESS_STEPS = [
  { title: "Inception", desc: "Idea → intent & KPIs" },
  { title: "Design", desc: "Design the AI system" },
  { title: "Development", desc: "Build the system" },
  { title: "Verification", desc: "Meets technical requirements" },
  { title: "Validation", desc: "Meets business & legal objectives" },
  { title: "Deployment", desc: "Install / release / configure" },
  { title: "Operation", desc: "Run, monitor, repair" },
  { title: "Continuous\nValidation", desc: "Incremental learning monitored" },
  { title: "Reevaluation", desc: "Post-operation reassessment" },
  { title: "Retirement", desc: "Decommission / replace" },
];

const stepCount = randInt(6, 10);
const processLead = Math.random() > 0.4
  ? "We anchor every engagement to the AI lifecycle. Each stage maps to a Standard SKU on the journey."
  : undefined;
const processFooter = Math.random() > 0.6 ? "Aligned to ISO/IEC 22989 AI lifecycle standard." : undefined;

console.log(`Process grid: ${stepCount} steps (${Math.ceil(stepCount / 2)}×2), lead=${!!processLead}`);

slides.processGrid(pres, {
  label: "OUR ENGAGEMENT MODEL",
  headline: "Fixed-price AI. ISO-aligned delivery.",
  lead: processLead,
  steps: ALL_PROCESS_STEPS.slice(0, stepCount),
  footer: processFooter,
  notes: `Slide type: processGrid. Random choices: ${stepCount} steps (range 6–10), lead=${!!processLead}, footer=${!!processFooter}.`,
});

// ---- SLIDE 13: CASE STUDY (2–3 sections, 3–5 outcomes) ------------------
const ALL_CASE_SECTIONS = [
  { heading: "The Challenge", body: "The FCA needed to analyse a large body of regulatory documentation, a task requiring six people working for six months under the traditional approach." },
  { heading: "Our Approach", body: "bigspark built a GenAI-powered regulatory intelligence tool in 6 hours. It ingests, parses and indexes FCA source documents, then answers natural-language queries with cited, source-grounded responses." },
  { heading: "Why It Matters", body: "The same pattern works for any regulatory corpus. Replicable at speed, at a fraction of the traditional cost." },
];

const ALL_CASE_OUTCOMES = [
  ["6 hrs", "to build vs 6 months manual"],
  ["10–20x", "faster than a 6-person analyst team"],
  ["✓", "Source-grounded outputs — curated knowledge base eliminates hallucination risk"],
  ["✓", "Production-grade UI, demoable today"],
  ["✓", "Reusable pattern for any regulatory corpus"],
];

const caseSectionCount = randInt(2, 3);
const caseOutcomeCount = randInt(3, 5);
const caseFooter = Math.random() > 0.5 ? "FCA Digital Sandbox engagement, Q4 2025." : undefined;

console.log(`Case study: ${caseSectionCount} sections, ${caseOutcomeCount} outcomes`);

slides.caseStudy(pres, {
  label: "FCA CASE STUDY",
  headline: "Regulatory intelligence at speed.",
  sections: ALL_CASE_SECTIONS.slice(0, caseSectionCount),
  outcomes: ALL_CASE_OUTCOMES.slice(0, caseOutcomeCount),
  footer: caseFooter,
  notes: `Slide type: caseStudy. Random choices: ${caseSectionCount} sections (range 2–3), ${caseOutcomeCount} outcomes (range 3–5), footer=${!!caseFooter}.`,
});

// ---- SLIDE 14: PRODUCT DEEP-DIVE (2–3 cards per section) ----------------
const ALL_PRODUCT_SECTION_1 = [
  { title: "Simulation-based synthetic data", body: "Artificial people, accounts, transactions and financial behaviours — statistically realistic, fully auditable, privacy-safe by construction." },
  { title: "Not generative AI. Not ML.", body: "Rules-based simulation modelled from first principles. Every data point documented and auditable. No hallucination risk." },
  { title: "No real data. Ever.", body: "Nothing derived from or based on personal records. No consent to manage, no DSAR exposure, no breach risk." },
];

const ALL_PRODUCT_SECTION_2 = [
  { title: "AI development and testing", body: "Train, test and validate AI models without touching personal data. Build edge cases no real dataset contains." },
  { title: "Regulatory sandbox delivery", body: "Multi-firm environments where real data sharing is impossible. Collaborative innovation without privacy barriers." },
  { title: "Scenario modelling", body: "Data that does not exist yet: new products, new markets, new regulations. Build and validate before launch." },
];

const productCardsPerSection = randInt(2, 3);
const productLead = Math.random() > 0.3
  ? "Realistic financial data, generated from simulation. No real data involved at any point."
  : undefined;
const productFooter = Math.random() > 0.6 ? "Aizle is a bigspark product, available as SaaS or on-premise." : undefined;

console.log(`Product deep-dive: ${productCardsPerSection} cards per section, lead=${!!productLead}`);

slides.productDeepDive(pres, {
  label: "AIZLE | SYNTHETIC DATA",
  headline: "The data you need but cannot use.",
  lead: productLead,
  sections: [
    { name: "What Aizle Produces", cards: ALL_PRODUCT_SECTION_1.slice(0, productCardsPerSection) },
    { name: "What It Unlocks", cards: ALL_PRODUCT_SECTION_2.slice(0, productCardsPerSection) },
  ],
  footer: productFooter,
  notes: `Slide type: productDeepDive. Random choices: ${productCardsPerSection} cards per section (range 2–3), lead=${!!productLead}, footer=${!!productFooter}.`,
});

// ---- SLIDE 15: PROOF POINTS (2–6 cards) ---------------------------------
const ALL_PROOF_POINTS = [
  { title: "Four years. One regulator.", body: "The UK FCA has used Aizle data continuously since 2022 across the Digital Sandbox, AI Sandbox, and Smart Data Accelerator programmes." },
  { title: "UK Government adoption", body: "Aizle data powers the Department for Business and Trade Smart Data Challenge — spanning Open Banking, Insurance, Energy, and Telecoms." },
  { title: "Tier 1 global bank AI hackathon", body: "Aizle produced datasets safe for unrestricted AI processing across multi-team events with zero data governance overhead." },
  { title: "Stress-tested by investors", body: "infact systems built and validated a production-grade identity matching product entirely on Aizle synthetic data before any real data integration." },
  { title: "NatWest production deployment", body: "Aizle synthetic data validated fraud detection models before production exposure to real customer transactions." },
  { title: "Multi-firm collaboration", body: "Enabled joint innovation programmes between competing firms — each sees realistic data without exposing proprietary customer records." },
];

const proofCount = randInt(2, 6);
const proofLead = Math.random() > 0.3
  ? "Four years of regulatory endorsement, commercial stress-testing, and government adoption."
  : undefined;
const proofFooter = Math.random() > 0.6 ? "All proof points independently verifiable via public references." : undefined;

console.log(`Proof points: ${proofCount} cards, lead=${!!proofLead}`);

slides.proofPoints(pres, {
  label: "PROOF POINTS",
  headline: "Why organisations trust Aizle.",
  lead: proofLead,
  points: ALL_PROOF_POINTS.slice(0, proofCount),
  footer: proofFooter,
  notes: `Slide type: proofPoints. Random choices: ${proofCount} cards (range 2–6), lead=${!!proofLead}, footer=${!!proofFooter}.`,
});

// ---- WRITE FILE ---------------------------------------------------------
const OUTPUT = "bigspark_example.pptx";
pres.writeFile({ fileName: OUTPUT })
  .then(() => {
    console.log(`Written: ${OUTPUT}`);
  })
  .catch((e) => { console.error(e); process.exit(1); });
