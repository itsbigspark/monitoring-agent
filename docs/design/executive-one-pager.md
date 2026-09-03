# Mission Control + Sentinel

## From production alert to evidence-backed action

**Mission Control is an application operations platform for support and monitoring teams. Its first feature, Sentinel, is an agentic incident investigator designed to turn alerts into evidence-backed root causes, validated fix proposals, or a clear investigation synopsis — with people retaining control.**

### The challenge

An alert identifies a symptom, not its cause. Engineers still have to collect logs, trace the relevant code, inspect supporting systems, reconstruct what happened, and decide what to do next. The work is slow and repetitive, and it often depends on a small number of original developers or senior engineers who hold the application context.

As applications move into support, knowledge transfer is commonly fragmented across meetings, tickets, documentation, and individual memory. Support teams inherit operational responsibility without always receiving a durable, usable picture of how each service behaves.

### The solution

For an in-scope incident, Sentinel is designed to:

1. **Detect and triage** the incident from ServiceNow or another configured source.
2. **Gather evidence** from Splunk, the deployed codebase, and approved data systems through governed connectors.
3. **Correlate and reason** across logs, code, architecture, runbooks, and past incidents.
4. **Validate safely** in an isolated playground when a candidate fix can be tested.
5. **Deliver action-ready output**: a root cause and proposed fix, or a detailed synopsis that fast-tracks the human investigation.
6. **Capture review outcomes** to measure quality and improve future investigations.

The initial focus is Splunk-alert-driven application incidents — automating a workflow already proven manually with a purpose-built Splunk MCP connector and code-aware AI investigation. New incident types are added through connectors and playbooks rather than by rebuilding the platform.

### More capable support teams, less key-person dependency

Mission Control makes application onboarding a structured, reusable process. Each application has defined documentation requirements, ownership, repositories, log sources, dashboards, runbooks, dependencies, and known operational behaviours. That captured context is indexed and made available to Sentinel and the support team.

The result is a durable handover: support teams can answer more operational questions and investigate more incidents without repeatedly relying on the original development team. Developers remain available for the genuinely novel and complex work, rather than routine context retrieval.

**Confluence remains the documentation source of truth.** Mission Control does not create a competing documentation store. It defines what must be documented during onboarding, checks that required material exists, and indexes approved Confluence content for retrieval alongside code and incident evidence.

### Designed for controlled environments

- **Human-approved by default:** no autonomous production changes; findings and fixes are reviewed.
- **Read-only, least-privilege investigation:** production access is tightly scoped and auditable.
- **Fully in-client:** one isolated deployment per client; code, logs, data, and inference remain inside the approved boundary.
- **Complete evidence trail:** tool calls, decisions, assumptions, confidence, and human verdicts are captured.
- **Portable and configurable:** the same container images run on-premises or in any cloud; onboarding is configuration-led, with automated preflight checks and air-gap support.
- **Model-agnostic:** use an approved managed, in-VPC, self-hosted, or local model without redesigning the workflow.

### Business outcomes

**Faster diagnosis and resolution.** Compress the most manual phase of incident response.  
**Greater engineering leverage.** Return scarce senior capacity to product and platform work.  
**Consistent investigations.** Apply the same evidence-led process to every in-scope incident.  
**Stronger operational resilience.** Turn handover material, incident learning, and tribal knowledge into a durable asset.  
**Measurable improvement.** Track diagnosis accuracy, fix acceptance, time-to-diagnosis, and reclaimed engineering effort.

### What comes next

Mission Control grows from Sentinel into a per-application incident cockpit, monitoring and analytics hub, and **code-aware operational Q&A**. Unlike documentation-only assistants, the planned Q&A experience will answer with the application’s approved Confluence content **and the relevant deployed code and Intent Layer context**, plus authorised incident history — all within the client boundary and with source evidence.

### Start focused, prove value, then scale

Begin with one lower-tier platform and a defined set of Splunk-driven incidents. Establish the baseline, validate on real or historical cases, measure outcomes, and then expand by application, evidence source, and incident type.

**One platform. One proven workflow. A practical path from manual investigation to safer, faster operations.**
