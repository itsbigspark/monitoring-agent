#!/usr/bin/env node
/**
 * Mission Control system-design deck, bigspark-branded.
 *
 * Source: docs/project/design/mission-control-system-design.md
 * Run:    npm run build
 * Output: mission-control-system-design.pptx
 */
const pptxgen = require("pptxgenjs");
const { C, FONT, W, H, MARGIN } = require("./theme");
const slides = require("./slides");
const { addLabel, addHeadline } = require("./components");

const pres = new pptxgen();
pres.defineLayout({ name: "BIGSPARK", width: W, height: H });
pres.layout = "BIGSPARK";
pres.author = "bigspark";
pres.company = "bigspark";
pres.subject = "Mission Control modular system design";
pres.title = "Mission Control architecture";
pres.lang = "en-GB";
pres.theme = {
  headFontFace: FONT,
  bodyFontFace: FONT,
  lang: "en-GB",
};

function customSlide(label, headline, notes, headlineSize = 24) {
  const s = pres.addSlide();
  s.background = { color: C.navy };
  addLabel(s, label);
  addHeadline(s, headline, 0.56, headlineSize, 0.72);
  if (notes) s.addNotes(notes);
  return s;
}

function box(s, x, y, w, h, title, body = "", opts = {}) {
  const {
    fill = C.navyCard,
    line = C.divider,
    lineWidth = 1,
    titleColor = C.white,
    bodyColor = C.offWhite,
    titleSize = 11,
    bodySize = 8.5,
    accent = false,
    align = "center",
  } = opts;
  s.addShape("rect", {
    x, y, w, h,
    fill: { color: fill },
    line: { color: line, width: lineWidth },
  });
  if (accent) {
    s.addShape("rect", {
      x, y, w: 0.05, h,
      fill: { color: C.teal },
      line: { color: C.teal },
    });
  }
  const pad = accent ? 0.14 : 0.1;
  const titleH = body ? Math.min(0.3, h * 0.44) : h - 0.08;
  s.addText(title, {
    x: x + pad,
    y: y + 0.06,
    w: w - pad - 0.08,
    h: titleH,
    fontFace: FONT,
    fontSize: titleSize,
    bold: true,
    color: titleColor,
    align,
    valign: body ? "top" : "middle",
    margin: 0,
  });
  if (body) {
    s.addText(body, {
      x: x + pad,
      y: y + titleH + 0.06,
      w: w - pad - 0.08,
      h: h - titleH - 0.14,
      fontFace: FONT,
      fontSize: bodySize,
      color: bodyColor,
      align,
      valign: "top",
      margin: 0,
    });
  }
}

function layerLabel(s, text, y, h) {
  s.addText(text.toUpperCase(), {
    x: MARGIN,
    y,
    w: 1.15,
    h,
    fontFace: FONT,
    fontSize: 7.5,
    bold: true,
    color: C.mid,
    charSpacing: 1.2,
    valign: "middle",
    margin: 0,
  });
}

function downArrow(s, y) {
  s.addText("↓", {
    x: 5.25,
    y,
    w: 0.3,
    h: 0.24,
    fontFace: FONT,
    fontSize: 15,
    bold: true,
    color: C.teal,
    align: "center",
    margin: 0,
  });
}

function footer(s, text) {
  s.addText(text, {
    x: MARGIN,
    y: 5.22,
    w: W - MARGIN * 2,
    h: 0.2,
    fontFace: FONT,
    fontSize: 7.5,
    color: C.mid,
    align: "center",
    margin: 0,
  });
}

// 1. COVER
slides.cover(pres, {
  title: "Mission Control architecture",
  subtitle: "Build the platform once. Ship Sentinel first.",
  label: "System design · proposed for senior review",
  agenda: [
    ["01", "Decision", "Choose the product boundary"],
    ["02", "Architecture", "Separate platform, modules and adapters"],
    ["03", "Proof", "Sentinel first, Dashboard Hub second"],
    ["04", "Deployment", "One immutable release, isolated per client"],
    ["05", "Ask", "Approve the guardrails and risk owners"],
  ],
  notes:
    "The decision is whether we build a Sentinel application that later becomes a platform, or " +
    "build the minimum Mission Control platform now and deliver Sentinel as its first feature. " +
    "The recommendation is the second option.",
});

// 2. CONTEXT
slides.proofPoints(pres, {
  label: "Decision context",
  headline: "The design must support more than Sentinel without becoming a plug-in platform.",
  headlineFontSize: 22,
  lead: "The platform boundary needs to be right before client integrations make it expensive to change.",
  points: [
    {
      title: "Sentinel already needs shared foundations",
      body: "Application identity, access control, configuration, jobs, audit, artifacts and a review UI are platform concerns.",
    },
    {
      title: "The product roadmap adds different capabilities",
      body: "Dashboard Hub, incident history, analytics and future evaluations do not share Sentinel's domain model.",
    },
    {
      title: "Clients need different enabled features",
      body: "One supported release must turn modules and providers on or off through environment-backed configuration.",
    },
    {
      title: "Every client has a different runtime boundary",
      body: "AWS, PCF and on-prem environments vary in identity, secrets, networking and isolated execution support.",
    },
  ],
  footer: "The target architecture is proposed. No modular product implementation is being claimed as complete.",
  notes:
    "Test alignment on the context first. Sentinel is the first use case, but its supporting foundations are already " +
    "needed by other Mission Control capabilities. The architecture must avoid both a Sentinel retrofit and a generic " +
    "runtime plug-in system.",
});

// 3. OPTIONS AND RECOMMENDATION
{
  const s = customSlide(
    "Architecture choice",
    "A modular monolith is the lowest-risk starting point.",
    "Option B buys the important seams without pre-paying for a distributed system. The cost is discipline: import rules, " +
      "module-owned data and architecture tests must make the monolith genuinely modular."
  );

  box(
    s,
    0.4,
    1.36,
    9.2,
    0.86,
    "Recommendation",
    "Make Mission Control the product shell. Compose supported feature modules at build time, enable them at startup, and keep client-specific connectors out of process.",
    { accent: true, line: C.teal, titleSize: 13, bodySize: 9.2, align: "left" }
  );

  const options = [
    {
      title: "A. Sentinel application first",
      body: "Fastest initial code path.\n\nCatalog, identity, flags and UI must later be extracted.\n\nMigration risk rises after client integrations are live.",
      fill: C.navyCard,
      line: C.divider,
    },
    {
      title: "B. Modular monolith",
      body: "Clear package and data ownership.\n\nOne supported release and operational model.\n\nBoundaries enforced by contracts and tests.",
      fill: C.blue,
      line: C.teal,
    },
    {
      title: "C. Feature microservices now",
      body: "Strong process isolation.\n\nImmediate networking, deployment and versioning cost.\n\nPremature while feature boundaries are still being learned.",
      fill: C.navyCard,
      line: C.divider,
    },
  ];
  const gap = 0.12;
  const cardW = (9.2 - gap * 2) / 3;
  options.forEach((option, i) => {
    box(s, 0.4 + i * (cardW + gap), 2.44, cardW, 2.42, option.title, option.body, {
      fill: option.fill,
      line: option.line,
      lineWidth: i === 1 ? 1.6 : 1,
      accent: i === 1,
      titleSize: 11.5,
      bodySize: 9,
      align: "left",
    });
  });

  footer(s, "Chosen: B. Split services only when scale, release cadence or isolation evidence requires it.");
}

// 4. LOGICAL ARCHITECTURE
{
  const s = customSlide(
    "Logical architecture",
    "Features, shared capabilities and provider adapters remain separate extension points.",
    "The web shell and API compose enabled feature modules. Sentinel alone uses the investigation runtime in the initial " +
      "release. Every module reuses the platform foundation, and provider adapters translate external systems without " +
      "leaking vendor SDKs into the domain."
  );

  const x0 = 1.55;
  const availW = 8.05;
  const dependencyArrow = (x, y) => {
    s.addText("↓", {
      x, y, w: 0.3, h: 0.24,
      fontFace: FONT, fontSize: 15, bold: true, color: C.teal,
      align: "center", margin: 0,
    });
  };

  layerLabel(s, "Product shell", 1.34, 0.44);
  box(s, x0, 1.34, availW, 0.44, "Mission Control web shell + API composition root", "", {
    fill: C.blue,
    line: C.teal,
    titleSize: 12,
  });
  downArrow(s, 1.79);

  layerLabel(s, "Feature modules", 2.02, 0.58);
  box(s, x0, 2.02, 2.55, 0.58, "Sentinel", "Feature 1", {
    line: C.teal,
    lineWidth: 1.6,
    titleSize: 11.5,
    bodySize: 8,
    accent: true,
  });
  box(s, x0 + 2.72, 2.02, 2.55, 0.58, "Dashboard Hub", "Next module", {
    titleSize: 11.5,
    bodySize: 8,
  });
  box(s, x0 + 5.44, 2.02, 2.61, 0.58, "Evaluations", "Future module", {
    titleColor: C.mid,
    bodyColor: C.mid,
    titleSize: 11.5,
    bodySize: 8,
  });
  dependencyArrow(2.68, 2.62);

  layerLabel(s, "Shared capability", 2.85, 0.48);
  box(s, x0, 2.85, 2.55, 0.48, "Investigation runtime", "", {
    line: C.blueMid,
    titleSize: 10.5,
  });
  s.addText("PLAYBOOKS + CONFIGURATION", {
    x: x0 + 3.0, y: 2.88, w: 4.9, h: 0.14,
    fontFace: FONT, fontSize: 7.2, bold: true, color: C.teal,
    charSpacing: 1.1, align: "center", margin: 0,
  });
  s.addText("Specialize installed modules without adding executable code.", {
    x: x0 + 2.85, y: 3.06, w: 5.2, h: 0.16,
    fontFace: FONT, fontSize: 8.2, color: C.mid, italic: true,
    align: "center", margin: 0,
  });
  dependencyArrow(2.68, 3.34);
  s.addText("ALL MODULES USE THE FOUNDATION", {
    x: 4.25, y: 3.39, w: 4.8, h: 0.14,
    fontFace: FONT, fontSize: 6.8, bold: true, color: C.mid,
    charSpacing: 1.1, align: "center", margin: 0,
  });

  layerLabel(s, "Platform foundation", 3.57, 0.58);
  const foundation = [
    "Application catalog",
    "Identity + policy",
    "Jobs + events",
    "Audit + artifacts",
    "Feature flags",
  ];
  const fGap = 0.08;
  const fW = (availW - fGap * 4) / 5;
  foundation.forEach((name, i) => {
    box(s, x0 + i * (fW + fGap), 3.57, fW, 0.58, name, "", {
      titleSize: 8.6,
      fill: C.navyCard,
      line: C.divider,
    });
  });
  downArrow(s, 4.16);

  layerLabel(s, "Provider adapters", 4.39, 0.58);
  box(s, x0, 4.39, 2.55, 0.58, "Incident + evidence", "ServiceNow · Splunk MCP", {
    titleSize: 9.4,
    bodySize: 7.6,
  });
  box(s, x0 + 2.72, 4.39, 2.55, 0.58, "Dashboards", "QuickSight · Tableau", {
    titleSize: 9.4,
    bodySize: 7.6,
  });
  box(s, x0 + 5.44, 4.39, 2.61, 0.58, "Platform providers", "Models · secrets · storage", {
    titleSize: 9.4,
    bodySize: 7.6,
  });

  footer(s, "Build-time modules · runtime feature flags · out-of-process connectors for client-specific access");
}

// 5. APPLICATION CATALOG
slides.productDeepDive(pres, {
  label: "Shared operational spine",
  headline: "The application catalog connects every capability without merging their domains.",
  headlineFontSize: 22,
  lead:
    "Each module attaches its own records to a stable application and environment identity. The platform does not grow one unbounded configuration document.",
  sections: [
    {
      name: "Platform owns",
      cards: [
        { title: "Application identity", body: "Stable application, environment and workspace references." },
        { title: "Shared metadata", body: "Owners, tier, lifecycle and authoritative-system references." },
        { title: "Provenance", body: "Records which values are owned, configured or mirrored." },
      ],
    },
    {
      name: "Modules attach",
      cards: [
        { title: "Sentinel", body: "Signals, playbooks, evidence sources, cases and findings." },
        { title: "Dashboard Hub", body: "QuickSight and Tableau bindings per application." },
        { title: "Future modules", body: "Evaluation, documentation and analytics data in their own schemas." },
      ],
    },
  ],
  footer: "Modules can reference platform IDs. They cannot write another module's tables.",
  notes:
    "The catalog is the reason the platform shell is coherent rather than scope creep. It is shared identity, not a shared " +
    "dumping ground. Each feature owns its own schema, API and migrations.",
});

// 6. SENTINEL FIRST
slides.processGrid(pres, {
  label: "Sentinel first",
  headline: "Sentinel proves the shared investigation lifecycle before we generalise it further.",
  headlineFontSize: 22,
  lead:
    "The reusable capability owns state, budgets, trace and review. Sentinel supplies incident schemas, tools, prompts and publication rules.",
  steps: [
    { title: "Normalize", desc: "Create a versioned signal" },
    { title: "Scope", desc: "Bind app and playbook" },
    { title: "Plan", desc: "Define evidence needs" },
    { title: "Collect", desc: "Use read-only tools" },
    { title: "Analyse", desc: "Find cause or synopsis" },
    { title: "Review", desc: "Approve before publish" },
  ],
  footer:
    "The OpenAI Agents SDK remains inside the Sentinel orchestration adapter. Splunk and ServiceNow fields stay out of shared contracts.",
  notes:
    "Do not build a generic visual workflow language. Implement one clear deterministic lifecycle and extract more only " +
    "after a second materially different investigation type creates evidence for it.",
});

// 7. DASHBOARD HUB
slides.caseStudy(pres, {
  label: "Second proof of modularity",
  headline: "Dashboard Hub should land without changing Sentinel.",
  sections: [
    {
      heading: "Design test",
      body:
        "Add a materially different capability that still reuses application identity, access control, integration health, feature flags and the Mission Control shell.",
    },
    {
      heading: "Provider boundary",
      body:
        "Dashboard Hub owns dashboard bindings. QuickSight and Tableau implement a provider-neutral link and embed-session port.",
    },
    {
      heading: "First increment",
      body:
        "Start with provider-aware deep links. Add embedding only after provider identity, licensing and short-lived token controls are approved.",
    },
  ],
  outcomes: [
    ["✓", "No Sentinel package changes"],
    ["✓", "Separate module data and API"],
    ["✓", "QuickSight and Tableau enabled independently"],
    ["✓", "Provider permissions remain authoritative"],
  ],
  footer: "If this requires restructuring Sentinel, the platform boundary is wrong.",
  notes:
    "Dashboard Hub is a deliberate architecture test. It uses almost none of Sentinel's domain model, but it needs the same " +
    "product foundation. Deep links create value before embedding risk is solved.",
});

// 8. FEATURE FLAGS
slides.comparisonTable(pres, {
  label: "Deployment configuration",
  headline: "Feature flags change runtime composition, not authorization.",
  headlineFontSize: 24,
  leftHeader: "Configuration gate",
  rightHeader: "Authoritative runtime effect",
  rows: [
    ["Sentinel disabled", "No Sentinel routes, jobs, event handlers or integration secrets are initialized"],
    ["Dashboard Hub enabled", "The backend registers the module and exposes its panels through the capabilities API"],
    ["QuickSight enabled", "The adapter starts only when Dashboard Hub and its required configuration are valid"],
    ["Auto-remediation disabled", "Human review remains mandatory even when Sentinel is available"],
    ["User lacks permission", "The API rejects the action regardless of frontend visibility or feature state"],
  ],
  footer:
    "Examples: MC_FEATURE_SENTINEL_ENABLED=true · MC_FEATURE_DASHBOARD_HUB_ENABLED=true · changes require restart or redeployment",
  notes:
    "There are four gates: included in the release, enabled for the deployment, optionally enabled for a future workspace, " +
    "and authorized for the principal. The backend is authoritative. The frontend consumes runtime capabilities from the API.",
});

// 9. DEPLOYMENT AND TENANCY
{
  const s = customSlide(
    "Deployment and tenancy",
    "Every client runs an isolated, immutable release with optional execution cells.",
    "The product is built once and distributed by signed digest. The client supplies configuration, secret references and " +
      "approved connectors. One control plane can route scoped jobs to execution cells when business areas or network zones " +
      "require stronger isolation."
  );

  box(s, 0.45, 2.0, 1.55, 1.2, "Signed release", "Backend · frontend\nconnectors · deploy packs\nSBOM · checksums", {
    line: C.teal,
    accent: true,
    titleSize: 10.5,
    bodySize: 7.8,
  });
  s.addText("→", {
    x: 2.05, y: 2.4, w: 0.35, h: 0.35,
    fontFace: FONT, fontSize: 22, bold: true, color: C.teal, align: "center", margin: 0,
  });

  s.addShape("rect", {
    x: 2.45, y: 1.38, w: 7.05, h: 3.55,
    fill: { color: C.navy },
    line: { color: C.teal, width: 1.4 },
  });
  s.addText("ONE CLIENT BOUNDARY", {
    x: 2.7, y: 1.52, w: 2.2, h: 0.18,
    fontFace: FONT, fontSize: 7.5, bold: true, color: C.teal, charSpacing: 1.4, margin: 0,
  });

  box(s, 2.75, 1.82, 6.45, 0.75, "Mission Control control plane", "UI · API · catalog · identity · policy · feature registry", {
    fill: C.blue,
    line: C.blueMid,
    titleSize: 11,
    bodySize: 8,
  });

  s.addText("↓", {
    x: 5.84, y: 2.57, w: 0.3, h: 0.24,
    fontFace: FONT, fontSize: 15, bold: true, color: C.teal, align: "center", margin: 0,
  });

  box(s, 2.75, 2.86, 3.05, 1.2, "Execution cell A", "Workers · MCP/connectors\napproved model endpoint\nscoped credentials + artifacts", {
    accent: true,
    titleSize: 10.5,
    bodySize: 8,
  });
  box(s, 6.15, 2.86, 3.05, 1.2, "Execution cell B", "Optional second trust zone\nseparate jobs and secrets\nseparate network reach", {
    titleSize: 10.5,
    bodySize: 8,
  });

  box(s, 2.75, 4.28, 6.45, 0.42, "Configuration + secret references select modules, providers and cell routing", "", {
    fill: C.navyCard,
    line: C.divider,
    titleSize: 8.7,
  });

  s.addText("AWS · Kubernetes · PCF · Docker/VM · air-gapped import", {
    x: 0.45, y: 3.45, w: 1.55, h: 0.85,
    fontFace: FONT, fontSize: 8, color: C.mid, align: "center", valign: "middle", margin: 0,
  });
  footer(s, "Same image digest from development to production · no client image forks · sandbox delegated when the runtime cannot isolate it");
}

// 10. DELIVERY SEQUENCE
slides.roadmap(pres, {
  label: "Delivery sequence",
  headline: "Four increments prove the architecture before we scale it.",
  headlineFontSize: 24,
  phases: [
    {
      title: "Platform skeleton",
      duration: "Phase 0",
      body: "Shell, catalog, module registry, feature flags, contracts and architecture tests.",
      gate: "Gate: Sentinel can be absent and the platform still starts.",
      price: "BOUNDARIES",
    },
    {
      title: "Sentinel vertical slice",
      duration: "Phase 1",
      body: "Manual signal to bounded investigation, report, trace and review using controlled adapters.",
      gate: "Gate: deterministic termination and full provenance.",
      price: "PROVE VALUE",
    },
    {
      title: "Client integration",
      duration: "Phase 2",
      body: "ServiceNow, Splunk MCP, approved model, identity and isolated execution backend.",
      gate: "Gate: security preflight and historical incident validation.",
      price: "DE-RISK",
    },
    {
      title: "Dashboard Hub",
      duration: "Phase 3",
      body: "Application dashboard bindings plus QuickSight and Tableau deep-link providers.",
      gate: "Gate: no Sentinel or investigation-core changes.",
      price: "PROVE MODULARITY",
    },
  ],
  footer:
    "Highest-risk decisions to resolve early: first deployment target, sandbox backend, identity path and intra-client isolation requirement.",
  notes:
    "The sequence deliberately proves boundaries before adding breadth. Phase 3 is not a distraction from Sentinel. It is the " +
    "smallest materially different module that can prove Mission Control is a platform rather than a renamed Sentinel application.",
});

// 11. DECISION
slides.closingAsk(pres, {
  context:
    "The proposal pays a small platform cost before Sentinel implementation so client integrations do not lock us into a Sentinel-shaped product.",
  ask: "Approve Mission Control as the product boundary, with Sentinel as Feature 1.",
  consequence:
    "A Sentinel-first application would force later extraction of catalog, identity, feature controls, data ownership and UI while live integrations depend on them.",
  nextStep:
    "Confirm the architecture guardrails, first deployment target and sandbox owner by [TBC: decision date].",
  notes:
    "Ask for four decisions: approve the modular-monolith boundary; approve environment-backed startup feature flags; approve " +
    "one isolated immutable deployment per client; assign owners for the first runtime target and isolated execution spike. " +
    "Do not close with a generic request to continue discussing.",
});

const OUTPUT = "mission-control-system-design.pptx";
pres
  .writeFile({ fileName: OUTPUT })
  .then(() => console.log(`Written: ${OUTPUT} (${pres.slides.length} slides)`))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
