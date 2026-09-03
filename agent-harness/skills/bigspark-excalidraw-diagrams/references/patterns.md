# Pattern library

Three worked examples covering the most common shapes Bigspark
architecture diagrams take. Each shows the layout, the element list,
and the routing decisions that keep arrows out of labels.

---

## Fan-out

One source distributes work to N parallel destinations, all of which
converge to a single result. Canonical example: a coordinator
distributing queries to multiple data sources and synthesising the
responses.

```
                  [Source]
                /  /  |  \  \
               v  v   v   v  v
        [Dst1][Dst2][Dst3][Dst4][Dst5]
               \  \   |   /  /
                v  v  v  v  v
                [Synthesised]
                     |
                     v
                  [Consumer]
```

### Pitfall it avoids

The previous design put a **label box in the middle of the fan-out zone**
(`PARALLEL MCP FAN-OUT` in a styled box, centred under the source). All
five fan-out arrows passed through the label box, obscuring the label
and making the arrows ambiguous.

### Fix

- Drop the styled label box.
- Replace with a small floating caption to the **right** of the source,
  outside the fan zone: `parallel fan-out · ~200ms · N sources`.
- Bind each fan-out arrow with `startElementId=source` and
  `endElementId=destination[i]` so the routing resolves cleanly.

### Element list (5-way fan-out)

```python
# Source
{"type": "rectangle", "id": "source", "x": 520, "y": 100,
 "width": 280, "height": 80, "backgroundColor": "#fce8e6",
 "strokeColor": "#EA4438"}

# Floating caption (no border, right of source)
{"type": "text", "id": "caption", "x": 830, "y": 120,
 "text": "parallel fan-out\n~ 200ms · 5 sources",
 "strokeColor": "#EA4438", "fontSize": 15, "fontFamily": 2}

# Five destinations in a row, evenly spaced
for i in range(5):
    x = 80 + i * 240
    {"type": "rectangle", "id": f"dst{i}", "x": x, "y": 280,
     "width": 200, "height": 130, ...}

# Fan-out arrows (bound)
for i in range(5):
    {"type": "arrow", "id": f"a_src_dst{i}",
     "x": 660, "y": 180,
     "width": (-480 + i * 240), "height": 100,
     "strokeColor": "#040038", "strokeWidth": 2,
     "endArrowhead": "arrow",
     "startElementId": "source",
     "endElementId": f"dst{i}"}

# Synthesis box (wider than any individual destination)
{"type": "rectangle", "id": "synth", "x": 280, "y": 490,
 "width": 760, "height": 150, "backgroundColor": "#fce8e6",
 "strokeColor": "#EA4438"}

# Fan-in arrows (bound)
for i in range(5):
    {"type": "arrow", "id": f"a_dst{i}_synth",
     "x": 80 + i * 240 + 100, "y": 410,
     "width": (..hint..), "height": 80,
     "endArrowhead": "arrow",
     "startElementId": f"dst{i}",
     "endElementId": "synth"}
```

---

## Layered components

Three sibling components on the same row, communicating with each other
via bidirectional flows. Canonical example: a UI / Broker / Backbone
split where the Broker mediates between user-facing and data-facing
layers.

```
+-------------+  ⇔  +-------------+  ⇔  +-------------+
|  Layer A    |     |  Layer B    |     |  Layer C    |
|  (blue)     |     |  (red)      |     |  (purple)   |
+-------------+     +-------------+     +-------------+
```

### Pitfall it avoids

Programmatic double-headed arrows (`startArrowhead: "arrow"`,
`endArrowhead: "arrow"`) render as thin asymmetric lines that read as
"two events" rather than "one relationship." Readers parse them
incorrectly.

### Fix

Use a single Unicode `⇔` glyph (U+21D4) as a 48pt text element between
each pair of layers. Symmetric by design, clearly one symbol.

### Element list

```python
# Three layer boxes, equal width
{"type": "rectangle", "id": "layer_a", "x": 120, "y": 280,
 "width": 380, "height": 460, "backgroundColor": "#e8f0fc",
 "strokeColor": "#040038"}

{"type": "rectangle", "id": "layer_b", "x": 560, "y": 280,
 "width": 380, "height": 460, "backgroundColor": "#fce8e6",
 "strokeColor": "#EA4438"}

{"type": "rectangle", "id": "layer_c", "x": 1000, "y": 280,
 "width": 380, "height": 460, "backgroundColor": "#ece8fc",
 "strokeColor": "#4a3fb8"}

# Bidirectional indicators (Unicode glyphs, not arrows)
{"type": "text", "id": "x_ab", "x": 510, "y": 480,
 "text": "⇔", "fontSize": 48, "strokeColor": "#040038",
 "fontFamily": 2}

{"type": "text", "id": "x_bc", "x": 950, "y": 480,
 "text": "⇔", "fontSize": 48, "strokeColor": "#040038",
 "fontFamily": 2}
```

### Variation — sideband actor above the middle layer

Common addition: an actor / role badge above the middle layer with a
directional arrow into it (e.g., authenticated user injecting JWT into
the broker):

```python
# Actor head (ellipse) + name box
{"type": "ellipse", "id": "actor_head", "x": 730, "y": 110,
 "width": 36, "height": 36, "backgroundColor": "#f0f0f0",
 "strokeColor": "#040038"}

{"type": "rectangle", "id": "actor_box", "x": 670, "y": 155,
 "width": 160, "height": 50, "backgroundColor": "#FFFFFF",
 "strokeColor": "#040038"}

# Directional arrow into the middle layer
{"type": "arrow", "id": "a_actor_layer_b",
 "x": 750, "y": 205, "width": 0, "height": 70,
 "strokeColor": "#EA4438", "strokeWidth": 2,
 "endArrowhead": "arrow",
 "startElementId": "actor_box",
 "endElementId": "layer_b"}
```

---

## Perimeter topology

Two clusters representing internal vs external scope, often with a
"perimeter" visual to indicate data residency. Canonical example: a
"Bigspark MCP catalogue" cluster vs a "Your-data MCPs" cluster, with
the latter inside a dashed perimeter.

```
                [Coordinator]
                  /        \
           via X /          \ via Y
                v            v
   +-----------------+   ╔═════════════════╗
   |  Cluster A      |   ║  Cluster B      ║   (dashed border)
   |  (red, solid)   |   ║  (blue, dashed) ║
   |                 |   ║                 ║
   |  [item][item]   |   ║  [item][item]   ║
   |  [item][item]   |   ║  [item][item]   ║
   |                 |   ║                 ║
   |  ✓ Our IP       |   ║  ✓ Your data    ║
   +-----------------+   ╚═════════════════╝
```

### Pitfall it avoids

A previous design put a `via MCP` styled label box between the
coordinator and the clusters, **on the path of both arrows**. Both
arrows passed through the label box, making the label appear to be
"between" the arrows but visually colliding with them.

### Fix

- Position the `via X` label **inside the V** formed by the two arrows
  fanning to the clusters (Y-junction style).
- Each cluster border carries its own visual code: solid stroke for
  "ours" (red), dashed stroke for "theirs" (blue). The dashed border
  is the perimeter indicator.

### Element list

```python
# Coordinator
{"type": "rectangle", "id": "coord", "x": 560, "y": 60,
 "width": 280, "height": 100, "backgroundColor": "#fce8e6",
 "strokeColor": "#EA4438"}

# Y-junction label — sits BETWEEN the arrows that fan to clusters
{"type": "text", "id": "via_label", "x": 670, "y": 195,
 "text": "via X", "strokeColor": "#040038",
 "fontSize": 13, "fontFamily": 2}

# Left cluster — solid red border ("ours")
{"type": "rectangle", "id": "cluster_a", "x": 60, "y": 280,
 "width": 700, "height": 500, "backgroundColor": "#fce8e6",
 "strokeColor": "#EA4438"}

# Right cluster — dashed blue border ("theirs, inside perimeter")
{"type": "rectangle", "id": "cluster_b", "x": 790, "y": 280,
 "width": 700, "height": 500, "backgroundColor": "#e8f0fc",
 "strokeColor": "#040038", "strokeStyle": "dashed"}

# Fan-out arrows — bound, colour-coded
{"type": "arrow", "id": "a_coord_cluster_a",
 "x": 700, "y": 160, "width": -290, "height": 120,
 "strokeColor": "#EA4438", "strokeWidth": 2,
 "endArrowhead": "arrow",
 "startElementId": "coord", "endElementId": "cluster_a"}

{"type": "arrow", "id": "a_coord_cluster_b",
 "x": 700, "y": 160, "width": 440, "height": 120,
 "strokeColor": "#040038", "strokeWidth": 2,
 "endArrowhead": "arrow",
 "startElementId": "coord", "endElementId": "cluster_b"}
```

---

## Sizing reference

| Element | Typical size |
|---------|--------------|
| Source / coordinator box | 280 × 80 |
| Destination / leaf box | 200 × 130 (for content) or 200 × 50 (for label only) |
| Cluster outer box | 700 × 500 |
| Layer box (in 3-layer row) | 380 × 460 |
| Arrow stroke width | 2 |
| `⇔` glyph font size | 48 |
| Floating caption font size | 13–15 |
| Legend font size | 11 |

Canvas is typically 1500 × 800 (matches a 16:9 slide diagram area at
high resolution). Adjust uniformly if you need a different target size;
proportions matter more than absolute pixels.
