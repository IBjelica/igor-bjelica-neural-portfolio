/**
 * Stage geometry, one set per shape of screen.
 *
 * A single layout cannot serve both. On a phone the wide stage has no room to
 * ring the drawing with words at all, so the narrow layout is a different
 * drawing: portrait stage, smaller brain, words in two tight staggered
 * columns rather than scattered.
 *
 * Anchors stay in BRAIN space (see `brainAnchors.ts`) and are shared. Only the
 * placement of the brain and the position of each word change.
 *
 * Stroke widths are NOT here — they are in styles.css, under the matching
 * media query. They have to move with the layout: stroke-width is in user
 * units, so shrinking the brain shrinks its strokes too. `NARROW_QUERY` is the
 * single breakpoint both sides read.
 */

import type { AnchorId } from "./brainAnchors";

export const NARROW_QUERY = "(max-width: 860px)";

/** Which edge of the word the leader line arrives at. */
export type Align = "start" | "end";

export interface LabelSpot {
  /**
   * Where the word sits, in STAGE units. This is the edge the leader meets:
   * the right edge for `end`, the left edge for `start`.
   */
  x: number;
  y: number;
  align: Align;
}

export interface Layout {
  stage: { width: number; height: number };
  /** Placement of the 1000x825 drawing inside the stage. */
  brain: { x: number; y: number; scale: number };
  /**
   * Length of the horizontal shelf between the elbow and the word. Without
   * it a diagonal leader arrives on top of the text it points at.
   */
  shelf: number;
  label: Record<AnchorId, LabelSpot>;
  /** The folds are a smudge below a certain size. */
  showSulci: boolean;
}

/**
 * Desktop.
 *
 * The brain is scaled to 0.82 rather than sitting at natural size, which is
 * what opens the ring of space the words are scattered into — at full size
 * the top and bottom margins are about 34px and nothing fits above or below
 * the drawing.
 *
 * Positions are hand-placed and hand-checked. Three things have to hold, and
 * they are what to re-verify after moving anything:
 *
 *   1. No word overlaps another.
 *   2. No word sits on the drawing. In stage units the silhouette spans
 *      roughly x 400..1200, y 130..790 — but it is not a rectangle, so check
 *      the scanline with `npm run trace:brain -- --profile`.
 *   3. No two leader lines cross. Crossing the drawing itself is fine and is
 *      how an anatomical plate reads; crossing each other is not.
 */
export const WIDE: Layout = {
  stage: { width: 1600, height: 900 },
  brain: { x: 390, y: 112, scale: 0.82 },
  shelf: 46,
  label: {
    // Going clockwise from the upper left. Links and notes alternate, so the
    // five that do something are not all down one side.
    basketball: { x: 300, y: 250, align: "end" },
    skills: { x: 560, y: 92, align: "end" },
    family: { x: 1090, y: 88, align: "start" },
    projects: { x: 1290, y: 300, align: "start" },
    music: { x: 1330, y: 520, align: "start" },
    experiments: { x: 1230, y: 700, align: "start" },
    chess: { x: 980, y: 858, align: "start" },
    contact: { x: 620, y: 800, align: "end" },
    anime: { x: 330, y: 620, align: "end" },
    work: { x: 200, y: 430, align: "end" },
  },
  showSulci: true,
};

/**
 * Phones and narrow tablets. Portrait stage, brain at just under half the
 * width, two columns hard against it.
 *
 * Scattering needs a ring of empty space and there is none at this width, so
 * the words stay in columns — but a word goes to the side its anchor is on,
 * which keeps links and notes mixed on both sides and keeps leader lines from
 * crossing.
 *
 * At a 390px viewport one stage unit is 0.433px, and the longest word in each
 * column is the constraint:
 *
 *   "Basketball"   53px at 0.7rem, right-aligned to x 210 -> runs 38..91px.
 *   "Experiments"  79px at 0.75rem, left-aligned at x 700 -> runs 303..382px.
 *
 * Eight pixels of clearance on the right is the tightest measurement in the
 * layout. Check it first if anything here moves.
 */
export const NARROW: Layout = {
  stage: { width: 900, height: 1150 },
  brain: { x: 235, y: 395, scale: 0.435 },
  shelf: 14,
  label: {
    // Left column, ordered by anchor height so leaders cannot cross.
    skills: { x: 210, y: 120, align: "end" },
    basketball: { x: 210, y: 340, align: "end" },
    work: { x: 210, y: 560, align: "end" },
    anime: { x: 210, y: 780, align: "end" },
    contact: { x: 210, y: 1000, align: "end" },
    // Right column, likewise.
    family: { x: 700, y: 170, align: "start" },
    projects: { x: 700, y: 390, align: "start" },
    music: { x: 700, y: 610, align: "start" },
    experiments: { x: 700, y: 830, align: "start" },
    chess: { x: 700, y: 1050, align: "start" },
  },
  // 327 fold paths inside a 190px silhouette read as dirt, not anatomy.
  showSulci: false,
};

/** Where a leader turns from its diagonal run into the shelf. */
export function elbowX(spot: LabelSpot, layout: Layout): number {
  return spot.align === "end" ? spot.x + layout.shelf : spot.x - layout.shelf;
}
