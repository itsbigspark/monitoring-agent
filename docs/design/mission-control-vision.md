# Product Vision — Mission Control

> **Product:** Mission Control — application management & operations platform
> **First feature:** Sentinel (agentic incident auto-investigation & resolution)
> **Status:** Vision draft for team review (not a build spec)
> **Related:** `system-design-overview.md`, `langgraph-orchestration.md`,
> `../incident-investigation-agent-proposal.md`

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

## 4. Anchoring principle — ServiceNow stays the system of record

**Mission Control works *off* ServiceNow; it does not replace it.** SNOW remains authoritative for
incident creation and lifecycle/compliance. Mission Control is the **management and resolution
layer** on top:

- **Mirrors + enriches** SNOW incidents (organisation by application, history, ownership, Sentinel
  findings, resolution workflow).
- **Writes status back** to SNOW so the system of record stays current.
- **Owns** only the value it adds (its organisation/enrichment, the resolution workflow, Sentinel
  output, analytics) — never a competing copy of the incident lifecycle.

> Design rule: avoid two sources of truth. Define precisely what Mission Control *owns* vs.
> *mirrors* from SNOW, and keep write-back one-directional and explicit.

## 5. Product structure (modules)

| Module | What it is | Status |
|---|---|---|
| **Application catalog** *(foundation)* | Registry of the apps a team owns + metadata: tier, owners, repos, log indices, dashboards, data sources, playbooks | Foundation — built first, shared by all features |
| **Sentinel — resolution** | Agentic auto-investigation; trigger, view findings, approve/edit/reject | **Feature 1 — first to ship** |
| **Incident cockpit** | Clean per-application, historical, filterable view across the shared queue; ownership, status, SLA/tier, trends | Grows from the Sentinel review screen |
| **Dashboard hub** | Centralise/embed monitoring dashboards (QuickSight, Tableau, …) per application | Feature 2 (later) |
| **Analytics & reporting** | MTTR, recurring-failure patterns, KPIs, exec views | Later |

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
   - ServiceNow **system-of-record boundary** locked early.
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

### 10.1 The documentation flywheel

Sentinel consumes documentation — code comments, runbooks, architecture notes, PR descriptions,
the Intent Layer context, and past incident write-ups. The better that material is, the sharper its
diagnoses. So **well-documented services get faster, better automated resolution**, and Mission
Control makes that payoff **visible and measurable per application for the first time**
(resolution-time and accuracy KPIs per app).

That visibility *is* the incentive: teams finally see documentation pay off — where today it's a
chore with no tangible reward — which reinforces the documentation habit. Good docs → better
Sentinel + support → measurably better KPIs → more/better docs.

### 10.2 Surfacing tacit / tribal knowledge

Beyond documenting ongoing work, the platform creates a natural pull to **externalise the tacit
knowledge that today lives only in people's heads** — the undocumented quirks, edge cases, and
process lore ("you just have to know service X behaves oddly when Y"). Because Sentinel and the
support team can *use* that knowledge to resolve incidents, there is finally a reason to write it
down — a forcing function that normally doesn't exist.

- **De-risks key-person dependency / bus factor:** captured knowledge survives staff turnover
  instead of walking out the door.
- **This is precisely the Intent Layer's "expert capture" mechanism** — combining automated
  extraction with the invariants, edge cases, and production lessons that the code itself can't
  express.
- Over time the system accumulates a durable, queryable model of each application that gets richer
  as more is captured.

### 10.3 Smoother knowledge transfer & handover

When an application is handed from the development team to the support/monitoring team, knowledge
transfer (KT) today is typically a handful of meetings whose content fades and is hard for future
joiners to recover. Mission Control gives KT a **structured, durable destination**: the app's
catalog entry, its runbooks, known quirks, and Intent Layer context.

- Handover becomes **"stand the application up in Mission Control"** — populate and review its
  entry — rather than "run a few sessions and hope it sticks."
- It is **reusable**: every future joiner onboards from the same living record, instead of
  repeating KT sessions.
- It compounds with §10.1–10.2: the KT artefacts are exactly what Sentinel and the support team
  then use day-to-day.
- This is a **clean, non-sensitive operational win** — a good point to lead with, as it reads as
  pure benefit rather than any critique of current practice.

### 10.4 Framing cautions (talking point, not a slide bullet)

- Deliver it as an **upside** ("the platform rewards good documentation and surfaces hidden
  knowledge"), never as a criticism of current docs or as coercion to "brain-dump everything."
- It is a compounding **multiplier, not a prerequisite** — Sentinel works on logs + code
  regardless; documentation and captured knowledge just make it better. Avoid implying the product
  only works with great docs.

*Now surfaced as a dedicated, benefit-framed slide ("A compounding knowledge dividend"); the
framing cautions above live in that slide's speaker notes rather than on the slide itself.*

## 11. Open questions

- **Catalog sourcing** — how is the application catalog populated per client (manual, from a CMDB,
  from SNOW/config)?
- **Incident→application mapping** — how reliable is classification on a messy shared queue, and
  what's the fallback when it's ambiguous?
- **Dashboard integration depth** — deep-link vs embedded; per-tool auth.
- **Multi-tenancy model** — team/portfolio scoping and access control.
- **Where the cockpit ends and SNOW begins** — exact owned-vs-mirrored state split.
- **Frontend stack & team** — skillset and effort implications for the platform build.
