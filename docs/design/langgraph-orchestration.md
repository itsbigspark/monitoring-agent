# Design — LangGraph Orchestration Core

> **Component:** Investigation orchestration engine
> **Part of:** Sentinel — the first feature of **Mission Control** (see `mission-control-vision.md`)
> **Status:** Draft for review
> **Related:** `system-design-overview.md`, `mission-control-vision.md`,
> `../incident-investigation-agent-proposal.md` (§5 Architecture)
>
> **Platform note:** the playbook/per-app config this graph consumes ([§8], `playbook_id`) is
> sourced from the **application catalog** ([O] in the system overview) — the shared foundation
> Mission Control is built on. The `human_review` node's surface ([§6]) is realised by Mission
> Control's UI (the first user-facing screen).

---

## 1. Purpose & scope

This document designs the **orchestration core** — the LangGraph application that drives an
incident from intake to a reviewed, published finding. It owns the investigation *control flow*,
*state*, *human-in-the-loop*, and *durability*.

**In scope:** state schema, nodes and their contracts, edges/routing, loops, budgets,
human-in-the-loop, checkpointing/durability, how tools/LLM plug in, extensibility model.

**Out of scope (designed elsewhere):** the ServiceNow intake/trigger service, the MCP servers
themselves, the sandbox/playground infrastructure, the Intent Layer/knowledge subsystems, the
LLM gateway internals, the human-review UI, deployment/infra. This component *consumes* those via
clean interfaces, described in §7–§8.

---

## 2. Design principles

1. **Deterministic backbone, agentic pockets.** The investigation *lifecycle* is an explicit,
   deterministic state machine we control. Only the phases that genuinely need it — gathering
   evidence, developing a fix — contain bounded *agentic* tool-calling loops. This keeps the
   system auditable, testable, and cost-bounded (critical for a regulated client).
2. **Lean state.** Logs and code are large and are checkpointed on every super-step. State holds
   **summaries and references**, never raw artifacts (§3.1).
3. **Always produce value.** Every path terminates in either a validated fix *or* a synopsis.
   Failure to fix degrades gracefully to a synopsis — never to nothing.
4. **Human-approved by default; autonomy is earned.** A hard review gate before any production
   action, switchable to auto-approve on low-tier systems via config (progressive autonomy).
5. **Replaceable dependencies.** Tools (MCP), the LLM, and per-incident-type behaviour
   (playbooks) are injected, never hard-wired.

---

## 3. State

### 3.1 Schema (illustrative)

```python
class InvestigationState(TypedDict):
    # --- intake ---
    incident: Incident                         # parsed: id, app, index, time_window,
                                               #         alert_query, error_signature, tier
    playbook_id: str                           # selected by triage
    # --- investigation ---
    plan: InvestigationPlan                    # sources to query, hypotheses to test
    messages: Annotated[list, add_messages]    # tool-calling transcript (gather sub-loop)
    evidence: Annotated[list[Evidence], add]   # appended findings: summary + artifact_ref
    hypothesis: Optional[RootCause]            # cause + confidence(0-1) + evidence_ids
    # --- resolution ---
    candidate_fix: Optional[Fix]               # patch_ref, test_results, status, attempts
    outcome: Literal["fix", "synopsis", "undetermined"]
    report: Optional[Report]
    # --- human + control ---
    decision: Optional[HumanDecision]          # approve | edit | reject + feedback
    budget: Budget                             # tool_calls, tokens, fix_attempts, deadline
```

### 3.2 The lean-state rule

State is checkpointed to Postgres at every step. **Raw logs, full files, and large query
results MUST NOT live in state.** Each `Evidence` entry carries a short LLM-readable summary plus
an `artifact_ref` (key into the artifact store, §7.3). This keeps checkpoints small, fast, and
free of bulk sensitive data, and makes the audit trail readable.

### 3.3 Reducers

- `messages`: `add_messages` (append + dedupe tool/AI turns) — scoped to the gather loop.
- `evidence`: append reducer (`operator.add`) so concurrent/iterative gathers accumulate.
- All other fields: last-writer-wins (single owning node each).

---

## 4. Nodes (phase contracts)

| Node | Responsibility | Reads | Writes |
|---|---|---|---|
| `triage` | Parse incident, extract app/index/time-window/signature, classify, select playbook, scope check | `incident` | `incident` (enriched), `playbook_id` |
| `plan` | Produce investigation plan: sources, time window, candidate hypotheses | `incident`, `playbook_id` | `plan` |
| `gather_evidence` | **Agentic loop**: LLM ↔ MCP read-only tools; iterative cost-aware retrieval | `plan`, `messages`, `budget` | `messages`, `evidence`, `budget` |
| `analyse` | Synthesise evidence → root-cause hypothesis + **confidence** + evidence trail | `evidence` | `hypothesis` |
| `develop_fix` | **Agentic loop, sandboxed**: generate patch, run tests in playground, revise | `hypothesis`, `budget` | `candidate_fix`, `budget` |
| `synthesise_synopsis` | Fallback: detailed "found / tried / suggest" writeup | `evidence`, `hypothesis`, `candidate_fix?` | `outcome="synopsis"` |
| `compose_report` | Assemble structured report (overview → investigation → root cause → fix/synopsis + confidence) | `hypothesis`, `candidate_fix`/synopsis, `evidence` | `report` |
| `human_review` | `interrupt()` for approval; resume with decision | `report` | `decision` |
| `publish` | Write back: ticket update / open PR / notify Teams | `report`, `decision` | — |
| `capture` | Persist incident + verdict to evaluation dataset | all | — |

Each node is a pure-ish function `State -> partial State` (or returns `Command` for combined
update+route). Side effects go through injected services (tools, stores), never inline — so nodes
are unit-testable with fakes.

---

## 5. Control flow

### 5.1 Graph

```
START → triage ──(out of scope)──► END
            │ in scope
            ▼
          plan ──► gather_evidence ◄──┐  agentic loop
            ▲                │         │  (need more evidence
            │           enough/budget  │   AND budget remains)
            │                ▼         │
   (reject  │            analyse ──────┘
   +feedback)                │
            │     route on confidence + fixability
            │        ┌───────┴────────┐
            │   fixable, high≥τ      else / low-conf
            │        ▼                  ▼
            │   develop_fix ◄─┐   synthesise_synopsis
            │    │  validate  │         │
            │    ├ fail < N ──┘         │
            │    ├ fail ≥ N ───────────►│  graceful fallback
            │    ▼                      ▼
            │  compose_report ◄─────────┘
            │        ▼
            └── human_review ─(approve/edit)─► publish → capture → END
```

### 5.2 Routing tables

**after `triage`**
| condition | goto |
|---|---|
| out of scope | `END` |
| in scope | `plan` |

**after `gather_evidence`** (loop guard)
| condition | goto |
|---|---|
| sufficient evidence | `analyse` |
| more needed AND budget remains | `gather_evidence` |
| budget exhausted | `analyse` (analyse with what we have) |

**after `analyse`**
| condition | goto |
|---|---|
| `confidence ≥ τ_fix` AND fixable | `develop_fix` |
| else | `synthesise_synopsis` |

**after `develop_fix`** (validation loop)
| condition | goto |
|---|---|
| tests pass | `compose_report` |
| tests fail AND attempts < N | `develop_fix` |
| tests fail AND attempts ≥ N | `synthesise_synopsis` (fallback) |

**after `human_review`**
| condition | goto |
|---|---|
| approve / edit | `publish` |
| reject + feedback | `plan` (re-investigate with feedback) or `END` |

### 5.3 Loops & termination guarantees

Three loops, each hard-bounded:
- **Gather** (`gather_evidence` ↔ tools): bounded by `budget.tool_calls` / `budget.tokens`.
- **Fix validation** (`develop_fix` self-loop): bounded by `budget.fix_attempts = N`.
- **Re-investigation** (`human_review → plan`): bounded by a max-reinvestigations counter.

Because every loop has a budgeted exit that routes forward (worst case → synopsis), the graph
**always terminates with a useful artifact**.

---

## 6. Human-in-the-loop & durability

- `human_review` calls `interrupt(report)`. The graph **pauses and persists** to the Postgres
  checkpointer; it resumes — minutes or days later — via
  `graph.invoke(Command(resume=decision), config)`. This matches the real workflow: the agent
  finishes fast, the human reviews asynchronously.
- **Thread = incident.** `config = {"configurable": {"thread_id": incident_id, ...}}`. Each
  incident is one durable, replayable thread; the checkpointer *is* the audit trail.
- **Progressive autonomy** is a property of the `human_review` node: default = hard interrupt;
  on `tier == 3 AND confidence ≥ τ_auto AND track_record_ok`, auto-approve (still fully logged).
  One config flag, same graph.

---

## 7. External interfaces (consumed, not owned)

### 7.1 Tools / MCP
- Tools are **injected** into the gather and fix nodes, loaded via `langchain-mcp-adapters`
  (`MultiServerMCPClient.get_tools()`) and exposed through a `ToolNode`.
- **Toolset partitioning is a hard boundary:** investigation tools are read-only; playground
  tools (write/exec) are a separate set available *only* to `develop_fix`. The graph never gives
  investigation nodes write/exec capability.

### 7.2 LLM gateway
- Nodes obtain a model via `get_model(config["configurable"]["model"])` — never an imported
  client. Enables per-client model selection and per-node routing (cheap model for `triage`,
  strong model for `analyse`) without code change.

### 7.3 Persistence & artifacts
- **Checkpointer:** `PostgresSaver` (durable state + audit).
- **Artifact store:** blob store (e.g., S3/in-client equivalent) holding raw logs, diffs, query
  results, keyed by incident; state holds only `artifact_ref`s.

### 7.4 Intake & output
- The graph is *invoked* by the intake/trigger service with a parsed `Incident`.
- `publish` calls injected action services (ServiceNow client, git/PR client, Teams notifier).

---

## 8. Extensibility — playbooks → subgraphs

- **Phase 1 (Splunk incidents):** a single graph; **playbooks are config/data** that parameterise
  prompts, the allowed tool subset, the plan template, and thresholds. New Splunk scenario = new
  playbook config, no graph change.
- **Later (structurally different incident types):** compile **per-type subgraphs**; `triage`
  dispatches via `Command(goto=...)`. The shared backbone — review, publish, capture, audit,
  budgets — is reused. This is the graph-level expression of the MCP-first "narrow then broaden"
  principle.

---

## 9. Cross-cutting concerns

- **Budgets as first-class state** (`Budget`): max tool calls, token ceiling, fix attempts,
  wall-clock deadline. Drive all graceful-degradation routing.
- **Audit/observability:** every node entry/exit, tool call, and routing decision is traced
  (LangSmith or OTel) and recoverable from the checkpointer. Tool calls are individually logged
  and attributable to the incident thread.
- **Error handling:** node-level retries with backoff for transient tool/LLM failures; a terminal
  error routes to a "could not complete — partial synopsis" report rather than crashing.
- **PII / sensitive data:** redaction happens at the tool boundary (before content enters
  `messages`/`evidence`), so sensitive raw data never reaches the model or the checkpoint. (Owned
  by the security/redaction component; the graph assumes tools return screened content.)
- **Concurrency:** many incidents run as independent threads; within an incident, `gather` may
  fan out across sources with `Send` (map) then join, as a later optimisation.

---

## 10. Open decisions

1. **Gather agency level** — constrained-but-looping (cheaper, testable) vs free ReAct. Lean
   constrained first, loosen with trust.
2. **Extra interrupt after `plan`** for higher-tier systems? (review the plan before spending on
   gather)
3. **Reject path** — re-investigate (loop to `plan`) vs end and hand to human. Probably configurable.
4. **Confidence thresholds** `τ_fix`, `τ_auto` — set empirically from the evaluation dataset.
5. **Fix-attempt cap N** and re-investigation cap — tune against cost/quality.

---

## 11. Build approach

Start with a **runnable skeleton**: all nodes stubbed, edges/conditionals/checkpointer/interrupt
wired, fake tools and a fake model. This makes the control flow executable end-to-end (including a
simulated human approve/reject and the fix→synopsis fallback) and surfaces design gaps before any
real integration. Then replace fakes with real MCP tools, the LLM gateway, and the sandbox.
