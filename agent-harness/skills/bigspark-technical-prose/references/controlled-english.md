# Controlled English for software engineering

Use these rules for technical explanations, documentation, specifications,
runbooks, review findings, and code comments. They are inspired by ASD-STE100
Simplified Technical English and adapted to software engineering.

## Write clear instructions

- Write short, direct sentences. Give one instruction or main idea in each
  sentence.
- Name the actor when ownership matters. Avoid an unclear `it`, `this`, or
  `that` when the text contains more than one possible subject.
- Use active voice when it makes the actor and action clear.
- Put a condition before its action when that order helps the reader:
  `If the health check fails, stop the release.`
- Use positive instructions where practical. Use `do not` for a real
  prohibition, and name the prohibited action precisely.

## Keep terminology stable

- Use one term for one meaning. Do not use synonyms only to add variety.
- Define an unfamiliar abbreviation or domain term at first use.
- Preserve exact code, commands, identifiers, API fields, normative terms, and
  approved domain language.
- Do not replace a precise technical term with a simpler but incorrect term.

## Make procedures executable

- Use numbered steps for procedures.
- Keep steps in the order that the reader must do them.
- Give one primary action in each step.
- State the expected result and the condition that stops the procedure.
- Keep warnings and prerequisites next to the step they affect.

## Separate different kinds of claims

- Separate requirements, current state, evidence, rationale, and examples.
- Do not describe a proposal as implemented.
- Do not describe a preference as a requirement.
- Keep uncertainty explicit. Do not strengthen a qualified claim during an
  edit.

## Avoid unnecessary language

- Avoid idioms, decorative metaphors, humour, and promotional language in
  instructions.
- Use an analogy only when it materially improves an explanation. Do not use
  analogies in safety-critical procedures.
- Remove introductions and transitions that do not help the reader act or
  understand.

## Compliance boundary

Describe output as `ASD-STE100-inspired` or `informed by ASD-STE100`. Claim
formal ASD-STE100 compliance only when the document has been checked against
the current official issue, its writing rules, and its controlled dictionary.
