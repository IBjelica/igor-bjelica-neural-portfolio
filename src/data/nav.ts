/**
 * The ten words on the diagram.
 *
 * Five are the entire navigation. Five are notes — things that take up room in
 * the same head but are not part of the site. The notes are deliberately not
 * interactive: they are set lighter, hung off thinner leader lines, and hidden
 * from assistive technology, so the diagram reads as an annotated plate rather
 * than as ten things to try clicking.
 *
 * Geometry, in STAGE space (see `brainAnchors.ts`):
 *
 *     label        elbow                    anchor
 *       Work  ──────┐                         ·
 *                   └────────────────────────╯
 *     x=252      x=348                    ANCHORS.work
 *
 * A leader line is two segments: a straight run from the anchor out to the
 * elbow, then a short horizontal shelf into the word. The shelf is what stops
 * a diagonal from colliding with the text it points at.
 *
 * `labelY` is set by hand rather than taken from the anchor. Anchors sit where
 * the anatomy is, which bunches them; labels need an even vertical rhythm to
 * stay readable. Both columns are ordered so that anchor order down the page
 * matches label order down the page — that is what keeps leader lines from
 * crossing each other, and it is the constraint to preserve when editing.
 */

import type { AnchorId } from "./brainAnchors";

export interface NavNode {
  id: AnchorId;
  label: string;
  /** Vertical position of the word, in STAGE space. */
  labelY: number;
}

export interface NavLink extends NavNode {
  /** Route path. `/` is the brain itself, so every link has a real segment. */
  slug: string;
}

/**
 * Where a column's words sit, and where their leader lines turn.
 *
 * Both elbows clear the silhouette at its widest. In STAGE space the drawing
 * spans x 314..1287 at the broadest scanline, so an elbow inside 300..1300
 * would put the horizontal shelf on top of the anatomy instead of beside it.
 */
export const COLUMN = {
  left: { labelX: 250, elbowX: 300, textAnchor: "end" as const },
  right: { labelX: 1350, elbowX: 1300, textAnchor: "start" as const },
};

export const NAV_LINKS: NavLink[] = [
  { id: "work", label: "Work", slug: "/work", labelY: 165 },
  { id: "skills", label: "Skills", slug: "/skills", labelY: 320 },
  { id: "projects", label: "Projects", slug: "/projects", labelY: 455 },
  { id: "experiments", label: "Experiments", slug: "/experiments", labelY: 590 },
  { id: "contact", label: "Contact", slug: "/contact", labelY: 735 },
];

export const NAV_NOTES: NavNode[] = [
  { id: "basketball", label: "Basketball", labelY: 150 },
  { id: "family", label: "Family", labelY: 305 },
  { id: "music", label: "Music", labelY: 450 },
  { id: "chess", label: "Chess", labelY: 620 },
  { id: "anime", label: "Anime", labelY: 775 },
];

/** Every route the brain can navigate to, for the router and for guards. */
export const NAV_SLUGS = NAV_LINKS.map((link) => link.slug);

export function findLinkBySlug(pathname: string): NavLink | undefined {
  return NAV_LINKS.find((link) => link.slug === pathname);
}
