#!/usr/bin/env node
/**
 * Sentinel proposal deck, bigspark-branded.
 *
 * Rebuilds the client-facing Sentinel proposal on the bigspark-slides
 * design system (pptxgenjs). Content mapped from the original
 * docs/slide-deck/sentinel-proposal-deck.pptx (built by
 * docs/diagrams/diagram-scripts/build_deck.py), rewritten to the
 * bigspark voice: no em dashes, lowercase "bigspark", takeaway
 * headlines, one idea per slide, no invented figures.
 *
 * Run:  node deck.js
 * Out:  sentinel-bigspark-deck.pptx
 */
const pptxgen = require("pptxgenjs");
const { W, H } = require("./theme");
const slides = require("./slides");

const pres = new pptxgen();
pres.defineLayout({ name: "BIGSPARK", width: W, height: H });
pres.layout = "BIGSPARK";

// ---- 1. COVER ----------------------------------------------------------
slides.cover(pres, {
  title: "Sentinel",
  subtitle: "Agentic incident auto-investigation · the first feature of Mission Control",
  label: "Project proposal · draft for discussion",
  agenda: [
    ["01", "The problem", "Alerts detect, humans diagnose"],
    ["02", "How it works today", "The manual investigation loop"],
    ["03", "Sentinel", "An agent that investigates automatically"],
    ["04", "Architecture & security", "Built for the bank"],
    ["05", "Where it scales", "One system to the whole estate"],
    ["06", "Engagement", "A low-commitment start"],
  ],
  notes:
    "One-line pitch: we turn a manual, senior-engineer-dependent investigation loop into a " +
    "deployable agent that diagnoses incidents and proposes fixes. Sentinel is the first feature " +
    "we ship of a broader platform, Mission Control. Sentinel is a working name.",
});

// ---- 2. PROBLEM (executiveSummary) -------------------------------------
slides.executiveSummary(pres, {
  label: "The problem",
  headline: "An alert tells you something broke, not why, or how to fix it.",
  lead:
    "Splunk fires alerts off application logs and raises a ServiceNow ticket. The ticket names the " +
    "error and little else.",
  paragraphs: [
    "There is no root-cause analysis, no context, and no proposed fix. A senior engineer must then " +
      "manually investigate every ticket.",
    "Investigation is the slowest, most repetitive phase of incident response, and it bottlenecks on " +
      "a handful of people.",
  ],
  notes:
    "Set up the pain: the alerting system detects symptoms but does no diagnosis. Humans carry the " +
    "entire investigation load.",
});

// ---- 3. HOW IT WORKS TODAY (processGrid) -------------------------------
slides.processGrid(pres, {
  label: "How it works today",
  headline: "The current manual investigation loop.",
  lead: "Steps three to five are pure manual toil. That is the work Sentinel takes over.",
  steps: [
    { title: "Alert fires", desc: "Splunk detects the symptom" },
    { title: "Ticket raised", desc: "ServiceNow logs the error" },
    { title: "Read logs", desc: "Engineer reads logs by hand" },
    { title: "Cross-check", desc: "Checks code and other systems" },
    { title: "Reproduce", desc: "Reproduces and diagnoses" },
    { title: "Write up fix", desc: "Hands a fix to the dev team" },
  ],
  footer:
    "Slow, person-dependent and lossy: serial evidence-gathering inflates time-to-diagnosis, and " +
    "findings live in tickets and people's heads.",
  notes:
    "Walk the loop left to right. Emphasise that steps three to five are pure manual toil that the " +
    "agent can take over.",
});

// ---- 4. WHY NOW (narrativeCards) ---------------------------------------
slides.narrativeCards(pres, {
  label: "Why now",
  headline: "The loop is already proven, manually.",
  narrative: {
    title: "Proven, not speculative",
    body:
      "A custom Splunk MCP server, already built at NatWest, lets an AI assistant query logs on " +
      "demand. Connected to the codebase, it already surfaces root causes. Today it runs by hand, " +
      "per incident.",
  },
  cards: [
    { title: "Already works", lines: ["Connected to logs and code, it has been phenomenal in practice."] },
    { title: "The opportunity", lines: ["Automate and productise a workflow that already delivers."] },
    { title: "Timing", lines: ["Teams like Complaints are onboarding alerting now. Early enough to build automation in from the start."] },
  ],
  notes:
    "This de-risks the pitch: we are not proposing something speculative, we are automating a " +
    "workflow that already works manually.",
});

// ---- 5. THE SOLUTION (comparisonTable) ---------------------------------
slides.comparisonTable(pres, {
  label: "The proposed solution",
  headline: "Sentinel investigates incidents automatically.",
  leftHeader: "Manual today",
  rightHeader: "With Sentinel",
  rows: [
    ["Human triages the ticket and kicks off the work", "Triggers automatically on a qualifying ServiceNow incident"],
    ["Engineer gathers logs by hand", "Pulls the relevant Splunk logs and inspects the deployed codebase"],
    ["Checks databases and other systems one by one", "Queries supporting systems (DB, Snowflake, S3) as needed"],
    ["Reasons about the failure from memory and notes", "Reasons inside an isolated playground environment"],
    ["Findings land in a ticket, if at all", "Delivers a structured report with a confidence level, posted back for approval"],
  ],
  footer:
    "Overview, investigation, root cause, then a proposed fix or synopsis. A human reviews and approves.",
  notes: "This is the what. Keep it outcome-focused; architecture comes next.",
});

// ---- 6. HOW SENTINEL WORKS (processGrid) -------------------------------
slides.processGrid(pres, {
  label: "How Sentinel works",
  headline: "End-to-end investigation flow.",
  lead: "Iterative, cost-aware log retrieval. Every diagnosis carries a confidence level and a full evidence trail.",
  steps: [
    { title: "Detect & triage", desc: "Qualifies the incident" },
    { title: "Plan", desc: "Plans the investigation" },
    { title: "Gather evidence", desc: "Logs, code and data" },
    { title: "Find root cause", desc: "Correlates the evidence" },
    { title: "Fix or synopsise", desc: "Validates a fix in the playground" },
    { title: "Human review", desc: "A person approves the outcome" },
  ],
  footer:
    "Every tool call and decision is logged. Human verdicts feed a golden dataset that tracks " +
    "accuracy, fix acceptance and MTTD over time.",
  notes:
    "The playground step is where it validates a candidate fix safely before proposing it.",
});

// ---- 7. TWO OUTCOMES (productDeepDive) ---------------------------------
slides.productDeepDive(pres, {
  label: "Two valuable outcomes",
  headline: "Fix it, or fast-track the human.",
  lead:
    "Value does not require solving everything. For illustration: 70% resolved outright plus 30% " +
    "accelerated is a brilliant outcome.",
  sections: [
    {
      name: "A. Validated fix",
      cards: [
        { title: "Reproduce", body: "Reproduces the issue and develops a fix in an isolated playground." },
        { title: "Test first", body: "Tests the fix before proposing it. Zero production risk." },
        { title: "Propose", body: "Offered for human review, for example as a pull request." },
      ],
    },
    {
      name: "B. Investigation synopsis",
      cards: [
        { title: "When a fix is not safe", body: "Delivers what it found instead of forcing a fix." },
        { title: "Evidence", body: "Overview, evidence, root-cause hypothesis and suggested next steps." },
        { title: "Head start", body: "Gives the human a major head start and speeds up resolution." },
      ],
    },
  ],
  footer: "Partial automation still wins: resolve many outright, accelerate the rest.",
  notes:
    "Key commercial framing: value does not require solving everything. Even partial coverage plus " +
    "acceleration of the rest is a strong return.",
});

// ---- 8. ARCHITECTURE (narrativeCards) ----------------------------------
slides.narrativeCards(pres, {
  label: "Architecture",
  headline: "Built to scale, and to swap parts out.",
  headlineFontSize: 22,
  narrative: {
    title: "Fully in-client",
    body:
      "Deployed inside the client environment, one isolated instance per client. The same versioned " +
      "containers run on-prem or in any cloud via Compose or Helm. Air-gap capable, built on open " +
      "protocols.",
  },
  cards: [
    { title: "Agent orchestration", lines: ["OpenAI Agents SDK. A deterministic pipeline with agentic loops and a full audit trace."] },
    { title: "MCP-first integration", lines: ["Reuses the existing Splunk MCP. Each new system is a connector plus playbook, not a rewrite."] },
    { title: "Model-agnostic", lines: ["Swap between Bedrock, in-VPC or local models by configuration. No vendor lock-in."] },
    { title: "Intent Layer", lines: ["Hierarchical in-repo context, so the agent understands the architecture before reading code."] },
  ],
  cardOpts: { bodySize: 9.5 },
  notes:
    "Three pillars to land: MCP-first scales, model-agnostic covers compliance and lock-in, in-client " +
    "means data never leaves. The Intent Layer is the quality multiplier. Engine note: Sentinel uses " +
    "the OpenAI Agents SDK; LangGraph is kept for heavier future incident types, chosen per type " +
    "behind shared seams.",
});

// ---- 9. SECURITY (proofPoints) -----------------------------------------
slides.proofPoints(pres, {
  label: "Built for the bank",
  headline: "Security, compliance and governance, first-class.",
  lead: "Read-only, in-client, and human-approved by default.",
  points: [
    { title: "Read-only, least privilege", body: "No write access to production. Scoped credentials." },
    { title: "Human-approved by default", body: "Fixes are validated in a sandbox, then proposed for review." },
    { title: "Fully in-client", body: "All logs, code, data and inference stay inside your boundary." },
    { title: "Complete audit trail", body: "Every tool call and decision is logged and attributable." },
    { title: "Model choice you approve", body: "Run only models your security teams have signed off." },
    { title: "Sensitive-data handling", body: "Screening and redaction before anything reaches the model." },
  ],
  notes: "This slide is what gets you past infosec. Lead with read-only, in-client and human-in-the-loop.",
});

// ---- 10. DEPLOYMENT & ONBOARDING (narrativeCards) ----------------------
slides.narrativeCards(pres, {
  label: "Deployment & onboarding",
  headline: "Runs anywhere, without client-specific forks.",
  narrative: {
    title: "One product, configured per client",
    body:
      "A deployment is a reviewed config bundle, secret references and MCP or content-source " +
      "endpoints. Open protocols avoid cloud lock-in and per-client forks.",
  },
  cards: [
    { title: "Portable by default", lines: ["The same versioned images run on-prem or in AWS, Azure or GCP, with an offline bundle for air-gapped sites."] },
    { title: "Configuration, not custom code", lines: ["Each rollout adds config and endpoints, not a fork."] },
    { title: "Preflight before go-live", lines: ["The onboarding CLI validates config, connectivity and index freshness, then smoke-tests an investigation."] },
  ],
  footer:
    "One isolated instance per client. No phone-home. All code, evidence and inference stay inside the approved boundary.",
  notes:
    "This is the newly designed deployment model, not a claim that every packaging component is " +
    "already built. The message is repeatability: shared versioned images, per-client configuration, " +
    "automated checks, and an air-gap path, not bespoke forks.",
});

// ---- 11. WHERE WE START (executiveSummary) -----------------------------
slides.executiveSummary(pres, {
  label: "Where we start",
  headline: "Prove it on lower-tier systems first.",
  lead: "Begin on Tier 3 platforms: low criticality, with a roughly three-day resolution turnaround.",
  paragraphs: [
    "An instant automated investigation there turbocharges the monitoring teams' resolution-time KPIs " +
      "and dashboards.",
    "Demonstrate value and build trust with zero risk to business-critical systems, then scale up the " +
      "tiers as confidence grows.",
  ],
  notes:
    "Tier 1 needs instant human action; Tier 3 has slack we can fill. An easy, low-risk, KPI-boosting " +
    "first win.",
});

// ---- 12. HOW IT SCALES (narrativeCards) --------------------------------
slides.narrativeCards(pres, {
  label: "How it scales",
  headline: "One system today, the whole estate over time.",
  narrative: {
    title: "Additive by design",
    body:
      "MCP-first means new incident types and new systems reuse the core agent, governance and " +
      "reporting unchanged.",
  },
  cards: [
    { title: "New incident types", lines: ["From Splunk-driven microservice incidents to Airflow DAG failures or LLM output-quality alerts."] },
    { title: "New triggers", lines: ["ServiceNow today. Airflow events and email alerts next."] },
    { title: "Progressive autonomy", lines: ["Human-approved first, then opt-in auto-apply on lower tiers once the track record is proven. Always audited and reversible."] },
    { title: "Broad applicability", lines: ["Applies across independent business areas, each with many candidate systems."] },
  ],
  cardOpts: { bodySize: 9.5 },
  notes:
    "Land the scalability story. Progressive autonomy reassures: we do not ask for trust up front, we " +
    "earn it. The Airflow and LLM-eval examples suit a data-science and AIOps buyer, and become " +
    "monitoring surfaces in Mission Control.",
});

// ---- 13. THE BIGGER PICTURE (proofPoints) ------------------------------
slides.proofPoints(pres, {
  label: "The bigger picture",
  headline: "Sentinel is the first feature of Mission Control.",
  lead:
    "An operations cockpit for the teams that monitor and support many applications across a shared " +
    "incident queue.",
  points: [
    { title: "Sentinel: ships first", body: "Auto-investigation and resolution. The wedge and the differentiator." },
    { title: "Incident cockpit", body: "A per-application, historical view of the incident queue." },
    { title: "Dashboard hub", body: "QuickSight and Tableau dashboards in one place." },
    { title: "Ask Mission Control (future)", body: "Permission-aware Q&A over docs and deployed code." },
  ],
  footer:
    "Application catalog is the shared foundation: apps, repos, log sources, required docs and " +
    "playbooks. ServiceNow owns incidents; Confluence owns documentation; Mission Control indexes, " +
    "enriches and acts.",
  notes:
    "We ship Sentinel first, the wedge and the differentiator. It is the first feature of a broader " +
    "platform for the monitoring teams that own many apps. Same in-client deployment. ServiceNow and " +
    "Confluence stay authoritative. Ask Mission Control is future scope.",
});

// ---- 14. OPERATIONAL KNOWLEDGE (narrativeCards) ------------------------
slides.narrativeCards(pres, {
  label: "Operational knowledge",
  headline: "Better handovers, without a new source of truth.",
  narrative: {
    title: "One indexed source, not another silo",
    body:
      "Onboarding defines what every support team needs; Mission Control validates and indexes it for " +
      "day-to-day use. It stores requirements, links, permissions and index freshness, not duplicate " +
      "pages.",
  },
  cards: [
    { title: "Confluence stays authoritative", lines: ["Runbooks, ownership, dependencies and rollback stay authored and governed in Confluence."] },
    { title: "Teams become self-sufficient", lines: ["Indexed docs, code context and incident learning answer routine questions without returning to the original developers."] },
    { title: "Future: code-aware Q&A", lines: ["Ask Mission Control will combine approved Confluence content with deployed code and authorised incident history, with citations."] },
  ],
  cardOpts: { bodySize: 9.5 },
  notes:
    "Lead with structured handover and operational resilience, not criticism of current documentation. " +
    "Confluence remains the source of truth. Say 'reduces routine dependence', not 'replaces developers'.",
});

// ---- 15. THE VALUE (proofPoints) ---------------------------------------
slides.proofPoints(pres, {
  label: "The value",
  headline: "Why this matters.",
  points: [
    { title: "Faster resolution", body: "Compresses the slowest phase, time-to-diagnosis." },
    { title: "Senior-engineer leverage", body: "Frees scarce expertise from repetitive triage." },
    { title: "Measured quality", body: "Human verdicts and golden-set replay track accuracy and acceptance." },
    { title: "Support independence", body: "Structured handover reduces routine developer escalations." },
    { title: "Low-risk proving ground", body: "KPI gains on Tier 3 before critical systems." },
    { title: "Partial automation wins", body: "Resolve some, accelerate the rest, for a net gain." },
  ],
  notes:
    "Baseline MTTD, accuracy, fix acceptance, senior-engineer hours and routine escalations before " +
    "rollout so the after delta is provable. Human verdict capture and golden-dataset replay answer " +
    "the buyer question: how do we know it is right?",
});

// ---- 16. ENGAGEMENT MODEL (roadmap) ------------------------------------
slides.roadmap(pres, {
  label: "Engagement model",
  headline: "Low-commitment start, scalable rollout.",
  phases: [
    {
      title: "Platform analysis",
      duration: "Fixed fee",
      body:
        "A short analysis of a target platform. Scope evidence access, documentation readiness, " +
        "security and success baselines up front.",
      gate: "Gate: agreed scope and price for the PoC.",
      price: "Step 1",
    },
    {
      title: "Proof of Concept",
      duration: "Fixed scope",
      body:
        "Configure Sentinel, preflight every dependency and demonstrate it on real or historical " +
        "incidents.",
      gate: "Gate: proof before commitment.",
      price: "Step 2",
    },
    {
      title: "Scaled rollout",
      duration: "Fixed-price or T&M",
      body:
        "Implement platform by platform. Shared components built once; only platform-specific work " +
        "per system.",
      gate: "Gate: expand as confidence grows.",
      price: "Step 3",
    },
  ],
  footer:
    "The product stays shared. Each rollout adds a reviewed config bundle, approved knowledge sources, " +
    "connectors and playbooks, not a fork.",
  notes:
    "Client-safe commercial framing. Keep specific numbers for the live conversation. The " +
    "analysis-first step de-risks pricing for both sides.",
});

// ---- 17. NEXT STEPS (closingNextSteps) ---------------------------------
slides.closingNextSteps(pres, {
  headline: "Next steps",
  actions: [
    { action: "Align on a target platform for a Proof of Concept", owner: "Joint", deadline: "Immediate" },
    { action: "Run the fixed-fee platform analysis to scope and price it", owner: "bigspark", deadline: "Week 1\u20132" },
    { action: "Deliver the PoC on real incidents and review the results", owner: "bigspark", deadline: "PoC phase" },
    { action: "Agree the rollout plan across systems and areas", owner: "Joint", deadline: "Post-PoC" },
  ],
  notes:
    "Close with a concrete, low-commitment ask: agree one platform and run the analysis. Momentum over " +
    "perfection. Sentinel first, the foundation for Mission Control. Owners and timings are indicative " +
    "for a draft proposal.",
});

// ---- WRITE -------------------------------------------------------------
const OUTPUT = "sentinel-bigspark-deck.pptx";
pres
  .writeFile({ fileName: OUTPUT })
  .then(() => console.log(`Written: ${OUTPUT} (${pres.slides.length} slides)`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
