/**
 * bigspark-slides theme — atoms layer.
 *
 * Raw design tokens: palette, font, slide dimensions, and spacing constants.
 * Zero logic, zero dependencies. Every other module imports from here.
 */

// ---- Palette ----------------------------------------------------------------
const C = {
  navy:     "040038",
  navyCard: "0D1554",
  navyDark: "140820",
  teal:     "18FFFF",
  blue:     "2A4A9E",
  blueMid:  "3D5FBF",
  white:    "FFFFFF",
  offWhite: "E8E8F0",
  mid:      "8888AA",
  divider:  "1A1A6A",
};

// ---- Typography ---------------------------------------------------------
const FONT = "Montserrat";

// ---- Slide dimensions ---------------------------------------------------
const W = 10;
const H = 5.625;
const MARGIN = 0.4;

// ---- Spacing & sizing constants (used by layout/block functions) --------
const DEFAULTS = {
  W,
  H,
  MARGIN,
  CONTENT_TOP:    1.5,      // default y where content starts (below label + headline)
  BOTTOM_PAD:     0.40,     // minimum clearance from slide bottom (matches side MARGIN)
  CARD_GAP:       0.09,     // standard gap between adjacent cards
  CARD_TITLE_H:   0.52,     // height reserved for a card title
  CARD_TITLE_PAD: 0.56,     // y offset from card top to body start (title + spacing)
  CARD_PAD_X:     0.16,     // horizontal padding inside a card
  CARD_TOP_BAR:   0.06,     // teal top bar height on cards
  ACCENT_BAR_W:   0.06,     // left accent bar width

  // Slide header geometry (label + headline on content slides)
  LABEL_Y:        0.28,     // y position for the teal caps label
  HEADLINE_Y:     0.56,     // y position for the bold headline

  // Closing-variant layout tokens (shared by 4 closing layouts)
  CLOSING_BAR_W:       0.12,  // teal left bar width on closing slides
  CLOSING_TOP:         0.66,  // headline/statements start y
  CLOSING_HEADLINE_H:  0.56,  // headline text box height
  CLOSING_HEADLINE_GAP: 0.24, // gap below headline before rows/items

  // Table/grid gaps
  TABLE_ROW_GAP:  0.06,     // vertical gap between table rows (comparisonTable, caseStudy)
  GRID_GAP_Y:     0.14,     // vertical gap in multi-row grids (processGrid, proofPoints)
};

// ---- Export ---------------------------------------------------------------
module.exports = { C, FONT, W, H, MARGIN, DEFAULTS };
