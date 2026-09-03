---
name: bigspark-technical-prose
description: Draft, review, or rewrite technical documents in Bigspark's direct, evidence-led style without changing their facts. Use for architecture documents, ADRs, RFCs, READMEs, runbooks, specifications, technical proposals, postmortems, status reports, and other engineering prose. Also use when the user asks to humanize technical writing, remove AI slop or robotic wording, improve clarity, calibrate a technical voice, or check a document for vague and formulaic writing.
---

# Bigspark technical prose

Produce useful technical writing, not prose that merely sounds polished. Preserve
the source material's facts, decisions, uncertainty, status, terminology, links,
and attribution.

Do not optimise for AI-detector scores or infer who wrote a document from style.
Treat prose smells as editing prompts, never proof of authorship.

## Choose the output mode

Infer the mode from the request. If the request is unclear, default to
`review-and-rewrite` for pasted text and `draft` for source notes.

- `review`: Return prioritised findings with quoted evidence and suggested fixes.
- `rewrite`: Return the revised document without an unsolicited changelog.
- `review-and-rewrite`: Return a short diagnosis followed by the revision.
- `draft`: Create a document from verified source material.
- `voice-calibrate`: Derive a small voice profile from approved writing samples,
  then apply it without copying distinctive phrases.

## Follow the editing workflow

1. **Establish the document contract.** Identify the audience, purpose, document
   type, expected reader action, and constraints. Ask a question only when an
   unknown would materially change the result.
2. **Build a fact ledger.** Record decisions, names, dates, numbers, links,
   technical terms, implementation states, limitations, and uncertainty that must
   survive the edit. Never invent an example, metric, incident, quotation, owner,
   or personal experience.
3. **Select the document shape.** Read
   [document-shapes.md](references/document-shapes.md) when the structure is
   missing, mixed, or unsuitable for the reader's task.
4. **Fix the structure first.** Lead with the decision, result, task, or system
   purpose. Remove duplicate introductions, topic-only headings, repeated
   conclusions, and sections that exist only to make the document look complete.
5. **Edit the prose.** Use concrete nouns and verbs. Keep precise domain language.
   Put evidence next to claims. Name boundaries, owners, sources of truth, and
   operational states when they affect the reader's understanding.
6. **Apply controlled-English principles.** Read
   [controlled-english.md](references/controlled-english.md) for instructions,
   runbooks, specifications, review findings, and substantial technical
   explanations. Use the ASD-STE100-inspired rules without claiming formal
   compliance.
7. **Run the integrity pass.** Compare the revision with the fact ledger. Do not
   strengthen uncertainty, imply that specified work is implemented, remove an
   inconvenient trade-off, or silently change a decision.
8. **Run the prose-smell pass.** Read
   [prose-smells.md](references/prose-smells.md) for substantial rewrites or when
   the user mentions AI slop, robotic language, or humanisation. Fix patterns only
   when they harm this document.
9. **Read the result as a reader.** Confirm that the opening earns attention, each
   section has one job, every paragraph advances that job, and the ending provides
   the necessary conclusion or next action.

## Apply the Bigspark voice

Read [bigspark-voice.md](references/bigspark-voice.md) for Bigspark documents or
when no stronger repository or publication style guide applies.

The default voice is direct, technically confident, plain, and evidence-led.
Distinguish `live`, `implemented`, `specified`, `proposed`, and `planned`. Prefer a
qualified claim over synthetic certainty. Preserve a useful disagreement instead
of smoothing it into a false consensus.

Use headings, lists, tables, diagrams, fragments, and punctuation when they help
the reader. Do not add or remove them to imitate a generic idea of human writing.

## Protect technical integrity

- Preserve code, commands, identifiers, paths, URLs, citations, and normative
  terms unless the user asks to change them.
- Verify mutable or disputed claims when the task permits research. Otherwise,
  label the limitation instead of silently presenting the claim as current.
- Keep requirements language precise. Do not weaken `must`, strengthen `may`, or
  change acceptance criteria during a prose edit.
- Keep implementation status explicit. A design document is not evidence that a
  capability exists.
- Prefer exact repetition of a technical term over synonym cycling that creates
  ambiguity.
- Do not introduce marketing claims into engineering documentation.

## Use the advisory linter when useful

Run `scripts/prose_lint.py` on Markdown or text files when the user requests a
prose audit, the document is large, or the edit will become a reusable standard.
The linter flags mechanical smells and possible review points. Interpret each
warning in context; a warning is not automatically a defect.

Resolve the script path relative to this `SKILL.md` at runtime:

```bash
python3 <skill-directory>/scripts/prose_lint.py path/to/document.md
python3 <skill-directory>/scripts/prose_lint.py --format json path/to/document.md
```

Do not use the linter's output as an AI-authorship score or a blocking quality gate
without a separately approved policy and calibrated evaluation set.

## Use examples without copying them

Read [worked-examples.md](references/worked-examples.md) when a rewrite remains
abstract, padded, or structurally flat after the first pass. Apply the editing
move, not the example's wording.

## Maintain source provenance

Read [sources.md](references/sources.md) before adapting upstream writing guidance
or changing the skill's attribution. Record the source, licence, reviewed revision
or date, and the ideas accepted or rejected.
