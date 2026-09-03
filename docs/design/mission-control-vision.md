# Product Vision — Mission Control

> **Product:** Mission Control — application management & operations platform
> **First feature:** Sentinel (agentic incident auto-investigation & resolution)
> **Status:** Vision draft for team review (not a build spec)
> **Related:** `system-design-overview.md`, `orchestration-core.md`,
> `incident-investigation-agent-proposal.md`

---

## 1. The vision

**Mission Control is a single operations cockpit for the teams that monitor and support
applications.** It centralises the things those teams currently juggle across many tools — the
incident queue, the monitoring dashboards, the historical view of what's gone wrong — and adds
something none of them have: **automated investigation and resolution** of incidents.

It is built as a **platform with features shipped incrementally**. The first and headline feature
is **Sentinel** — the agentic incident auto-investigation capability. Subsequent features
(dashboard hub, analytics, and more) layer onto the same foundation.

**Positioning:** Mission Control is the product; **Sentinel is its first feature and primary
differentiator**.

## 2. The problem (beyond a single incident)

Support/monitoring teams own *many* applications whose incidents land in a *shared* queue. Today:

- **The queue is noisy and flat.** At NatWest, the AIOps team owns many applications built by the
  Data Science & Innovation team; all their incidents flow into one ServiceNow queue, and the SNOW
  bot fires every ticket into a single Teams channel. It's a firehose.
- **No clean per-application, historical view.** ServiceNow organises by *queue*, not by
  *application*; Teams offers no structure at all. Seeing "what's been happening with app X over
  time" is hard.
- **Monitoring is scattered.** Dashboards live across QuickSight, Tableau, and elsewhere — no
  single place to see the health of everything a team owns.
- **Resolution is fully manual.** Even once you find the incident, investigating and fixing it is
  hands-on (this is the gap Sentinel closes).

Mission Control turns that firehose into an organised, per-application operations view — and then
resolves incidents for you.

## 3. Target users

Application **support / monitoring / AIOps teams** that own a portfolio of services across a shared
incident queue. (Beachhead: NatWest AIOps owning DSI-built applications — see the proposal's
go-to-market appendix.) This is exactly the "teams that monitor across many platforms" buyer the
broader strategy targets — a platform for them, with Sentinel as the reason to adopt.

## 4. Anchoring principles — operational systems remain authoritative

Mission Control is a **management, retrieval, and resolution layer** over the systems teams
already use. It does not create competing sources of truth.

### 4.1 ServiceNow remains the incident system of record

**Mission Control works *off* ServiceNow; it does not replace it.** SNOW remains authoritative for
incident creation and lifecycle/compliance. Mission Control:

- **Mirrors + enriches** SNOW incidents with per-application organisation, history, ownership,
  Sentinel findings, and resolution workflow.
- **Writes status back** to SNOW so the authoritative incident record stays current.
- **Owns** only the value it adds — organisation, enrichment, Sentinel output, and analytics — not
  a competing incident lifecycle.

### 4.2 Confluence remains the documentation system of record

**Mission Control indexes approved documentation; it does not become the place where documentation
is authored or owned.** Confluence remains authoritative. During application onboarding, Mission
Control defines a required documentation contract — for example architecture, ownership,
dependencies, deployment and rollback, dashboards, runbooks, known failure modes, and escalation —
and records whether each requirement is met.

- **Requirements, not duplicate pages:** the platform specifies what must exist and links to the
  authoritative Confluence content.
- **Validated onboarding:** missing, inaccessible, or stale required material is surfaced before
  the application is considered fully onboarded.
- **Permission-aware indexing:** approved pages are indexed for Sentinel and support-team retrieval;
  source links, permissions, and refresh metadata are preserved.
- **Combined context:** retrieval can join documentation with deployed code/Intent Layer context and
  authorised incident history without changing ownership of any source.

> Design rule: avoid two sources of truth. Define precisely what Mission Control *owns*, *indexes*,
> and *mirrors*, and always preserve links back to the authoritative source.

## 5. Product structure (modules)

| Module | What it is | Status |
|---|---|---|
| **Application catalog** *(foundation)* | Registry of apps and operational metadata: tier, owners, repos, log indices, dashboards, data sources, playbooks, required-document checklist, and authoritative Confluence links | Foundation — built first, shared by all features |
| **Sentinel — resolution** | Agentic auto-investigation; trigger, view findings, approve/edit/reject | **Feature 1 — first to ship** |
| **Incident cockpit** | Clean per-application, historical, filterable view across the shared queue; ownership, status, SLA/tier, trends | Grows from the Sentinel review screen |
| **Dashboard hub** | Centralise/embed monitoring dashboards (QuickSight, Tableau, …) per application | Feature 2 (later) |
| **Pipeline & model health** | Track Airflow DAG runs/failures and LLM-output evaluation metrics per application; surface threshold breaches | Later (expansion) |
| **Ask Mission Control** | Permission-aware operational Q&A over indexed Confluence documentation, deployed code/Intent Layer context, and authorised incident history, with citations | Future feature |
| **Analytics & reporting** | MTTR, recurring-failure patterns, KPIs, exec views | Later |

**Sentinel expansion incident types & trigger sources.** Beyond Splunk-alert application incidents
(the wedge), the same engine extends to new incident types via *connector + playbook*, reusing the
core unchanged. Two high-value candidates — both squarely in the data-science/AIOps beachhead:

- **Airflow DAG / task failures** — structured failure events with clear task boundaries,
  accessible logs, run metadata, and a known recent-change surface (DAG code/config).
- **LLM-output evaluation-metric breaches** — when an LLM app's quality metrics (e.g. relevance,
  faithfulness, drift) cross a threshold and fire an alert; Sentinel investigates *why* quality
  degraded (prompt/model change, data drift, upstream input change).

Both introduce **non-ServiceNow trigger sources** (Airflow failure callbacks/API; **email-based**
eval alerts), so the intake layer is designed to generalise beyond SNOW from the start. And the
signals behind them — DAG failure stats, LLM eval scores over time — double as **Mission Control
monitoring surfaces** (the "Pipeline & model health" module above).

## 6. Why this is coherent, not scope creep

Mission Control and Sentinel **share one foundation and feed each other**:

- **Shared application catalog.** Sentinel *already needs* per-app config (which Splunk index,
  which repo, which data sources, which tier, which playbook). That *is* Mission Control's catalog.
  Build it once; both use it.
- **Triage classification powers the cockpit.** Sentinel's triage classifies each incident by
  application in order to investigate it. That classification is exactly what re-organises the
  noisy shared queue into Mission Control's per-application view — the cockpit's organisation is a
  byproduct of the engine.
- **The review UI is Mission Control's first screen.** Sentinel's human-review surface (approve /
  edit / reject a finding) is the first slice of the Mission Control UI — not a throwaway.

So the platform vision gives Sentinel's awkward bits (per-app config, classification, review UX) a
natural home, rather than adding new surface area.

## 7. Architectural implications (vs. headless Sentinel)

- **It's a web application** — frontend + API backend, **SSO/auth**, **team-scoped
  multi-tenancy**, a richer data model. A bigger build and a different (frontend) skillset than a
  headless agent.
- **Still fully in-client.** Same deployment posture as Sentinel — one isolated instance per
  client, all data inside the boundary.
- **Dashboard embedding** (QuickSight/Tableau) carries auth/licensing/SSO friction — likely
  deep-links first, true embeds later.
- **Sentinel remains a clean module** behind Mission Control's API, so it can still run / be
  demoed as the headless engine for the PoC.

## 8. Sequencing & discipline

1. **Ship Sentinel first** — it's the provable, fast PoC and the differentiator. First user-facing
   surface = the Sentinel incident/review view.
2. **Design the seams now** so Mission Control grows without rework:
   - Application catalog as a **first-class data model** from day one.
   - Sentinel review UI built as **Mission Control's first screen**.
   - ServiceNow and Confluence **system-of-record boundaries** locked early.
   - Documentation requirements, source links, permissions, and index freshness represented in the
     application catalog.
3. **Then** add the dashboard hub, analytics, and further features on the same foundation.

> Discipline: *build Sentinel, shaped so it slots into Mission Control.* Don't build the cockpit
> before the engine proves value; don't build anything that must be thrown away when Mission
> Control arrives.

## 9. Commercial framing

Mission Control shifts the offer from a point tool to a **platform** — stickier and higher-value —
while Sentinel stays the wedge that wins the first conversation. It aligns directly with selling to
the **teams that monitor across many platforms** (e.g. AIOps): a cockpit *for them*, with Sentinel
as why they choose it. Commercial model is unchanged (analysis → PoC → rollout); Mission Control is
the platform those rollouts expand into.

## 10. Secondary benefits

### 10.1 Documentation requirements and the Confluence indexing flywheel

Mission Control turns application onboarding into a documented operational contract. It defines the
minimum material a support team needs — architecture, ownership, dependencies, deployment and
rollback, dashboards, runbooks, known failure modes, and escalation — then checks that the required
content exists and is accessible in **Confluence, which remains the source of truth**.

Mission Control stores links, requirement status, permissions, and index metadata; it does **not**
author or own duplicate documentation. Approved Confluence content is indexed for retrieval and
refreshed on a defined cadence. Every answer or investigation should retain citations back to its
source so users can verify it and update it in Confluence.

Sentinel also consumes code comments, the deployed codebase and Intent Layer context, and past
incident write-ups. The better that combined context is, the sharper its diagnoses. Mission Control
makes the payoff visible through resolution-time and accuracy KPIs per application: good docs →
better Sentinel + support outcomes → measurable benefit → continued documentation investment.

### 10.2 Surfacing tacit / tribal knowledge

The onboarding requirements create a natural pull to **externalise knowledge that today lives only
in people's heads** — undocumented quirks, edge cases, and process lore. Because Sentinel and the
support team can use that knowledge day-to-day, there is a practical reason to capture it in the
authoritative documentation.

- **De-risks key-person dependency / bus factor:** captured knowledge survives staff turnover.
- **Complements the Intent Layer:** expert operational knowledge adds invariants and production
  lessons that automated code cartography cannot infer.
- **Creates a durable operating model:** each application becomes easier to understand as onboarding
  content and incident learning improve.

### 10.3 Smoother handover and support-team independence

When an application moves from development to support, knowledge transfer is often concentrated in
a few meetings and repeated questions to the original developers. Mission Control makes handover
**"onboard the application against a defined operational contract"**: populate its catalog entry,
complete the required Confluence material, connect the code and evidence sources, and validate that
the platform can retrieve them.

- Support teams can answer routine operational questions and investigate more incidents from the
  indexed documentation, code context, runbooks, and prior findings.
- Original developers remain available for genuinely novel or high-complexity issues instead of
  acting as the default route to recover application context.
- Every future joiner starts from the same living, authoritative material rather than requiring a
  new round of knowledge-transfer sessions.
- Independence is an outcome to measure — for example, fewer developer escalations for routine
  questions and faster support-led diagnosis — not a claim that development expertise is never
  needed.

### 10.4 Future feature — code-aware operational Q&A

The same retrieval layer can power **Ask Mission Control**, a permission-aware conversational
interface for application questions. It is intentionally positioned beyond documentation-only
assistants such as Rovo: answers can combine approved **Confluence documentation with the relevant
deployed code and Intent Layer context**, plus authorised incident history, while staying inside the
client boundary.

This is a **future feature**, not part of the initial Sentinel MVP. It should provide citations,
identify whether evidence came from documentation, code, or an incident, respect source permissions,
and state uncertainty when sources conflict or are incomplete. Confluence remains where
corrections are made; Mission Control re-indexes them rather than becoming a parallel wiki.

### 10.5 Framing cautions

- Present documentation governance as an **operational enabler**, never as criticism of current
  documentation or a demand to "brain-dump everything."
- It is a compounding **multiplier, not a prerequisite** — the initial Sentinel workflow can use
  logs + code while documentation maturity improves.
- Say **"reduces routine dependence"**, not "eliminates developers from support." Complex and novel
  issues will still need engineering judgement.
- Keep code-aware Q&A labelled as roadmap until implemented and evaluated.

## 11. Open questions

- **Catalog sourcing** — how is the application catalog populated per client (manual, from a CMDB,
  from SNOW/config)?
- **Documentation contract** — which artefacts are mandatory by application tier, who approves
  completeness, and what freshness SLA applies?
- **Confluence integration** — connector/API choice, page and space scope, permission propagation,
  incremental refresh, deletion handling, and citation format.
- **Incident→application mapping** — how reliable is classification on a messy shared queue, and
  what's the fallback when it's ambiguous?
- **Dashboard integration depth** — deep-link vs embedded; per-tool auth.
- **Multi-tenancy model** — team/portfolio scoping and access control.
- **Where the cockpit ends and SNOW begins** — exact owned-vs-mirrored state split.
- **Frontend stack & team** — skillset and effort implications for the platform build.
