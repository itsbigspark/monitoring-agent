# Agentic Incident Investigation Platform — Project Proposal

> **Working name:** *Sentinel* (placeholder)
> **Document type:** Project proposal / solution brief
> **Audience:** Internal sponsors and prospective enterprise clients (initial focus: financial services)
> **Status:** Draft for review
> **Date:** 2026-08-25

---

## 1. Executive Summary

Engineering and operations teams spend a disproportionate amount of time on the *investigation* phase of incident management — pulling logs, correlating across systems, reading code, and reconstructing what happened — before any fix is even written. This work is repetitive, requires deep context-switching, and is often funnelled to a small number of senior engineers who become bottlenecks.

**Sentinel is an agentic application that automates the investigation of production incidents.** It monitors an incident queue (e.g. ServiceNow), automatically picks up incidents that match a defined scope, gathers evidence from the relevant systems (logs, code, databases, object storage, data warehouse), reasons about the failure, and delivers a structured findings report — *overview, investigation trail, root-cause hypothesis, and a proposed fix* — back to the dev team for review.

The initial offering deliberately targets a **narrow, high-value slice**: incidents raised from Splunk alerts, where application logs are the primary evidence. This scope is already validated through manual practice (see §2) and is straightforward to automate. The architecture is designed to **scale to any incident type** by adding connectors and investigation playbooks, without re-architecting the core.

Sentinel keeps a human firmly in the loop. It investigates and then, working inside an **isolated playground environment**, either develops and validates a candidate **fix** or — when a reliable fix isn't achievable — produces a detailed **investigation synopsis** that helps the team resolve the issue faster. Promotion of any change to production is **human-approved by default**; Sentinel does not autonomously alter production systems. Over time, as the team builds trust in its track record, higher levels of automation can be unlocked selectively on lower-risk systems (see §6). This aligns with the risk posture of regulated environments.

**Headline value:** reduce mean-time-to-diagnosis (MTTD), free senior engineers from repetitive investigation, capture institutional knowledge, and enable support teams to operate handed-over applications with less routine dependence on the original development team.

---

## 2. Problem Statement & Origin

In current client engagements (DSIMLOPS @ Natwest), the following pattern recurs:

1. An application misbehaves and triggers a **Splunk alert**, which raises an incident in the queue (Complaints platform has various services -> FRL, CAI, CATE)
2. The incident is routed to a senior engineer to investigate (generally myself as I've got understanding and visibility over all the applications)
3. The engineer manually queries Splunk (by app name, index, and time window), pulls the relevant logs, then cross-references the **codebase** and other systems to determine the root cause.
4. They write up findings and hand a proposed fix to the dev team.

This loop has already been **partially automated ad hoc** — using a custom-built Splunk MCP server (I built this at Natwest) combined with an AI coding assistant to query logs and inspect a locally available codebase (Kiro). The manual process works and is repeatable; it is simply slow, person-dependent, and not productised.

**The problems this creates:**

- **Bottleneck risk:** investigation and application knowledge are concentrated in a few individuals; support teams must repeatedly return to original developers for routine context.
- **Slow MTTD:** evidence-gathering is manual and serial.
- **Context loss:** findings live in tickets and people's heads; recurring failure patterns aren't systematically captured.
- **Cost:** engineering time spent on mechanical evidence-gathering rather than design and fixes.

Sentinel (WIP) turns this proven manual loop into a deployable, auditable, reusable product.

---

## 3. Proposed Solution & Vision

**Vision:** an extensible investigation agent that can be pointed at any incident queue and, for incident types it has been equipped to handle, autonomously produce a high-quality, evidence-backed diagnosis and either a validated proposed fix or a detailed investigation synopsis.

**Product context — Sentinel within Mission Control.** Sentinel is the **first feature of a broader platform, Mission Control** — an application management & operations cockpit for monitoring/support teams that own many applications across a shared incident queue. Mission Control organises incidents per application (working *off* ServiceNow, which remains the incident system of record), centralises monitoring dashboards, and — through Sentinel — auto-investigates and resolves incidents. **Confluence remains the documentation source of truth**: Mission Control defines application-onboarding documentation requirements, checks completeness/access, and indexes approved content rather than becoming a parallel wiki. **Sentinel is the wedge we ship first** (the focus of this proposal); the dashboard, analytics, and future code-aware Q&A capabilities follow on the same foundation. This keeps the initial engagement focused and provable while pointing at a larger platform opportunity.

**Initial offering (Phase 1):** Splunk-alert-driven incidents.
- Pull application logs via the Splunk MCP.
- Scan and correlate logs.
- Inspect the relevant codebase (codebase should be kept up to date based on deployments - we need the version of the code that's deployed in the prod environment)
- Query supporting systems as needed (DB - read only user, S3, Snowflake, any relevant system)
- Produce a structured report: **Overview → Investigation → Root Cause → Proposed Fix or Synopsis (with confidence)**.

**Fix-or-synopsis outcome.** For each in-scope incident Sentinel aims for one of two outcomes: (a) a **validated fix** — reproduced and tested inside an isolated playground environment, then proposed for human review (e.g. as a pull request); or (b) where a reliable fix can't be determined, a **detailed investigation synopsis** (overview, evidence trail, root-cause hypothesis, suggested next steps) that meaningfully shortens the human's path to resolution. Either way the team gets value.

**Design principle — narrow and deep, then broaden:** each new *incident type* is onboarded as a **playbook** plus the **connectors** (MCP servers / APIs) it needs. The core orchestration, reasoning, reporting, governance, and human-in-the-loop layers are reused unchanged.

**Non-goals (initially):**
- No autonomous changes to production. Candidate fixes are developed and validated in an **isolated playground / sandbox environment** and proposed for human review (e.g. as a pull request); promotion to production is always human-approved.
- No write access to production systems.

*These non-goals reflect the **initial** posture. The longer-term vision (§6) includes earning toward **automated resolution** on lower-tier systems as trust in the agent's track record is established — always fully audited and reversible.*

---

## 4. How It Works (End-to-End Walkthrough)

Example: a Splunk alert raises a "payment service error rate elevated" incident.

1. **Detect & triage.** Sentinel receives the new incident (webhook or poll), classifies it, and confirms it is in scope (Splunk-originated). Out-of-scope incidents are ignored or routed onward.
2. **Plan.** The agent selects the appropriate investigation playbook and identifies the evidence sources needed (app name, Splunk index, time window derived from the alert).
3. **Gather evidence.** It iteratively queries Splunk — searching, refining, and drilling into the relevant log lines rather than dumping everything — then inspects the corresponding code paths and any supporting data (DB, Snowflake, S3).
4. **Correlate & reason.** The agent builds a causal picture: what error, where in the code, triggered by what condition, supported by what evidence.
5. **Diagnose, attempt fix, or synopsise.** The agent forms a root-cause hypothesis with a confidence level and evidence trail. Where feasible it reproduces the issue and develops/validates a candidate fix in an **isolated playground environment**; when a reliable fix isn't achievable, it instead produces a detailed **investigation synopsis** to accelerate human resolution.
6. **Human review.** The report is posted back to the incident ticket or on teams and the dev team is notified. A human approves, edits, or rejects. Nothing is applied automatically. Maybe we can let the system make a PR on the repo and request human review.
7. **Capture.** The incident, findings, and the human's verdict are stored to improve future investigations and to build an evaluation dataset.

---

## 5. Technical Architecture

### 5.1 Architecture overview

```
                 ┌───────────────────────────────────────────────┐
   ServiceNow    │                  SENTINEL                     │
  incident queue │                                               │
        │        │   ┌────────────┐      ┌──────────────────┐    │
        └───────►│   │  Ingestion │─────►│  Triage / Router │    │
   (webhook /    │   │  & filter  │      │  (in-scope?)     │    │
    poller)      │   └────────────┘      └────────┬─────────┘    │
                 │                                │              │
                 │                       ┌────────▼──────────┐   │
                 │                       │ Investigation     │   │
                 │                       │ (Agents SDK)      │   │
                 │                       │  ┌─────────────┐  │   │
                 │                       │  │ plan        │  │   │
                 │                       │  │ gather      │  │   │
                 │                       │  │ correlate   │  │   │
                 │                       │  │ root-cause  │  │   │
                 │                       │  │ propose fix │  │   │
                 │                       │  └─────────────┘  │   │
                 │                       └────────┬──────────┘   │
                 │                                │              │
                 │        ┌───────────────────────┼──────────┐   │
                 │        │           Tool / MCP layer       │   │
                 │        │  Splunk · Code · DB · Snowflake  │   │
                 │        │  · S3 · (future connectors)      │   │
                 │        └───────────────────────┬──────────┘   │
                 │                                │              │
                 │   ┌───────────────┐   ┌─────────▼─────────┐   │
                 │   │ State store / │   │ Findings report   │   │
                 │   │ audit log     │◄──┤ + HITL approval   │   │
                 │   │ (Postgres)    │   └─────────┬─────────┘   │
                 │   └───────────────┘             │             │
                 └─────────────────────────────────┼─────────────┘
                                                   ▼
                            Post to ticket + notify dev team (Slack/Teams)
```

### 5.2 Recommended tech stack

| Layer | Choice | Rationale |
|---|---|---|
| **Agent orchestration** | **OpenAI Agents SDK** (plain-Python backbone) for Sentinel; **LangGraph** kept for heavier *future* incident types | The investigation is a deterministic pipeline with two agentic loops (evidence-gathering, fix-validation). The Agents SDK is right-sized for this — its agent/tool/handoff/guardrail model fits the loops, and the human gate is a post-run workflow boundary (no need for heavy mid-run checkpoint/resume). Engine is chosen per incident type behind shared seams, so heavier future workflows can adopt LangGraph without rework. |
| **Tool / data integration** | **MCP-first** (via the Agents SDK's MCP support), with direct APIs where MCP is impractical | Reuses the already-built Splunk MCP. Each new incident type = new MCP server(s) + a playbook, not a rewrite. Cleanly decouples reasoning from data access. |
| **LLM** | **Pluggable, model-agnostic** (§5.6) — default Claude via Amazon Bedrock; switchable to self-hosted/in-VPC or local (LM Studio, Ollama) | In-account / in-region or fully local inference supports data residency and compliance. The model sits behind a provider interface and is selected by configuration per client. |
| **State & audit store** | **PostgreSQL** (application-managed state + encrypted `Trace`) | A complete, queryable, encrypted audit trail of every decision and tool call (payloads, outputs, timing), plus investigation/review records. |
| **Ingestion / trigger** | ServiceNow webhook (preferred) or scheduled poller | Filters the queue down to in-scope incidents at the edge. |
| **Output / notification** | ServiceNow ticket update + Slack/Teams | Delivers findings where teams already work; keeps the system of record authoritative. |
| **Knowledge / retrieval (Phase 2+)** | Permission-aware index over authoritative Confluence docs, runbooks, architecture material, and past incidents; Confluence content remains owned there | Improves root-cause quality and support self-service. The same substrate later powers code-aware Q&A by combining documentation with deployed code/Intent Layer context and authorised incident history. |
| **Codebase context (Intent Layer)** | Hierarchical "Intent Node" summaries delivered as in-repo `AGENTS.md` / `CLAUDE.md`, auto-refreshed via VCS hooks (§5.5) | Gives the agent a senior engineer's understanding of each codebase; raises diagnosis quality and cuts token cost via progressive disclosure. |
| **Deployment** | **Fully in-client-environment**, containerised (e.g. ECS/EKS or client-equivalent), IaC-managed, one isolated instance per client | Confirmed hosting model (§11.1): keeps all data and inference inside the client's security/data-residency boundary; reproducible, portable, and auditable per client. |

### 5.3 Why MCP-first is the key decision

The single most important architectural choice is standardising data access behind **MCP**. It is what makes the "scale to any incident type" vision tractable: the core agent, governance, and reporting layers stay constant, while capability grows by adding connectors and playbooks. It also directly reuses the existing Splunk MCP investment and keeps the system portable across clients with different toolchains.

### 5.4 Key design behaviours

- **Iterative, cost-aware retrieval.** Log volumes can be enormous. The agent searches and narrows rather than ingesting everything, controlling both token cost and accuracy.
- **Confidence and uncertainty.** Every diagnosis carries an explicit confidence level and flags assumptions. A confidently-wrong root cause erodes trust faster than an honest "low confidence."
- **Full audit trail.** Every tool call, query, and decision is logged and attributable — essential for compliance and for debugging the agent itself.
- **Model-agnostic.** The LLM is a swappable component behind a provider interface — Bedrock, self-hosted, or local (LM Studio/Ollama) — selected by configuration per client. See §5.6.
- **Isolated playground environment.** Reproduction and any fix development/validation happen in a sandboxed environment, never against production — letting the agent *test* a candidate fix before proposing it, with zero operational risk. When a reliable fix can't be reached, the agent falls back to a detailed synopsis.

### 5.5 Codebase context enrichment — the Intent Layer

A major determinant of root-cause quality is **how well the agent understands the codebase it is investigating**. Cold-reading source files on every incident is slow, token-expensive, and error-prone — especially across many small services where the relevant knowledge lives *between* repos (shared contracts, implicit dependencies, cross-cutting patterns) rather than inside any one file.

Sentinel adopts the **Intent Layer philosophy** ([intent-systems.com/intent-layer](https://intent-systems.com/intent-layer)): enrich each codebase ahead of time with dense, hierarchical context that an agent can load, so it arrives at an incident already understanding the architecture. The approach rests on four principles:

- **Fractal compression** — leaf nodes summarise code; parent nodes summarise their children, not raw code. Each layer compresses the one below it.
- **Hierarchical summarisation** — broad architectural context at the root, specific detail where the agent is working. The agent knows the architecture before reading a line of code.
- **LCA deduplication** — shared knowledge lives once, at the shallowest node covering all relevant paths. No duplication, no drift.
- **Progressive disclosure** — minimal context upfront; the agent drills into detail only where the investigation requires it. Lean token budget, high signal.

This context is **built** by automated cartography over the repos, ideally augmented with **expert-captured knowledge** (invariants, edge cases, production lessons that the code itself can't express), and **delivered as in-repo `AGENTS.md` / `CLAUDE.md` files** — versioned with the code, diffable in git, and auto-refreshed via VCS hooks so it stays fresh leaf-first rather than decaying.

**Why this matters specifically for Sentinel:**
- **Higher diagnosis quality** — the agent reasons with a senior engineer's mental model of the system, directly reducing hallucinated or shallow root causes.
- **Lower cost** — progressive disclosure means the agent pulls only the context a given incident needs, controlling the token spend that log-heavy investigations otherwise incur.
- **Cross-service reasoning** — surfaces the inter-repo contracts and dependencies that single-file inspection misses — common in the kind of microservice estates Sentinel will investigate.
- **Fits the in-client deployment model** — because the Intent Layer is just files living in the client's own repos, it adds no external dependency, database, or API, and stays entirely inside the client's security boundary (§11.1).

**Build vs. integrate:** the philosophy can be realised either by integrating a dedicated provider (e.g. Intent Systems) or by building an equivalent cartography step into Sentinel's onboarding. Because delivery is plain in-repo files, either route is compatible with the fully in-client deployment model. This is captured as an open decision (§11.2).

**Caveat — where it pays off.** The Intent Layer delivers the most value on larger codebases (roughly above 1M tokens, ~50–100K lines). Below that threshold, agents can usually navigate the code unaided and the enrichment overhead may not be justified. The exception is **many small services**: even when each repo is modest, the cross-repo contracts and implicit dependencies between them are exactly where the Intent Layer adds disproportionate value — which is the common shape of the microservice estates Sentinel will investigate. The enrichment should therefore be applied selectively, prioritising large monoliths and multi-service estates over small standalone repos.

### 5.6 Model-agnostic LLM layer (first-class design principle)

Sentinel treats the LLM as a **swappable component, not a fixed dependency**. All reasoning calls go through a single internal model-provider interface, so the underlying model can be changed by configuration — per client, per deployment, or even per investigation stage — with no change to the orchestration, tools, or prompts.

Supported backends are anything exposing a standard (typically OpenAI-compatible) inference API, including:

- **Managed cloud** — Amazon Bedrock (default), or other hosted provider APIs.
- **Self-hosted / in-VPC** — open-weight models served via vLLM, TGI, or similar inside the client's own infrastructure.
- **Local** — developer or air-gapped machines running **LM Studio**, Ollama, or equivalent, exposing a local endpoint.

**Design requirements to make this real (not just aspirational):**
- A thin provider abstraction with a uniform request/response contract; provider-specific quirks (auth, streaming, token limits, tool-calling formats) handled behind it.
- **Configuration-driven selection** — model, endpoint, and credentials set via config/secrets, never hard-coded.
- Capability negotiation so the agent adapts to a model's context window and tool-calling support rather than assuming a single vendor's features.
- Prompts kept model-portable, with a thin per-model adaptation layer only where genuinely required.
- An evaluation harness (§9 metrics) used to benchmark candidate models on real incidents, so model choice is evidence-based per client.

**Why this matters:**
- **Compliance & approved-vendor lists** — each client can run only models their security/procurement teams have approved.
- **Data residency & air-gap** — fully local or in-VPC inference keeps all prompts (logs, code) inside the client boundary, reinforcing the in-client deployment decision (§11.1); supports air-gapped environments where no external API is reachable.
- **Cost & performance tuning** — route to cheaper/faster models for simple steps and stronger models for hard reasoning.
- **No vendor lock-in** — resilience against pricing, availability, or policy changes from any single provider.

---

## 6. Phased Roadmap

| Phase | Scope | Capabilities | Goal |
|---|---|---|---|
| **Phase 1 — MVP** | Splunk-alert incidents on lower-tier (Tier 3) systems | Ingest + triage; Splunk log retrieval; read-only code inspection; playground reproduction; structured report (fix or synopsis); HITL approval; post to ticket | Prove value on the already-validated use case, **starting on lower-tier (Tier 3) systems** to improve resolution-time KPIs without risking critical systems; establish governance + audit baseline |
| **Phase 2 — Breadth & quality** | Add data sources + governed knowledge retrieval | DB / Snowflake / S3 connectors; incident classification & routing; **Intent Layer codebase enrichment (§5.5)**; application documentation contract; permission-aware indexing of authoritative Confluence content; RAG over docs, runbooks, and past incidents | Higher-quality diagnoses; support-team self-service; handle more Splunk-driven scenarios; system learns each client's environment without becoming a documentation source of truth |
| **Phase 3 — Expansion & progressive autonomy** | Broader incident types + feedback loop + earned automation | Additional incident-type playbooks — e.g. **Airflow DAG/task failures** and **LLM-output evaluation-metric breaches** (both introduce non-ServiceNow trigger sources: Airflow events/API and email alerts); feedback-driven evaluation against a golden dataset; sandboxed fix-validation; **Ask Mission Control** code-aware Q&A over Confluence + deployed code/Intent Layer context + authorised incident history; **progressive autonomy — opt-in auto-apply of validated fixes on lower-tier (Tier 3) systems once track-record/trust thresholds are met, fully audited and reversible** | Generalise beyond Splunk incidents; measurable, improving accuracy; reduce routine support dependence and human toil as trust grows |

Each phase is independently shippable and delivers value on its own.

**Progressive autonomy.** Automation is *earned*, not assumed. The agent starts fully human-approved; as its track record on a given system accumulates (humans repeatedly confirming its fixes are correct), the team can opt in to letting it auto-apply validated fixes — beginning on lower-tier (Tier 3) systems where the blast radius is small. Every action remains audited and reversible, and higher-tier systems stay human-gated until explicitly promoted.

---

## 7. Security, Compliance & Governance

This section is treated as a first-class requirement, not an afterthought — it is typically what determines approval in a regulated client.

| Area | Approach |
|---|---|
| **Least privilege** | All system access is **read-only** and scoped to the minimum required. No write access to production. |
| **No auto-remediation (by default)** | Fixes are developed and validated in an **isolated playground/sandbox** and proposed for human review (e.g. as a PR); promotion to production is human-approved by default. Auto-apply is only ever unlocked as an explicit, opt-in, audited and reversible capability on lower-tier systems once trust is established (§6). Removes the highest-risk failure mode. |
| **Trigger endpoint security** | The ingestion webhook is network-exposed and must be authenticated (signed requests / mTLS / allow-listing). Treated as a controlled integration point. |
| **Secrets management** | All credentials held in a managed secrets store (e.g. AWS Secrets Manager / client equivalent); no secrets in code or config. |
| **Audit logging** | Every tool call, query, and agent decision is logged immutably and is attributable to a specific incident. |
| **Sensitive data / PII** | Log content is screened/redacted before reaching the LLM where required; data-residency controls via in-region Bedrock inference. |
| **Data handling** | No client code, logs, or data sent to third-party endpoints outside the approved boundary. |
| **Human accountability** | Clear ownership: the agent's output is advisory; the approving engineer remains accountable for any change applied. |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Hallucinated / incorrect root cause** | Wasted dev time; erosion of trust | Confidence scoring; full evidence trail attached to every claim; HITL review; evaluation against golden dataset; **Intent Layer codebase enrichment (§5.5) for deeper code understanding** |
| **Token/log-volume cost blow-out** | Unsustainable running cost | Iterative narrowing retrieval; query budgets; caching; monitoring of per-incident cost; **Intent Layer progressive disclosure (§5.5)** |
| **Over-broad system access** | Security exposure | Read-only, least-privilege, scoped credentials; no prod writes |
| **Trigger endpoint as attack surface** | Unauthorised invocation | Authn on webhook, allow-listing, rate limiting |
| **Scope creep / "boil the ocean"** | Stalled delivery | Strict phasing; ship Phase 1 narrow and deep before broadening |
| **Client toolchain variance** | Re-work per client | MCP-first abstraction isolates connectors from core |
| **Model/vendor constraints per client** | Blocked deployment | Model-agnostic interface; Bedrock-hosted option |
| **"How do we know it's right?" objection** | Adoption resistance | Built-in feedback capture + evaluation dataset from Phase 1 onward |
| **Required logs unavailable / disabled** | Investigation blocked or incomplete | Verbose logging is sometimes throttled or switched off to control volume/performance impact. Confirm logging coverage during the platform analysis; degrade gracefully to a partial synopsis; flag missing telemetry rather than guessing |

---

## 9. Business Case & ROI

**Value drivers:**
- **Reduced MTTD / MTTR** — investigation is the slowest, most manual phase; automating it compresses time-to-diagnosis.
- **Senior-engineer leverage** — removes a bottleneck and frees scarce expertise for design and fixes rather than evidence-gathering.
- **Consistency** — every in-scope incident gets a thorough, structured investigation regardless of who's on call.
- **Support-team independence** — structured onboarding requirements and indexed operational context reduce routine reliance on original developers while preserving escalation for novel issues.
- **Knowledge capture without a new source of truth** — Confluence stays authoritative; recurring failure patterns and approved operational material become safely retrievable alongside code context.
- **Low-risk proving ground** — by demonstrating first on lower-tier (Tier 3) systems, the platform improves their resolution-time KPIs and builds organisational trust before being extended to higher-tier, business-critical systems.
- **Partial automation still wins** — value does not require solving everything. Even if the agent fully resolves a subset of incidents and merely *accelerates* the rest via a synopsis (e.g. ~70% resolved, ~30% sped up), the net benefit is large. "Some of the solution" beats "none of the solution."
- **Scalability** — once built, the marginal cost of investigating an additional in-scope incident is low.

**Suggested success metrics (baseline before rollout, then track):**
- Mean time-to-diagnosis for in-scope incidents (before vs. after).
- % of in-scope incidents auto-investigated.
- Root-cause accuracy (validated by dev-team feedback).
- Senior-engineer hours reclaimed per month.
- Proportion of proposed fixes accepted with little/no modification.

**Cost considerations:** primarily LLM inference (managed via cost-aware retrieval), hosting, and build/maintenance effort. The ROI case rests on reclaimed senior-engineering time and faster incident resolution; both should be baselined per client.

---

## 10. Time & Effort Estimates

> **How to read these numbers.** Estimates are indicative, expressed in **person-weeks of engineering effort** and **elapsed calendar time**, and assume a **small team (1–2 engineers)** with the existing Splunk MCP reused and Claude/Bedrock access available. Elapsed time for client work is typically driven by **client-side gates** (security review, access provisioning, procurement) far more than by engineering effort — those are called out explicitly.

### 10.1 Proof of Concept (internal)

**Objective:** a working end-to-end demo that investigates real, historical Splunk-driven incidents and produces a structured findings report — sufficient to validate quality and to demo to prospects. Ingestion can be simplified (manual trigger or single-queue poll) for the POC.

| Workstream | Effort (person-weeks) |
|---|---|
| Core orchestration (Agents SDK) — backbone, agents, trace | 1.5–2 |
| Splunk MCP integration + iterative/cost-aware log retrieval | ~1 (reuses existing MCP) |
| Read-only code-inspection connector | 0.5–1 |
| Reasoning & prompting + structured report (overview / investigation / root cause / proposed fix + confidence) | 1.5–2 |
| Simplified ingestion & triage (manual or single-queue) | 0.5–1 |
| Human-in-the-loop + output (post report, notify) | ~0.5 |
| Audit-logging baseline | ~0.5 |
| Tuning & validation against real historical incidents | ~1 |
| **Total** | **~6–8 person-weeks** |

**Elapsed time:** ~6–8 weeks with one engineer; ~4–5 weeks with two working in parallel.

**Exit criteria:** the POC correctly diagnoses a meaningful share of a sample set of past Splunk-driven incidents, with evidence trails and confidence levels that senior engineers judge credible.

### 10.2 Per-Client Implementation (Phase 1 rollout)

**Objective:** Sentinel running in a client's environment against their live in-scope incidents, integrated with their ServiceNow queue, security-approved, and accepted by their dev team.

| Stage | Eng. effort (person-weeks) | Elapsed | Notes |
|---|---|---|---|
| Discovery + security/compliance review | 0.5–1 | **2–4 wks** | Usually the **long pole**; client-driven (infosec, data handling, procurement). Low engineering effort, high wait time. |
| Environment & access setup (scoped read-only creds, network, secrets, deployment) | 1–2 | 1–2 wks | Often overlaps with security review. |
| Connector wiring (Splunk index/app mapping, code access, client-specific systems) | 1–2 | 1–2 wks | |
| ServiceNow integration (webhook/poll + findings write-back format) | ~1 | ~1 wk | |
| Tuning & playbook calibration on the client's incidents | 2–3 | 2–3 wks | Drives diagnosis quality for that environment. |
| UAT with dev team + feedback-loop setup | 1–2 | 1–2 wks | |
| Go-live + handover | 0.5–1 | 0.5–1 wk | |
| **Total** | **~7–11 person-weeks** | **~8–14 weeks elapsed** | Elapsed time dominated by security/onboarding gates, not build effort. |

**Key driver:** in regulated clients (banks), the security review and access-provisioning gates typically set the timeline — as does the **dev → test → production promotion process**, where each environment hand-off carries its own approvals and hoops that add elapsed time well beyond the actual build effort. Engineering work is often ready and waiting on approvals. Engaging infosec and change-approval functions early materially shortens elapsed time.

### 10.3 Incremental incident types (Phase 2 / 3)

Once the platform is live at a client, each **new incident type** is additive — a new connector (MCP) plus an investigation playbook — reusing the core orchestration, governance, and reporting unchanged:

| Item | Effort | Elapsed |
|---|---|---|
| New incident-type playbook + connector (per type) | ~1–3 person-weeks | 1–3 wks (+ any new security review for new data access) |
| RAG / knowledge layer (past incidents, runbooks, docs) | ~2–3 person-weeks | one-off, reused across types |

This is the payoff of the MCP-first design: capability grows roughly linearly with low marginal effort, rather than requiring re-architecture.

### 10.4 Summary

| Milestone | Engineering effort | Elapsed (typical) |
|---|---|---|
| **Internal POC** | ~6–8 person-weeks | ~4–8 weeks |
| **First client implementation (Phase 1)** | ~7–11 person-weeks | ~8–14 weeks (gated by client security/onboarding) |
| **Each additional incident type** | ~1–3 person-weeks | ~1–3 weeks |

> These figures assume scope discipline (Phase 1 stays narrow). The largest schedule risks are scope creep and client-side approval timelines — both addressed in §8.

---

## 11. Decisions & Open Questions

### 11.1 Confirmed decisions

- **Hosting model — fully deployed within the client environment.** Sentinel runs entirely inside each client's own environment (their cloud account / infrastructure), not as a central multi-tenant SaaS. This keeps all logs, code, and data — and LLM inference — inside the client's security and data-residency boundary, which is the expected posture for regulated clients such as banks. Implications:
  - Deployment is packaged as portable, IaC-managed infrastructure deployed per client (one isolated instance each).
  - No client code, logs, or data ever leave the client boundary; LLM inference uses in-environment/in-region Bedrock.
  - Trade-off: each client requires its own provisioning, upgrade, and operational handling — there is no shared central instance to maintain. This is reflected in the per-client effort estimates (§10.2).

- **Rollout strategy — prove on lower-tier (Tier 3) systems first.** Initial deployment targets lower-criticality (Tier 3) platforms, where the agent can demonstrably improve resolution-time KPIs and build trust without risk to business-critical systems, before scaling up to higher tiers. (Stakeholder/targeting strategy is internal — see Appendix A.)

- **System-of-record boundaries — ServiceNow for incidents, Confluence for documentation.** Mission Control mirrors/enriches incidents and writes status back to ServiceNow. It defines documentation requirements and stores a permission-aware index with citations, while documentation is authored, governed, and corrected in Confluence. Future code-aware Q&A is an indexed retrieval experience, not a parallel wiki.

- **Commercial engagement model — fixed-fee analysis, then scaled implementation.** Engagements begin with a small fixed-fee Proof of Concept / platform analysis (indicative **~£5k**) that scopes the target platform and determines the implementation cost. Implementation then follows on a **tiered / Time-and-Materials** basis. Because each platform requires its own **knowledge-base curation** (and sometimes additional access engineering to reach platform-specific data), implementation effort and cost vary with system complexity (§10.2).

### 11.2 Open questions

- **ServiceNow integration depth:** webhook vs. poller, and how findings are written back (work notes, attachments, custom fields).
- **LLM approval per client:** which models are on each client's approved-vendor list.
- **Evaluation strategy:** how the golden dataset is sourced and curated from real incidents (with appropriate data handling).
- **Intent Layer — build vs. integrate:** build codebase cartography into Sentinel's onboarding, or integrate a dedicated provider (e.g. Intent Systems). Both fit the in-client model since delivery is in-repo files (§5.5).
- **Confluence/documentation contract:** mandatory artefacts by tier, connector and permission model, freshness/refresh policy, deletion handling, and Q&A citation/evaluation requirements.
- **Product name & branding.**

---

## 12. Recommendation

Proceed with a **Phase 1 MVP** scoped to Splunk-alert incidents, reusing the existing Splunk MCP, built on the **OpenAI Agents SDK** with an MCP-first integration layer and Bedrock-hosted Claude (model-agnostic). Establish the governance, audit, and feedback foundations from day one so the platform is both demonstrably safe for regulated clients and positioned to scale to additional incident types in later phases.

---

*Appendix and detailed component specifications to follow once Phase 1 scope is confirmed.*

---

## Appendix A — Go-to-Market & Rollout Strategy

> **⚠️ INTERNAL ONLY — REMOVE BEFORE CLIENT DISTRIBUTION.** This appendix captures internal targeting, stakeholder, and commercial-strategy notes (from the 5 Jun 2026 strategy call with Simon Treacy). It is not for sharing with prospective clients.

### A.1 Beachhead

- **First client / beachhead:** NatWest — building on existing DSIMLOPS delivery and the Splunk MCP already built there.
- **Initial proving ground:** lower-tier (Tier 3) systems — demonstrate KPI / resolution-time improvement without touching critical systems, then scale up to higher tiers.
- **Tier SLA rationale:** Tier 1 platforms need near-instantaneous fixes (little room for an agent to add value before a human must act); Tier 3 platforms typically run a ~3-day resolution turnaround. Delivering an instant automated investigation/fix on Tier 3 directly **turbocharges the monitoring teams' dashboards and resolution-time KPIs** — a compelling, low-risk first win.

### A.2 Target-audience strategy

- **Lead's guidance: pitch to the teams responsible for failure tracking / incident management — not individual platform leads.** Engaging the monitoring/incident-management function opens opportunities across *all* platforms at once, rather than a single platform entry point. If that route doesn't land, fall back to going platform-by-platform.
- **Strategic door-opener:** **Duncan Pine** — an accredited change approver (signs off MCRs/TCRs on bank-critical systems) whose broader role is tracking alerts/failures across the entire DNA estate and coordinating incident management. He sees failures across all platforms, making him the ideal entry point. Simon to "warm up" this contact before his leave.
- **Likely first PoC venue:** **Complaints** — where Zein already has strong relationships and context. **James Thurgood** (complaints lead) is the likely **PoC sponsor**, even though the strategic pitch goes in via Duncan Pine. So: pitch broadly via the failure-tracking function, then land the first concrete PoC in Complaints under James Thurgood's sponsorship.
- **Other warm connections:** Rich (well-connected across NatWest); Simon himself (23 years at NatWest, knows people across all platforms — DNA, Risk, Finance, CNI, Retail, Wealth).

### A.3 Expansion areas (post-beachhead) & market sizing

Following the beachhead, open conversations across independent business areas, each owning its own tech/environments (using broadly the same tooling): **DNA · Risk · Finance · Commercial & Institutional (CNI) · Retail · Wealth**.

- These areas are **independent of each other** — each is a separate sales avenue.
- Within each area there are **many candidate systems**: DNA ~15–20 systems, Risk ~10, CNI ~30–40, and so on. The agent won't fit every system, but even partial coverage per area represents substantial, repeatable opportunity.
- The CDD platform (Complaints' home) sits under DNA, which also covers the AWS platform, Snowflake, and other systems — so a single DNA entry can fan out across many systems.

### A.4 Commercial model (internal view)

- **Fixed-fee analysis / PoC (indicative ~£5k):** a small up-front fee to analyse a specific platform; the output scopes and prices that platform's implementation (quoted as a range A–B).
- **Then either:**
  - a **fixed price** for that platform's implementation (only quotable *after* the analysis, because complexity varies), or
  - pure **Time-and-Materials**, rolling out system by system; scale a team (e.g. ~3 people) to parallelise across platforms and deliver faster.
- **Build-once vs. per-platform delta:** shared components are built once and reused — the **ServiceNow integration**, and any **shared Splunk** that multiple platforms log to. The **delta** charged per platform is the platform-specific work: curating its **knowledge base** and giving the agent the extra **"skills"/connectors** (MCP servers) needed to reach and interpret that platform's data. Bigger/more complex systems = more to scan and more to wire up = higher delta. This is the answer to the inevitable "if you built it once, why does each rollout cost more?" question.
- **Estimation basis:** think in **days of effort**, ground-up, *including* the dev → test → prod promotion hurdles (which dominate elapsed time at NatWest), to derive the PoC and implementation numbers.

### A.5 Required deliverable

- **Slide deck** (owner: Zein) covering: the problem statement, the current manual investigation process, and the proposed automated agent solution — explaining how it either implements a playground-validated fix or, when a fix isn't possible, provides a detailed investigation synopsis. *(This written proposal is the source material for the deck.)*

### A.6 Next steps & owners

| Action | Owner | Notes |
|---|---|---|
| Create proposal slide deck (problem, current process, proposed solution) | Zein | Derived from this document |
| Identify & reach out to key NatWest stakeholders | Simon | Determine best approach for presenting the solution |
| Schedule follow-up to review proposal & next steps | Zein | Once leave dates are finalised |

### A.7 Scheduling notes

- **Simon** on leave **10–29** (this month); plans to warm up Duncan Pine before departing.
- **Zein** on leave **17–19**.
- Reconnect after Simon returns to finalise the proposal and initiate business-area conversations.
