# System Design Overview

> **Project:** Sentinel — Agentic Incident Investigation (the first feature of **Mission Control**)
> **Purpose:** A lightweight map of the components we need to design and build, for review
> with senior engineers. Each entry is a sketch, not a spec — deeper design docs follow per
> component (see `docs/design/`).
> **Status:** Draft for team review
> **Related:** `mission-control-vision.md`, `incident-investigation-agent-proposal.md`,
> `sentinel-architecture.svg`, `design/orchestration-core.md`, `design/deployment-and-config.md`

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
   → [B] Orchestration core (Agents SDK)  ──uses──▶ [C] Tools/MCP ──▶ client data sources
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
**Purpose:** Receive incident signals, filter to in-scope, parse into a normalised `Incident`, and
start a graph run.
**Responsibilities:** webhook receiver and/or poller; dedup; scope filter; payload parsing
(app, index, time window, error signature, tier); enqueue/launch.
**Key decisions:** webhook vs poll; how to extract structured fields reliably from alert payloads;
the network-exposed endpoint's auth (signed requests / mTLS / allow-list) and rate-limiting.
**Generalise beyond ServiceNow:** ServiceNow is the Phase-1 source, but future incident types bring
**other trigger sources** — e.g. **Airflow** failure callbacks/API (DAG/task failures) and
**email-based alerts** (LLM-output evaluation-metric breaches). Design the intake as a pluggable set
of *source adapters* that all normalise to the same `Incident`, rather than hard-wiring SNOW.
**Depends on:** ServiceNow (and later Airflow, mail, …); [M] runtime; [K] security.

### [B] Orchestration core (OpenAI Agents SDK) · 🟢 *(designed)*
**Purpose:** Drive the investigation lifecycle; own control flow, working state, human-review
boundary, and the audit `Trace`.
**Status:** Designed — see `design/orchestration-core.md`. Engine for Sentinel is the **OpenAI
Agents SDK** with a plain-Python backbone; LangGraph retained for heavier *future* incident types
(chosen per type behind shared seams).
**Key decisions (open):** gather-loop agency level; handoffs vs plain-Python routing; confidence
thresholds; loop caps.
**Depends on:** [C], [D], [G], [H].

### [C] Tool / MCP layer · 🔴
**Purpose:** Give the agent governed access to logs, code, and data.
**Responsibilities:** MCP client wiring (via the Agents SDK's MCP support); the MCP servers themselves
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

### [F] Knowledge indexing, retrieval & Q&A · 🟡 *(Phase 2; Q&A later)*
**Purpose:** Improve diagnosis and support-team self-service using approved operational knowledge,
without making Mission Control a competing documentation system.
**Source-of-truth boundary:** **Confluence remains authoritative.** Mission Control stores the
per-application documentation requirements, source links, index/refresh state, and retrieval index;
users author and correct documentation in Confluence.
**Responsibilities:** permission-aware Confluence connector; required-document completeness and
access checks; ingestion/chunking/indexing; incremental refresh and deletion handling; citations to
source pages; retrieval over runbooks, architecture docs, past incidents, and — where appropriate —
deployed code/Intent Layer context.
**Future use:** the same substrate can power **Ask Mission Control**, interactive operational Q&A
that combines indexed Confluence material with relevant deployed code and authorised incident
history. This code-in-context capability differentiates it from documentation-only assistants such
as Rovo; it is roadmap, not MVP scope.
**Key decisions:** corpus and mandatory document set by application tier; permission propagation;
index freshness SLA; conflict handling between docs and code; citation contract; vector/hybrid store;
Q&A evaluation and access controls.
**Depends on:** Confluence/client identity; [E] code context; [H] persistence; [K] security; [O]
application catalog. Lower urgency than A–D.

### [G] LLM gateway · 🟡
**Purpose:** Model-agnostic access — Bedrock / self-hosted / local — selected by config.
**Responsibilities:** uniform provider interface; per-client and per-node model selection; prompt
management; token/cost accounting; capability negotiation (context window, tool-calling).
**Key decisions:** interface contract; prompt versioning; per-node routing policy.
**Depends on:** client-approved models; [K].

### [H] Persistence & artifacts · 🟢
**Purpose:** Durable state, audit, and bulk artifact storage.
**Responsibilities:** Postgres (application-managed investigation state + encrypted `Trace`/audit); blob/artifact store for raw
logs/diffs/results keyed by incident; data model & retention.
**Key decisions:** schema; retention/PII policy; artifact store backend (in-client).
**Depends on:** [K]; [M].

### [I] Human review & action layer · 🟡 *(grows into Mission Control's first UI)*
**Purpose:** Let a human review the finding and approve/edit/reject, and act on the outcome.
**Responsibilities:** review surface; on approval, trigger the `publish` follow-up job (reject → new seeded run); output
actions — ticket write-back, **open PR**, notifications.
**Key decisions:** the review UX/surface — **this becomes Mission Control's first screen** (the
Sentinel incident/review view), so design it as the first slice of the platform UI rather than a
throwaway Teams/SNOW-note surface; how approval maps to graph resume; PR/git integration model;
progressive-autonomy controls.
**Depends on:** [B] (review boundary / run completion); [O] (app/incident organisation); ServiceNow, git, Teams.

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

### [M] Deployment & runtime · 🟡 *(designed — see `design/deployment-and-config.md`)*
**Purpose:** Run Sentinel inside each client, and execute investigation runs reliably at scale.
**Responsibilities:** containerization; portable packaging (Helm/Compose); per-client IaC;
dev→test→prod promotion; the worker/queue runtime that executes investigation runs and the
`publish` follow-up job; concurrency, retries, scaling; air-gap/offline bundle; upgrades.
**Key decisions:** worker/queue runtime choice (Agents SDK runs are plain Python jobs — e.g. a
Celery/RQ/Temporal-style worker); K8s-first vs Compose-first; sandbox execution backend.
**Depends on:** client infra; [K].

### [N] Config & playbook management · 🟡 *(designed — see `design/deployment-and-config.md`)*
**Purpose:** Define and version per-incident-type behaviour and per-client settings.
**Responsibilities:** playbook schema (prompts, tool subset, plan template, thresholds); versioning;
per-client config; rollout.
**Key decisions:** config format/storage; how playbooks are authored and validated.
**Depends on:** [B], [G].

### [O] Application catalog · 🟡 *(shared foundation; seeds Mission Control)*
**Purpose:** Registry of the applications a team owns and the per-app metadata everything else
keys off.
**Responsibilities:** hold per-app config — tier, owners, repos, log indices, data sources,
dashboards, playbook binding, required-document checklist, authoritative Confluence links, and
index freshness/status. Feeds Sentinel (which index/repo/tier/playbook and knowledge sources for an
incident) and classification (incident → application); **is also the foundation of Mission
Control** (the per-application organisation, cockpit, dashboard hub, and future Q&A all hang off it).
**Key decisions:** how it's populated per client (manual / CMDB / SNOW / config); schema; ownership
of the source of truth for app metadata; which documentation fields are requirements/status owned by
Mission Control versus content and permissions mirrored from Confluence.
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
3. **Runtime [M]:** what worker/queue runtime executes investigation runs + the publish job in-client?
4. **Review UX [I]:** Teams actionable message vs lightweight web UI vs ServiceNow work notes?
5. **PII redaction [K]:** redact at the tool boundary before content reaches the model — coverage
   and approach?
6. **Build vs buy [E]:** Intent Layer in-house vs provider, given the in-client constraint.
7. **Knowledge governance [F/O/K]:** can we preserve Confluence permissions and citations while
   indexing enough content to support reliable retrieval?
8. **Scope discipline:** does the MVP spine (A→B→C→D→I) feel like the right thinnest valuable slice?

---

## 6. What's already settled (decisions to date)

- Fully **in-client** deployment, one isolated instance per client.
- **OpenAI Agents SDK** orchestration for Sentinel (LangGraph retained for heavier future incident types), **MCP-first** integration, **model-agnostic** LLM.
- **Read-only by default**, **human-approved by default**, **progressive autonomy** as an earned,
  low-tier, opt-in capability.
- **Fix-or-synopsis** outcome; always produce something useful.
- **Tier-3-first** rollout.
- **Authoritative-system boundaries:** ServiceNow owns incident lifecycle; Confluence owns
  documentation content. Mission Control mirrors/enriches incidents and stores documentation
  requirements plus a permission-aware retrieval index — it does not replace either source.
- **Code-aware operational Q&A** is a future Mission Control feature built on [E]+[F], not part of
  the initial Sentinel MVP.
