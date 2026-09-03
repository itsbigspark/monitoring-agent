/**
 * bigspark-slides blocks — organisms layer.
 *
 * Pure layout computation functions that derive x/y/w/h from content
 * descriptions. No pptxgenjs dependency — this module only computes geometry.
 * Arranges components into larger structures (grids, stacks, split panels).
 *
 * Usage:
 *   const B = require("./blocks");
 *   const cols = B.distribute(4, { total: contentW, gap: 0.09 });
 */
const { DEFAULTS } = require("./theme");

// ---- Shared utility -------------------------------------------------------

/**
 * Select adaptive font sizes from a tiered lookup.
 *
 * Each tier is [threshold, fontsObject]. The first tier whose threshold
 * is ≤ measure wins. The final entry should use threshold 0 as the fallback.
 *
 * Used by 7 layout functions to scale fonts to available space.
 *
 * @param {number} measure        The dimension to test (item width, row height, etc.)
 * @param {Array<[number, object]>} tiers  Ordered largest-first: [[threshold, fonts], ...]
 * @returns {object}  The matching fonts object
 */
function adaptiveFonts(measure, tiers) {
  for (const [threshold, fonts] of tiers) {
    if (measure >= threshold) return fonts;
  }
  return tiers[tiers.length - 1][1];
}

// ---- Core geometry functions ----------------------------------------------

/**
 * Distribute N items evenly across a total width (or height).
 *
 * @param {number} n         Number of items
 * @param {object} opts
 * @param {number} opts.total   Available space (defaults to W - 2*MARGIN)
 * @param {number} opts.gap     Gap between items (default 0.09)
 * @param {number} opts.start   Starting offset (default MARGIN)
 * @returns {Array<{x: number, w: number}>}  Position and width for each item
 */
function distribute(n, opts = {}) {
  const {
    total = DEFAULTS.W - DEFAULTS.MARGIN * 2,
    gap = DEFAULTS.CARD_GAP,
    start = DEFAULTS.MARGIN,
  } = opts;

  const itemW = (total - gap * (n - 1)) / n;
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({
      x: start + i * (itemW + gap),
      w: itemW,
    });
  }

  // Recommend body font size based on item width
  items.fonts = adaptiveFonts(itemW, [
    [2.8, { title: 12, body: 10.5, stat: 36 }],
    [2.0, { title: 12, body: 10, stat: 36 }],
    [1.4, { title: 11, body: 9.5, stat: 28 }],
    [0,   { title: 10, body: 9, stat: 22 }],
  ]);

  return items;
}

/**
 * Distribute items vertically within a region, flush to top with gaps between.
 * Optionally auto-sizes heights to fill remaining space.
 *
 * @param {Array<{h?: number, flex?: number}>} items  Each item has a fixed h OR a flex weight
 * @param {object} opts
 * @param {number} opts.top       Y position to start stacking (default CONTENT_TOP)
 * @param {number} opts.bottom    Y position of the bottom boundary (default H - BOTTOM_PAD)
 * @param {number} opts.gap       Gap between items (default 0.09)
 * @returns {Array<{y: number, h: number}>}
 */
function distributeVertically(items, opts = {}) {
  const {
    top = DEFAULTS.CONTENT_TOP,
    bottom = DEFAULTS.H - DEFAULTS.BOTTOM_PAD,
    gap = DEFAULTS.CARD_GAP,
  } = opts;

  const totalSpace = bottom - top;
  const gapSpace = gap * (items.length - 1);
  const fixedSpace = items.reduce((sum, it) => sum + (it.h || 0), 0);
  const flexTotal = items.reduce((sum, it) => sum + (it.flex || 0), 0);
  const flexSpace = totalSpace - gapSpace - fixedSpace;

  const result = [];
  let y = top;
  for (const item of items) {
    const h = item.h || (item.flex / flexTotal) * flexSpace;
    result.push({ y, h });
    y += h + gap;
  }
  return result;
}

/**
 * Distribute N blocks with N+1 equal surrounding gaps (equidistant spacing).
 *
 * Unlike distributeVertically() (which places items flush to top with gaps only between),
 * distributeVerticallyEqualGaps() floats items so that the space above the first item,
 * between each pair, and below the last item are all identical.
 *
 * Supports two modes:
 *   1. All items the same height (pass `itemH`) — simplest, most common.
 *   2. Items with individual heights (pass array of `{h}` objects) — the gap
 *      is computed from the total remaining space after subtracting all heights.
 *
 * @param {number|Array<{h: number}>} items
 *        Either a count (number) when all items share the same height,
 *        or an array of {h} objects for variable heights.
 * @param {object} opts
 * @param {number} opts.top       Y start of the region (default CONTENT_TOP)
 * @param {number} opts.bottom    Y end of the region (default H - BOTTOM_PAD)
 * @param {number} [opts.itemH]   Uniform item height (required when items is a number)
 * @param {number} [opts.ratio]   Items occupy this fraction of space (default 0.6);
 *                                used to derive itemH when neither itemH nor per-item
 *                                heights are provided. Ignored if itemH is set.
 * @returns {{items: Array<{y: number, h: number}>, gap: number}}
 */
function distributeVerticallyEqualGaps(items, opts = {}) {
  const {
    top = DEFAULTS.CONTENT_TOP,
    bottom = DEFAULTS.H - DEFAULTS.BOTTOM_PAD,
    itemH: explicitItemH,
    ratio = 0.6,
  } = opts;

  const totalSpace = bottom - top;

  // Normalise: either count + uniform height, or array of {h}
  let n, heights;
  if (typeof items === "number") {
    n = items;
    const h = explicitItemH != null ? explicitItemH : (totalSpace * ratio) / n;
    heights = Array(n).fill(h);
  } else {
    n = items.length;
    heights = items.map(it => it.h);
  }

  const usedSpace = heights.reduce((sum, h) => sum + h, 0);
  const gap = (totalSpace - usedSpace) / (n + 1);

  const result = [];
  let y = top + gap;
  for (let i = 0; i < n; i++) {
    result.push({ y, h: heights[i] });
    y += heights[i] + gap;
  }
  return { items: result, gap };
}

/**
 * Define a content region — the usable rectangle below label/headline.
 *
 * @param {object} opts
 * @param {number} opts.top        Where content starts (default CONTENT_TOP)
 * @param {number} opts.bottom     Bottom boundary (default H - BOTTOM_PAD)
 * @param {number} opts.left       Left edge (default MARGIN)
 * @param {number} opts.right      Right edge (default W - MARGIN)
 * @returns {{x: number, y: number, w: number, h: number}}
 */
function contentRegion(opts = {}) {
  const {
    top = DEFAULTS.CONTENT_TOP,
    bottom = DEFAULTS.H - DEFAULTS.BOTTOM_PAD,
    left = DEFAULTS.MARGIN,
    right = DEFAULTS.W - DEFAULTS.MARGIN,
  } = opts;
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * Compute a grid of card positions (N columns × M rows).
 *
 * @param {number} cols     Number of columns
 * @param {number} rows     Number of rows (default 1)
 * @param {object} opts
 * @param {object} opts.region  Bounding region {x, y, w, h}
 * @param {number} opts.gapX   Horizontal gap (default CARD_GAP)
 * @param {number} opts.gapY   Vertical gap (default CARD_GAP)
 * @returns {Array<{x: number, y: number, w: number, h: number}>}  Flat array, row-major
 */
function cardGrid(cols, rows = 1, opts = {}) {
  const region = opts.region || contentRegion();
  const gapX = opts.gapX != null ? opts.gapX : DEFAULTS.CARD_GAP;
  const gapY = opts.gapY != null ? opts.gapY : DEFAULTS.CARD_GAP;

  const cardW = (region.w - gapX * (cols - 1)) / cols;
  const cardH = (region.h - gapY * (rows - 1)) / rows;

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: region.x + c * (cardW + gapX),
        y: region.y + r * (cardH + gapY),
        w: cardW,
        h: cardH,
      });
    }
  }
  return cells;
}

/**
 * Estimate the height needed for a text block given content + font size.
 *
 * Uses an empirical model: in Montserrat at a given pt size, a character is
 * roughly (fontSize * 0.6 / 72) inches wide. Line height is fontSize * 1.3 / 72.
 * We calculate how many lines wrap in the given width, then return the total height.
 *
 * @param {string|string[]} text    Text content (or array of lines/bullets)
 * @param {object} opts
 * @param {number} opts.fontSize    Font size in pt (default 10.5)
 * @param {number} opts.width       Available text width in inches (default W - 2*MARGIN)
 * @param {number} opts.lineSpacing Multiplier for line height (default 1.35)
 * @param {number} opts.paraSpacing Extra space between paragraphs/bullets in inches (default 0.04)
 * @returns {number}  Estimated height in inches
 */
function textHeight(text, opts = {}) {
  if (!text || (Array.isArray(text) && text.length === 0)) return 0;
  if (typeof text === "string" && text.trim() === "") return 0;

  const {
    fontSize = 10.5,
    width = DEFAULTS.W - DEFAULTS.MARGIN * 2,
    lineSpacing = 1.35,
    paraSpacing = 0.04,
  } = opts;

  const charWidthInches = fontSize * 0.6 / 72;
  const lineH = fontSize * lineSpacing / 72;
  const charsPerLine = Math.floor(width / charWidthInches);

  const paragraphs = Array.isArray(text) ? text : text.split("\n");
  let totalLines = 0;

  for (const para of paragraphs) {
    if (para.length === 0) { totalLines += 1; continue; }
    totalLines += Math.ceil(para.length / charsPerLine);
  }

  const textH = totalLines * lineH + (paragraphs.length - 1) * paraSpacing;
  return Math.round(textH * 100) / 100; // round to 2 decimal places
}

/**
 * Compute a "narrative box + cards below" layout.
 * Returns positions for the narrative box and an array of card positions.
 *
 * @param {object} opts
 * @param {string|string[]} opts.narrativeText  Text in the narrative box (for height calc)
 * @param {number} opts.narrativeFontSize       Font size in narrative (default 10.5)
 * @param {number} opts.narrativeMinH           Minimum narrative box height (default 0.8)
 * @param {boolean} opts.hasHeadline            Whether the box has a headline above the body (default false)
 * @param {number} opts.headlineH               Height consumed by the headline + gap (default 0.44)
 * @param {number} opts.cols                    Number of cards (default 4)
 * @param {number} opts.top                     Start y (default CONTENT_TOP)
 * @param {number} opts.gap                     Gap between narrative and cards (default 0.16)
 * @returns {{narrative: {x, y, w, h}, cards: Array<{x, y, w, h}>}}
 */
function narrativeAndCards(opts = {}) {
  const {
    narrativeText = "",
    narrativeFontSize = 10.5,
    narrativeMinH = 0.8,
    hasHeadline = false,
    headlineH = 0.44,
    cols = 4,
    top = DEFAULTS.CONTENT_TOP,
    bottom = DEFAULTS.H - DEFAULTS.BOTTOM_PAD,
    gap = 0.18,
  } = opts;

  const totalW = DEFAULTS.W - DEFAULTS.MARGIN * 2;
  const innerWidth = totalW - 0.4; // padding inside narrative box

  // Calculate narrative height from content
  const textH = textHeight(narrativeText, { fontSize: narrativeFontSize, width: innerWidth });
  const contentH = textH + 0.36 + (hasHeadline ? headlineH : 0); // internal padding + optional headline
  const narrativeH = Math.max(narrativeMinH, contentH);

  const narrative = {
    x: DEFAULTS.MARGIN,
    y: top,
    w: totalW,
    h: narrativeH,
  };

  // Cards fill the remaining space
  const cardsTop = top + narrativeH + gap;
  const cardsH = bottom - cardsTop;
  const cardRegion = { x: DEFAULTS.MARGIN, y: cardsTop, w: totalW, h: cardsH };
  const cards = cardGrid(cols, 1, { region: cardRegion });

  return { narrative, cards };
}

/**
 * Compute roadmap phase columns with a chip footer.
 *
 * @param {number} n            Number of phases
 * @param {object} opts
 * @param {number} opts.top        Content top (default CONTENT_TOP)
 * @param {number} opts.chipH      Height of the price/status chip (default 0.42)
 * @param {number} opts.chipGap    Gap between card bottom and chip (default 0.08)
 * @param {number} opts.gap        Gap between columns (default CARD_GAP)
 * @param {number} opts.footerH    Space reserved for footer note below chips (default 0.28)
 * @returns {{columns: Array<{x, y, w, h}>, chips: Array<{x, y, w, h}>, fonts: object}}
 */
function roadmapColumns(n, opts = {}) {
  const {
    top = DEFAULTS.CONTENT_TOP,
    chipH = 0.42,
    chipGap = 0.08,
    gap = DEFAULTS.CARD_GAP,
    footerH = 0.28,
  } = opts;

  const totalW = DEFAULTS.W - DEFAULTS.MARGIN * 2;
  const colW = (totalW - gap * (n - 1)) / n;

  // Cards fill from top to above the chip
  const bottom = DEFAULTS.H - footerH;
  const cardH = bottom - top - chipH - chipGap;

  const columns = [];
  const chips = [];
  for (let i = 0; i < n; i++) {
    const x = DEFAULTS.MARGIN + i * (colW + gap);
    columns.push({ x, y: top, w: colW, h: cardH });
    chips.push({ x, y: top + cardH + chipGap, w: colW, h: chipH });
  }

  // Recommend font sizes based on column width
  const fonts = adaptiveFonts(colW, [
    [2.0, { num: 36, duration: 9, title: 12, body: 9.5, price: 14 }],
    [1.4, { num: 28, duration: 8.5, title: 11, body: 9, price: 12 }],
    [0,   { num: 22, duration: 8, title: 10, body: 8.5, price: 11 }],
  ]);

  return { columns, chips, fonts };
}

/**
 * Compute inner zones within a roadmap column: number, duration, title, divider, body.
 *
 * @param {{x, y, w, h}} col    Column bounds from roadmapColumns()
 * @param {object} opts
 * @param {number} opts.padX        Horizontal padding (default 0.12)
 * @param {number} opts.numH        Height for phase number area (default 0.56)
 * @param {number} opts.titleH      Height for phase title (default 0.38)
 * @param {number} opts.dividerGap  Space above/below the divider line (default 0.04)
 * @returns {{num, duration, title, divider, body}}  Each has {x, y, w, h}
 */
function roadmapCardInner(col, opts = {}) {
  const {
    padX = 0.12,
    dividerGap = 0.04,
  } = opts;

  const innerX = col.x + padX;
  const innerW = col.w - padX * 2;

  // Adaptive zone heights: scale number and title regions proportionally
  // to the column's available interior height, reserving majority for body.
  const topPad = 0.1;
  const botPad = 0.1;
  const interiorH = col.h - topPad - botPad;

  // Number region: 16% of interior (was fixed 0.56)
  // Title region: 11% of interior (was fixed 0.38)
  // These proportions give the body ~65% of the column
  const numH = Math.min(interiorH * 0.16, 0.56);
  const titleH = Math.min(interiorH * 0.11, 0.38);

  // Number + duration sit on the same row
  const numY = col.y + topPad;
  const num = { x: innerX, y: numY, w: 0.5, h: numH };
  const duration = { x: col.x + 0.66, y: numY + numH * 0.2, w: col.w - 0.78, h: 0.24 };

  // Title below number
  const titleY = numY + numH + 0.04;
  const title = { x: innerX, y: titleY, w: innerW, h: titleH };

  // Divider line
  const dividerY = titleY + titleH + dividerGap;
  const divider = { x: innerX, y: dividerY, w: innerW, h: 0.01 };

  // Body fills remaining space
  const bodyY = dividerY + 0.01 + dividerGap + 0.02;
  const bodyH = col.y + col.h - bodyY - botPad;
  const body = { x: innerX, y: bodyY, w: innerW, h: Math.max(bodyH, 0.3) };

  return { num, duration, title, divider, body };
}

/**
 * Compute the closing slide layout: teal bar, N statements, divider,
 * question, and M follow-up cards at the bottom.
 *
 * Dynamically sizes statement rows and follow-up cards based on count.
 * Statement font size scales down with count (18pt for 3, 15pt for 5).
 *
 * @param {number} statementCount   Number of "We..." statements (default 3)
 * @param {number} followupCount    Number of follow-up cards (default 4)
 * @param {object} opts
 * @returns {{bar, statements, divider, question, cards, contentLeft, contentW, fonts}}
 */
function closingLayout(statementCount = 3, followupCount = 4, opts = {}) {
  // Adaptive sizing: shrink statement rows as count grows
  const defaultStatementH = statementCount <= 3 ? 0.52 : statementCount === 4 ? 0.44 : 0.38;
  const defaultStatementGap = statementCount <= 3 ? 0.02 : 0.01;

  const {
    barW = DEFAULTS.CLOSING_BAR_W,
    statementsTop = DEFAULTS.CLOSING_TOP + 0.16,
    statementH = defaultStatementH,
    statementGap = defaultStatementGap,
    questionH = 0.4,
    dividerGap = statementCount <= 3 ? 0.16 : 0.12,
    cardGap = DEFAULTS.CARD_GAP,
  } = opts;

  const contentLeft = DEFAULTS.MARGIN + barW;
  const contentW = DEFAULTS.W - DEFAULTS.MARGIN - barW - 0.2; // right margin

  // Bar
  const bar = { x: 0, y: 0, w: barW, h: DEFAULTS.H };

  // Statements
  const statements = [];
  for (let i = 0; i < statementCount; i++) {
    statements.push({
      y: statementsTop + i * (statementH + statementGap),
      h: statementH,
    });
  }

  // Divider below last statement
  const lastStatBottom = statementsTop + statementCount * (statementH + statementGap) - statementGap;
  const dividerY = lastStatBottom + dividerGap;
  const divider = { y: dividerY };

  // Question below divider
  const questionY = dividerY + 0.02 + dividerGap;
  const question = { y: questionY, h: questionH };

  // Follow-up cards fill remaining space
  const cardsTop = questionY + questionH + 0.1;
  const cardsH = DEFAULTS.H - DEFAULTS.BOTTOM_PAD - cardsTop;
  const cardW = (DEFAULTS.W - DEFAULTS.MARGIN * 2 - barW - cardGap * (followupCount - 1)) / followupCount;

  const cards = [];
  for (let i = 0; i < followupCount; i++) {
    cards.push({
      x: contentLeft + i * (cardW + cardGap),
      y: cardsTop,
      w: cardW,
      h: cardsH,
    });
  }

  return {
    bar,
    statements,
    divider,
    question,
    cards,
    contentLeft,
    contentW,
    // Adaptive font sizes based on statement count
    fonts: {
      statement: statementCount <= 3 ? 18 : statementCount === 4 ? 16 : 14,
    },
  };
}

/**
 * Compute vertical positions for stacking sections inside a box.
 * Use for case-study left panel (Challenge / Approach / Why It Matters).
 *
 * @param {Array<{heading: string, body: string}>} sections
 * @param {object} opts
 * @param {number} opts.top           Y start inside the box
 * @param {number} opts.width         Available text width
 * @param {number} opts.headingSize   Heading font size (default 11)
 * @param {number} opts.bodySize      Body font size (default 10.5)
 * @param {number} opts.sectionGap    Gap between sections (default 0.14)
 * @returns {Array<{headingY: number, bodyY: number, bodyH: number}>}
 */
function sectionStack(sections, opts = {}) {
  const {
    top = 0,
    width = 4,
    headingSize = 11,
    bodySize = 10.5,
    sectionGap = 0.14,
  } = opts;

  const headingH = 0.28;
  const headingBodyGap = 0.04;
  const result = [];
  let y = top;

  for (const section of sections) {
    const headingY = y;
    const bodyY = y + headingH + headingBodyGap;
    const bodyH = textHeight(section.body, { fontSize: bodySize, width });
    result.push({ headingY, bodyY, bodyH: Math.max(bodyH, 0.4) });
    y = bodyY + Math.max(bodyH, 0.4) + sectionGap;
  }

  return result;
}

/**
 * Compute slide header geometry: label + headline sized to content.
 * Returns the Y position where slide content should begin.
 *
 * @param {string} headlineText   The headline string (may contain \n)
 * @param {object} opts
 * @param {number} opts.labelY        Y position for the label (default 0.28)
 * @param {number} opts.headlineY     Y position for the headline (default 0.56)
 * @param {number} opts.fontSize      Headline font size in pt (default 26)
 * @param {number} opts.width         Available headline width (default W - 2*MARGIN)
 * @param {number} opts.gap           Space between headline bottom and content (default 0.22)
 * @param {number} opts.minHeadlineH  Minimum headline height (default 0.5)
 * @returns {{labelY: number, headlineY: number, headlineH: number, contentTop: number}}
 */
function slideHeader(headlineText, opts = {}) {
  const {
    labelY = DEFAULTS.LABEL_Y,
    headlineY = DEFAULTS.HEADLINE_Y,
    fontSize = 26,
    width = DEFAULTS.W - DEFAULTS.MARGIN * 2,
    gap = 0.22,
    minHeadlineH = 0.5,
  } = opts;

  const rawH = textHeight(headlineText, {
    fontSize,
    width,
    lineSpacing: 1.25, // headlines are tighter than body text
  });
  const headlineH = Math.max(minHeadlineH, rawH + 0.1); // +0.1 for descenders/padding
  const contentTop = headlineY + headlineH + gap;

  return { labelY, headlineY, headlineH, contentTop };
}

// ---- Footer geometry ----------------------------------------------------

/**
 * Compute footer geometry and the adjusted content bottom boundary.
 *
 * When a footer is present, content must end higher to make room.
 * When no footer, returns the standard bottom boundary (H - BOTTOM_PAD).
 *
 * @param {string|null} footerText   Footer text (null/undefined = no footer)
 * @param {object} opts
 * @param {number} opts.footerH      Total height reserved for footer (default 0.34)
 * @param {number} opts.fontSize     Footer font size (default 8)
 * @param {number} opts.gap          Gap between content bottom and footer text (default 0.08)
 * @returns {{hasFooter: boolean, contentBottom: number, footerY: number, footerH: number, fontSize: number}}
 */
function slideFooter(footerText, opts = {}) {
  const {
    footerH = 0.40,
    fontSize = 8,
    gap = 0.08,
  } = opts;

  if (!footerText) {
    return {
      hasFooter: false,
      contentBottom: DEFAULTS.H - DEFAULTS.BOTTOM_PAD,
      footerY: 0,
      footerH: 0,
      fontSize,
    };
  }

  const footerY = DEFAULTS.H - footerH + 0.06; // slight inset from absolute bottom
  const contentBottom = DEFAULTS.H - footerH - gap;

  return {
    hasFooter: true,
    contentBottom,
    footerY,
    footerH: 0.2, // text box height
    fontSize,
  };
}

// ---- Comparison Table layout --------------------------------------------

/**
 * Compute row positions for a two-column comparison table (problem → solution).
 *
 * Adapts font size and row height to fit N rows. Each row has a left cell,
 * arrow separator, and right cell.
 *
 * @param {number} n            Number of rows
 * @param {object} opts
 * @param {number} opts.top        Content start Y (default CONTENT_TOP)
 * @param {number} opts.bottom     Content end Y (default H - BOTTOM_PAD)
 * @param {number} opts.headerH    Height of the column headers row (default 0.28)
 * @param {number} opts.headerGap  Gap below headers (default 0.1)
 * @param {number} opts.rowGap     Gap between rows (default 0.06)
 * @param {number} opts.arrowW     Width of the arrow separator (default 0.3)
 * @param {number} opts.splitRatio Fraction of usable width for left column (default 0.45)
 * @returns {{headers: {leftX, rightX, y, leftW, rightW, h}, rows: Array<{y, h}>, leftX, rightX, arrowX, leftW, rightW, arrowW, fonts}}
 */
function comparisonTableLayout(n, opts = {}) {
  const {
    top = DEFAULTS.CONTENT_TOP,
    bottom = DEFAULTS.H - DEFAULTS.BOTTOM_PAD,
    headerH = 0.28,
    headerGap = 0.1,
    rowGap = DEFAULTS.TABLE_ROW_GAP,
    arrowW = 0.3,
    splitRatio = 0.45,
  } = opts;

  const totalW = DEFAULTS.W - DEFAULTS.MARGIN * 2;
  const usableW = totalW - arrowW;
  const leftW = usableW * splitRatio;
  const rightW = usableW * (1 - splitRatio);

  const leftX = DEFAULTS.MARGIN;
  const arrowX = leftX + leftW;
  const rightX = arrowX + arrowW;

  // Row geometry — use distributeVertically() for uniform flush-top distribution
  const rowsTop = top + headerH + headerGap;
  const rowItems = Array(n).fill({ flex: 1 });
  const rows = distributeVertically(rowItems, { top: rowsTop, bottom, gap: rowGap });

  // Adaptive font sizes
  const fonts = adaptiveFonts(rows[0].h, [
    [0.6,  { header: 9, body: 10.5, arrow: 14 }],
    [0.45, { header: 8.5, body: 10, arrow: 12 }],
    [0.35, { header: 8, body: 9.5, arrow: 11 }],
    [0,    { header: 7.5, body: 9, arrow: 10 }],
  ]);

  return {
    headers: { leftX, rightX, y: top, leftW, rightW, h: headerH },
    rows,
    leftX,
    rightX,
    arrowX,
    leftW,
    rightW,
    arrowW,
    fonts,
  };
}

// ---- Process Grid layout ------------------------------------------------

/**
 * Compute positions for a numbered process/lifecycle grid.
 *
 * Always two rows. Column count derived from step count (3–5 cols):
 *   6 steps → 3×2, 7–8 steps → 4×2, 9–10 steps → 5×2.
 * Each cell contains a number, title, and description. Adaptive font sizing.
 *
 * @param {number} n            Number of steps (6–10)
 * @param {object} opts
 * @param {number} opts.top        Content start Y (default CONTENT_TOP)
 * @param {number} opts.bottom     Content end Y (default H - BOTTOM_PAD)
 * @param {number} opts.cols       Force column count (otherwise derived from n)
 * @param {number} opts.gapX       Horizontal gap (default CARD_GAP)
 * @param {number} opts.gapY       Vertical gap (default 0.14)
 * @param {number} opts.minCellH   Minimum cell height (content-derived floor from caller).
 *                                 When the natural 50/50 split produces shorter cells than
 *                                 this value, the grid expands to honour the floor and the
 *                                 caller should use centreInSlot to position capped cells.
 * @returns {{cells: Array<{x, y, w, h}>, cols: number, rows: number, fonts: object}}
 */
function processGridLayout(n, opts = {}) {
  const {
    top = DEFAULTS.CONTENT_TOP,
    bottom = DEFAULTS.H - DEFAULTS.BOTTOM_PAD,
    cols: forcedCols,
    gapX = DEFAULTS.CARD_GAP,
    gapY = DEFAULTS.GRID_GAP_Y,
    minCellH = 0,
  } = opts;

  // Always 2 rows; cols derived from count (3–5 columns)
  const rows = 2;
  const cols = forcedCols || Math.ceil(n / rows);

  const totalW = DEFAULTS.W - DEFAULTS.MARGIN * 2;
  const totalH = bottom - top;

  const cellW = (totalW - gapX * (cols - 1)) / cols;
  // Honour content-derived floor: if minCellH exceeds the natural even split,
  // use minCellH (cells will overlap the bottom boundary only in extreme cases;
  // in practice the content measurement keeps it sane).
  const naturalCellH = (totalH - gapY * (rows - 1)) / rows;
  const cellH = Math.max(naturalCellH, minCellH);

  const cells = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    cells.push({
      x: DEFAULTS.MARGIN + col * (cellW + gapX),
      y: top + row * (cellH + gapY),
      w: cellW,
      h: cellH,
    });
  }

  // Adaptive font sizes based on cell dimensions
  const fonts = adaptiveFonts(cellW, [
    [2.0, { num: 28, title: 11, body: 9.5 }],
    [1.5, { num: 24, title: 10.5, body: 9 }],
    [0,   { num: 20, title: 10, body: 8.5 }],
  ]);

  return { cells, cols, rows, fonts };
}

// ---- Case Study layout --------------------------------------------------

/**
 * Compute a case study layout: narrative left with stacked sections,
 * outcomes right with stat rows.
 *
 * @param {number} sectionCount    Number of sections on the left (e.g. 3: Challenge, Approach, Why)
 * @param {number} outcomeCount    Number of outcome rows on the right
 * @param {object} opts
 * @param {number} opts.top           Content start Y (default CONTENT_TOP)
 * @param {number} opts.bottom        Content end Y (default H - BOTTOM_PAD)
 * @param {number} opts.splitRatio    Left column fraction (default 0.52)
 * @param {number} opts.gap           Gap between left and right columns (default 0.2)
 * @param {number} opts.outcomeLabelH Height for the "OUTCOMES" label (default 0.3)
 * @returns {{left: {x, y, w, h}, right: {x, y, w, h}, outcomeLabel: {x, y, w, h}, outcomes: Array<{y, h}>, fonts: object}}
 */
function caseStudyLayout(sectionCount, outcomeCount, opts = {}) {
  const {
    top = DEFAULTS.CONTENT_TOP,
    bottom = DEFAULTS.H - DEFAULTS.BOTTOM_PAD,
    splitRatio = 0.52,
    gap = 0.2,
    outcomeLabelH = 0.3,
  } = opts;

  const totalW = DEFAULTS.W - DEFAULTS.MARGIN * 2;
  const leftW = totalW * splitRatio - gap / 2;
  const rightW = totalW * (1 - splitRatio) - gap / 2;
  const h = bottom - top;

  const left = { x: DEFAULTS.MARGIN, y: top, w: leftW, h };
  const rightX = DEFAULTS.MARGIN + leftW + gap;
  const right = { x: rightX, y: top, w: rightW, h };

  // Outcome label above outcome rows
  const outcomeLabel = { x: rightX, y: top, w: rightW, h: outcomeLabelH };

  // Outcome rows fill below the label
  const outcomesTop = top + outcomeLabelH;
  const outcomesH = h - outcomeLabelH;
  const rowGap = DEFAULTS.TABLE_ROW_GAP;
  const outcomeItems = Array(outcomeCount).fill({ flex: 1 });
  const outcomes = distributeVertically(outcomeItems, { top: outcomesTop, bottom: outcomesTop + outcomesH, gap: rowGap });

  // Adaptive fonts based on outcome row height
  const fonts = adaptiveFonts(outcomes[0].h, [
    [0.7, { stat: 18, label: 11, sectionHeading: 11, sectionBody: 10.5 }],
    [0.5, { stat: 15, label: 10, sectionHeading: 11, sectionBody: 10 }],
    [0,   { stat: 13, label: 9.5, sectionHeading: 10, sectionBody: 9.5 }],
  ]);

  return { left, right, outcomeLabel, outcomes, fonts };
}

// ---- Product Deep-Dive layout -------------------------------------------

/**
 * Compute a two-section product deep-dive layout: headline + lead text,
 * then two named sections each with a row of cards.
 *
 * @param {number} cardsPerSection   Number of cards per section (default 3)
 * @param {object} opts
 * @param {number} opts.top            Content start Y (default CONTENT_TOP)
 * @param {number} opts.bottom         Content end Y (default H - BOTTOM_PAD)
 * @param {number} opts.leadH          Height of the lead paragraph (default 0.28)
 * @param {number} opts.sectionLabelH  Height of section sub-headings (default 0.24)
 * @param {number} opts.sectionGap     Gap between sections (default 0.12)
 * @param {number} opts.cardGap        Gap between cards (default CARD_GAP)
 * @returns {{lead: {x, y, w, h}, sections: Array<{label: {x, y, w, h}, cards: Array<{x, y, w, h}>}>, fonts: object}}
 */
function productDeepDiveLayout(cardsPerSection = 3, opts = {}) {
  const {
    top = DEFAULTS.CONTENT_TOP,
    bottom = DEFAULTS.H - DEFAULTS.BOTTOM_PAD,
    leadH = 0.28,
    sectionLabelH = 0.24,
    sectionGap = 0.12,
    cardGap = DEFAULTS.CARD_GAP,
  } = opts;

  const totalW = DEFAULTS.W - DEFAULTS.MARGIN * 2;
  const totalH = bottom - top;

  // Lead text
  const lead = { x: DEFAULTS.MARGIN, y: top, w: totalW, h: leadH };

  // Available space for the two sections (after lead)
  const sectionsTop = top + leadH + sectionGap;
  const sectionsH = bottom - sectionsTop;

  // Each section = label + card row, two sections stacked
  const singleSectionH = (sectionsH - sectionGap) / 2;
  const cardH = singleSectionH - sectionLabelH - 0.04; // 0.04 gap below label

  const cardW = (totalW - cardGap * (cardsPerSection - 1)) / cardsPerSection;

  const sections = [];
  for (let s = 0; s < 2; s++) {
    const sectionY = sectionsTop + s * (singleSectionH + sectionGap);
    const label = { x: DEFAULTS.MARGIN, y: sectionY, w: totalW, h: sectionLabelH };
    const cardsY = sectionY + sectionLabelH + 0.04;

    const cards = [];
    for (let c = 0; c < cardsPerSection; c++) {
      cards.push({
        x: DEFAULTS.MARGIN + c * (cardW + cardGap),
        y: cardsY,
        w: cardW,
        h: cardH,
      });
    }
    sections.push({ label, cards });
  }

  // Adaptive fonts based on card width
  const fonts = adaptiveFonts(cardW, [
    [2.8, { lead: 10.5, sectionLabel: 9, cardTitle: 12, cardBody: 10 }],
    [2.0, { lead: 10, sectionLabel: 8.5, cardTitle: 11, cardBody: 9.5 }],
    [0,   { lead: 9.5, sectionLabel: 8, cardTitle: 10, cardBody: 9 }],
  ]);

  return { lead, sections, fonts };
}

// ---- Proof Points layout ------------------------------------------------

/**
 * Compute a proof-points layout: lead text + N cards in a grid (2 cols).
 *
 * Each card is large enough for a headline and several sentences. Uses
 * a 2-column grid with 1 or 2 rows depending on count.
 *
 * @param {number} n            Number of proof point cards (2–6)
 * @param {object} opts
 * @param {number} opts.top        Content start Y (default CONTENT_TOP)
 * @param {number} opts.bottom     Content end Y (default H - BOTTOM_PAD)
 * @param {number} opts.leadH      Height of the lead paragraph (default 0.28)
 * @param {number} opts.leadGap    Gap below lead before cards (default 0.12)
 * @param {number} opts.cols       Number of columns (default 2)
 * @param {number} opts.gapX       Horizontal gap (default 0.14)
 * @param {number} opts.gapY       Vertical gap (default 0.12)
 * @returns {{lead: {x, y, w, h}, cards: Array<{x, y, w, h}>, cols: number, rows: number, fonts: object}}
 */
function proofPointsLayout(n, opts = {}) {
  const {
    top = DEFAULTS.CONTENT_TOP,
    bottom = DEFAULTS.H - DEFAULTS.BOTTOM_PAD,
    leadH = 0.28,
    leadGap = 0.12,
    cols = 2,
    gapX = 0.14,
    gapY = 0.12,
  } = opts;

  const totalW = DEFAULTS.W - DEFAULTS.MARGIN * 2;
  const lead = { x: DEFAULTS.MARGIN, y: top, w: totalW, h: leadH };

  const cardsTop = top + leadH + leadGap;
  const cardsH = bottom - cardsTop;
  const rows = Math.ceil(n / cols);

  const cardW = (totalW - gapX * (cols - 1)) / cols;
  const cardH = (cardsH - gapY * (rows - 1)) / rows;

  const cards = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    cards.push({
      x: DEFAULTS.MARGIN + col * (cardW + gapX),
      y: cardsTop + row * (cardH + gapY),
      w: cardW,
      h: cardH,
    });
  }

  // Adaptive fonts based on card dimensions
  const fonts = adaptiveFonts(cardH, [
    [1.5, { lead: 10.5, cardTitle: 12, cardBody: 10.5 }],
    [1.0, { lead: 10, cardTitle: 11, cardBody: 10 }],
    [0,   { lead: 9.5, cardTitle: 10.5, cardBody: 9.5 }],
  ]);

  return { lead, cards, cols, rows, fonts };
}

// ---- Set measurement utilities ------------------------------------------

/**
 * Measure the tallest text in a set at a given font size and width.
 * Returns the max height plus padding, floored at a minimum.
 *
 * Use when a grid or table needs uniform row/cell heights sized to the
 * tallest entry (e.g., process grid titles, comparison table rows).
 *
 * @param {string[]} texts          Array of text strings to measure
 * @param {object} opts
 * @param {number} opts.fontSize    Font size in pt (default 11)
 * @param {number} opts.width       Available text width in inches (default 2)
 * @param {number} opts.padding     Extra height above measured max (default 0.06)
 * @param {number} opts.minH        Minimum returned height (default 0.3)
 * @param {number} opts.lineSpacing Line spacing multiplier (default 1.25)
 * @returns {number}  Uniform height suitable for all items in the set
 */
function maxTextInSet(texts, opts = {}) {
  const {
    fontSize = 11,
    width = 2,
    padding = 0.06,
    minH = 0.3,
    lineSpacing = 1.25,
  } = opts;

  const tallest = texts.reduce((max, t) => {
    if (!t) return max;
    return Math.max(max, textHeight(t, { fontSize, width, lineSpacing }));
  }, 0);

  return Math.max(tallest + padding, minH);
}

// ---- Adaptive card height cap -------------------------------------------

/**
 * Compute a content-adaptive card height: measure the tallest card's content,
 * add padding, then cap between a minimum floor and the slot's available height.
 *
 * Used by any template that renders a row/grid of cards which would otherwise
 * stretch to fill remaining vertical space regardless of content volume.
 *
 * @param {Array<{title: string, body: string|string[]}>} items
 *        Card content — title and body (body may be a string or array of lines)
 * @param {object} opts
 * @param {number} opts.slotH         Available height from layout engine (the max)
 * @param {number} opts.textW         Available text width inside the card
 * @param {number} opts.titleSize     Font size for title measurement (default 11)
 * @param {number} opts.bodySize      Font size for body measurement (default 10)
 * @param {number} opts.padding       Extra height for internal spacing (default 0.6)
 * @param {number} opts.minH          Minimum card height floor (default 1.2)
 * @returns {number}  The capped height to use when rendering cards
 */
function cappedCardHeight(items, opts = {}) {
  const {
    slotH = 99,
    textW = 3,
    titleSize = 11,
    bodySize = 10,
    padding = 0.6,
    minH = 1.2,
  } = opts;

  const maxContentH = items.reduce((max, item) => {
    const titleText = item.title || "";
    const bodyText = Array.isArray(item.body) ? item.body.join("\n") : (item.body || "");
    const tH = titleText ? textHeight(titleText, { fontSize: titleSize, width: textW, lineSpacing: 1.25 }) : 0;
    const bH = bodyText ? textHeight(bodyText, { fontSize: bodySize, width: textW }) : 0;
    return Math.max(max, tH + bH + padding);
  }, 0);

  return Math.min(slotH, Math.max(maxContentH, minH));
}

// ---- CLOSING: NEXT STEPS layout -----------------------------------------

/**
 * Layout for the closingNextSteps slide: teal left bar, headline,
 * and 3–5 numbered action rows with owner and deadline columns.
 *
 * Best for: internal updates, steering committees, project kick-offs.
 *
 * @param {number} rowCount   Number of action items (3–5)
 * @param {object} [opts]
 * @returns {object}  Layout geometry for bar, headline, rows, and fonts
 */
function closingNextStepsLayout(rowCount = 4, opts = {}) {
  const {
    barW = DEFAULTS.CLOSING_BAR_W,
    headlineTop = DEFAULTS.CLOSING_TOP,
    headlineH = DEFAULTS.CLOSING_HEADLINE_H,
    rowGap = 0.08,
  } = opts;

  const contentLeft = DEFAULTS.MARGIN + barW;
  const contentW = DEFAULTS.W - DEFAULTS.MARGIN - barW - 0.2;

  const bar = { x: 0, y: 0, w: barW, h: DEFAULTS.H };
  const headline = { x: contentLeft, y: headlineTop, w: contentW, h: headlineH };

  // Rows fill the space below the headline
  const rowsTop = headlineTop + headlineH + DEFAULTS.CLOSING_HEADLINE_GAP;
  const rowsBottom = DEFAULTS.H - DEFAULTS.BOTTOM_PAD;
  const totalRowSpace = rowsBottom - rowsTop;
  const rowH = (totalRowSpace - rowGap * (rowCount - 1)) / rowCount;

  // Column widths inside each row: number | action | owner | deadline
  const numW = 0.4;
  const deadlineW = 1.0;
  const ownerW = 1.4;
  const actionW = contentW - numW - ownerW - deadlineW - 0.3; // gaps between cols

  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    const y = rowsTop + i * (rowH + rowGap);
    rows.push({
      y,
      h: rowH,
      numX: contentLeft,
      numW,
      actionX: contentLeft + numW + 0.06,
      actionW,
      ownerX: contentLeft + numW + actionW + 0.16,
      ownerW,
      deadlineX: contentLeft + numW + actionW + ownerW + 0.26,
      deadlineW,
    });
  }

  // Adaptive fonts based on row height
  const fonts = adaptiveFonts(rowH, [
    [0.7, { headline: 22, action: 12, owner: 10, deadline: 10, num: 14 }],
    [0.5, { headline: 20, action: 11, owner: 9.5, deadline: 9.5, num: 13 }],
    [0,   { headline: 18, action: 10, owner: 9, deadline: 9, num: 12 }],
  ]);

  return { bar, headline, rows, contentLeft, contentW, fonts };
}

// ---- CLOSING: TAKEAWAYS layout ------------------------------------------

/**
 * Layout for the closingTakeaways slide: teal left bar, headline,
 * and 3–5 numbered takeaway rows displayed as full-width accent cards.
 *
 * Best for: conference talks, training sessions, knowledge-sharing.
 *
 * @param {number} itemCount   Number of takeaway items (3–5)
 * @param {object} [opts]
 * @returns {object}  Layout geometry for bar, headline, items, and fonts
 */
function closingTakeawaysLayout(itemCount = 3, opts = {}) {
  const {
    barW = DEFAULTS.CLOSING_BAR_W,
    headlineTop = DEFAULTS.CLOSING_TOP,
    headlineH = DEFAULTS.CLOSING_HEADLINE_H,
    itemGap = 0.1,
  } = opts;

  const contentLeft = DEFAULTS.MARGIN + barW;
  const contentW = DEFAULTS.W - DEFAULTS.MARGIN - barW - 0.2;

  const bar = { x: 0, y: 0, w: barW, h: DEFAULTS.H };
  const headline = { x: contentLeft, y: headlineTop, w: contentW, h: headlineH };

  // Takeaway cards fill the space below the headline
  const itemsTop = headlineTop + headlineH + DEFAULTS.CLOSING_HEADLINE_GAP;
  const itemsBottom = DEFAULTS.H - DEFAULTS.BOTTOM_PAD;
  const totalItemSpace = itemsBottom - itemsTop;
  const itemH = (totalItemSpace - itemGap * (itemCount - 1)) / itemCount;

  const items = [];
  for (let i = 0; i < itemCount; i++) {
    items.push({
      x: contentLeft,
      y: itemsTop + i * (itemH + itemGap),
      w: contentW,
      h: itemH,
    });
  }

  // Adaptive fonts based on item height
  const fonts = adaptiveFonts(itemH, [
    [0.8, { headline: 22, num: 18, body: 12 }],
    [0.6, { headline: 20, num: 16, body: 11 }],
    [0,   { headline: 18, num: 14, body: 10 }],
  ]);

  return { bar, headline, items, contentLeft, contentW, fonts };
}

// ---- CLOSING: THE ASK layout --------------------------------------------

/**
 * Layout for the closingAsk slide (McKinsey decision pattern): teal left bar,
 * decision context, the bold ask, quantified consequence, and a single next step.
 *
 * Best for: board presentations, budget requests, executive sponsor updates.
 *
 * @param {object} [opts]
 * @returns {object}  Layout geometry for bar, regions, and fonts
 */
function closingAskLayout(opts = {}) {
  const {
    barW = DEFAULTS.CLOSING_BAR_W,
  } = opts;

  const contentLeft = DEFAULTS.MARGIN + barW;
  const contentW = DEFAULTS.W - DEFAULTS.MARGIN - barW - 0.2;

  const bar = { x: 0, y: 0, w: barW, h: DEFAULTS.H };

  // Four stacked regions: context, ask, consequence, next step
  // Proportional heights that give the ask the most visual weight
  const regionTop = DEFAULTS.CLOSING_TOP;
  const regionBottom = DEFAULTS.H - DEFAULTS.BOTTOM_PAD;
  const totalH = regionBottom - regionTop;

  const contextH = totalH * 0.18;
  const askH = totalH * 0.32;

  const context = { x: contentLeft, y: regionTop, w: contentW, h: contextH };
  const ask = { x: contentLeft, y: regionTop + contextH, w: contentW, h: askH };
  const dividerY = ask.y + askH + 0.04;

  // Bottom half: distribute consequence and nextStep with equal gaps
  // (gap below divider, between blocks, and at slide bottom are equidistant)
  const bottomTop = dividerY + 0.02; // just below the divider line
  const bottomBottom = DEFAULTS.H - DEFAULTS.BOTTOM_PAD;
  const { items: bottomItems } = distributeVerticallyEqualGaps(2, {
    top: bottomTop,
    bottom: bottomBottom,
    ratio: 0.6,
  });

  const consequence = { x: contentLeft, y: bottomItems[0].y, w: contentW, h: bottomItems[0].h };
  const nextStep = { x: contentLeft, y: bottomItems[1].y, w: contentW, h: bottomItems[1].h };

  return {
    bar,
    context,
    ask,
    dividerY,
    consequence,
    nextStep,
    contentLeft,
    contentW,
    fonts: {
      context: 12,
      ask: 24,
      consequence: 13,
      nextStep: 12,
      label: 8.5,
    },
  };
}

// ---- Vertical redistribution utilities -----------------------------------

/**
 * Compute the Y offset to vertically centre an element within its slot.
 *
 * Use when a capped-height element (e.g. cards after cappedCardHeight) is
 * shorter than the available slot and would otherwise float at the top,
 * leaving a void at the bottom. This function returns the adjusted Y that
 * centres the element in the slot.
 *
 * If contentH >= slotH, returns slotY unchanged (content fills or exceeds
 * the slot — no redistribution possible).
 *
 * @param {number} slotY      Y position where the slot starts
 * @param {number} slotH      Total height of the available slot
 * @param {number} contentH   Height of the content to centre
 * @returns {number}  Adjusted Y position for the content
 */
function centreInSlot(slotY, slotH, contentH) {
  if (contentH >= slotH) return slotY;
  return slotY + (slotH - contentH) / 2;
}

/**
 * Cap row heights and vertically centre the resulting group within the
 * original bounding box.
 *
 * Use when a layout divides space evenly among N rows (stretch-to-fill),
 * producing rows taller than their content warrants. This function:
 * 1. Caps each row's height at maxRowH (preserving original gaps)
 * 2. Computes the total height of the capped group (rows + gaps)
 * 3. Offsets the entire group to vertically centre within the original span
 *
 * Returns a new array with adjusted y and h for each row. Extra properties
 * on the original row objects (e.g. numX, actionX, ownerX, deadlineX, etc.)
 * are preserved — only y and h change.
 *
 * If maxRowH >= every row's current h, returns the rows unchanged (no cap
 * needed, no redistribution).
 *
 * @param {Array<{y: number, h: number}>} rows   Row geometry from a layout function
 * @param {number} maxRowH                        Maximum height per row
 * @returns {Array<{y: number, h: number}>}       Adjusted rows (centred in original span)
 */
function cappedRowGroup(rows, maxRowH) {
  if (!rows || rows.length === 0) return rows;

  // Detect whether any capping is needed
  const needsCap = rows.some(r => r.h > maxRowH);
  if (!needsCap) return rows;

  // Original bounding box
  const originalTop = rows[0].y;
  const lastRow = rows[rows.length - 1];
  const originalBottom = lastRow.y + lastRow.h;
  const originalSpan = originalBottom - originalTop;

  // Infer gap from the original rows (distance between consecutive rows)
  const gap = rows.length > 1 ? rows[1].y - (rows[0].y + rows[0].h) : 0;

  // Capped group total height
  const cappedH = Math.min(rows[0].h, maxRowH); // uniform cap
  const groupH = cappedH * rows.length + gap * (rows.length - 1);

  // Vertical offset to centre the group
  const offset = (originalSpan - groupH) / 2;

  // Build new rows with adjusted positions
  return rows.map((row, i) => ({
    ...row,
    y: originalTop + offset + i * (cappedH + gap),
    h: cappedH,
  }));
}

// ---- Export ---------------------------------------------------------------
module.exports = {
  distribute,
  distributeVertically,
  distributeVerticallyEqualGaps,
  cardGrid,
  textHeight,
  maxTextInSet,
  cappedCardHeight,
  centreInSlot,
  cappedRowGroup,
  narrativeAndCards,
  roadmapColumns,
  roadmapCardInner,
  closingLayout,
  closingNextStepsLayout,
  closingTakeawaysLayout,
  closingAskLayout,
  sectionStack,
  slideHeader,
  slideFooter,
  comparisonTableLayout,
  processGridLayout,
  caseStudyLayout,
  productDeepDiveLayout,
  proofPointsLayout,
};
