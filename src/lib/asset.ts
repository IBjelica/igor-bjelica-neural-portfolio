/**
 * Resolves a path under `public/` against the deployed base.
 *
 * Needed because the GitHub Pages preview is served from a repository
 * sub-path, not from the root. A literal `/work/shot.png` resolves to the
 * domain root there and 404s; Vite rewrites such paths inside index.html and
 * inside imported modules, but not strings sitting in a data file.
 *
 * `import.meta.env.BASE_URL` is "/" for the production build, so this is a
 * no-op there.
 */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}
