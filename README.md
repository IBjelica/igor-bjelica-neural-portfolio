# igorbjelica.com

Personal portfolio site for Igor Bjelica, built with React, TypeScript and Three.js.

**Live:** https://igorbjelica.com

## Overview

A single-page portfolio with an interactive WebGL hero, a selected-work section,
and the usual background sections (about, experience, skills, contact). It is a
static site — no backend, no database, no API calls at runtime.

The hero is the part worth reading the source for: a 3D brain model split into
seven selectable anatomical regions, with hover and click handled by raycasting
against the mesh rather than by overlaid DOM hotspots.

## The interactive hero

`src/components/BrainExplorer.tsx` holds the entire scene. It runs one
`useEffect` that builds the scene, starts a render loop, and tears everything
down on unmount.

**Region selection.** The model is a GLTF file whose seven meshes are named
after the regions they represent (`Frontal_Lobe`, `Cerebellum`, and so on). On
load, each mesh name is matched against a `REGION_CONFIG` map and the matching
key is stored on `mesh.userData.regionKey`. Pointer interaction then works by
raycasting: a ray is cast from the camera through the pointer position and the
first mesh it hits identifies the region. Selection and hover both resolve
through the same mechanism, so there is no separate hit-testing geometry to keep
in sync with the model.

**Hover feedback.** Hovering shifts a region's emissive colour toward cyan and
raises its intensity, eased per frame toward a target rather than snapped. The
currently selected region is excluded from hover response so that selection stays
the strongest state on screen.

**Soft region borders.** Because the model is cut into regions along planes, the
seams between them would otherwise be hard straight lines. Two things soften
them. `scripts/split-brain.mjs` offsets each cut threshold by a shared 3D noise
value when generating the model, so borders wander instead of running ruler
straight. It also bakes a per-vertex `_REGIONFADE` weight into each mesh, which
the runtime reads and feeds into the material through an `onBeforeCompile` patch
that multiplies `totalEmissiveRadiance` by that weight — so a region's glow
falls off toward its edges instead of ending on a line.

**Lighting and post-processing.** The scene environment is a gradient generated
into a canvas texture and passed through `PMREMGenerator`, which gives the
materials something to reflect. Rendering goes through an `EffectComposer` chain
of `RenderPass` → `UnrealBloomPass` → `OutputPass`; tone mapping and the sRGB
conversion happen once, in the output pass.

**Performance and teardown notes in the code:**

- The hover raycast runs at most once per animation frame, not once per
  `pointermove` event, which can fire well above the frame rate.
- Hover is skipped for non-mouse pointers, so a tap on a touch device does not
  latch a region into a permanent hover state.
- Device pixel ratio is clamped to 2 (`setPixelRatio(Math.min(dpr, 2))`).
- Unmount disposes geometries, materials, textures, the environment render
  target, the composer and the bloom pass, then releases the WebGL context.
  Materials are cloned per mesh so per-region colour changes do not bleed —
  which also means each clone has to be disposed individually.
- The model carries no textures at all — one material, shaded entirely at
  runtime — and ships compressed with `EXT_meshopt_compression` and
  `KHR_mesh_quantization`, decoded by the `MeshoptDecoder` wired into the
  loader. `@gltf-transform/cli` is the dev dependency used to produce it.

Parts of this codebase, the Three.js work included, were built with substantial
AI assistance.

## Tech stack

- **React 18** with **TypeScript**
- **Vite 5** (build and dev server), `@vitejs/plugin-react-swc`
- **Three.js 0.181** — GLTFLoader, OrbitControls, EffectComposer post-processing
- **React Router 6** — routing for the index and 404 pages
- **Tailwind CSS 3** with **shadcn/ui** (Radix primitives) for UI components
- **TanStack Query** — installed and provider-mounted, not yet used for data
- **ESLint 9** with `typescript-eslint`

Most page styling is hand-written CSS using custom properties in
`src/styles.css`, not Tailwind utilities. Tailwind is present for the
`components/ui` layer.

## Project structure

```
public/
  brain-regions.glb        3D model, seven named region meshes
scripts/
  split-brain.mjs          Splits a source brain model into named regions,
                           bakes the per-vertex edge-fade weight
src/
  components/
    BrainExplorer.tsx      The WebGL hero — scene, interaction, teardown
    Projects.tsx           Selected work grid and detail modals
    About.tsx  Experience.tsx  Skills.tsx  Contact.tsx  Header.tsx  Footer.tsx
    ui/                    shadcn/ui components (Radix + Tailwind)
  data/
    projects.ts            Project content, typed — the only file to edit
                           when adding a case study
  pages/
    Index.tsx              Page composition and global scroll/nav behaviour
    NotFound.tsx
  styles.css               Design tokens and all section styling
  index.css                Tailwind layers
```

## Running locally

Requires Node.js 20 or newer.

```sh
npm install
npm run dev      # dev server on http://localhost:8080
```

Other scripts:

```sh
npm run build      # production build to dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit over app and node configs
npm run lint       # eslint
```

No environment variables are required.

## Deployment

Pushing to `main` triggers `.github/workflows` to install, typecheck, lint,
build, and rsync `dist/` to the production host. The lint step is set to
`continue-on-error`, so it reports without blocking a deploy.
