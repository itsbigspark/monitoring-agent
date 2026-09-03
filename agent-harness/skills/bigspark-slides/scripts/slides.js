/**
 * bigspark-slides slide templates — templates layer.
 *
 * Full-slide builder functions. Each takes a pptxgenjs presentation object
 * and a content descriptor, adds one slide, and returns nothing.
 * Imports blocks (layout geometry) and components (drawing primitives).
 *
 * Every template accepts an optional `notes` string in its data object.
 * When provided, the text is attached as PowerPoint speaker notes via
 * pptxgenjs's slide.addNotes() API.
 *
 * Usage:
 *   const slides = require("./slides");
 *   slides.cover(pres, { title: "Deck Title\nGoes Here", ..., notes: "Speaker notes here" });
 *   slides.stats(pres, { headline: "...", stats: [...], insight: {...}, notes: "..." });
 */
const { C, FONT, W, H, MARGIN } = require("./theme");
const {
  addLabel, addHeadline, addStatCard, addCard, addSectionDivider, addFooter,
  addAccentBox, addTopBarBox, addContentBox, addLead, beginContentSlide,
  addTopBarCard, addAccentCard, renderLead,
} = require("./components");
const B = require("./blocks");

// ---- COVER SLIDE --------------------------------------------------------

/**
 * Cover slide with left agenda panel and right title panel.
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.title        Main deck title (supports \n for multi-line)
 * @param {string} data.subtitle     Italic tagline below the title
 * @param {string} data.label        Caps label above the title (e.g. "EXAMPLE DECK")
 * @param {Array<[string,string,string]>} data.agenda  Array of [num, label, sub] items
 * @param {string} [data.notes]       Optional speaker notes for presenter view
 */
function cover(pres, data) {
  const { title, subtitle, label, agenda, notes } = data;
  const s = pres.addSlide();
  s.background = { color: C.navy };
  if (notes) s.addNotes(notes);

  // Vertical divider
  s.addShape("rect", { x: 4.1, y: 0, w: 0.04, h: H, fill: { color: C.divider }, line: { color: C.divider } });

  // bigspark wordmark
  s.addText("bigspark", { x: MARGIN, y: 0.3, w: 3.4, h: 0.56, fontFace: FONT, fontSize: 28, bold: true, color: C.teal, margin: 0 });

  // Agenda (left panel) — number, bold title, muted subtitle, teal divider
  // Dynamically size: available region from y=1.3 to y=5.3 (4.0 inches)
  const agendaTop = 1.3;
  const agendaBottom = 5.3;
  const agendaSpace = agendaBottom - agendaTop;
  const itemStride = agendaSpace / agenda.length;
  // Scale fonts when items are tight
  const agFonts = itemStride >= 0.8
    ? { num: 9, label: 12, sub: 9.5, labelH: 0.28, subH: 0.24, subOffset: 0.32, divOffset: 0.7 }
    : itemStride >= 0.6
      ? { num: 8.5, label: 11, sub: 9, labelH: 0.24, subH: 0.2, subOffset: 0.26, divOffset: 0.52 }
      : { num: 8, label: 10, sub: 8.5, labelH: 0.22, subH: 0.18, subOffset: 0.23, divOffset: 0.44 };

  agenda.forEach(([num, agLabel, sub], i) => {
    const ay = agendaTop + i * itemStride;
    s.addText(num, { x: MARGIN, y: ay, w: 0.44, h: agFonts.labelH, fontFace: FONT, fontSize: agFonts.num, bold: true, color: C.teal, margin: 0 });
    s.addText(agLabel, { x: MARGIN + 0.48, y: ay, w: 3.4, h: agFonts.labelH, fontFace: FONT, fontSize: agFonts.label, bold: true, color: C.white, margin: 0 });
    s.addText(sub, { x: MARGIN + 0.48, y: ay + agFonts.subOffset, w: 3.2, h: agFonts.subH, fontFace: FONT, fontSize: agFonts.sub, color: C.mid, margin: 0 });
    if (i < agenda.length - 1) {
      s.addShape("rect", { x: MARGIN, y: ay + agFonts.divOffset, w: 3.5, h: 0.01, fill: { color: C.divider }, line: { color: C.divider } });
    }
  });

  // Right panel
  const rx = 4.6;
  const titleY = 0.7;
  const titleW = W - rx - MARGIN;
  const titleTextH = B.textHeight(title, { fontSize: 44, width: titleW, lineSpacing: 1.15 });
  const titleBoxH = Math.max(titleTextH + 0.2, 1.0); // pad for descenders, min 1"
  const subtitleY = titleY + titleBoxH + 0.3; // 0.3" breathing room below title

  s.addText(label.toUpperCase(), { x: rx, y: 0.34, w: titleW, h: 0.22, fontFace: FONT, fontSize: 8.5, bold: true, color: C.teal, charSpacing: 2, margin: 0 });
  s.addText(title, { x: rx, y: titleY, w: titleW, h: titleBoxH, fontFace: FONT, fontSize: 44, bold: true, color: C.white, margin: 0 });
  s.addText(subtitle, { x: rx, y: subtitleY, w: titleW, h: 0.4, fontFace: FONT, fontSize: 13, color: C.mid, italic: true, margin: 0 });
}

// ---- STATS SLIDE --------------------------------------------------------

/**
 * Key metrics slide: headline, stat cards row, and key insight box.
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.label          Section label text
 * @param {string} data.headline       Bold headline text
 * @param {Array<[string,string]>} data.stats  Array of [stat, description] pairs
 * @param {object} data.insight
 * @param {string} data.insight.title  Insight box title
 * @param {string} data.insight.body   Insight box body text
 */
function stats(pres, data) {
  const { stats: statsData, insight, footer } = data;
  const { s, header, ft } = beginContentSlide(pres, data);

  // Use layout engine for adaptive positioning — top flows from header
  const [statsRow, insightRow] = B.distributeVertically([
    { h: 1.7 },
    { flex: 1 },
  ], { top: header.contentTop, bottom: ft.contentBottom, gap: 0.18 });
  const statCols = B.distribute(statsData.length, { start: MARGIN });

  statCols.forEach((col, i) => {
    addStatCard(s, col.x, statsRow.y, col.w, statsRow.h, statsData[i][0], statsData[i][1]);
  });

  // Key insight box — adaptive spacing: body Y derived from title height
  const iy = insightRow.y, ih = insightRow.h;
  const insightW = W - MARGIN * 2;
  addAccentBox(s, MARGIN, iy, insightW, ih);

  const insightTitleH = B.textHeight(insight.title, { fontSize: 11, width: 3, lineSpacing: 1.3 });
  const insightTitleBoxH = Math.max(insightTitleH + 0.04, 0.24);
  const insightTitleY = iy + 0.14;
  const insightBodyY = insightTitleY + insightTitleBoxH + 0.06;

  s.addText(insight.title, { x: MARGIN + 0.2, y: insightTitleY, w: 3, h: insightTitleBoxH, fontFace: FONT, fontSize: 11, bold: true, color: C.teal, margin: 0 });
  s.addText(insight.body, { x: MARGIN + 0.2, y: insightBodyY, w: insightW - 0.36, h: iy + ih - insightBodyY - 0.12, fontFace: FONT, fontSize: 11, color: C.offWhite, margin: 0 });

  // Footer
  addFooter(s, footer, ft);
}

// ---- EXECUTIVE SUMMARY SLIDE --------------------------------------------

/**
 * Executive summary: label, headline, lead paragraph, and a full-width
 * narrative box with teal accent bar containing multiple body paragraphs.
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.label          Section label text (e.g. "EXECUTIVE SUMMARY")
 * @param {string} data.headline       Bold headline (20pt)
 * @param {string} data.lead           Short lead paragraph below headline
 * @param {string[]} data.paragraphs   Array of body paragraphs for the narrative box
 * @param {string} [data.footer]       Optional footer text
 */
function executiveSummary(pres, data) {
  const { lead, paragraphs, footer } = data;
  const { s, header, ft } = beginContentSlide(pres, data, {
    headlineFontSize: 20,
    headerOpts: { headlineY: 0.5, gap: 0.12 },
  });

  // Lead paragraph
  const boxTop = renderLead(s, lead, header.contentTop, { padding: 0.1, minH: 0.4, gap: 0.08 });

  // Narrative box — adaptive sizing:
  //   - Minimum 60% of available vertical space (the box is the main element)
  //   - Sized to content when content exceeds 60%
  //   - Font scales UP when box has surplus space (60% floor > content needs)
  const availableH = ft.contentBottom - boxTop;
  const boxW = W - MARGIN * 2;
  const textW = boxW - 0.36;
  const boxPadding = 0.24; // top + bottom internal padding

  // Measure content at base font size
  const baseFontSize = 10.5;
  const contentText = paragraphs.join("\n\n");
  const baseContentH = B.textHeight(contentText, { fontSize: baseFontSize, width: textW, paraSpacing: 0.08 });
  const baseBoxH = baseContentH + boxPadding;

  // Floor: 60% of available space. Ceiling: all available space.
  const minBoxH = availableH * 0.6;
  const boxH = Math.max(minBoxH, Math.min(baseBoxH, availableH));

  // Adaptive font: when box is bigger than content needs (floor kicked in),
  // scale font up proportionally to fill the space better
  let bodyFontSize = baseFontSize;
  if (boxH > baseBoxH + 0.1) {
    // How much surplus space? Scale font to use it (capped at 12.5pt)
    const surplusRatio = (boxH - boxPadding) / baseContentH;
    bodyFontSize = Math.min(baseFontSize * Math.sqrt(surplusRatio), 12.5);
  }

  // Box background + teal accent bar
  addAccentBox(s, MARGIN, boxTop, boxW, boxH);

  // Body paragraphs inside the box
  const textX = MARGIN + 0.2;
  const textY = boxTop + 0.12;
  const textH = boxH - boxPadding;

  const parts = paragraphs.map((p, i) => ({
    text: p,
    options: { color: C.offWhite, breakLine: i < paragraphs.length - 1, paraSpaceAfter: 6 },
  }));
  s.addText(parts, {
    x: textX, y: textY, w: textW, h: textH,
    fontFace: FONT, fontSize: bodyFontSize, valign: "top", margin: 0,
  });

  // Footer
  addFooter(s, footer, ft);
}

// ---- SECTION DIVIDER SLIDE ----------------------------------------------

/**
 * Section divider — delegates to the component-level addSectionDivider.
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.num    Section number (e.g. "01")
 * @param {string} data.title  Section title
 * @param {string} [data.sub]  Optional subtitle
 */
function sectionDivider(pres, data) {
  const s = addSectionDivider(pres, data.num, data.title, data.sub);
  if (data.notes) s.addNotes(data.notes);
}

// ---- NARRATIVE + CARDS SLIDE --------------------------------------------

/**
 * Slide with narrative box at top and N content cards below.
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.label               Section label text
 * @param {string} data.headline            Bold headline text
 * @param {number} [data.headlineFontSize]  Headline font size (default 22)
 * @param {object} data.narrative
 * @param {string} data.narrative.title     Narrative box headline
 * @param {string} data.narrative.body      Narrative box body text
 * @param {Array<{title: string, lines: string[]}>} data.cards  Card content
 * @param {object} [data.cardOpts]          Options passed to addCard (e.g. { bodySize })
 */
function narrativeCards(pres, data) {
  const { narrative, cards, cardOpts = {}, footer } = data;
  const headlineFontSize = data.headlineFontSize || 22;
  const { s, header, ft } = beginContentSlide(pres, data, { headlineFontSize });

  // Layout engine computes positions from content — top flows from header
  const { narrative: narr, cards: cardSlots } = B.narrativeAndCards({
    narrativeText: narrative.body,
    hasHeadline: true,
    cols: cards.length,
    top: header.contentTop,
    bottom: ft.contentBottom,
  });

  // Narrative box
  addAccentBox(s, narr.x, narr.y, narr.w, narr.h);
  s.addText(narrative.title, { x: narr.x + 0.2, y: narr.y + 0.12, w: narr.w - 0.28, h: 0.38, fontFace: FONT, fontSize: 18, bold: true, color: C.white, margin: 0 });
  s.addText(narrative.body, { x: narr.x + 0.2, y: narr.y + 0.54, w: narr.w - 0.28, h: narr.h - 0.66, fontFace: FONT, fontSize: 10.5, color: C.offWhite, margin: 0 });

  // Adaptive card height cap — measure tallest card content, cap to avoid
  // large empty boxes when content is sparse
  const bodySize = (cardOpts && cardOpts.bodySize) || 10;
  const cardTextW = cardSlots[0] ? cardSlots[0].w - 0.32 : 2;
  const cappedH = B.cappedCardHeight(
    cards.map(c => ({ title: c.title, body: c.lines })),
    { slotH: cardSlots[0] ? cardSlots[0].h : 99, textW: cardTextW, titleSize: 12, bodySize, padding: 0.6, minH: 1.2 }
  );

  // Centre capped cards vertically in their available slot
  const cardY = B.centreInSlot(cardSlots[0].y, cardSlots[0].h, cappedH);

  // Cards — render with capped height, vertically centred
  cards.forEach((c, i) => {
    addCard(s, cardSlots[i].x, cardY, cardSlots[i].w, cappedH, c.title, c.lines, cardOpts);
  });

  // Footer
  addFooter(s, footer, ft);
}

// ---- ROADMAP SLIDE ------------------------------------------------------

/**
 * Roadmap slide: N phase columns with number, duration, title, body, gate,
 * and a price/status chip below each column. Optional footer note.
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.label               Section label text
 * @param {string} data.headline            Bold headline text
 * @param {number} [data.headlineFontSize]  Headline font size (default 22)
 * @param {Array<object>} data.phases       Phase data (3–5 items)
 * @param {string} data.phases[].title      Phase title
 * @param {string} data.phases[].duration   Duration label (e.g. "3 weeks")
 * @param {string} data.phases[].body       Body text (deliverables)
 * @param {string} [data.phases[].gate]     Gate text (italic, shown after body)
 * @param {string} data.phases[].price      Price/status chip text (e.g. "£26k", "TBC")
 * @param {string} [data.footer]            Footer note below the chips
 */
function roadmap(pres, data) {
  const { phases, footer } = data;
  const headlineFontSize = data.headlineFontSize || 22;
  const { s, header, ft } = beginContentSlide(pres, data, { headlineFontSize });

  // Compute phase column geometry — pass footerH so columns shrink when footer present
  const { columns, chips, fonts } = B.roadmapColumns(phases.length, {
    top: header.contentTop,
    footerH: ft.hasFooter ? 0.42 : 0.28,
  });

  phases.forEach((phase, i) => {
    const col = columns[i];
    const chip = chips[i];
    const inner = B.roadmapCardInner(col);

    // Column background card + teal top bar
    addTopBarBox(s, col.x, col.y, col.w, col.h);

    // Phase number
    s.addText(String(i + 1), {
      x: inner.num.x, y: inner.num.y, w: inner.num.w, h: inner.num.h,
      fontFace: FONT, fontSize: fonts.num, bold: true, color: C.teal, margin: 0,
    });

    // Duration
    s.addText(phase.duration, {
      x: inner.duration.x, y: inner.duration.y, w: inner.duration.w, h: inner.duration.h,
      fontFace: FONT, fontSize: fonts.duration, color: C.mid, margin: 0,
    });

    // Title
    s.addText(phase.title, {
      x: inner.title.x, y: inner.title.y, w: inner.title.w, h: inner.title.h,
      fontFace: FONT, fontSize: fonts.title, bold: true, color: C.white, margin: 0,
    });

    // Divider line
    s.addShape("rect", {
      x: inner.divider.x, y: inner.divider.y, w: inner.divider.w, h: 0.01,
      fill: { color: C.divider }, line: { color: C.divider },
    });

    // Body text (with optional gate)
    const bodyParts = [];
    bodyParts.push({ text: phase.body, options: { color: C.offWhite, breakLine: !!phase.gate } });
    if (phase.gate) {
      bodyParts.push({ text: phase.gate, options: { color: C.offWhite, italic: true } });
    }
    s.addText(bodyParts, {
      x: inner.body.x, y: inner.body.y, w: inner.body.w, h: inner.body.h,
      fontFace: FONT, fontSize: fonts.body, valign: "top", margin: 0, paraSpaceAfter: 4,
    });

    // Price/status chip
    s.addShape("rect", { x: chip.x, y: chip.y, w: chip.w, h: chip.h, fill: { color: C.navyCard }, line: { color: C.navyCard } });
    s.addText(phase.price, {
      x: chip.x + 0.12, y: chip.y + 0.05, w: chip.w - 0.24, h: chip.h - 0.1,
      fontFace: FONT, fontSize: fonts.price, bold: true, color: C.teal, margin: 0,
    });
  });

  // Footer
  addFooter(s, footer, ft);
}

// ---- CLOSING SLIDE: DISCUSSION PROMPT -----------------------------------

/**
 * Closing slide — "Discussion Prompt" variant.
 *
 * Bold value statements with a teal-highlighted keyword, a horizontal divider,
 * an open question, and follow-up topic cards the audience can choose from.
 *
 * Best for: sales/pitch presentations where the goal is to open a conversation
 * and let the prospect choose which area to explore next.
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {Array<[string,string,string]>} data.statements  Array of [prefix, highlight, suffix]
 * @param {Array<[string,string]>} data.followups          Array of [title, description]
 * @param {string} [data.question]  Question text above cards (default "Where would you like to go deeper?")
 */
function closingDiscussionPrompt(pres, data) {
  const { statements, followups, question = "Where would you like to go deeper?", notes } = data;
  const s = pres.addSlide();
  s.background = { color: C.navy };
  if (notes) s.addNotes(notes);

  const cl = B.closingLayout(statements.length, followups.length);

  // Teal left bar
  s.addShape("rect", { x: cl.bar.x, y: cl.bar.y, w: cl.bar.w, h: cl.bar.h, fill: { color: C.teal }, line: { color: C.teal } });

  // Statements
  statements.forEach((parts, i) => {
    s.addText([
      { text: parts[0], options: { color: C.white } },
      { text: parts[1], options: { color: C.teal } },
      { text: parts[2], options: { color: C.white } },
    ], {
      x: cl.contentLeft, y: cl.statements[i].y, w: cl.contentW, h: cl.statements[i].h,
      fontFace: FONT, fontSize: cl.fonts.statement, bold: true, margin: 0,
    });
  });

  // Divider + question
  s.addShape("rect", { x: cl.contentLeft, y: cl.divider.y, w: W - MARGIN * 2, h: 0.02, fill: { color: C.divider }, line: { color: C.divider } });
  s.addText(question, { x: cl.contentLeft, y: cl.question.y, w: cl.contentW, h: cl.question.h, fontFace: FONT, fontSize: 14, color: C.mid, italic: true, margin: 0 });

  // Follow-up cards — adaptive height cap based on content volume
  const followupCardW = cl.cards[0] ? cl.cards[0].w : 2;
  const followupTextW = followupCardW - 0.28;
  const followupCappedH = B.cappedCardHeight(
    followups.map(([ftitle, desc]) => ({ title: ftitle, body: desc })),
    { slotH: cl.cards[0] ? cl.cards[0].h : 99, textW: followupTextW, titleSize: 11, bodySize: 9.5, padding: 0.5, minH: 0.9 }
  );

  // Centre capped cards vertically in their available slot
  const followupY = B.centreInSlot(cl.cards[0].y, cl.cards[0].h, followupCappedH);

  followups.forEach(([ftitle, desc], i) => {
    const card = cl.cards[i];
    addTopBarCard(s, card.x, followupY, card.w, followupCappedH, ftitle, desc, {
      barH: 0.05, padX: 0.14, titleY: 0.1, titleH: 0.36, bodyY: 0.5, titleSize: 11, bodySize: 9.5,
    });
  });
}

// ---- CLOSING SLIDE: NEXT STEPS ------------------------------------------

/**
 * Closing slide — "Next Steps" variant.
 *
 * Numbered action items with owner and deadline columns. Each row has a teal
 * number, bold action text, owner name, and a by-when date. Clean, scannable,
 * action-oriented layout inspired by McKinsey/BCG/Bain project deliverables.
 *
 * Best for: internal updates, steering committees, project kick-offs, team
 * meetings — anywhere people need to leave with assigned work.
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.headline                  Headline text (e.g. "Next Steps")
 * @param {Array<{action: string, owner: string, deadline: string}>} data.actions
 *        3–5 action items with owner and deadline
 * @param {string} [data.notes]  Optional speaker notes
 */
function closingNextSteps(pres, data) {
  const { headline = "Next Steps", actions, notes } = data;
  const s = pres.addSlide();
  s.background = { color: C.navy };
  if (notes) s.addNotes(notes);

  const layout = B.closingNextStepsLayout(actions.length);

  // Cap row heights: measure tallest action text, add padding for valign middle
  const actionTextW = layout.rows[0] ? layout.rows[0].actionW : 4;
  const maxContentH = B.maxTextInSet(
    actions.map(a => a.action),
    { fontSize: layout.fonts.action, width: actionTextW, padding: 0.2, minH: 0.44 }
  );
  const maxRowH = Math.min(maxContentH, 0.6); // hard cap: rows never taller than 0.6"
  const rows = B.cappedRowGroup(layout.rows, maxRowH);

  // Teal left bar
  s.addShape("rect", { x: layout.bar.x, y: layout.bar.y, w: layout.bar.w, h: layout.bar.h, fill: { color: C.teal }, line: { color: C.teal } });

  // Headline
  s.addText(headline, {
    x: layout.headline.x, y: layout.headline.y, w: layout.headline.w, h: layout.headline.h,
    fontFace: FONT, fontSize: layout.fonts.headline, bold: true, color: C.white, margin: 0,
  });

  // Column headers — positioned relative to first row
  const headerY = rows[0].y - 0.26;
  s.addText("ACTION", {
    x: rows[0].actionX, y: headerY, w: rows[0].actionW, h: 0.22,
    fontFace: FONT, fontSize: 8, bold: true, color: C.teal, charSpacing: 1.5, margin: 0,
  });
  s.addText("OWNER", {
    x: rows[0].ownerX, y: headerY, w: rows[0].ownerW, h: 0.22,
    fontFace: FONT, fontSize: 8, bold: true, color: C.teal, charSpacing: 1.5, margin: 0,
  });
  s.addText("BY WHEN", {
    x: rows[0].deadlineX, y: headerY, w: rows[0].deadlineW, h: 0.22,
    fontFace: FONT, fontSize: 8, bold: true, color: C.teal, charSpacing: 1.5, margin: 0,
  });

  // Action rows
  actions.forEach((item, i) => {
    const row = rows[i];

    // Alternating row background
    if (i % 2 === 0) {
      s.addShape("rect", {
        x: layout.contentLeft, y: row.y, w: layout.contentW, h: row.h,
        fill: { color: C.navyCard }, line: { color: C.navyCard },
      });
    }

    // Number
    s.addText(String(i + 1), {
      x: row.numX, y: row.y, w: row.numW, h: row.h,
      fontFace: FONT, fontSize: layout.fonts.num, bold: true, color: C.teal,
      valign: "middle", margin: 0,
    });

    // Action text
    s.addText(item.action, {
      x: row.actionX, y: row.y, w: row.actionW, h: row.h,
      fontFace: FONT, fontSize: layout.fonts.action, bold: true, color: C.white,
      valign: "middle", margin: 0,
    });

    // Owner
    s.addText(item.owner, {
      x: row.ownerX, y: row.y, w: row.ownerW, h: row.h,
      fontFace: FONT, fontSize: layout.fonts.owner, color: C.offWhite,
      valign: "middle", margin: 0,
    });

    // Deadline
    s.addText(item.deadline, {
      x: row.deadlineX, y: row.y, w: row.deadlineW, h: row.h,
      fontFace: FONT, fontSize: layout.fonts.deadline, color: C.mid,
      valign: "middle", margin: 0,
    });
  });
}

// ---- CLOSING SLIDE: KEY TAKEAWAYS ---------------------------------------

/**
 * Closing slide — "Key Takeaways" variant.
 *
 * Numbered takeaway rows displayed as full-width accent-bar cards. Each row
 * has a large teal number and a single bold conclusion statement. No new
 * information — just the 3–5 most important messages restated for retention.
 *
 * Best for: conference talks, training sessions, informational presentations,
 * knowledge-sharing — wherever the audience needs to remember what was said.
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.headline                Headline text (e.g. "Key Takeaways")
 * @param {string[]} data.takeaways             3–5 one-sentence takeaway statements
 * @param {string} [data.notes]  Optional speaker notes
 */
function closingTakeaways(pres, data) {
  const { headline = "Key Takeaways", takeaways, notes } = data;
  const s = pres.addSlide();
  s.background = { color: C.navy };
  if (notes) s.addNotes(notes);

  const layout = B.closingTakeawaysLayout(takeaways.length);

  // Cap item heights: measure tallest takeaway text, add padding
  const textW = layout.items[0] ? layout.items[0].w - 0.9 : 6; // numW + padding
  const maxContentH = B.maxTextInSet(
    takeaways,
    { fontSize: layout.fonts.body, width: textW, padding: 0.24, minH: 0.5 }
  );
  const maxItemH = Math.min(maxContentH, 0.7); // hard cap: items never taller than 0.7"
  const items = B.cappedRowGroup(layout.items, maxItemH);

  // Teal left bar
  s.addShape("rect", { x: layout.bar.x, y: layout.bar.y, w: layout.bar.w, h: layout.bar.h, fill: { color: C.teal }, line: { color: C.teal } });

  // Headline
  s.addText(headline, {
    x: layout.headline.x, y: layout.headline.y, w: layout.headline.w, h: layout.headline.h,
    fontFace: FONT, fontSize: layout.fonts.headline, bold: true, color: C.white, margin: 0,
  });

  // Takeaway items — accent-bar cards with number + statement
  takeaways.forEach((text, i) => {
    const item = items[i];
    const numW = 0.5;

    // Card background with left accent bar
    addAccentBox(s, item.x, item.y, item.w, item.h);

    // Teal number
    s.addText(String(i + 1), {
      x: item.x + 0.14, y: item.y, w: numW, h: item.h,
      fontFace: FONT, fontSize: layout.fonts.num, bold: true, color: C.teal,
      valign: "middle", margin: 0,
    });

    // Takeaway text
    s.addText(text, {
      x: item.x + numW + 0.2, y: item.y, w: item.w - numW - 0.4, h: item.h,
      fontFace: FONT, fontSize: layout.fonts.body, bold: true, color: C.white,
      valign: "middle", margin: 0,
    });
  });
}

// ---- CLOSING SLIDE: THE ASK ---------------------------------------------

/**
 * Closing slide — "The Ask" variant (McKinsey decision pattern).
 *
 * Four stacked elements: context (what decision we're facing), the ask itself
 * (large and bold), quantified consequence (what happens if we act / don't act),
 * and a single specific next step. Does NOT summarise the presentation — it
 * restates the decision and drives toward a yes/no.
 *
 * Best for: board presentations, budget requests, executive sponsor updates —
 * anywhere you need a clear decision from the audience.
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.context       Decision context (e.g. "We've validated the model...")
 * @param {string} data.ask           The ask (e.g. "Approve £180k for Phase 2 build-out")
 * @param {string} data.consequence   Quantified consequence (e.g. "Every week of delay...")
 * @param {string} data.nextStep      Single next step (e.g. "Sign SOW by Friday 8 Aug")
 * @param {string} [data.notes]       Optional speaker notes
 */
function closingAsk(pres, data) {
  const { context, ask, consequence, nextStep, notes } = data;
  const s = pres.addSlide();
  s.background = { color: C.navy };
  if (notes) s.addNotes(notes);

  const layout = B.closingAskLayout();

  // Teal left bar
  s.addShape("rect", { x: layout.bar.x, y: layout.bar.y, w: layout.bar.w, h: layout.bar.h, fill: { color: C.teal }, line: { color: C.teal } });

  // Context — muted, sets the scene
  s.addText(context, {
    x: layout.context.x, y: layout.context.y, w: layout.context.w, h: layout.context.h,
    fontFace: FONT, fontSize: layout.fonts.context, color: C.mid, valign: "bottom", margin: 0,
  });

  // The Ask — large, bold, teal-highlighted
  s.addText(ask, {
    x: layout.ask.x, y: layout.ask.y, w: layout.ask.w, h: layout.ask.h,
    fontFace: FONT, fontSize: layout.fonts.ask, bold: true, color: C.teal, valign: "middle", margin: 0,
  });

  // Divider
  s.addShape("rect", {
    x: layout.contentLeft, y: layout.dividerY, w: layout.contentW, h: 0.02,
    fill: { color: C.divider }, line: { color: C.divider },
  });

  // Consequence — what happens if we do/don't act
  s.addText("IF WE DON'T ACT", {
    x: layout.consequence.x, y: layout.consequence.y, w: 2, h: 0.2,
    fontFace: FONT, fontSize: layout.fonts.label, bold: true, color: C.teal, charSpacing: 1.5, margin: 0,
  });
  s.addText(consequence, {
    x: layout.consequence.x, y: layout.consequence.y + 0.24, w: layout.consequence.w, h: layout.consequence.h - 0.24,
    fontFace: FONT, fontSize: layout.fonts.consequence, color: C.offWhite, valign: "top", margin: 0,
  });

  // Next step — single action with teal arrow
  s.addText("NEXT STEP", {
    x: layout.nextStep.x, y: layout.nextStep.y, w: 2, h: 0.2,
    fontFace: FONT, fontSize: layout.fonts.label, bold: true, color: C.teal, charSpacing: 1.5, margin: 0,
  });
  s.addText(nextStep, {
    x: layout.nextStep.x, y: layout.nextStep.y + 0.24, w: layout.nextStep.w, h: layout.nextStep.h - 0.24,
    fontFace: FONT, fontSize: layout.fonts.nextStep, bold: true, color: C.white, valign: "top", margin: 0,
  });
}

// ---- COMPARISON TABLE SLIDE ---------------------------------------------

/**
 * Two-column comparison table: problem/blocker on the left, solution on the right.
 * Arrow separator between columns. Adapts row height and fonts to fit N rows.
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.label              Section label text
 * @param {string} data.headline           Bold headline text
 * @param {string} data.leftHeader         Left column header (e.g. "TYPICAL BLOCKER")
 * @param {string} data.rightHeader        Right column header (e.g. "HOW WE BRIDGE IT")
 * @param {Array<[string,string]>} data.rows  Array of [problem, solution] pairs (4–8 rows)
 * @param {string} [data.footer]           Optional footer text
 */
function comparisonTable(pres, data) {
  const { leftHeader, rightHeader, rows: rowData, footer } = data;
  const { s, header, ft } = beginContentSlide(pres, data);

  const layout = B.comparisonTableLayout(rowData.length, {
    top: header.contentTop,
    bottom: ft.contentBottom,
  });

  // Cap row heights: measure tallest text across both columns + padding
  const allTexts = rowData.flatMap(([problem, solution]) => [problem, solution]);
  const cellTextW = Math.min(layout.leftW, layout.rightW) - 0.2;
  const maxContentH = B.maxTextInSet(
    allTexts,
    { fontSize: layout.fonts.body, width: cellTextW, padding: 0.16, minH: 0.4 }
  );
  const maxRowH = Math.min(maxContentH, 0.7); // hard cap: rows never taller than 0.7"
  const rows = B.cappedRowGroup(layout.rows, maxRowH);

  // Column headers
  s.addText(leftHeader.toUpperCase(), {
    x: layout.headers.leftX, y: layout.headers.y, w: layout.headers.leftW, h: layout.headers.h,
    fontFace: FONT, fontSize: layout.fonts.header, bold: true, color: C.teal,
    charSpacing: 1.5, margin: 0,
  });
  s.addText(rightHeader.toUpperCase(), {
    x: layout.headers.rightX, y: layout.headers.y, w: layout.headers.rightW, h: layout.headers.h,
    fontFace: FONT, fontSize: layout.fonts.header, bold: true, color: C.teal,
    charSpacing: 1.5, margin: 0,
  });

  // Rows with alternating subtle background
  rowData.forEach(([problem, solution], i) => {
    const row = rows[i];

    // Subtle alternating row background
    if (i % 2 === 0) {
      s.addShape("rect", {
        x: MARGIN, y: row.y, w: W - MARGIN * 2, h: row.h,
        fill: { color: C.navyCard }, line: { color: C.navyCard },
      });
    }

    // Left cell: problem
    s.addText(problem, {
      x: layout.leftX + 0.1, y: row.y + 0.04, w: layout.leftW - 0.2, h: row.h - 0.08,
      fontFace: FONT, fontSize: layout.fonts.body, color: C.offWhite, valign: "middle", margin: 0,
    });

    // Arrow separator
    s.addText("→", {
      x: layout.arrowX, y: row.y, w: layout.arrowW, h: row.h,
      fontFace: FONT, fontSize: layout.fonts.arrow, bold: true, color: C.teal,
      align: "center", valign: "middle", margin: 0,
    });

    // Right cell: solution
    s.addText(solution, {
      x: layout.rightX + 0.1, y: row.y + 0.04, w: layout.rightW - 0.2, h: row.h - 0.08,
      fontFace: FONT, fontSize: layout.fonts.body, color: C.offWhite, valign: "middle", margin: 0,
    });
  });

  addFooter(s, footer, ft);
}

// ---- PROCESS GRID SLIDE -------------------------------------------------

/**
 * Numbered process/lifecycle grid: N steps arranged in a cols × rows grid.
 * Each cell has a big teal number, bold title, and muted description.
 * Auto-determines grid shape from count (e.g. 10 → 5×2, 6 → 3×2).
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.label              Section label text
 * @param {string} data.headline           Bold headline text
 * @param {string} [data.lead]             Optional lead paragraph below headline
 * @param {Array<{title: string, desc: string}>} data.steps  Steps with title + description
 * @param {number} [data.cols]             Force column count (otherwise auto)
 * @param {string} [data.footer]           Optional footer text
 */
function processGrid(pres, data) {
  const { lead, steps, cols: forcedCols, footer } = data;
  const { s, header, ft } = beginContentSlide(pres, data);

  // Optional lead paragraph
  let contentTop = renderLead(s, lead, header.contentTop);

  // ---- Pass 1: get fonts + cell width from a natural (unconstrained) layout
  const layoutPass1 = B.processGridLayout(steps.length, {
    top: contentTop,
    bottom: ft.contentBottom,
    cols: forcedCols,
  });

  const cellW = layoutPass1.cells[0] ? layoutPass1.cells[0].w : 2;
  const textW = cellW - 0.24; // horizontal padding inside each cell

  // ---- Measure content with the fonts from pass 1 ----
  // Uniform title height: sized to the tallest title across all cells so the
  // number zone always ends at the same Y offset regardless of title length.
  const uniformTitleH = B.maxTextInSet(
    steps.map(step => step.title),
    { fontSize: layoutPass1.fonts.title, width: textW, padding: 0.06, minH: 0.3 }
  );

  // Fixed padding used for top and bottom of each cell
  const topPad = 0.08;
  //   Zone breakdown per cell:
  //     topPad (0.08)      top clearance
  //     numZoneEstimate    number (35% of cell — circular, so estimated below)
  //     uniformTitleH      title
  //     tallestDescH       description
  //     topPad (0.08)      bottom clearance
  // We measure description height first, then derive the minimum total cell height.
  const tallestDescH = steps.reduce((max, step) => {
    if (!step.desc) return max;
    return Math.max(max, B.textHeight(step.desc, { fontSize: layoutPass1.fonts.body, width: textW }));
  }, 0);

  // Minimum cell height: top pad + 35% num probe (we use uniformTitleH * 1.5 as a
  // reasonable num zone estimate) + uniformTitleH + desc + bottom pad
  const numZoneEstimate = Math.max(uniformTitleH * 1.5, 0.45);
  const minCellH = topPad + numZoneEstimate + uniformTitleH + tallestDescH + topPad;

  // ---- Pass 2: re-run layout with the content-derived floor ----
  // This makes cells grow when text is long (overflow fix).
  const layout = B.processGridLayout(steps.length, {
    top: contentTop,
    bottom: ft.contentBottom,
    cols: forcedCols,
    minCellH,
  });

  // ---- Sparse fix: cap and centre cells that are taller than their content ----
  // cappedCellH ≤ layout.cells[0].h (the slot height).
  // When content is short, cappedCellH < slot → centreInSlot shifts Y down.
  // When content is long (minCellH kicked in), cappedCellH ≈ slot → no shift.
  const cellSlotH = layout.cells[0] ? layout.cells[0].h : minCellH;
  const cappedCellH = B.cappedCardHeight(
    steps.map(step => ({ title: step.title, body: step.desc || "" })),
    { slotH: cellSlotH, textW, titleSize: layout.fonts.title, bodySize: layout.fonts.body, padding: 0.6, minH: 1.0 }
  );

  // Row-slot Y positions (one per row of the grid — always 2 rows)
  // We need to know where each row's slot starts to centre within it.
  // layout.cells gives us the cell positions already placed at their row's Y.
  // The slot for row R starts at the Y of the first cell in that row.
  const rowSlotY = [
    layout.cells[0] ? layout.cells[0].y : contentTop,
    layout.cells[layout.cols] ? layout.cells[layout.cols].y : contentTop,
  ];

  steps.forEach((step, i) => {
    const cell = layout.cells[i];
    const rowIndex = Math.floor(i / layout.cols);
    const slotY = rowSlotY[rowIndex] || cell.y;

    // Vertically centre the capped cell within the row slot
    const cellY = B.centreInSlot(slotY, cellSlotH, cappedCellH);

    // Cell background + teal top bar (drawn at cappedCellH, not the full slot)
    addTopBarBox(s, cell.x, cellY, cell.w, cappedCellH, { barH: 0.04 });

    // Number — proportional to capped cell height
    const numZoneH = cappedCellH * 0.35;
    s.addText(String(i + 1), {
      x: cell.x + 0.12, y: cellY + topPad, w: 0.6, h: numZoneH,
      fontFace: FONT, fontSize: layout.fonts.num, bold: true, color: C.teal, margin: 0,
    });

    // Title — uniform height across all cells based on longest title
    const titleY = cellY + topPad + numZoneH;
    s.addText(step.title, {
      x: cell.x + 0.12, y: titleY, w: textW, h: uniformTitleH,
      fontFace: FONT, fontSize: layout.fonts.title, bold: true, color: C.white, margin: 0,
    });

    // Description — fills remaining space below the uniform title
    const descY = titleY + uniformTitleH;
    const descH = cellY + cappedCellH - descY - topPad;
    if (step.desc && descH > 0.05) {
      s.addText(step.desc, {
        x: cell.x + 0.12, y: descY, w: textW, h: descH,
        fontFace: FONT, fontSize: layout.fonts.body, color: C.mid, valign: "top", margin: 0,
      });
    }
  });

  addFooter(s, footer, ft);
}

// ---- CASE STUDY SLIDE ---------------------------------------------------

/**
 * Case study: narrative left with stacked sections (Challenge, Approach, etc.),
 * outcomes right with stat/label rows.
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.label              Section label text
 * @param {string} data.headline           Bold headline text
 * @param {Array<{heading: string, body: string}>} data.sections  Left-panel sections
 * @param {Array<[string,string]>} data.outcomes  Array of [stat, description] pairs
 * @param {string} [data.footer]           Optional footer text
 */
function caseStudy(pres, data) {
  const { sections, outcomes, footer } = data;
  const { s, header, ft } = beginContentSlide(pres, data, { headlineFontSize: 22 });

  const layout = B.caseStudyLayout(sections.length, outcomes.length, {
    top: header.contentTop,
    bottom: ft.contentBottom,
  });

  // Left panel: navyCard box with teal top bar and stacked sections
  addTopBarBox(s, layout.left.x, layout.left.y, layout.left.w, layout.left.h);

  // Stack sections inside the left box
  const secPositions = B.sectionStack(sections, {
    top: layout.left.y + 0.2,
    width: layout.left.w - 0.32,
    headingSize: layout.fonts.sectionHeading,
    bodySize: layout.fonts.sectionBody,
  });

  sections.forEach((sec, i) => {
    const pos = secPositions[i];
    s.addText(sec.heading.toUpperCase(), {
      x: layout.left.x + 0.16, y: pos.headingY, w: layout.left.w - 0.32, h: 0.28,
      fontFace: FONT, fontSize: layout.fonts.sectionHeading, bold: true, color: C.teal, margin: 0,
    });
    s.addText(sec.body, {
      x: layout.left.x + 0.16, y: pos.bodyY, w: layout.left.w - 0.32, h: pos.bodyH,
      fontFace: FONT, fontSize: layout.fonts.sectionBody, color: C.offWhite, valign: "top", margin: 0,
    });
  });

  // Right panel: "OUTCOMES" label + stat rows
  s.addText("OUTCOMES", {
    x: layout.outcomeLabel.x, y: layout.outcomeLabel.y, w: layout.outcomeLabel.w, h: layout.outcomeLabel.h,
    fontFace: FONT, fontSize: 8.5, bold: true, color: C.teal, charSpacing: 2, margin: 0,
  });

  outcomes.forEach(([stat, desc], i) => {
    const row = layout.outcomes[i];

    // Row background + teal left accent
    addAccentBox(s, layout.right.x, row.y, layout.right.w, row.h, { barW: 0.05 });

    // Adaptive stat column width: measure the stat text width,
    // symbols (✓, ✗, •) get less space; long strings ("10–20x") get more
    const isSymbolOnly = stat.length <= 2 && /[^\w\s£$€%]/.test(stat);
    const statCharW = layout.fonts.stat * 0.6 / 72; // approximate char width
    const measuredStatW = stat.length * statCharW;
    const statColW = isSymbolOnly
      ? Math.max(measuredStatW + 0.2, 0.5)   // compact for symbols
      : Math.max(measuredStatW + 0.3, 0.7);  // generous for numbers
    const statFontSize = isSymbolOnly
      ? Math.min(layout.fonts.stat * 1.3, 22) // slightly larger for symbols
      : layout.fonts.stat;
    const descX = layout.right.x + statColW + 0.2;
    const descW = layout.right.w - statColW - 0.34;

    // Stat
    s.addText(stat, {
      x: layout.right.x + 0.14, y: row.y + 0.04, w: statColW, h: row.h - 0.08,
      fontFace: FONT, fontSize: statFontSize, bold: true, color: C.white,
      valign: "middle", margin: 0,
    });
    // Description
    s.addText(desc, {
      x: descX, y: row.y + 0.04, w: descW, h: row.h - 0.08,
      fontFace: FONT, fontSize: layout.fonts.label, color: C.offWhite,
      valign: "middle", margin: 0,
    });
  });

  addFooter(s, footer, ft);
}

// ---- PRODUCT DEEP-DIVE SLIDE --------------------------------------------

/**
 * Product deep-dive: headline + lead text, then two named sections each
 * containing a row of cards. Good for "What it does / What it unlocks" slides.
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.label              Section label text
 * @param {string} data.headline           Bold headline text
 * @param {string} [data.lead]             Optional lead paragraph
 * @param {Array<{name: string, cards: Array<{title: string, body: string}>}>} data.sections
 *        Two sections, each with a name and card array (2–4 cards each)
 * @param {string} [data.footer]           Optional footer text
 */
function productDeepDive(pres, data) {
  const { lead, sections: sectionData, footer } = data;
  const { s, header, ft } = beginContentSlide(pres, data);

  // Use the cardsPerSection from the first section (or default 3)
  const cardsPerSection = sectionData[0] ? sectionData[0].cards.length : 3;
  const layout = B.productDeepDiveLayout(cardsPerSection, {
    top: header.contentTop,
    bottom: ft.contentBottom,
  });

  // Lead text
  if (lead) {
    addLead(s, lead, layout.lead.x, layout.lead.y, layout.lead.w, layout.lead.h, {
      fontSize: layout.fonts.lead,
    });
  }

  // Two sections
  sectionData.forEach((section, si) => {
    if (si >= 2) return; // max 2 sections
    const sec = layout.sections[si];

    // Section label
    s.addText(section.name.toUpperCase(), {
      x: sec.label.x, y: sec.label.y, w: sec.label.w, h: sec.label.h,
      fontFace: FONT, fontSize: layout.fonts.sectionLabel, bold: true, color: C.teal,
      charSpacing: 1.5, margin: 0,
    });

    // Cards
    section.cards.forEach((card, ci) => {
      if (ci >= sec.cards.length) return; // don't overflow
      const slot = sec.cards[ci];

      // Card with teal top bar + title/body content
      addTopBarCard(s, slot.x, slot.y, slot.w, slot.h, card.title, card.body, {
        barH: 0.05, padX: 0.14, titleY: 0.12, titleH: 0.4, bodyY: 0.54,
        titleSize: layout.fonts.cardTitle, bodySize: layout.fonts.cardBody,
      });
    });
  });

  addFooter(s, footer, ft);
}

// ---- PROOF POINTS SLIDE -------------------------------------------------

/**
 * Proof points: lead text + N evidence cards in a 2-column grid.
 * Each card is large enough for a headline and several sentences of narrative.
 *
 * @param {object} pres   pptxgenjs Presentation object
 * @param {object} data
 * @param {string} data.label              Section label text
 * @param {string} data.headline           Bold headline text
 * @param {string} [data.lead]             Optional lead paragraph
 * @param {Array<{title: string, body: string}>} data.points  Proof point cards (2–6)
 * @param {string} [data.footer]           Optional footer text
 */
function proofPoints(pres, data) {
  const { lead, points, footer } = data;
  const { s, header, ft } = beginContentSlide(pres, data);

  const layout = B.proofPointsLayout(points.length, {
    top: header.contentTop,
    bottom: ft.contentBottom,
    leadH: lead ? 0.28 : 0,
    leadGap: lead ? 0.12 : 0,
  });

  // Lead text
  if (lead) {
    addLead(s, lead, layout.lead.x, layout.lead.y, layout.lead.w, layout.lead.h, {
      fontSize: layout.fonts.lead,
    });
  }

  // Adaptive card height cap — measure tallest card's content, cap to avoid
  // oversized empty boxes when content is sparse
  const cardTextW = layout.cards[0] ? layout.cards[0].w - 0.4 : 3;
  const cappedH = B.cappedCardHeight(
    points,
    { slotH: layout.cards[0] ? layout.cards[0].h : 99, textW: cardTextW, titleSize: layout.fonts.cardTitle, bodySize: layout.fonts.cardBody, padding: 0.7, minH: 1.2 }
  );

  // Centre capped cards vertically within each row's slot height
  const slotH = layout.cards[0] ? layout.cards[0].h : cappedH;
  const cardYOffset = (slotH - cappedH) / 2;

  // Proof point cards — render with capped height, vertically centred in row
  points.forEach((point, i) => {
    const card = layout.cards[i];
    const adjustedY = card.y + cardYOffset;

    // Card with teal left accent bar + title/body content
    addAccentCard(s, card.x, adjustedY, card.w, cappedH, point.title, point.body, {
      padX: 0.2, titleY: 0.14, titleH: 0.4, bodyY: 0.56,
      titleSize: layout.fonts.cardTitle, bodySize: layout.fonts.cardBody,
    });
  });

  addFooter(s, footer, ft);
}

// ---- Export ---------------------------------------------------------------
module.exports = {
  cover,
  stats,
  executiveSummary,
  sectionDivider,
  narrativeCards,
  roadmap,
  closingDiscussionPrompt,
  closingNextSteps,
  closingTakeaways,
  closingAsk,
  comparisonTable,
  processGrid,
  caseStudy,
  productDeepDive,
  proofPoints,
};
