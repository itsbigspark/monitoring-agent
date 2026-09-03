---
name: bigspark-excalidraw-diagrams
description: >
  Use this skill when drawing architecture, process, or topology diagrams in
  Excalidraw that will appear in Bigspark decks, briefs, or technical docs.
  Triggers on requests like "diagram the architecture", "draw the data flow",
  "sketch the topology", "build a system diagram", or whenever the bigspark-slides
  skill is producing a deck that needs embedded architecture visuals. Ensures
  diagrams match the deck palette and avoid the common arrow-routing pitfalls.
---

# Bigspark Excalidraw Diagrams Skill

Brand-disciplined architecture diagrams in Excalidraw. Companion to
`bigspark-slides` — the slides skill embeds the PNGs this skill produces.

Never invent colours. Never let arrows pass through labels. Use the patterns
catalogued in `references/patterns.md` for fan-out, layered components, and
perimeter topology.

---

## Palette

Mirror of `bigspark-slides` plus three soft tints for box fills:

| Role | Hex | Usage |
|------|-----|-------|
| Navy stroke | `#040038` | All neutral strokes, labels, body text |
| Red stroke | `#EA4438` | Bigspark-IP elements (catalogue items, our boxes) |
| Purple stroke | `#4a3fb8` | Knowledge / canonical / "Brain"-style elements |
| Red fill tint | `#fce8e6` | Inside Bigspark-IP boxes |
| Blue fill tint | `#e8f0fc` | Inside external-system / data boxes |
| Purple fill tint | `#ece8fc` | Inside knowledge / Brain boxes |
| White fill | `#FFFFFF` | Inside neutral / generic boxes |
| Muted grey | `#808090` | Footnote text, legends, low-emphasis labels |

The colour carries semantic meaning — readers should be able to read role
from colour without consulting a legend. Always include a small legend
anyway, bottom-left, for accessibility.

---

## Arrow routing — the bind-by-id rule

Excalidraw arrows have **two modes**: free-floating (you set `points`) and
bound (you set `startElementId` / `endElementId` on the arrow and Excalidraw
auto-routes to nearest edges).

**Always use bound mode.** Free-floating arrows look wrong the first time
their endpoint moves, and arrow tails that start inside box text (because
the start coordinate was guessed) are a chronic pitfall.

```python
# Excalidraw MCP — bound arrow
{
  "type": "arrow",
  "id": "a_one_brain",
  "x": 760, "y": 180,                # initial vector hint
  "width": 480, "height": 100,
  "strokeColor": "#040038",
  "strokeWidth": 2,
  "endArrowhead": "arrow",
  "startElementId": "the_one_box",   # ← bind
  "endElementId":   "brain_box",     # ← bind
}
```

When you batch-create many arrows in a fan-out, pass the initial vector
hint as a rough direction (positive `width` for right-bound, negative for
left-bound) and let Excalidraw resolve to the actual edge endpoints.

---

## Label placement — never on the arrow path

When an arrow needs a textual annotation ("via MCP", "200ms", "JWT"), place
the label **between** arrows in a Y-junction, **beside** the arrow as a
floating caption, or **off** the diagram entirely in a legend. Never under
or on top of the arrow line — readers can't tell whether the arrow connects
to the label or passes through it.

Three working patterns:

### A. Y-junction label

Two arrows fanning from a single source to two destinations:

```
   [Source]
      |
   [label]   ← label sits ON the centre line, between the two arrows
    /   \
   v     v
 [Dst1] [Dst2]
```

The label is visually inside the V/Y formed by the arrows, never crossed
by either arrow body.

### B. Floating caption beside an arrow

Single arrow with an annotation:

```
   [Source]
      |  ← arrow body
      |   ┌────────────┐
      |   │ annotation │   ← caption to the side, free text, no border
      v   └────────────┘
   [Dst]
```

Caption is a text element with no surrounding box, italic font, small
size (12-14pt), muted-grey colour `#808090` or matching the arrow colour.

### C. Legend in corner

Many arrows / many semantic colours → don't try to label each. Use one
small legend block in the bottom-left:

```
Red = Bigspark IP
Blue = Bank data
Purple = Knowledge
```

---

## When to use Unicode `⇔` over an Excalidraw arrow

For **chunky bidirectional indicators** between sibling components on the
same row, use Unicode `⇔` (U+21D4) as a 48pt text element rather than two
overlapping arrow shapes. Reasons:

- A single glyph reads as one symbol — two arrow shapes read as two events.
- The glyph is symmetric by design — programmatic arrows are not.
- Glyphs scale crisply at any zoom; arrow shapes can pixelate.

```python
{
  "type": "text",
  "id": "x_ui_broker",
  "x": 510, "y": 480,
  "text": "⇔",
  "strokeColor": "#040038",
  "fontSize": 48,
  "fontFamily": 2
}
```

Use bound arrows for **directional** flows (A → B), **labeled** flows
("A → B via X"), or anything **fan-out / fan-in** with > 2 sources or
destinations.

---

## Export conventions

Export to PNG at canvas-native resolution into the deck's `deck-assets/`
directory:

```python
mcp__excalidraw__export_to_image(
    format="png",
    filePath="/abs/path/to/deck-assets/03-fraud-sequence.png",
    background=True,   # set False for diagrams that should blend with
                       # the slide background (no white frame)
)
```

`background=False` produces transparent PNGs that look cleaner on dark
slides but render less well on light slides. Pick one direction per deck.

Filename convention: `NN-short-name.png` where `NN` matches the slide
position in the deck. Makes per-slide diagrams easy to track.

---

## Working with the Excalidraw MCP server

Diagrams are produced live in the canvas at `http://127.0.0.1:7777` via
the Excalidraw MCP tools (`batch_create_elements`, `update_element`,
`export_to_image`, `snapshot_scene`, `restore_snapshot`).

Workflow:

1. `clear_canvas` (or `restore_snapshot` of a previous diagram you want
   to edit).
2. `batch_create_elements` with all rectangles, text, and arrows in one
   call. Arrows reference shapes by `startElementId` / `endElementId`.
3. `describe_scene` to verify the bound resolution.
4. `export_to_image` to PNG.
5. `snapshot_scene` named for the slide it serves
   (e.g. `slide07-fraud-sequence-fixed`) before clearing for the next
   diagram. Snapshots survive server restarts; ad-hoc state does not.

---

## Patterns library

Worked examples for the three most common diagram shapes:

- **Fan-out / fan-in** (one source → many destinations, all converging
  to one synthesis): `references/patterns.md#fan-out`
- **Layered components** (UI / Broker / Brain-style horizontal split
  with bidirectional indicators): `references/patterns.md#layered`
- **Perimeter topology** (dashed boundary lines, "your data, your
  perimeter" visual): `references/patterns.md#perimeter`

---

## Don't

- ❌ Free-floating arrows. Always bind to shape IDs.
- ❌ Labels under or on top of arrow lines. Use Y-junction, beside-caption,
  or legend.
- ❌ Invent colours outside the palette table.
- ❌ Use arrow shapes for symmetric ↔ indicators. Use the Unicode glyph.
- ❌ Export with `background=true` then layer on a navy slide without
  matching the frame. Pick one direction per deck.
- ❌ Skip the snapshot. The canvas server's in-memory state is lost on
  restart; snapshots survive.
