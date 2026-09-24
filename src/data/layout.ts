/**
 * Stage geometry, one set per shape of screen.
 *
 * A single layout cannot serve both. On a phone the wide stage is 219px tall
 * for ten labels, and its left column puts the right edge of "Experiments"
 * at 61px in a 390px viewport — the word runs off the screen. So the narrow
 * layout is a different drawing: taller stage, smaller brain, columns pulled
 * in close.
 *
 * Anchors stay in BRAIN space (see `brainAnchors.ts`) and are shared. Only the
 * placement of the brain, the column positions and the label heights change.
 *
 * Stroke widths are NOT here — they are in styles.css, under the matching
 * media query. They have to move with the layout: stroke-width is in user
 * units, so shrinking the brain shrinks its strokes too, and the narrow
 * layout needs roughly three times the number to land on the same hairline.
 * `NARROW_QUERY` is the single breakpoint both sides read.
 */

import type { AnchorId } from "./brainAnchors";

export const NARROW_QUERY = "(max-width: 860px)";

export interface Column {
  /** Where the word sits. Right edge for the left column, left edge for the right. */
  labelX: number;
  /** Where the leader line turns into its horizontal shelf. Must clear the brain. */
  elbowX: number;
}

export interface Layout {
  stage: { width: number; height: number };
  /** Placement of the 1000x825 drawing inside the stage. */
  brain: { x: number; y: number; scale: number };
  left: Column;
  right: Column;
  labelY: Record<AnchorId, number>;
  /** The folds are a smudge below a certain size. */
  showSulci: boolean;
}

/**
 * Desktop. The brain sits at natural size with a 300-unit margin either side.
 * Elbows clear the silhouette at its widest, which spans x 314..1287 here.
 */
export const WIDE: Layout = {
  stage: { width: 1600, height: 900 },
  brain: { x: 300, y: 38, scale: 1 },
  left: { labelX: 250, elbowX: 300 },
  right: { labelX: 1350, elbowX: 1300 },
  labelY: {
    work: 165,
    skills: 320,
    projects: 455,
    experiments: 590,
    contact: 735,
    basketball: 150,
    family: 305,
    music: 450,
    chess: 620,
    anime: 775,
  },
  showSulci: true,
};

/**
 * Phones and narrow tablets. Portrait stage, brain at about half the width,
 * columns tight against it.
 *
 * At a 390px viewport one stage unit is 0.433px, which makes the two tightest
 * words the constraint on everything else:
 *
 *   "Experiments"  79px wide at 0.75rem. Right-aligned to labelX 210, so it
 *                  runs from 12px to 91px. 12px of clearance.
 *   "Basketball"   53px wide at 0.7rem. Left-aligned at labelX 725, so it runs
 *                  from 314px to 367px. 23px of clearance.
 *
 * The brain gets what is left: x 235..700, or 201px. If either column moves,
 * re-check those two words first — they are what will break.
 */
export const NARROW: Layout = {
  stage: { width: 900, height: 1150 },
  brain: { x: 235, y: 383, scale: 0.465 },
  left: { labelX: 210, elbowX: 222 },
  right: { labelX: 725, elbowX: 710 },
  labelY: {
    work: 120,
    skills: 340,
    projects: 560,
    experiments: 780,
    contact: 1000,
    basketball: 170,
    family: 390,
    music: 610,
    chess: 830,
    anime: 1050,
  },
  // 327 fold paths inside a 220px silhouette read as dirt, not anatomy.
  showSulci: false,
};
