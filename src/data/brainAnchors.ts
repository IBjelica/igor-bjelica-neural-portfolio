/**
 * Where the navigation attaches to the drawing.
 *
 * Two coordinate spaces are in play and mixing them is the easy mistake:
 *
 *   BRAIN space  — `src/assets/brain.svg`'s own viewBox, 1000 x 825. Produced
 *                  by `scripts/trace-brain.mjs` and only valid for the SVG
 *                  that run generated.
 *   STAGE space  — the hero's viewBox. Bigger than the brain so the labels
 *                  have somewhere to live. Its size and the brain's placement
 *                  inside it depend on the shape of the screen; both live in
 *                  `layout.ts`.
 *
 * Anchors below are written in BRAIN space so they travel with the drawing and
 * survive a change of layout. `toStage` converts, given a layout.
 *
 * To re-derive any of these numbers after changing the trace:
 *
 *   npm run trace:brain -- --profile
 *
 * which prints the silhouette's left and right edge on every scanline, plus
 * the seven region centroids. Every anchor here was checked against that table
 * to confirm it lands inside the drawing.
 */

import type { Layout } from "./layout";

export const BRAIN_VIEWBOX = { width: 1000, height: 825 } as const;

export type AnchorId =
  | "work"
  | "skills"
  | "projects"
  | "experiments"
  | "contact"
  | "basketball"
  | "family"
  | "music"
  | "chess"
  | "anime";

export interface Point {
  x: number;
  y: number;
}

/**
 * Anchor positions in BRAIN space.
 *
 * Ten points spread around the drawing. Five are the region centroids the
 * trace script reports — the actual anatomical structures; the other five are
 * hand-placed on distinct features, because seven centroids cannot carry ten
 * labels without clustering. Every one was verified to sit inside the
 * silhouette, against the scanline noted beside it.
 *
 * Listed in clockwise order, because that order is the point: a link and a
 * note alternate the whole way round, so the five words that navigate are not
 * all gathered down one side of the head. Moving a word to a different anchor
 * breaks that alternation — and, if it crosses another word's position in the
 * ring, makes their leader lines cross too.
 */
export const ANCHORS: Record<AnchorId, Point> = {
  work: { x: 110, y: 420 }, //      frontal pole       (scanline 425:  29..987)
  basketball: { x: 224, y: 289 }, // Frontal_Lobe centroid
  skills: { x: 330, y: 150 }, //    superior frontal   (scanline 150: 122..856)
  family: { x: 700, y: 165 }, //    precentral         (scanline 175: 112..861)
  projects: { x: 905, y: 330 }, //  occipital          (scanline 325:  15..951)
  music: { x: 860, y: 480 }, //     lateral occipital  (scanline 475:  58..965)
  experiments: { x: 729, y: 610 }, // Cerebellum centroid
  chess: { x: 656, y: 745 }, //     Brain_Stem centroid (scanline 750: 630..682)
  contact: { x: 421, y: 538 }, //   Temporal_Lobe centroid
  anime: { x: 258, y: 511 }, //     Limbic_System centroid
};

/** BRAIN space to STAGE space, for a given layout. */
export function toStage(point: Point, layout: Layout): Point {
  return {
    x: point.x * layout.brain.scale + layout.brain.x,
    y: point.y * layout.brain.scale + layout.brain.y,
  };
}

/** Centre of the drawing in STAGE space — the pivot for tilt and for parking. */
export function brainCentre(layout: Layout): Point {
  return toStage(
    { x: BRAIN_VIEWBOX.width / 2, y: BRAIN_VIEWBOX.height / 2 },
    layout
  );
}
