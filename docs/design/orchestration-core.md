# Design — Orchestration Core

> **Component:** Investigation orchestration engine
> **Part of:** Sentinel — the first feature of **Mission Control** (see `mission-control-vision.md`)
> **Status:** Draft for review
> **Related:** `system-design-overview.md`, `mission-control-vision.md`,
> `incident-investigation-agent-proposal.md` (§5 Architecture)
>
> **Engine decision (summary):** Sentinel (Splunk-alert investigation) is built on the
> **OpenAI Agents SDK** with a **plain-Python deterministic backbone**. **LangGraph** is retained
> as a candidate for *future, heavier* incident types — chosen per incident type behind shared
> seams (see §8, §13). The design below is deliberately engine-neutral where it can be; the phase
> model, `Trace`, budgets, and review boundary are orchestrator-agnostic.
>
> **Platform note:** the playbook/per-app config this engine consumes (`playbook_id`) is sourced
> from the **application catalog** ([O] in the system overview). The human-review surface (§6) is
> realised by Mission Control's UI (the first user-facing screen).

---

## 1. Purpose & scope

This document designs the **orchestration core** — the engine that drives an incident from intake
to a reviewed, published finding. It owns the investigation *control flow*, *working state*,
*human-review boundary*, and the *audit trace*.

**In scope:** the phase model and their contracts, control flow and loops, budgets, the
human-review boundary, how tools/LLM plug in, the `Trace` audit object, and the extensibility /
per-incident-type orchestration model.

**Out of scope (designed elsewhere):** the intake/trigger service, the MCP servers themselves, the
sandbox/playground infrastructure, Intent Layer/knowledge subsystems, the LLM gateway internals,
the review UI, deployment/runtime. This component *consumes* those via clean interfaces (§7).

---

## 2. Design principles

1. **Deterministic backbone, agentic pockets.** The investigation *lifecycle* (triage → plan →
   gather → analyse → fix/synopsis → report) is explicit, deterministic **plain-Python
   orchestration**. Only the phases that need it — gathering evidence, developing a fix — are
   **agentic tool-calling loops** (an Agents SDK `Runner` over an agent + tools). This keeps the
   system auditable, testable, and cost-bounded.
2. **Right-sized engine per scope.** Use the lightest engine that fits the *known* requirements
   (Agents SDK for Sentinel); adopt heavier orchestration (LangGraph) only when a concrete future
   incident type demands it (§8, §13). Don't pre-pay complexity.
3. **Lean working state; the `Trace` is the record.** Large artifacts (raw logs, code, query
   results) live in an artifact store; working state and the `Trace` hold **summaries and
   references** (§3, §10).
4. **Always produce value.** Every path ends in a validated fix *or* a synopsis; fix failure
   degrades gracefully to a synopsis — never to nothing.
5. **Human-approved by default; autonomy is earned.** A review gate before any production action,
   switchable to auto-approve on low-tier systems via config (progressive autonomy).
6. **Replaceable dependencies.** Tools (MCP), the LLM (gateway), per-incident-type behaviour
   (playbooks), and the orchestration engine itself are injected/behind seams — never hard-wired.

---

## 3. Working state & the context object

The investigation's logical state:

```python
@dataclass
class Incident:          # from intake, normalised
    id: str; app: str; index: str; time_window: TimeWindow
    alert_query: str; error_signature: str; tier: int

@dataclass
class InvestigationContext:      # the object threaded through the run (see §10 Trace)
    incident: Incident
    playbook_id: str
    plan: Optional[InvestigationPlan] = None
    evidence: list[Evidence] = field(default_factory=list)   # summaries + artifact_refs
    hypothesis: Optional[RootCause] = None                   # cause + confidence + evidence_ids
    candidate_fix: Optional[Fix] = None
    outcome: Literal["fix","synopsis","undetermined"] = "undetermined"
    report: Optional[Report] = None
    budget: Budget = field(default_factory=Budget)
    trace: Trace = field(default_factory=Trace)              # §10, the audit record
```

**How it's carried (Agents SDK):** this context object is passed via the SDK's
**`RunContextWrapper`** — dependency-injected into tools and hooks, and **never sent to the LLM**.
Backbone steps read/update it as ordinary Python. The agentic loops' *message history* is handled
by an Agents SDK **Session**; the loop's structured findings are written back onto the context.

**Lean-state rule:** `evidence`, `candidate_fix`, and `Trace.tool_calls` hold summaries and
`artifact_ref`s — never multi-MB blobs. Raw artifacts live in the artifact store (§7.3).

---

## 4. Phases (contracts)

| Phase | Kind | Responsibility |
|---|---|---|
| `triage` | backbone | Parse/enrich incident, extract app/index/window/signature, select playbook, scope check |
| `plan` | backbone (LLM call) | Produce investigation plan: sources, time window, candidate hypotheses |
| `gather_evidence` | **agentic loop** | Agent ↔ MCP read-only tools; iterative cost-aware retrieval; appends `Evidence` |
| `analyse` | backbone (LLM call) | Synthesise evidence → root-cause hypothesis + **confidence** + evidence trail |
| `develop_fix` | **agentic loop, sandboxed** | Generate patch, run tests in playground, revise |
| `synthesise_synopsis` | backbone (LLM call) | Fallback: detailed "found / tried / suggest" writeup |
| `compose_report` | backbone | Assemble structured report (overview → investigation → root cause → fix/synopsis + confidence) |
| `human_review` | boundary | Persist report+Trace; hand to Mission Control; **run ends here** (see §6) |
| `publish` | backbone (follow-up job) | On approval: ticket write-back / open PR / notify |
| `capture` | backbone | Persist incident + verdict to the evaluation dataset |

The agentic phases are small Agents SDK agents (instructions + a scoped toolset + guardrails). The
backbone phases are plain Python calling the LLM gateway or assembling data. Side effects go
through injected services, so phases are unit-testable with fakes.

---

## 5. Control flow

### 5.1 Pipeline

```
triage ──(out of scope)──► END
   │ in scope
   ▼
 plan ──► gather_evidence ◄──┐  agentic loop
   ▲             │           │  (need more evidence
   │        enough/budget    │   AND budget remains)
   │             ▼           │
(reject +    analyse ────────┘
 feedback)       │
   │   route on confidence + fixability
   │      ┌──────┴───────┐
   │  fixable, high≥τ   else / low-conf
   │      ▼                ▼
   │  develop_fix ◄─┐  synthesise_synopsis
   │   │ validate   │       │
   │   ├ fail<N ────┘       │
   │   ├ fail≥N ───────────►│  graceful fallback
   │   ▼                    ▼
   │ compose_report ◄───────┘
   │      ▼
   └── human_review ─(approve/edit)─► publish → capture → END
```

The backbone *is* this pipeline, written in Python. Routing functions (`gather` sufficiency,
`analyse → fix vs synopsis`, fix-validation outcome) are pure and unit-testable. In the Agents SDK,
`triage`-style routing to a specialist agent can also use a **handoff**; the fix/synopsis choice is
a plain conditional.

### 5.2 Routing tables

**after `gather_evidence`** (loop guard): sufficient → `analyse`; more needed & budget remains →
loop; budget exhausted → `analyse` (with what we have).
**after `analyse`**: `confidence ≥ τ_fix` & fixable → `develop_fix`; else → `synthesise_synopsis`.
**after `develop_fix`**: tests pass → `compose_report`; fail & attempts < N → loop; fail & attempts
≥ N → `synthesise_synopsis` (fallback).
**after `human_review`**: approve/edit → `publish`; reject + feedback → new run seeded with feedback
(re-investigate) or END.

### 5.3 Loops & termination guarantees

Three hard-bounded loops: **gather** (bounded by `budget.tool_calls`/`tokens`), **fix validation**
(bounded by `budget.fix_attempts = N`), **re-investigation** (bounded counter). Every loop has a
budgeted exit routing forward (worst case → synopsis), so the pipeline **always terminates with a
useful artifact**.

---

## 6. Human review boundary (not a mid-run suspension)

The human gate sits **after** the investigation run, not inside it. This is the key simplification
that makes a heavy checkpoint/resume framework unnecessary for Sentinel:

1. The run investigates to completion (minutes), produces a **report**, persists **report + Trace**,
   and **stops**.
2. A **review record** is created and surfaced in Mission Control. The human approves / edits /
   rejects — minutes or days later.
3. Approval triggers **`publish`** as a **separate, short follow-up job** (idempotent). Rejection
   with feedback triggers a **new investigation run** seeded with that feedback.

So HITL is a **workflow boundary between two jobs**, persisted in application tables, not a paused
in-memory graph. No mid-run interrupt/resume primitive is required.

- **Progressive autonomy** is a property of this boundary: default = require human approval; on
  `tier == 3 AND confidence ≥ τ_auto AND track_record_ok`, auto-approve and go straight to
  `publish` — still fully recorded in the `Trace`.
- **Crash resilience:** investigations are short and **read-only**, so a failed run is simply
  re-run (the partial `Trace` is already persisted for audit). `publish` is made **idempotent** so
  a retried follow-up can't double-post. (This is the trade-off vs. checkpoint-resume; acceptable
  for short read-only runs — see §13.)

---

## 7. External interfaces (consumed, not owned)

### 7.1 Tools / MCP
- Tools are **injected** into the agentic phases as Agents SDK function tools; MCP servers are
  connected via the SDK's MCP support (stdio / HTTP). Each tool receives the `RunContextWrapper`
  and appends a `ToolCall` to the `Trace` (§10).
- **Toolset partitioning is a hard boundary:** investigation tools are read-only; playground
  tools (write/exec) are a separate set given *only* to the `develop_fix` agent.

### 7.2 LLM gateway
- Backbone steps and agents obtain models through a **model-agnostic gateway** — the Agents SDK
  supports non-OpenAI models via LiteLLM and custom Chat-Completions providers, covering **Bedrock,
  self-hosted/in-VPC, and local (LM Studio/Ollama)** by configuration.
- **In-client deployment:** disable the SDK's default tracing egress to OpenAI
  (`set_tracing_disabled` / custom trace processor); audit lives in our own `Trace` (§10) and
  optionally OpenTelemetry to a self-hosted collector.

### 7.3 Persistence & artifacts
- **Application-managed persistence** (Postgres): `investigations`, `reviews`, and the encrypted
  `Trace` (§10) — not a graph checkpointer.
- **Artifact store:** blob store for raw logs/diffs/query results, keyed by incident; state and
  `Trace` hold only `artifact_ref`s.
- **Runtime:** a job/queue worker executes investigation runs and the `publish` follow-up (see
  system overview [M]).

### 7.4 Intake & output
- The engine is *invoked* by the intake/trigger service with a normalised `Incident`.
- `publish` calls injected action services (ServiceNow client, git/PR client, Teams notifier).

---

## 8. Extensibility & per-incident-type orchestration

- **Phase 1 (Splunk incidents):** one Agents-SDK pipeline; **playbooks are config/data** that
  parameterise prompts, the allowed tool subset, the plan template, guardrails, and thresholds. New
  Splunk scenario = new playbook config, no code change.
- **New incident types** (e.g. Airflow DAG failures, LLM-eval breaches) are added as *connector +
  playbook*, reusing the shared platform (intake, catalog, tools, LLM gateway, `Trace`, review,
  publish).
- **Per-incident-type orchestration engine.** The orchestration engine is itself one of the things
  a type can vary, chosen **behind the shared seams**:
  - **Sentinel / Splunk → OpenAI Agents SDK** (this design).
  - **A future heavier incident type → LangGraph**, coexisting behind the same platform, adopted
    only when that workflow's requirements justify it (triggers in §13.3).
  - **Discipline:** default to the Agents SDK; introduce LangGraph only when a concrete requirement
    forces it — don't run two engines without a forcing function.

---

## 9. Cross-cutting concerns

- **Budgets as first-class state** (`Budget`): max tool calls, token ceiling, fix attempts,
  wall-clock deadline. Drive all graceful-degradation routing.
- **Audit/observability:** the full evidentiary record is the **`Trace` object (§10)**; every tool
  call, LLM call, and routing decision is recorded there and attributable to the incident.
  Optional OpenTelemetry spans to a self-hosted collector for operational observability.
- **Error handling:** step-level retries with backoff for transient tool/LLM failures; a terminal
  error routes to a "could not complete — partial synopsis" report rather than crashing.
- **PII / sensitive data:** a **pluggable redaction seam** at the tool-result boundary,
  **off/light by default** for the log-only MVP; each client's infosec sets the policy, and Phase-2
  data sources (DB/Snowflake/S3) are expected to enable it (§10.4).
- **Concurrency:** many incidents run as independent jobs; within a run, `gather` may fan out
  across sources and join, as a later optimisation.

---

## 10. Trace & audit object

Sentinel maintains an explicit **`Trace` object** — a full, replayable record of everything the
agent did: every tool call with input payload, output, status, and timing, plus routing decisions.
This is the evidentiary audit artifact, and it *is* the pattern proven at the target client.

### 10.1 Shape (illustrative)

```python
class ToolCall(BaseModel):
    seq: int; node: str; tool: str
    input: dict | str          # redacted/summarised; artifact_ref for large payloads
    output: dict | str         # redacted/summarised; artifact_ref for large payloads
    status: Literal["ok","error"]; error: Optional[str]
    started_at: datetime; ended_at: datetime; duration_ms: int
    model_id: Optional[str]; tokens_in: Optional[int]; tokens_out: Optional[int]

class Trace(BaseModel):
    incident_id: str
    metadata: dict                 # investigation metadata, set at run start
    tool_calls: list[ToolCall]
    decisions: list[Decision]      # routing choices + rationale (confidence, budget, ...)
    started_at: datetime; ended_at: Optional[datetime]
```

### 10.2 Threading it through the run — native `RunContextWrapper`

The `Trace` lives on the `InvestigationContext` passed via the Agents SDK's **`RunContextWrapper`**
— this is the SDK's *native* pattern (no adaptation needed), and matches the client's existing
design exactly:

- **Instantiated with investigation metadata at run start.**
- **Injected into every tool and hook**, and **never sent to the LLM**.
- **Continuously updated:** each tool appends a `ToolCall`. A **run hook / callback** appends
  entries automatically with timing so it's complete-by-construction; backbone steps add semantic
  `Decision` entries explicitly.

### 10.3 Persistence & protection
- **Stored in Postgres, encrypted** (application-layer / envelope encryption via KMS, or DB-level),
  keyed by `incident_id`; **persisted incrementally** (so a crashed run still has an audit trail),
  and finalised at run end.
- **Append-only / immutable** with access controls; **retention** configurable per client.

### 10.4 Redaction — pluggable seam, policy per client
`ToolCall` inputs/outputs are the sensitive bulk. Provide a redaction seam at the tool-result
boundary, **configurable and off/light by default** for the log-only MVP:
- "App logs shouldn't contain PII" is a **client-infosec sign-off**, not a hard-coded assumption —
  logs leak PII in practice, so the seam must exist to be switched on.
- Phase-2 sources (DB/Snowflake/S3) materially raise the chance of customer data; redaction is
  expected there.
- Large payloads are stored as **artifact references** (not inline) regardless, for cost/hygiene.

---

## 11. Open decisions

1. **Gather agency level** — constrained-but-looping (cheaper, testable) vs free tool-use. Lean
   constrained first, loosen with trust.
2. **Handoffs vs conditionals** — model triage→specialist as an Agents SDK handoff, or keep routing
   in plain Python? (Start with plain Python; adopt handoffs if agent specialisation grows.)
3. **Reject path** — re-investigate (new seeded run) vs end and hand to human. Probably configurable.
4. **Confidence thresholds** `τ_fix`, `τ_auto` — set empirically from the evaluation dataset.
5. **Fix-attempt cap N** and re-investigation cap — tune against cost/quality.

---

## 12. Build approach

Start with a **runnable skeleton**: backbone pipeline in plain Python, agentic phases as stubbed
Agents SDK agents, fake tools and a fake model, the `Trace` wired via `RunContextWrapper`, and the
review boundary simulated (persist report → approve/reject → publish). This makes the flow
executable end-to-end (including the fix→synopsis fallback and a simulated approval) and surfaces
gaps before real integration. Then replace fakes with real MCP tools, the LLM gateway, and the
sandbox.

---

## 13. Engine choice & alternatives considered

**Decision:** build **Sentinel** (Splunk-alert investigation, the MVP) on the **OpenAI Agents SDK**
with a plain-Python backbone. Retain **LangGraph** as a candidate for *heavier future incident
types*. The choice is made **per incident type behind shared seams** (§8), so it is not a one-way
door.

### 13.1 Why the Agents SDK fits Sentinel

- **The human gate is post-run, not mid-run** (§6), so LangGraph's headline primitive — durable
  mid-execution interrupt/resume via a checkpointer — is largely unused for Sentinel. HITL is a
  workflow boundary handled with application tables + a job queue.
- **The agentic pockets (gather, fix) are exactly the SDK's sweet spot**; the deterministic
  backbone is a few plain-Python steps that need no graph framework.
- **It natively is the client's `Trace`/`RunContextWrapper` audit pattern** — no re-implementation.
- **Lighter**: fewer novel abstractions, faster to build and reason about, right-sized to the known
  scope.
- **Model-agnostic** (LiteLLM/custom provider) and **in-client-friendly** (disable tracing egress).

### 13.2 What we give up (and why it's acceptable here)
- **No free checkpoint/resume of in-flight runs.** Runs are short and read-only, so re-running on
  failure is cheap; `publish` is idempotent. Acceptable for Sentinel.
- **Control flow is code, not a declarative graph.** For a mostly-linear pipeline with two loops,
  plain Python is clearer and just as testable; the `Trace` provides the audit/replay record.

### 13.3 When to reach for LangGraph (future incident types)
Adopt LangGraph for a *specific* new incident type if it needs: **mid-run** human interrupts;
**long-running / multi-day** orchestration with **crash-resume**; **complex branching / parallel
fan-out** worth modelling and visualising; or **multi-agent coordination over shared, evolving
state**. Simon's broader expansion (other bank incident types / other industries) may include such
workflows — decide then, with evidence, and let it coexist behind the shared platform.

### 13.4 Target-client note
The target client uses the Agents SDK for an existing system but it is **not an org-wide standard**,
and Sentinel is **our product** (we own the stack and deploy across clients). So no client mandate
drives this — it's chosen on merits for the Sentinel scope. The client's `Trace`/`RunContextWrapper`
pattern is preserved natively (§10).

### 13.5 Portability
Backbone + agentic-pockets is engine-agnostic. With the LLM behind a gateway and tools behind MCP,
the orchestration engine is one of the more swappable parts — a future type can use LangGraph
without reworking intake, catalog, tools, `Trace`, review, or publish.
