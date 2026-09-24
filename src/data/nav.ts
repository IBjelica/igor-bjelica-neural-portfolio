/**
 * The ten words on the diagram.
 *
 * Five are the entire navigation. Five are notes — things that take up room in
 * the same head but are not part of the site. The notes are deliberately not
 * interactive: they are set lighter, hung off thinner leader lines, and hidden
 * from assistive technology, so the diagram reads as an annotated plate rather
 * than as ten things to try clicking.
 *
 * Where each word sits is not here — that is geometry, and it changes with the
 * shape of the screen, so it lives in `layout.ts`. What is here is only which
 * words exist, what they point at, and where they go.
 *
 * One constraint spans both files: within a column, anchor order down the page
 * must match label order down the page. That is what keeps leader lines from
 * crossing each other, and it is the thing to re-check when editing either.
 */

import type { AnchorId } from "./brainAnchors";

export interface NavNode {
  id: AnchorId;
  label: string;
}

export interface NavLink extends NavNode {
  /** Route path. `/` is the brain itself, so every link has a real segment. */
  slug: string;
}

export const NAV_LINKS: NavLink[] = [
  { id: "work", label: "Work", slug: "/work" },
  { id: "skills", label: "Skills", slug: "/skills" },
  { id: "projects", label: "Projects", slug: "/projects" },
  { id: "experiments", label: "Experiments", slug: "/experiments" },
  { id: "contact", label: "Contact", slug: "/contact" },
];

export const NAV_NOTES: NavNode[] = [
  { id: "basketball", label: "Basketball" },
  { id: "family", label: "Family" },
  { id: "music", label: "Music" },
  { id: "chess", label: "Chess" },
  { id: "anime", label: "Anime" },
];

export function findLinkBySlug(pathname: string): NavLink | undefined {
  return NAV_LINKS.find((link) => link.slug === pathname);
}
