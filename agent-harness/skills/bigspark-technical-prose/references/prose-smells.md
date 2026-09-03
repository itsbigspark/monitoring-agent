# Technical prose smells

Use these categories to diagnose writing problems. Quote the relevant text and
explain its effect on this reader. Do not count isolated patterns, calculate an
AI score, or infer authorship.

## Integrity smells

Treat these as the highest priority.

- A proposal is described as implemented.
- An uncertain claim becomes categorical.
- A requirement changes strength during editing.
- An owner, source, number, example, incident, or quotation has been invented.
- A trade-off, limitation, or dissenting position disappears from the rewrite.
- A citation no longer supports the nearby claim.
- Terminology changes introduce a second name for the same technical concept.

## Structural smells

- The document delays its purpose or requested decision.
- Headings name broad topics but do not help the reader navigate.
- The introduction, section endings, and conclusion repeat the same claim.
- A document mixes explanation, procedure, and reference without a clear reason.
- Lists replace connected reasoning, or dense prose hides an exact mapping.
- Every section has the same introduction-body-summary shape regardless of need.
- A metaphor becomes the primary description of system components or authority.

## Claim smells

- Significance is asserted with words such as "pivotal" or "transformative"
  instead of evidence.
- An abstract improvement lacks a measure, observation, or bounded example.
- A vague group such as "experts" or "the industry" carries the authority.
- "Ensures", "guarantees", or "eliminates" overstates what a control can prove.
- Novelty is claimed without checking prior art.
- A future capability is described in the present tense.

Do not invent specificity to repair a vague claim. Ask for evidence, qualify the
claim, or remove it.

## Formulaic prose smells

- Staged contrast: "not just X, but Y", "not X; rather Y", or a false binary.
- Promotional framing: "seamless", "world-class", "cutting-edge", or similar
  language without a defined measure.
- Generic scene-setting: "in today's rapidly evolving landscape".
- Significance landing: "this marks a pivotal moment" or "stands as a testament".
- Assistant framing: "let's dive in", "great question", or "here is a
  comprehensive overview".
- Forced groups of three, mirrored clauses, or slogan-like paragraph endings.
- Repeated transitions such as "furthermore", "moreover", and "additionally".
- Synonym cycling that replaces a precise technical term with looser alternatives.

These constructions are legitimate in some contexts. Fix them when they make the
document vague, theatrical, repetitive, or less accurate.

## Formatting smells

- Bold is used as sentence-level decoration rather than meaningful emphasis.
- Headings or callouts split a short connected argument into fragments.
- Paragraphs are too dense for the task and medium.
- A diagram repeats the prose but does not clarify a relationship.
- A table is used for long narrative text, or prose is used for repeated fields.

Do not ban em dashes, semicolons, fragments, lists, or sentence-length patterns.
Judge whether the choice helps this document.

## Human voice safeguards

- Match an approved sample only when the user supplies or identifies it.
- Infer broad traits such as directness, technical depth, and paragraph rhythm.
- Do not copy distinctive phrases or reproduce personal verbal tics mechanically.
- Do not add fabricated anecdotes, emotional reactions, hesitations, slang, or
  grammatical mistakes to make text appear human.
- Preserve an author's deliberate idiosyncrasy when it does not obstruct the
  reader.

## Review format

For each material finding, report:

1. Severity: `integrity`, `structural`, or `editorial`.
2. Evidence: the shortest useful quotation or location.
3. Reader effect: why it causes confusion, risk, or wasted effort.
4. Revision direction: the change needed, without inventing missing facts.

Return no finding when the pattern is harmless in context.
