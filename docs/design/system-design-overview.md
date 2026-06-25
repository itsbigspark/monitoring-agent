# System Design Overview

> **Project:** Sentinel — Agentic Incident Investigation (the first feature of **Mission Control**)
> **Purpose:** A lightweight map of the components we need to design and build, for review
> with senior engineers. Each entry is a sketch, not a spec — deeper design docs follow per
> component (see `docs/design/`).
> **Status:** Draft for team review
> **Related:** `mission-control-vision.md`, `incident-investigation-agent-proposal.md`,
> `sentinel-architecture.svg`, `design/langgraph-orchestration.md`

> **Product context:** Sentinel is the first feature of **Mission Control**, an application
> management & operations platform for monitoring teams (see `mission-control-vision.md`). This
> document scopes the **Sentinel** engine — the first thing we ship. Two seams here grow directly
> into the platform and should be designed with that in mind: the **application catalog** ([O])
> and the **human review & action layer** ([I], which becomes Mission Control's first UI screen).

---

## 1. What we're building (one paragraph)

An agent that triggers on a qualifying ServiceNow incident (initially Splunk-alert-driven),
automatically investigates it — pulling logs, inspecting the deployed code, querying supporting
systems — reasons about the failure, and produces a structured finding: either a **validated fix**
(developed and tested in an isolated sandbox, proposed for human review) or a **detailed
synopsis**. It runs **fully inside the client's environment**, is **read-only by default**,
**human-approved by default**, and is built to **scale to new incident types** via connectors and
playbooks rather than rewrites.

## 2. End-to-end flow

```
ServiceNow incident
   → [A] Intake & trigger  (filter, parse, enqueue)
   → [B] Orchestration core (LangGraph)  ──uses──▶ [C] Tools/MCP ──▶ client data sources
        │                                  ──uses──▶ [G] LLM gateway
        │                                  ──uses──▶ [D] Sandbox (fix validation)
        │                                  ──uses──▶ [E] Codebase/Intent  [F] Knowledge/RAG
        │                                  ──persists──▶ [H] State & artifacts
   → [I] Human review & action  (approve/edit/reject → ticket / PR / Teams)
   → [J] Evaluation & feedback  (capture verdict, score, KPIs)

Cross-cutting: [K] Security/secrets/PII · [L] Observability/cost · [M] Deploy/runtime · [N] Config/playbooks
```

See `sentinel-architecture.svg` for the architectural view.

---

## 3. Component catalogue

Legend — **Maturity:** 🟢 well-understood · 🟡 needs design · 🔴 high uncertainty / novel.

### [A] Intake & trigger service · 🟡
**Purpose:** Receive ServiceNow incidents, filter to in-scope (Splunk-originated), parse into a
normalised `Incident`, and start a graph run.
**Responsibilities:** webhook receiver and/or poller; dedup; scope filter; payload parsing
(app, index, time window, error signature, tier); enqueue/launch.
**Key decisions:** webhook vs poll; how to extract structured fields reliably from alert payloads;
the network-exposed endpoint's auth (signed requests / mTLS / allow-list) and rate-limiting.
**Depends on:** ServiceNow; [M] runtime; [K] security.

### [B] Orchestration core (LangGraph) · 🟢 *(designed)*
**Purpose:** Drive the investigation lifecycle; own control flow, state, HITL, durability.
**Status:** Designed — see `design/langgraph-orchestration.md`.
**Key decisions (open):** gather-loop agency level; extra interrupt after planning; confidence
thresholds; loop caps.
**Depends on:** [C], [D], [G], [H].

### [C] Tool / MCP layer · 🔴
**Purpose:** Give the agent governed access to logs, code, and data.
**Responsibilities:** MCP client wiring (`langchain-mcp-adapters`); the MCP servers themselves
(Splunk ✅ exists; code, DB, Snowflake, S3 to build/adapt); read-only credential scoping; the hard
partition between read-only **investigation** tools and write/exec **sandbox** tools.
**Key decisions:** build vs adapt each connector; per-tool auth & least-privilege model; uniform
tool result schema (summary + artifact ref); rate/cost limits per tool.
**Depends on:** client systems; [K] secrets.

### [D] Playground / sandbox environment · 🔴 *(highest uncertainty)*
**Purpose:** Reproduce the issue and develop/validate a candidate fix with **zero production risk**.
**Responsibilities:** provision an isolated environment; check out code+deps at the
**prod-deployed** version; run tests / reproduce; capture results; tear down.
**Key decisions:** isolation model (ephemeral container / per-incident namespace); how to obtain a
faithful runnable environment per service; test discovery & execution; resource limits & timeouts;
what "validated" means when no tests exist.
**Depends on:** [E] (deployed code version), client CI/build conventions, [M] infra.

### [E] Codebase context & Intent Layer · 🟡
**Purpose:** Give the agent a senior engineer's understanding of each codebase, and ensure it
reasons about the **version actually deployed in prod**.
**Responsibilities:** generate in-repo hierarchical context (Intent Layer philosophy); track
deployed code version; retrieval/loading into the agent.
**Key decisions:** build cartography in-house vs integrate a provider; prod-version tracking
mechanism; refresh on deploy.
**Depends on:** repo access; deployment metadata.

### [F] Knowledge base / RAG · 🟡 *(Phase 2)*
**Purpose:** Improve diagnosis with past incidents, runbooks, and architecture docs.
**Responsibilities:** ingestion pipeline; vector store; retrieval; freshness.
**Key decisions:** store choice; what corpora; how curated. Lower urgency than A–D.

### [G] LLM gateway · 🟡
**Purpose:** Model-agnostic access — Bedrock / self-hosted / local — selected by config.
**Responsibilities:** uniform provider interface; per-client and per-node model selection; prompt
management; token/cost accounting; capability negotiation (context window, tool-calling).
**Key decisions:** interface contract; prompt versioning; per-node routing policy.
**Depends on:** client-approved models; [K].

### [H] Persistence & artifacts · 🟢
**Purpose:** Durable state, audit, and bulk artifact storage.
**Responsibilities:** Postgres (LangGraph checkpointer + audit); blob/artifact store for raw
logs/diffs/results keyed by incident; data model & retention.
**Key decisions:** schema; retention/PII policy; artifact store backend (in-client).
**Depends on:** [K]; [M].

### [I] Human review & action layer · 🟡 *(grows into Mission Control's first UI)*
**Purpose:** Let a human review the finding and approve/edit/reject, and act on the outcome.
**Responsibilities:** review surface; resume the interrupted graph with the decision; output
actions — ticket write-back, **open PR**, notifications.
**Key decisions:** the review UX/surface — **this becomes Mission Control's first screen** (the
Sentinel incident/review view), so design it as the first slice of the platform UI rather than a
throwaway Teams/SNOW-note surface; how approval maps to graph resume; PR/git integration model;
progressive-autonomy controls.
**Depends on:** [B] (interrupt/resume); [O] (app/incident organisation); ServiceNow, git, Teams.

### [J] Evaluation & feedback · 🟡 *(strategic)*
**Purpose:** Measure and improve diagnosis quality — the answer to "how do we know it's right?"
**Responsibilities:** capture human verdicts; build a golden dataset; replay harness; LLM-judge +
human scoring; KPI/metrics (MTTD, accuracy, acceptance rate).
**Key decisions:** dataset sourcing & data handling; metrics definitions; eval cadence.
**Depends on:** [H]; [I] verdicts.

### [K] Security, secrets & PII redaction · 🔴 *(cross-cutting; gates approval)*
**Purpose:** Make the system safe and approvable in a bank.
**Responsibilities:** authn/z; secrets management; scoped read-only IAM; immutable audit logging;
**pre-LLM PII/sensitive-data redaction** at the tool boundary; data-residency controls.
**Key decisions:** redaction approach & coverage; secrets backend; audit format; threat model for
the trigger endpoint and sandbox.
**Depends on:** everything; informs A, C, D, H.

### [L] Observability & cost · 🟡 *(cross-cutting)*
**Purpose:** See what the agent is doing and what it costs.
**Responsibilities:** tracing (LangSmith / OTel); logging; per-incident cost/token tracking;
alerting on the agent itself.
**Key decisions:** tracing stack (esp. in-client/air-gapped constraints); cost budgets/alerts.

### [M] Deployment & runtime · 🟡
**Purpose:** Run Sentinel inside each client, and execute graph runs reliably at scale.
**Responsibilities:** containerization; per-client IaC; dev→test→prod promotion; the worker/queue
runtime that executes runs; concurrency, retries, scaling.
**Key decisions:** **LangGraph Platform vs custom worker/queue runtime**; per-client packaging;
environment-promotion pipeline.
**Depends on:** client infra; [K].

### [N] Config & playbook management · 🟡
**Purpose:** Define and version per-incident-type behaviour and per-client settings.
**Responsibilities:** playbook schema (prompts, tool subset, plan template, thresholds); versioning;
per-client config; rollout.
**Key decisions:** config format/storage; how playbooks are authored and validated.
**Depends on:** [B], [G].

### [O] Application catalog · 🟡 *(shared foundation; seeds Mission Control)*
**Purpose:** Registry of the applications a team owns and the per-app metadata everything else
keys off.
**Responsibilities:** hold per-app config — tier, owners, repos, log indices, data sources,
dashboards, playbook binding. Feeds Sentinel (which index/repo/tier/playbook for an incident) and
classification (incident → application); **is also the foundation of Mission Control** (the
per-application organisation, cockpit, and dashboard hub all hang off it).
**Key decisions:** how it's populated per client (manual / CMDB / SNOW / config); schema;
ownership of the source of truth for app metadata.
**Depends on:** client app inventory; informs [A] (classification), [B], [C], [N].
**Note:** although it's a Sentinel dependency, design it as a **first-class, standalone data
model**, not buried in Sentinel config — it is the seam Mission Control grows from.

---

## 4. Dependency & sequencing view

**MVP spine (thin end-to-end slice):** `[A] → [B] → [C] → [D] → [I]`, supported by `[G]`, `[H]`,
`[O]`, and `[K]` throughout. Everything else layers on after a working slice.

**Suggested design order (post-[B]):**
1. **[D] Sandbox** — 🔴 highest uncertainty, security-critical, most likely to reshape other designs.
2. **[C] Tool/MCP layer** — connective tissue [B] depends on; read-only scoping matters for the bank.
3. **[I] Human review & action** — closes the loop; **first slice of the Mission Control UI**.
4. **[O] Application catalog** — small but foundational; design as a standalone data model early.
5. **[A] Intake/trigger** — well-understood, but owns the security-sensitive endpoint.
6. **[G]/[H]** plumbing specs alongside the above; **[K]** runs through all of them.
7. Later: **[E] Intent**, **[F] RAG**, **[J] Eval**, **[L] Observability**, **[M] Runtime hardening**, **[N] Config**.

---

## 5. For reviewers — the big questions to pressure-test

1. **Sandbox feasibility [D]:** can we reliably stand up a faithful, isolated runnable environment
   per service at the prod-deployed version, inside the client? This is the make-or-break risk.
2. **Read-only access & scoping [C/K]:** is the least-privilege, per-system credential model
   acceptable to client infosec? Where will it be hardest?
3. **Runtime [M]:** LangGraph Platform vs a custom worker/queue runtime for in-client deployment?
4. **Review UX [I]:** Teams actionable message vs lightweight web UI vs ServiceNow work notes?
5. **PII redaction [K]:** redact at the tool boundary before content reaches the model — coverage
   and approach?
6. **Build vs buy [E]:** Intent Layer in-house vs provider, given the in-client constraint.
7. **Scope discipline:** does the MVP spine (A→B→C→D→I) feel like the right thinnest valuable slice?

---

## 6. What's already settled (decisions to date)

- Fully **in-client** deployment, one isolated instance per client.
- **LangGraph** orchestration, **MCP-first** integration, **model-agnostic** LLM.
- **Read-only by default**, **human-approved by default**, **progressive autonomy** as an earned,
  low-tier, opt-in capability.
- **Fix-or-synopsis** outcome; always produce something useful.
- **Tier-3-first** rollout.
