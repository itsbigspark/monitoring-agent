# Technical document shapes

Choose a shape from the reader's need. Do not force every document into the same
template, and do not mix task instructions, reference material, and architectural
explanation without clear boundaries.

## Contents

- [Architecture explanation](#architecture-explanation)
- [Architecture decision record](#architecture-decision-record)
- [RFC or technical proposal](#rfc-or-technical-proposal)
- [README](#readme)
- [How-to guide](#how-to-guide)
- [Runbook](#runbook)
- [Status report](#status-report)
- [Postmortem](#postmortem)
- [Documentation-system note](#documentation-system-note)

## Architecture explanation

Use when the reader needs to understand a system and the reasons behind it.

1. Purpose and scope
2. Governing decisions or invariants
3. Components and ownership boundaries
4. Important runtime or delivery flows
5. Trade-offs and rejected alternatives
6. Current implementation state
7. Sources of truth and related specifications

Lead with the system's purpose and the decision readers need to understand. Use a
diagram only when it clarifies relationships, sequence, or authority.

## Architecture decision record

Use for one durable decision.

1. Status and date
2. Context and forces
3. Decision
4. Consequences
5. Alternatives considered
6. Follow-up or superseding decision

Keep the decision distinct from its implementation plan. Record material costs and
constraints, not only benefits.

## RFC or technical proposal

Use when a decision remains open.

1. Decision requested
2. Problem and evidence
3. Constraints and non-goals
4. Proposed design
5. Alternatives
6. Risks and mitigations
7. Migration, rollout, and rollback
8. Validation plan
9. Open questions and decision owner

Label proposals as proposals. Do not write about future behaviour in the present
tense.

## README

Use as an entry point, not an exhaustive specification.

1. What the project is
2. Why it exists and who it serves
3. Architecture or repository map when needed
4. Smallest useful getting-started path
5. Development and validation commands
6. Configuration and operational boundaries
7. Links to canonical specifications and support

Keep detailed policy and design material in its source-of-truth document and link
to it.

## How-to guide

Use for a competent reader trying to achieve a specific result.

1. Goal and applicability
2. Preconditions
3. Ordered actions and decision points
4. Verification
5. Recovery or rollback when failure is plausible
6. Related reference material

Keep explanation close to the decision it supports. Do not interrupt steps with a
general technical lecture.

## Runbook

Use for operational work under time pressure.

1. Trigger and scope
2. Safety conditions and required access
3. Diagnosis or decision tree
4. Actions with expected observations
5. Verification and stop conditions
6. Rollback or escalation
7. Evidence to capture
8. Owner and last validation date

Make destructive actions and authority boundaries visible before the command that
uses them.

## Status report

Use to support a decision or coordinate work.

1. Current outcome or state
2. Evidence
3. Changes since the last report
4. Risks or blocked decisions
5. Next action, owner, and due point when known

Do not turn activity into progress. Report the verified result and the remaining
gap.

## Postmortem

Use to explain an incident and improve the system.

1. Impact
2. Detection and response timeline
3. Technical cause and contributing conditions
4. What helped and what delayed recovery
5. Corrective actions with owners and verification
6. Lessons that generalise beyond this incident

Avoid blame, theatrical language, and hindsight certainty. Separate evidence from
inference.

## Documentation-system note

The distinction between tutorials, how-to guides, reference, and explanation is
informed by [Diataxis](https://diataxis.fr/). Use that model to separate reader
needs, not as a requirement to rename every existing document.
