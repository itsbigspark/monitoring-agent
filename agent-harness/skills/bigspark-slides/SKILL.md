---
name: bigspark-slides
description: >
  Use this skill whenever creating any Bigspark-branded PowerPoint deck.
  Triggers on "create a Bigspark deck", "make slides for [topic]", "build a pitch",
  "make a deck", or any request to produce a .pptx for Bigspark.
  Builds decks using pptxgenjs based on shared templates. Produces the navy/teal visual language.
  Always use this skill instead of the generic pptx skill.
---

# Bigspark Slides

A **design system** for programmatic slide decks, implemented in pptxgenjs.

## File layout

All paths in this document are relative to this skill folder:

```
.
├── SKILL.md          ← you are here
├── scripts/
│   ├── theme.js      — tokens layer
│   ├── blocks.js     — geometry layer
│   ├── components.js — components layer
│   ├── slides.js     — templates layer
│   └── example.js    — reference deck
└── asset.yaml
```

---

## Layers

The system has four layers, from lowest to highest abstraction:

| Layer | Module | Responsibility |
|-------|--------|----------------|
| Tokens | `scripts/theme.js` | Palette, font, slide dimensions, spacing constants |
| Geometry | `scripts/blocks.js` | Layout calculators — returns `{ x, y, w, h }` from content descriptions |
| Components | `scripts/components.js` | Drawing primitives — renders a single element onto a slide |
| Templates | `scripts/slides.js` | Full slide builders — one function call produces one complete slide |

Always work at the **highest layer that fits**. A new deck that uses
existing slide types should only touch the templates layer. A new slide
type that rearranges existing elements uses geometry + components. You
reach for tokens only when introducing a genuinely new design atom.

---

## Planning a deck

Two questions, in order:

1. **What do you want to say?** Write the headline for every slide first.
   Headlines are conclusions, not labels. Someone flipping through the deck
   should get the full story from headlines alone.

2. **Which elements carry each message?** Pick from the template library
   (`slides.cover`, `slides.stats`, `slides.narrativeCards`,
   `slides.roadmap`, `slides.caseStudy`, `slides.closingDiscussionPrompt`,
   `slides.closingNextSteps`, `slides.closingTakeaways`,
   `slides.closingAsk`, etc.).
   Never use the same template on consecutive content slides.

The system is flexible, and you can introduce your own elements too.

---

## Building a deck

Each deck is a **self-contained folder** in the user's project. Copy the
design system modules into it so the deck is reproducible regardless of
future changes to this skill.

### Steps

1. Create a folder for the deck in the user's project:

   ```
   <project>/decks/<deck-name>/
   ```

2. Copy the design system modules into it:

   ```bash
   cp scripts/theme.js scripts/blocks.js scripts/components.js scripts/slides.js \
      <project>/decks/<deck-name>/
   ```

3. Install `pptxgenjs` in the deck folder:

   ```bash
   cd <project>/decks/<deck-name>
   npm init -y && npm install pptxgenjs
   ```

4. Create the deck script at `<project>/decks/<deck-name>/deck.js`:

   ```js
   #!/usr/bin/env node
   const pptxgen = require("pptxgenjs");
   const { W, H } = require("./theme");
   const slides = require("./slides");

   const pres = new pptxgen();
   pres.defineLayout({ name: "BIGSPARK", width: W, height: H });
   pres.layout = "BIGSPARK";

   slides.cover(pres, { /* ... */ });
   // ... more slides ...

   pres.writeFile({ fileName: "deck.pptx" });
   ```

5. Run it:

   ```bash
   node <project>/decks/<deck-name>/deck.js
   ```

The result is a portable folder: zip it, share it, re-run it any time.

### Rules

- **Do not** use ES module syntax (`import`/`export`). These scripts are
  plain CommonJS run directly with `node`.
- **Do not** modify the copied design system files unless you are
  intentionally customising this specific deck.
- **Do not** install additional dependencies unless the deck genuinely
  needs them. The design system is self-contained.

---

## Content rules (bigspark voice)

- Always "bigspark" — never "Bigspark" or "BigSpark".
- No em dashes — use commas, colons, or full stops.
- No filler: "leveraging", "utilising", "going forward", "seamless".
- Outcomes are specific and measurable.
- Uncertain stats: `[TBC: owner to confirm]` — never invent.
- Headlines are takeaways, not labels.
- One idea per slide. Max 4 bullets per card.

---
