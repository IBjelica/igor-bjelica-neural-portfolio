/**
 * Reads the traced drawing out of `src/assets/brain.svg` and hands back two
 * lists of path data.
 *
 * The file is imported as raw text and split here rather than injected with
 * `dangerouslySetInnerHTML`, so the hero can render real React nodes: the
 * sulci need refs for the pointer response and the outline needs its own
 * class, and neither is reachable inside an innerHTML blob.
 *
 * This runs once at module scope. The file is a build input, not user content.
 */

import brainSvg from "../assets/brain.svg?raw";

/** Pulls the `d` of every `<path>` inside the named `<g>`. */
function extractGroup(source: string, id: string): string[] {
  const group = new RegExp(`<g id="${id}">([\\s\\S]*?)</g>`).exec(source);
  if (!group) return [];

  return Array.from(group[1].matchAll(/\sd="([^"]+)"/g)).map(
    (match) => match[1]
  );
}

/** The closed silhouette. One path in practice, but the tracer can emit more. */
export const OUTLINE_PATHS = extractGroup(brainSvg, "brain-outline");

/** The visible surface folds. Around 330 open polylines. */
export const SULCI_PATHS = extractGroup(brainSvg, "brain-sulci");

if (import.meta.env.DEV && OUTLINE_PATHS.length === 0) {
  // Silent failure here would show an empty hero with no error anywhere, so
  // say so loudly. Regenerate with `npm run trace:brain`.
  console.error(
    "[brainArt] No outline paths found in src/assets/brain.svg — the hero will render blank."
  );
}
