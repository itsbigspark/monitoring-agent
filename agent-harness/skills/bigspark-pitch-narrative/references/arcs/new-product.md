# Arc A — New-product pitch

Per-slide guidance for the 13-slide new-product pitch arc.

## Slide 1 — Cover

**Intent**: Name the product.

The cover is doing one job: anchor the product name in the audience's
mind before they hear anything else. Title big. Subhead in red caps.
Tagline one line. Three-dot motif right side (if the product has
multiple components — otherwise drop to Recipe B).

What it must NOT do: explain. Save explanation for slides 2 onward.

## Slide 2 — PART I divider

**Intent**: Frame the problem.

A single declarative sentence the audience can't disagree with. Not
"problems with current AI" — too broad. "Most banks can't deploy
agentic AI safely" — claim that lands.

The sentence carries the whole part. The next slide will substantiate.

## Slide 3 — Three reasons the current state fails

**Intent**: Name three reasons.

Use 3-Column Cards. One reason per card. Each card:
- Title: noun phrase, 4–6 words.
- Body: three sentences max. Specific. Evidence where possible.

What to put in each card depends on the product. For an enterprise
product targeting risk-averse buyers, the three are usually some
combination of:
- Compliance / risk gap
- Operational waste / time gap
- Build-cost / capability gap

## Slide 4 — PART II divider

**Intent**: Pivot to the solution.

Declarative sentence introducing the product as a *named thing*.
"[Product]: agentic AI for regulated banking." This is where the
product name re-enters as a concept the audience now has a hook for
(the problem from Part I).

## Slide 5 — Architecture

**Intent**: Show the components.

For a multi-component product: 3-Column Cards or an embedded
architecture diagram. Each component:
- One-line description.
- One concrete capability or feature per bullet.

Audience leaves this slide knowing the *parts* of the product.

## Slide 6 — Integration topology

**Intent**: Show how it fits into their world.

This is where you signal "we don't replace your stack — we integrate."
Use the perimeter-topology pattern (see `bigspark-excalidraw-diagrams`)
to show your components inside / alongside their data systems.

The audience leaves this slide knowing the *boundary* between you and
them.

## Slide 7 — Worked example

**Intent**: Walk one example end-to-end.

Pick the worked example carefully. It should be:
- Concrete (one specific case, with numbers).
- Representative (the audience can map it to their world).
- Compelling (the outcome is materially better than the status quo).

Use the Case Study layout with an embedded diagram (fan-out pattern is
common). Step numbers on each box in the diagram. Impact stats off to
one side.

This slide is the deck's centre of gravity. If the audience remembers
one slide, it should be this one.

## Slide 8 — Variants / coverage

**Intent**: Show breadth.

Worked example is one variant. Slide 8 says: "and here are eight
more." 3-Column Cards organising the variants by maturity:
- Live / proven
- Next tranche
- Future / expansion

Avoids the "is this just for one use case?" pushback before it's asked.

## Slide 9 — PART III divider

**Intent**: Pivot to compliance and commercial.

The audience has the *what* (Parts I + II). Now: how does this work
operationally? Compliance, deployment, money.

Declarative sentence — "Compliance by design, not bolted on." sets the
tone for the remaining slides.

## Slide 10 — Compliance / security model

**Intent**: Show how compliance is baked in.

For regulated buyers this slide is non-negotiable. Architecture
diagram showing the trust boundary, the audit trail, the
gate-per-call enforcement. Use the perimeter-topology pattern again
but zoomed in.

Pair with explicit framework references (FCA, EU AI Act, GDPR,
SOC 2, etc.) in the speaker notes — the buyer's risk function will ask.

## Slide 11 — Commercial model

**Intent**: Anchor the commercial story.

Stats / Impact layout. Three numbers:
- Time to first value (e.g., "16 weeks").
- Marginal cost of subsequent variants (e.g., "40% cheaper").
- Pricing unit (e.g., "£/seat" or "£/case").

Key Insight panel at the bottom: one sentence that ties the numbers
together. "The platform pays back inside the first deployed variant."

## Slide 12 — Deployment timeline

**Intent**: Show the path from kick-off to value.

Native pptx timeline (horizontal track + phase dots + per-phase
bodies). Three phases is the right number — fewer reads as
hand-wavy, more reads as project plan.

Speaker note: subsequent variants compound the timeline ratio.

## Slide 13 — Closing / CTA

**Intent**: Make the specific ask.

The ask must be:
- Specific: a meeting, an introduction, a pilot scope.
- Time-bound: by when.
- Asymmetric: low cost for them, high signal for you.

"A 90-minute discovery session with your fraud, compliance, and
security teams" passes all three. "Let's continue the conversation"
fails all three.

Footer with name / email / LinkedIn — operator fills in before each
pitch. Bigspark · year · domain on the second line.

---

## Cuts to short form (8 slides)

If 13 slides is too long:

- **Cut 4** (Part II divider) — go straight from problem cards to
  architecture.
- **Cut 8** (variants) — keep one variant only.
- **Cut 10** (compliance) — fold the key compliance points into
  slide 5 or speaker notes.
- **Cut 12** (timeline) — fold into speaker notes on slide 11.
- **Cut 13** (closing) — make the ask on slide 11 as the Key Insight.

Result: Cover → Problem → 3 reasons → Architecture → Integration
→ Worked example → Commercial → Ask.
