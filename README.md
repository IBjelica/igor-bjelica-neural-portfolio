# igorbjelica.com

Personal portfolio site for Igor Bjelica, built with React, TypeScript and Vite.

**Live:** https://igorbjelica.com

## Overview

A single-page portfolio whose navigation is a drawing. The hero is an
anatomical plate of a brain in thin off-black lines on off-white paper, with
hairline leader lines running from points on the anatomy out to single words.
Five of those words are the entire navigation. Five are notes — things that
occupy the same head but are not part of the site — set lighter, hung off
thinner lines, and hidden from assistive technology.

Clicking a word flies the drawing into the top-right corner, where it shrinks
into an icon that toggles it back, and the section fades onto the emptied page.
Each section is a real route, so links are shareable and the back button
returns to the brain.

Static site — no backend, no database, no API calls at runtime.

## The hero

### The drawing is generated, not hand-authored

`scripts/trace-brain.mjs` traces `public/brain-regions.glb` — a 3D model — into
`src/assets/brain.svg`. An earlier version of this site rendered that model
live in Three.js. Tracing it instead keeps the anatomy honest while taking
WebGL out of the bundle entirely.

```sh
npm run trace:brain              # regenerate the drawing
npm run trace:brain -- --profile # + print silhouette extents per scanline
```

The pipeline:

1. **Decode.** The model ships meshopt-compressed *and* quantized, so the
   script shells out to the `gltf-transform` CLI (`dequantize`, not `copy` —
   copy leaves the quantization in place and the file still will not load).
   Dequantization pushes a per-region scale and translation onto each node, so
   every vertex goes through its node's transform before anything else.
2. **Project.** Orthographic, left-lateral. Screen X is world +Z, screen Y is
   world +Y, depth is world X. Orthographic rather than perspective because a
   technical drawing wants every fold at true scale.
3. **Rasterize** depth and region id into one grid, which then does three jobs:
   the silhouette comes from its coverage, hidden-line removal reads its depth,
   and the label anchors come from its per-region centroids.
4. **Find the folds.** Crease edges (adjacent faces disagreeing by more than
   `--crease` degrees) plus true silhouette edges. Vertices are welded across
   regions first — without that, every cut made by `split-brain.mjs` reads as a
   boundary edge and the tracer draws seven artificial slice lines across the
   drawing.
5. **Cull, chain, simplify.** Occluded edges are dropped against the depth
   buffer *and* against the silhouette mask; culling by depth alone leaves the
   creases of stray slivers drawn in empty space. What survives is chained into
   polylines, simplified, and smoothed into cubics.

Every threshold is a flag with a documented default. `scripts/.debug/` gets a
preview SVG with visible strokes and the anchor dots — open that to judge a
change rather than reasoning about the numbers.

### How it reacts to the pointer

`src/hooks/usePointerFollow.ts`, one animation frame loop, no React state:

- Two copies of the pointer position chase it at different rates (0.04 and
  0.10). The whole drawing shifts and tilts by the slow one; the folds shift by
  the **difference** between the two, so they trail the outline when the
  pointer moves quickly and settle flush when it stops. The difference of two
  lag values is a velocity in all but name.
- Two sine waves at 0.51 and 0.23 rad/s keep it breathing when the pointer is
  still. Different frequencies, so the loop never visibly repeats.
- Folds near the cursor darken and thicken on a distance falloff. A spatial
  hash over precomputed path samples keeps this to a few dozen elements a
  frame instead of all 327.

Switched off entirely under `prefers-reduced-motion`, and on narrow screens,
where there is no pointer and the folds are not drawn.

### Coordinate spaces

Three, and mixing them is the easy mistake:

| Space | Where | What |
|---|---|---|
| BRAIN | `src/assets/brain.svg` | 1000 × 825, the traced drawing |
| STAGE | `src/data/layout.ts` | the hero's viewBox — size and brain placement vary by breakpoint |
| page | CSS | labels are HTML, positioned as a percentage of the figure box |

Label anchors live in BRAIN space so they survive a re-trace or a change of
layout. `toStage()` converts.

The drawing and leader lines are SVG because they are geometry; the words are
HTML because they are links and need real focus rings and text rendering. The
two layers stay registered only because the figure is locked to the stage's
aspect ratio — which is why its width is capped against viewport height and
never its height. Clamping the height would override `aspect-ratio`, and the
words would slide away from the lines pointing at them.

### Things that look cosmetic and are not

- The background transition is declared on the base `html` rule, not next to
  the colour it animates. A transition introduced by the same style change that
  alters the value does not run — the property jumps, silently.
- Every boot animation runs *from* its opening state, leaving the settled value
  as the element's base. Written the other way round, any frame where the
  animation does not run renders a blank hero — which is what a tab opened in
  the background does, since its timeline stays frozen until first viewed.
- `useParkTransform` strips the transform before measuring. Landing directly on
  a section URL renders the figure already parked at the CSS fallback scale, so
  measuring it as-is computes a scale wrong by that factor.

## Tech stack

- **React 18** with **TypeScript**
- **Vite 5**, `@vitejs/plugin-react-swc`
- **React Router 6**
- Hand-written CSS with custom properties in `src/styles.css`. Tailwind and the
  `components/ui` (shadcn/Radix) layer are still installed but nothing in the
  site imports them.
- **ESLint 9** with `typescript-eslint`

No Three.js, no WebGL, no runtime 3D.

## Project structure

```
public/
  brain-regions.glb        3D model — input to the tracer, not shipped to users
scripts/
  trace-brain.mjs          Traces the model into flat SVG line art
  split-brain.mjs          How brain-regions.glb was cut into named regions
src/
  assets/brain.svg         Generated. Edit the tracer, not this.
  components/
    BrainNav.tsx           The hero
    sections/              One component per route
  data/
    brainAnchors.ts        Where the navigation attaches to the anatomy
    layout.ts              Stage geometry, one set per breakpoint
    nav.ts                 Which words exist and where they go
    projects.ts            Case studies — the only file to edit for new work
    experience.ts  skills.ts
  hooks/
    usePointerFollow.ts    Drift and wake
    useParkTransform.ts    The flight to the corner
  lib/brainArt.ts          Splits the generated SVG into outline and folds
  pages/Index.tsx          The shell: brain, or brain-in-corner plus content
  styles.css               Design tokens and all styling
```

## Running locally

Requires Node.js 20 or newer.

```sh
npm install
npm run dev      # http://localhost:8080
```

```sh
npm run build      # production build to dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run trace:brain
```

No environment variables are required.

## Deployment

Pushing to `main` triggers `.github/workflows` to install, typecheck, lint,
build, and rsync `dist/` to the production host. The lint step is set to
`continue-on-error`, so it reports without blocking a deploy. `nginx.conf`
already serves `/index.html` for unknown paths, which is what makes the
section routes work on refresh.

Parts of this codebase were built with substantial AI assistance.
