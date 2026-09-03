---
name: bigspark-pitch-narrative
description: >
  Use this skill when planning the slide order and per-slide intent for a Bigspark
  pitch, exec update, or decision memo. Triggers on requests like "plan the deck",
  "what slides do I need", "structure the pitch", "scope a board update", "write
  the narrative for a position paper". Pairs with bigspark-slides — this skill
  decides what each slide says; bigspark-slides decides how each slide looks.
---

# Bigspark Pitch Narrative Skill

Three proven narrative arcs for Bigspark decks. Pick the arc that matches the
deck's job, then run each slide through its prescribed intent. Visual style
comes from `bigspark-slides`; this skill governs sequence and meaning.

---

## When to use which arc

| Arc | Job to be done | Typical length |
|-----|----------------|----------------|
| **New-product pitch** | Sell a product / capability to a client or investor | 10–14 slides |
| **Stakeholder update** | Brief a board / sponsor / SteerCo on status | 6–10 slides |
| **Decision memo** | Drive a single decision to a single answer | 5–8 slides |

If the deck doesn't fit one of these, you're probably mixing two arcs.
Pick the dominant one and cut the rest to a one-slide appendix.

---

## Arc A — New-product pitch

```
Cover →  Part I: Problem  →  Part II: Solution  →  Part III: Commercial  → CTA
         |                   |                     |
         ├─ Problem framing  ├─ Architecture      ├─ Commercial model
         └─ Why now          ├─ Worked example    ├─ Timeline
                             ├─ Variants ready    └─ Ask
                             └─ How it's compliant
```

**Full sequence** (13 slides):

| # | Layout | Intent (one verb + one noun) |
|---|--------|------------------------------|
| 1 | Cover | Name the product |
| 2 | Section Divider — PART I | Frame the problem |
| 3 | 3-Column Cards | Name three reasons the current state fails |
| 4 | Section Divider — PART II | Pivot to the solution |
| 5 | 3-Column Cards or Diagram | Show the architecture |
| 6 | Process Flow / Topology | Show how it integrates with their world |
| 7 | Case Study | Walk one worked example end-to-end |
| 8 | 3-Column Cards | Show variants / coverage breadth |
| 9 | Section Divider — PART III | Pivot to commercial |
| 10 | 3-Column Cards or Diagram | Show how compliance is baked in |
| 11 | Stats / Impact | Anchor the commercial model |
| 12 | Process Flow (timeline) | Show the deployment path |
| 13 | Closing | Make the specific ask |

**Short form** (8 slides — cut these): 4, 8, 10, 12, 13. Keep the
problem → solution → worked-example → commercial → ask spine.

**Pivots** (the rhetorical moves between sections):

- Cover → Part I: silence + click. The cover does the work; don't talk through it.
- Part I → Part II: "We built this because we saw the gap" — claim ownership.
- Part II → Worked example: "Here's what that looks like in practice."
- Part III → CTA: drop the slide deck. Look the audience in the eye. Ask.

**Non-negotiables**:
- The worked example slide (#7). Without one concrete worked example
  the deck reads as theory.
- A specific ask on the closing slide (#13). "Continue the conversation"
  is not an ask. "A 90-minute discovery session with your fraud,
  compliance, and security teams" is an ask.

Full per-slide guidance in [`references/arcs/new-product.md`](references/arcs/new-product.md).

---

## Arc B — Stakeholder update

```
Cover  →  Status (where we are)  →  Progress (what changed)  →
Risks (what we're worried about)  →  Decisions needed  →  CTA
```

**Full sequence** (8 slides):

| # | Layout | Intent |
|---|--------|--------|
| 1 | Cover | Frame the period covered |
| 2 | Stats / Impact | Headline metrics — three numbers |
| 3 | 3-Column Cards | What changed since last update |
| 4 | Process Flow | Where we are vs the plan |
| 5 | 3-Column Cards | Risks / dependencies / blockers |
| 6 | Case Study | One worked example of recent progress |
| 7 | 3-Column Cards | Decisions you need from this audience |
| 8 | Closing | Confirm the asks |

**Short form** (5 slides): cut 4, 6, 7. Keep status / changed / risks /
decisions.

**Non-negotiables**:
- Three numbers on slide 2. Numbers, not narratives. Numbers tell the
  audience whether the deck is good news or bad news in the first 30
  seconds.
- Decisions needed (slide 7) must be named with names. "Approve the
  budget reallocation" not "We need a decision on budget."

Full per-slide guidance in [`references/arcs/stakeholder-update.md`](references/arcs/stakeholder-update.md).

---

## Arc C — Decision memo

```
Context  →  Option set  →  Recommendation  →  Trade-offs  →  Decision
```

**Full sequence** (6 slides):

| # | Layout | Intent |
|---|--------|--------|
| 1 | Cover | Name the decision |
| 2 | 3-Column Cards | Context — what we know, what we don't, what the audience already accepts |
| 3 | 3-Column Cards | Option set — name the three options being weighed |
| 4 | Case Study | Recommendation — the option we're advocating + why |
| 5 | 3-Column Cards | Trade-offs — what we give up to get what we want |
| 6 | Closing | The decision — what we need the audience to do, by when |

**Short form** (4 slides): merge 2+3, merge 5+6. Two-page brief.

**Non-negotiables**:
- All three options on slide 3, even the ones you're rejecting. The
  audience trusts the recommendation more if you've shown the rejected
  alternatives.
- A date on slide 6. "By next week" is not a date. "By 17 June" is.

Full per-slide guidance in [`references/arcs/decision-memo.md`](references/arcs/decision-memo.md).

---

## Workflow

1. **Pick the arc**. New product? A. Status? B. Decision? C.
2. **Read the arc's reference doc** for per-slide intent.
3. **Draft each slide's intent** (one verb + one noun) before writing
   content. If the intent is fuzzy the slide will be too.
4. **Write the content**, matching the intent.
5. **Run the pivots** — say out loud the transition between sections.
   If the transition doesn't make sense the sequence is wrong.
6. **Cut to short form** if the audience has less time than the full
   deck assumes. Don't try to talk faster.
7. **Hand off to `bigspark-slides`** for visual production.

---

## Don't

- ❌ Mix arcs. A "status update + product pitch" is two decks.
- ❌ Skip the worked example. Theory without a concrete example reads
  as vapourware.
- ❌ End with thanks. End with an ask.
- ❌ Use "Next steps" as a section title. Either it's a decision the
  audience makes (then call it that) or it's not in this deck.
- ❌ Pad to a slide count. Better to land a 6-slide decision memo than
  to stretch it to 10.
