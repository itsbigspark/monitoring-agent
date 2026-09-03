/**
 * bigspark-slides components — molecules layer.
 *
 * Small drawing helpers that combine atoms (palette, font, dimensions) into
 * single visual units on a slide. Each function takes a slide object and
 * renders one discrete element.
 *
 * Usage:
 *   const { addLabel, addHeadline, addStatCard, addCard, addSectionDivider } = require("./components");
 */
const { C, FONT, W, H, MARGIN } = require("./theme");
const B = require("./blocks");

// ---- Component-level shapes --------------------------------------------------

/**
 * NavyCard rectangle with a teal LEFT accent bar.
 * Used for insight boxes, narrative panels, proof-point cards, outcome rows.
 *
 * @param {object} s       Slide object
 * @param {number} x       X position
 * @param {number} y       Y position
 * @param {number} w       Width
 * @param {number} h       Height
 * @param {object} [opts]
 * @param {number} [opts.barW=0.06]  Width of the teal accent bar
 */
function addAccentBox(s, x, y, w, h, opts = {}) {
  const { barW = 0.06 } = opts;
  s.addShape("rect", { x, y, w, h, fill: { color: C.navyCard }, line: { color: C.navyCard } });
  s.addShape("rect", { x, y, w: barW, h, fill: { color: C.teal }, line: { color: C.teal } });
}

/**
 * NavyCard rectangle with a teal TOP bar.
 * Used for roadmap columns, closing cards, process-grid cells, case-study
 * left panel, product-deep-dive section cards.
 *
 * @param {object} s       Slide object
 * @param {number} x       X position
 * @param {number} y       Y position
 * @param {number} w       Width
 * @param {number} h       Height
 * @param {object} [opts]
 * @param {number} [opts.barH=0.06]  Height of the teal top bar
 */
function addTopBarBox(s, x, y, w, h, opts = {}) {
  const { barH = 0.06 } = opts;
  s.addShape("rect", { x, y, w, h, fill: { color: C.navyCard }, line: { color: C.navyCard } });
  s.addShape("rect", { x, y, w, h: barH, fill: { color: C.teal }, line: { color: C.teal } });
}

// ---- Composite card components -------------------------------------------

/**
 * TopBar card: navyCard box with teal TOP bar + title/body text content.
 * Combines addTopBarBox + addContentBox in one call.
 *
 * Used by: closing (follow-up cards), productDeepDive (section cards).
 *
 * @param {object} s       Slide object
 * @param {number} x       X position
 * @param {number} y       Y position
 * @param {number} w       Width
 * @param {number} h       Height
 * @param {string} title   Title text (bold)
 * @param {string} body    Body text
 * @param {object} [opts]  Merged opts: barH for the top bar + all addContentBox opts
 */
function addTopBarCard(s, x, y, w, h, title, body, opts = {}) {
  const { barH = 0.05, ...contentOpts } = opts;
  addTopBarBox(s, x, y, w, h, { barH });
  addContentBox(s, x, y, w, h, title, body, contentOpts);
}

/**
 * Accent card: navyCard box with teal LEFT accent bar + title/body text content.
 * Combines addAccentBox + addContentBox in one call.
 *
 * Used by: proofPoints (evidence cards), caseStudy (outcome rows with content).
 *
 * @param {object} s       Slide object
 * @param {number} x       X position
 * @param {number} y       Y position
 * @param {number} w       Width
 * @param {number} h       Height
 * @param {string} title   Title text (bold)
 * @param {string} body    Body text
 * @param {object} [opts]  Merged opts: barW for the accent bar + all addContentBox opts
 */
function addAccentCard(s, x, y, w, h, title, body, opts = {}) {
  const { barW, ...contentOpts } = opts;
  addAccentBox(s, x, y, w, h, { barW });
  addContentBox(s, x, y, w, h, title, body, contentOpts);
}

// ---- Molecule-level components ------------------------------------------

/**
 * Teal caps section label. Top of every content slide.
 */
function addLabel(s, text, y = 0.28) {
  s.addText(text.toUpperCase(), {
    x: MARGIN, y, w: 9, h: 0.22,
    fontFace: FONT, fontSize: 8.5, bold: true, color: C.teal,
    charSpacing: 2, margin: 0,
  });
}

/**
 * Bold white headline below the label.
 * Pass h from L.slideHeader().headlineH for content-sized height.
 */
function addHeadline(s, text, y = 0.56, size = 26, h) {
  s.addText(text, {
    x: MARGIN, y, w: W - MARGIN * 2, h: h || 1.4,
    fontFace: FONT, fontSize: size, bold: true, color: C.white, margin: 0,
  });
}

/**
 * Metric card with teal left accent bar — large stat number + description.
 */
function addStatCard(s, x, y, w, h, stat, desc) {
  addAccentBox(s, x, y, w, h);
  s.addText(stat, {
    x: x + 0.14, y: y + 0.12, w: w - 0.2, h: h * 0.5,
    fontFace: FONT, fontSize: 36, bold: true, color: C.white, valign: "top", margin: 0,
  });
  s.addText(desc, {
    x: x + 0.14, y: y + h * 0.56, w: w - 0.22, h: h * 0.38,
    fontFace: FONT, fontSize: 10.5, color: C.offWhite, valign: "top", margin: 0,
  });
}

/**
 * Content card with teal top bar, bold title, and bulleted body lines.
 */
function addCard(s, x, y, w, h, title, bodyLines, opts = {}) {
  const { titleSize = 12, bodySize = 10 } = opts;
  addTopBarBox(s, x, y, w, h);
  let textY = y + 0.18;
  if (title) {
    s.addText(title, {
      x: x + 0.16, y: textY, w: w - 0.32, h: 0.52,
      fontFace: FONT, fontSize: titleSize, bold: true, color: C.white, margin: 0,
    });
    textY += 0.56;
  }
  if (bodyLines && bodyLines.length) {
    const items = bodyLines.map((t, i) => ({
      text: t,
      options: {
        bullet: { code: "25A0", color: C.teal, size: 50 },
        breakLine: i < bodyLines.length - 1,
        color: C.offWhite,
      },
    }));
    s.addText(items, {
      x: x + 0.16, y: textY, w: w - 0.32, h: h - (textY - y) - 0.1,
      fontFace: FONT, fontSize: bodySize, valign: "top", margin: 0, paraSpaceAfter: 3,
    });
  }
}

/**
 * Plain-text content box: title + body inside a positioned region.
 * Unlike addCard, this does NOT draw a background — pair with addTopBarBox
 * or addAccentBox for the container. Good for narrative boxes, product cards,
 * follow-up cards, proof-point content.
 *
 * @param {object} s       Slide object
 * @param {number} x       Box x position (outer)
 * @param {number} y       Box y position (outer)
 * @param {number} w       Box width (outer)
 * @param {number} h       Box height (outer)
 * @param {string} title   Title text (bold)
 * @param {string} body    Body text
 * @param {object} [opts]
 * @param {number} [opts.padX=0.14]       Horizontal padding
 * @param {number} [opts.titleY=0.12]     Title y offset from box top
 * @param {number} [opts.titleH=0.4]      Title height
 * @param {number} [opts.bodyY]           Body y offset from box top (default: titleY + titleH + gap)
 * @param {number} [opts.titleSize=11]    Title font size
 * @param {number} [opts.bodySize=9.5]    Body font size
 * @param {string} [opts.titleColor=C.white]  Title colour
 */
function addContentBox(s, x, y, w, h, title, body, opts = {}) {
  const {
    padX = 0.14,
    titleY: titleOffY = 0.12,
    titleH = 0.4,
    bodyY: bodyOffY,
    titleSize = 11,
    bodySize = 9.5,
    titleColor = C.white,
  } = opts;

  const textX = x + padX;
  const textW = w - padX * 2;
  const tY = y + titleOffY;
  const bY = bodyOffY != null ? y + bodyOffY : tY + titleH + 0.02;

  if (title) {
    s.addText(title, {
      x: textX, y: tY, w: textW, h: titleH,
      fontFace: FONT, fontSize: titleSize, bold: true, color: titleColor, margin: 0,
    });
  }
  if (body) {
    s.addText(body, {
      x: textX, y: bY, w: textW, h: h - (bY - y) - 0.1,
      fontFace: FONT, fontSize: bodySize, color: C.offWhite, valign: "top", margin: 0,
    });
  }
}

/**
 * Lead paragraph: optional short text between headline and content.
 * Renders only if text is truthy.
 *
 * @param {object} s       Slide object
 * @param {string} text    Lead paragraph text
 * @param {number} x       X position
 * @param {number} y       Y position
 * @param {number} w       Width
 * @param {number} h       Height
 * @param {object} [opts]
 * @param {number} [opts.fontSize=10.5]  Font size
 */
function addLead(s, text, x, y, w, h, opts = {}) {
  if (!text) return;
  const { fontSize = 10.5 } = opts;
  s.addText(text, {
    x, y, w, h,
    fontFace: FONT, fontSize, color: C.offWhite, margin: 0, valign: "top",
  });
}

/**
 * Full-bleed section divider — teal left bar, large number, bold title.
 * Returns the slide object for further customisation.
 */
function addSectionDivider(pres, num, title, sub) {
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText(num, {
    x: MARGIN + 0.12, y: 1.5, w: 2, h: 0.8,
    fontFace: FONT, fontSize: 56, bold: true, color: C.teal, margin: 0,
  });
  s.addText(title, {
    x: MARGIN + 0.12, y: 2.2, w: W - MARGIN - 0.32, h: 1.8,
    fontFace: FONT, fontSize: 38, bold: true, color: C.white, margin: 0,
  });
  if (sub) {
    s.addText(sub, {
      x: MARGIN + 0.12, y: 4.3, w: W - MARGIN - 0.32, h: 0.3,
      fontFace: FONT, fontSize: 11, color: C.mid, italic: true, margin: 0,
    });
  }
  return s;
}

/**
 * Slide footer — small muted text pinned to the bottom of the slide.
 * Call with geometry from B.slideFooter().
 */
function addFooter(s, text, footerGeom) {
  if (!footerGeom.hasFooter) return;
  s.addText(text, {
    x: MARGIN, y: footerGeom.footerY, w: W - MARGIN * 2, h: footerGeom.footerH,
    fontFace: FONT, fontSize: footerGeom.fontSize, color: C.mid, margin: 0,
  });
}

// ---- Organism-level helper (slide scaffolding) --------------------------

/**
 * Begin a standard content slide: creates the slide, sets navy background,
 * adds notes, computes header geometry, renders label + headline, and
 * computes footer geometry.
 *
 * This pattern is used by 10 of 12 slide templates. Centralising it removes
 * ~6 lines of boilerplate from each template function.
 *
 * @param {object} pres             pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.label       Section label text
 * @param {string} data.headline    Headline text
 * @param {string} [data.footer]    Optional footer text
 * @param {string} [data.notes]     Optional speaker notes
 * @param {object} [opts]
 * @param {number} [opts.headlineFontSize=26]  Headline font size
 * @param {object} [opts.headerOpts]  Extra opts passed to B.slideHeader()
 * @returns {{s: object, header: object, ft: object}}
 */
function beginContentSlide(pres, data, opts = {}) {
  const { label: labelText, headline, footer, notes } = data;
  const { headlineFontSize = 26, headerOpts = {} } = opts;

  const s = pres.addSlide();
  s.background = { color: C.navy };
  if (notes) s.addNotes(notes);

  const header = B.slideHeader(headline, { fontSize: headlineFontSize, ...headerOpts });
  addLabel(s, labelText);
  addHeadline(s, headline, header.headlineY, headlineFontSize, header.headlineH);

  const ft = B.slideFooter(footer);

  return { s, header, ft };
}

// ---- Lead paragraph with measurement ------------------------------------

/**
 * Render an optional lead paragraph and return the adjusted content top.
 * Measures the text, renders it, and advances the Y position. If text is
 * falsy, returns contentTop unchanged (no-op).
 *
 * Eliminates the repeated measure-render-advance pattern from templates
 * that support optional lead text (processGrid, proofPoints, etc.).
 *
 * @param {object} s              Slide object
 * @param {string|null} text      Lead paragraph text (falsy = no-op)
 * @param {number} contentTop     Current Y where content starts
 * @param {object} [opts]
 * @param {number} [opts.fontSize=10.5]  Font size
 * @param {number} [opts.width]          Available width (default W - 2*MARGIN)
 * @param {number} [opts.padding=0.08]   Extra height above measured text
 * @param {number} [opts.minH=0.3]       Minimum lead box height
 * @param {number} [opts.gap=0.1]        Space between lead bottom and next element
 * @returns {number}  The new contentTop (advanced past the lead, or unchanged)
 */
function renderLead(s, text, contentTop, opts = {}) {
  if (!text) return contentTop;
  const {
    fontSize = 10.5,
    width = W - MARGIN * 2,
    padding = 0.08,
    minH = 0.3,
    gap = 0.1,
  } = opts;
  const h = Math.max(B.textHeight(text, { fontSize, width }) + padding, minH);
  addLead(s, text, MARGIN, contentTop, width, h, { fontSize });
  return contentTop + h + gap;
}

// ---- Export ---------------------------------------------------------------
module.exports = {
  addAccentBox,
  addTopBarBox,
  addTopBarCard,
  addAccentCard,
  addLabel,
  addHeadline,
  addStatCard,
  addCard,
  addContentBox,
  addLead,
  addSectionDivider,
  addFooter,
  beginContentSlide,
  renderLead,
};
