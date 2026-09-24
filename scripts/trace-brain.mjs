/**
 * Traces `public/brain-regions.glb` into `public/brain.svg` — a flat anatomical
 * plate: one silhouette outline plus one path per visible surface fold.
 *
 * The hero is a 2D line drawing, but the brain it draws is the same model the
 * old WebGL hero used. Tracing rather than redrawing keeps the anatomy honest
 * and keeps label anchors on real features.
 *
 * Pipeline:
 *   1. Decode the model. It ships meshopt-compressed AND quantized, and each
 *      region node carries its own scale/translation, so every vertex has to go
 *      through its node's world matrix before anything else.
 *   2. Project orthographically from a left-lateral view. Screen X is world +Z
 *      (posterior), screen Y is world +Y, depth is world X. The frontal pole
 *      lands on the left, which is the conventional way to draw this.
 *   3. Rasterize depth and region id into a grid. That single buffer then does
 *      three jobs: the silhouette comes from its coverage, hidden-line removal
 *      reads its depth, and label anchors come from its per-region centroids.
 *   4. Take crease edges (adjacent faces disagreeing by more than
 *      --crease degrees) and true silhouette edges (one adjacent face toward
 *      the camera, one away). Those are the folds.
 *   5. Drop occluded edges against the depth buffer, chain what survives into
 *      polylines, simplify, and smooth.
 *
 * Usage:
 *   node scripts/trace-brain.mjs
 *   node scripts/trace-brain.mjs --crease 30 --min-length 14 --res 2048
 *
 * Writes public/brain.svg, plus scripts/.debug/trace-preview.svg — open that
 * one to judge the result. It carries visible strokes and the anchor dots;
 * brain.svg deliberately carries no styling at all, because CSS drives the
 * stroke colour and width at runtime.
 */

import { NodeIO } from "@gltf-transform/core";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- Tuning ---------------------------------------------------------------
// Every knob lives here. The defaults are the ones the shipped brain.svg was
// generated with; changing them means regenerating and re-checking the anchors
// in src/data/brainAnchors.ts, which are expressed in this file's viewBox.
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
};

const OPTIONS = {
  /** Raster width, in pixels, used for coverage/depth. Higher = smoother
   *  silhouette and stricter occlusion, at the cost of runtime. */
  res: flag("res", 1800),
  /** Dihedral angle, in degrees, above which a shared edge counts as a fold.
   *  Lower finds more sulci and eventually finds mesh noise too. */
  crease: flag("crease", 32),
  /** Drop traced polylines shorter than this, in viewBox units. The single
   *  most effective noise control — raise it before lowering `crease`. */
  minLength: flag("min-length", 26),
  /** Ramer-Douglas-Peucker tolerance, in viewBox units. */
  simplify: flag("simplify", 0.6),
  /** How far apart two segment endpoints may sit and still be chained into one
   *  fold, in viewBox units. Occlusion sampling cuts edges at fractional
   *  positions, so exact endpoint equality is rare — this has to be generous
   *  or every sulcus shatters into flecks. */
  chainTolerance: flag("chain-tolerance", 2.5),
  /** Sharpest turn, in degrees, the chainer will follow. Stops a fold from
   *  doubling back into an unrelated neighbour that happens to touch it. */
  maxTurn: flag("max-turn", 72),
  /** Morphological opening radius, in raster pixels, applied to coverage
   *  before the silhouette is traced. Removes the one-pixel slivers that
   *  stray triangles leave hanging off the outline. */
  open: flag("open", 3),
  /** Depth tolerance for the occlusion test, as a fraction of model depth.
   *  Too small and every fold self-occludes into dashes; too large and folds
   *  on the far side bleed through. */
  depthBias: flag("depth-bias", 0.004),
  /** Samples per edge for the occlusion test. */
  samples: flag("samples", 7),
  /** Catmull-Rom tension for the smoothing pass. 0 disables smoothing. */
  tension: flag("tension", 1),
  /** viewBox width. Height follows the model's aspect ratio. */
  viewWidth: flag("view-width", 1000),
  /** Padding inside the viewBox, in viewBox units. */
  padding: flag("padding", 12),
};

const SOURCE = join(ROOT, "public", "brain-regions.glb");
const OUT_SVG = join(ROOT, "public", "brain.svg");
const DEBUG_DIR = join(ROOT, "scripts", ".debug");
const OUT_DEBUG = join(DEBUG_DIR, "trace-preview.svg");

// --- 1. Decode ------------------------------------------------------------

/**
 * `NodeIO` on its own cannot open the shipped model: it is compressed with
 * EXT_meshopt_compression and stored with KHR_mesh_quantization, and refuses
 * files whose required extensions it has no handler for. The gltf-transform
 * CLI already registers both, so shelling out to it is cheaper and far less
 * fragile than wiring a decoder in here.
 *
 * `dequantize` (not `copy`) is the right subcommand — copy decodes meshopt but
 * leaves the quantization in place, which still fails to load.
 */
function decodeToTemp() {
  const out = join(tmpdir(), "brain-trace-dequantized.glb");
  const fresh =
    existsSync(out) && statSync(out).mtimeMs > statSync(SOURCE).mtimeMs;

  if (!fresh) {
    console.log("decoding  brain-regions.glb (meshopt + quantization)...");
    execFileSync(
      join(ROOT, "node_modules", ".bin", "gltf-transform"),
      ["dequantize", SOURCE, out],
      { stdio: ["ignore", "ignore", "inherit"] }
    );
  }
  return out;
}

/**
 * Flattens the document into one world-space triangle soup.
 *
 * Dequantization pushes a per-mesh scale and translation onto each region's
 * node, so vertices read straight off the accessor are in seven different
 * local spaces. Applying the node transform is not optional here.
 */
async function loadTriangles(path) {
  const doc = await new NodeIO().read(path);
  const root = doc.getRoot();

  const positions = [];
  const indices = [];
  const triRegion = [];
  const regionNames = [];

  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;

    const regionId = regionNames.length;
    regionNames.push(node.getName() || mesh.getName() || `region_${regionId}`);

    const [tx, ty, tz] = node.getTranslation();
    const [sx, sy, sz] = node.getScale();

    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      const idx = prim.getIndices();
      const base = positions.length / 3;
      const vertex = [];

      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, vertex);
        positions.push(
          vertex[0] * sx + tx,
          vertex[1] * sy + ty,
          vertex[2] * sz + tz
        );
      }

      const count = idx ? idx.getCount() : pos.getCount();
      for (let i = 0; i < count; i += 3) {
        indices.push(
          base + (idx ? idx.getScalar(i) : i),
          base + (idx ? idx.getScalar(i + 1) : i + 1),
          base + (idx ? idx.getScalar(i + 2) : i + 2)
        );
        triRegion.push(regionId);
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
    triRegion: new Uint8Array(triRegion),
    regionNames,
  };
}

// --- 2. Project -----------------------------------------------------------

/**
 * Orthographic left-lateral projection.
 *
 * Perspective would taper the far hemisphere and make the drawing read as a
 * photograph of a brain rather than as a plate of one. Orthographic keeps every
 * fold at true scale, which is what a technical drawing wants.
 *
 * Screen X = world +Z, screen Y = world +Y (flipped into SVG's downward Y),
 * depth = world X with smaller values nearer the camera.
 */
function project(positions, viewWidth, padding) {
  const n = positions.length / 3;
  let minU = Infinity, maxU = -Infinity;
  let minV = Infinity, maxV = -Infinity;
  let minD = Infinity, maxD = -Infinity;

  for (let i = 0; i < n; i++) {
    const d = positions[i * 3];
    const v = positions[i * 3 + 1];
    const u = positions[i * 3 + 2];
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
    if (d < minD) minD = d;
    if (d > maxD) maxD = d;
  }

  const inner = viewWidth - padding * 2;
  const scale = inner / (maxU - minU);
  const viewHeight = Math.round((maxV - minV) * scale + padding * 2);

  const screen = new Float32Array(n * 2);
  const depth = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    screen[i * 2] = padding + (positions[i * 3 + 2] - minU) * scale;
    // SVG Y grows downward; world +Y is up. Flip so the model stands upright.
    screen[i * 2 + 1] = padding + (maxV - positions[i * 3 + 1]) * scale;
    depth[i] = positions[i * 3];
  }

  return { screen, depth, viewHeight, depthRange: maxD - minD };
}

// --- 3. Rasterize ---------------------------------------------------------

/**
 * Scanline-rasterizes every triangle into a depth buffer and a parallel region
 * buffer, using barycentric coverage.
 *
 * All triangles are rasterized, not just front-facing ones. The seven region
 * meshes are each an open shell — only their union is closed — so culling per
 * triangle would punch holes in the depth buffer along every region seam.
 */
function rasterize(mesh, projected, gridW, gridH, viewWidth, viewHeight) {
  const { indices, triRegion } = mesh;
  const { screen, depth } = projected;

  const depthBuf = new Float32Array(gridW * gridH).fill(Infinity);
  const regionBuf = new Int8Array(gridW * gridH).fill(-1);

  const sx = gridW / viewWidth;
  const sy = gridH / viewHeight;

  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t], b = indices[t + 1], c = indices[t + 2];

    const ax = screen[a * 2] * sx, ay = screen[a * 2 + 1] * sy;
    const bx = screen[b * 2] * sx, by = screen[b * 2 + 1] * sy;
    const cx = screen[c * 2] * sx, cy = screen[c * 2 + 1] * sy;

    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (area === 0) continue;
    const invArea = 1 / area;

    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const x1 = Math.min(gridW - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const y1 = Math.min(gridH - 1, Math.ceil(Math.max(ay, by, cy)));

    const da = depth[a], db = depth[b], dc = depth[c];
    const region = triRegion[t / 3];

    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5;
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5;

        let w0 = ((bx - px) * (cy - py) - (by - py) * (cx - px)) * invArea;
        let w1 = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) * invArea;
        let w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;

        const d = w0 * da + w1 * db + w2 * dc;
        const i = y * gridW + x;
        if (d < depthBuf[i]) {
          depthBuf[i] = d;
          regionBuf[i] = region;
        }
      }
    }
  }

  return { depthBuf, regionBuf, gridW, gridH, sx, sy };
}

// --- 4. Silhouette --------------------------------------------------------

/**
 * Morphological opening — erode, then dilate by the same radius.
 *
 * Stray thin triangles in the model hang one- and two-pixel tabs off the
 * silhouette, and the contour tracer faithfully walks around every one of
 * them. Erosion deletes anything thinner than the kernel; the matching
 * dilation restores the real edge to its original position.
 *
 * Both passes are separable (horizontal then vertical), which turns a
 * (2r+1)^2 window into 2*(2r+1) and keeps this off the critical path.
 */
function openCoverage(covered, w, h, r) {
  if (r <= 0) return covered;

  const pass = (src, keepIf) => {
    const mid = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let acc = keepIf ? 1 : 0;
        for (let d = -r; d <= r; d++) {
          const nx = x + d;
          const v = nx < 0 || nx >= w ? 0 : src[y * w + nx];
          acc = keepIf ? acc & v : acc | v;
        }
        mid[y * w + x] = acc;
      }
    }
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let acc = keepIf ? 1 : 0;
        for (let d = -r; d <= r; d++) {
          const ny = y + d;
          const v = ny < 0 || ny >= h ? 0 : mid[ny * w + x];
          acc = keepIf ? acc & v : acc | v;
        }
        out[y * w + x] = acc;
      }
    }
    return out;
  };

  return pass(pass(covered, true), false);
}

/** Labels connected covered areas so specks can be dropped before tracing. */
function connectedComponents(covered, w, h) {
  const label = new Int32Array(w * h).fill(-1);
  const sizes = [];
  const stack = [];

  for (let start = 0; start < covered.length; start++) {
    if (!covered[start] || label[start] !== -1) continue;
    const id = sizes.length;
    let size = 0;
    stack.push(start);
    label[start] = id;

    while (stack.length) {
      const i = stack.pop();
      size++;
      const x = i % w, y = (i / w) | 0;
      if (x > 0 && covered[i - 1] && label[i - 1] === -1) { label[i - 1] = id; stack.push(i - 1); }
      if (x < w - 1 && covered[i + 1] && label[i + 1] === -1) { label[i + 1] = id; stack.push(i + 1); }
      if (y > 0 && covered[i - w] && label[i - w] === -1) { label[i - w] = id; stack.push(i - w); }
      if (y < h - 1 && covered[i + w] && label[i + w] === -1) { label[i + w] = id; stack.push(i + w); }
    }
    sizes.push(size);
  }

  return { label, sizes };
}

/** Neighbour offsets in rotational order, starting due west. */
const N8 = [
  [-1, 0], [-1, -1], [0, -1], [1, -1],
  [1, 0], [1, 1], [0, 1], [-1, 1],
];
const N8_INDEX = new Map(N8.map(([dx, dy], i) => [`${dx},${dy}`, i]));

/**
 * Moore-neighbourhood boundary following. Walks the outside of one labelled
 * blob and returns its contour in grid coordinates.
 *
 * Chosen over marching squares because the coverage grid is dense and already
 * component-labelled: following the boundary yields one ordered closed loop
 * directly, with no segment-stitching step to get wrong.
 *
 * The backtrack cell is what makes this work, and getting it wrong is the
 * classic way to break Moore tracing: the search for the next boundary pixel
 * must begin at the neighbour you *arrived from* and rotate forward, and the
 * new backtrack is the last background cell examined before the hit. Tracking
 * only a direction index instead lets the walk step back into the interior,
 * where it orbits the start pixel and returns a four-point contour.
 */
function traceContour(label, id, w, h) {
  let startIdx = -1;
  for (let i = 0; i < label.length; i++) {
    if (label[i] === id) { startIdx = i; break; }
  }
  if (startIdx < 0) return [];

  const inside = (x, y) =>
    x >= 0 && y >= 0 && x < w && y < h && label[y * w + x] === id;

  const sx = startIdx % w, sy = (startIdx / w) | 0;

  // Row-major scan guarantees nothing of this blob lies west or north of the
  // start pixel, so west is background and is a valid opening backtrack.
  let backtrack = 0;
  let cx = sx, cy = sy;

  const contour = [[sx, sy]];
  const seen = new Set([`${startIdx}:${backtrack}`]);
  const maxSteps = w * h * 4;

  for (let step = 0; step < maxSteps; step++) {
    let hit = -1;
    let prevProbe = backtrack;

    for (let k = 1; k <= 8; k++) {
      const d = (backtrack + k) % 8;
      const nx = cx + N8[d][0];
      const ny = cy + N8[d][1];
      if (inside(nx, ny)) { hit = d; break; }
      prevProbe = d;
    }
    if (hit < 0) break;

    const nx = cx + N8[hit][0];
    const ny = cy + N8[hit][1];

    // Re-express the last background cell probed relative to the pixel we are
    // about to stand on. That is the next backtrack.
    const bx = cx + N8[prevProbe][0] - nx;
    const by = cy + N8[prevProbe][1] - ny;
    const nextBacktrack = N8_INDEX.get(`${bx},${by}`) ?? (hit + 4) % 8;

    cx = nx; cy = ny; backtrack = nextBacktrack;

    // Jacob's stopping criterion: finish when the same pixel is entered from
    // the same side again. Testing position alone cuts pinched shapes short.
    const state = `${cy * w + cx}:${backtrack}`;
    if (seen.has(state)) break;
    seen.add(state);

    contour.push([cx, cy]);
  }

  return contour;
}

// --- 5. Folds -------------------------------------------------------------

/**
 * Welds vertices by position so the seven region shells behave as one surface.
 *
 * Without this, every region cut reads as a boundary edge with a single
 * adjacent face, and the tracer would draw the seven artificial slice lines
 * from `split-brain.mjs` straight across the drawing.
 */
function weld(positions) {
  const map = new Map();
  const remap = new Uint32Array(positions.length / 3);
  let next = 0;

  for (let i = 0; i < remap.length; i++) {
    const key =
      `${Math.round(positions[i * 3] * 1e5)},` +
      `${Math.round(positions[i * 3 + 1] * 1e5)},` +
      `${Math.round(positions[i * 3 + 2] * 1e5)}`;
    let id = map.get(key);
    if (id === undefined) { id = next++; map.set(key, id); }
    remap[i] = id;
  }

  return { remap, count: next };
}

function faceNormals(positions, indices) {
  const normals = new Float32Array(indices.length);
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    const vz = positions[c + 2] - positions[a + 2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    normals[t] = nx / len;
    normals[t + 1] = ny / len;
    normals[t + 2] = nz / len;
  }
  return normals;
}

/**
 * Collects the edges worth drawing: creases (the sulci) and true silhouettes
 * (where the surface turns away from the camera, which is what gives interior
 * contours their depth).
 */
function findFeatureEdges(mesh, welded, normals, creaseDegrees) {
  const { indices } = mesh;
  const { remap } = welded;
  const cosLimit = Math.cos((creaseDegrees * Math.PI) / 180);

  // Edge key -> first face seen. Second sighting resolves the pair and frees
  // the slot, so the map never holds more than the open frontier.
  const pending = new Map();
  const edges = [];

  for (let t = 0; t < indices.length; t += 3) {
    const face = t / 3;
    const v = [indices[t], indices[t + 1], indices[t + 2]];

    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3];
      const wa = remap[a], wb = remap[b];
      if (wa === wb) continue;
      const key = wa < wb ? `${wa}_${wb}` : `${wb}_${wa}`;

      const other = pending.get(key);
      if (other === undefined) {
        pending.set(key, { face, a, b });
        continue;
      }
      pending.delete(key);

      const f1 = other.face * 3;
      const f2 = face * 3;

      // Depth is world X and the camera looks along +X, so a face points at
      // the camera when its normal's X component is negative.
      const front1 = normals[f1] < 0;
      const front2 = normals[f2] < 0;
      if (front1 !== front2) {
        edges.push([other.a, other.b]);
        continue;
      }

      // Both faces face the same way: keep the edge only if the surface
      // actually creases there. Back-facing pairs are dropped outright —
      // they are on the far hemisphere and would be occluded anyway.
      if (!front1) continue;

      const dot =
        normals[f1] * normals[f2] +
        normals[f1 + 1] * normals[f2 + 1] +
        normals[f1 + 2] * normals[f2 + 2];
      if (dot < cosLimit) edges.push([other.a, other.b]);
    }
  }

  return edges;
}

/**
 * Keeps the parts of each feature edge that the surface does not hide.
 *
 * Samples along the edge and compares against the depth buffer. Runs of
 * consecutive visible samples become segments; a single visible sample in
 * isolation is discarded as noise.
 *
 * `mask` is the silhouette the drawing actually uses — after opening, and
 * after specks too small to outline have been dropped. Testing against it as
 * well as against depth is what keeps fold lines from floating outside the
 * outline: stray slivers in the model carry creases of their own, and culling
 * them by depth alone leaves those creases drawn in empty space.
 */
function cullHidden(edges, projected, raster, mask, options) {
  const { screen, depth, depthRange } = projected;
  const { depthBuf, gridW, gridH, sx, sy } = raster;
  const bias = depthRange * options.depthBias;
  const samples = options.samples;

  const segments = [];

  for (const [a, b] of edges) {
    const ax = screen[a * 2], ay = screen[a * 2 + 1], ad = depth[a];
    const bx = screen[b * 2], by = screen[b * 2 + 1], bd = depth[b];

    let runStart = -1;

    for (let s = 0; s <= samples; s++) {
      const t = s / samples;
      const px = ax + (bx - ax) * t;
      const py = ay + (by - ay) * t;
      const pd = ad + (bd - ad) * t;

      const gx = Math.min(gridW - 1, Math.max(0, Math.round(px * sx)));
      const gy = Math.min(gridH - 1, Math.max(0, Math.round(py * sy)));
      const cell = gy * gridW + gx;
      const visible = mask[cell] === 1 && pd <= depthBuf[cell] + bias;

      if (visible && runStart < 0) {
        runStart = t;
      } else if (!visible && runStart >= 0) {
        const end = (s - 1) / samples;
        if (end > runStart) {
          segments.push([
            ax + (bx - ax) * runStart, ay + (by - ay) * runStart,
            ax + (bx - ax) * end, ay + (by - ay) * end,
          ]);
        }
        runStart = -1;
      }
    }

    if (runStart >= 0 && runStart < 1) {
      segments.push([
        ax + (bx - ax) * runStart, ay + (by - ay) * runStart, bx, by,
      ]);
    }
  }

  return segments;
}

/**
 * Chains loose segments into polylines by matching endpoints on a coarse grid.
 *
 * Endpoints are bucketed rather than compared pairwise — there are tens of
 * thousands of segments, and the quadratic version of this takes minutes.
 *
 * Two details matter more than they look:
 *
 * The 3x3 bucket probe is not an optimisation, it is correctness. Bucketing at
 * the match tolerance means two endpoints well within tolerance still land in
 * different buckets whenever they straddle a cell boundary. Probing only the
 * home cell misses roughly half of all joins and shatters every sulcus into
 * flecks.
 *
 * Continuation is chosen by smallest turn, not by whichever segment is found
 * first. Folds cross and touch constantly on a brain; without the turn test a
 * chain hops onto whatever neighbour it meets and zigzags across the drawing.
 */
function chainSegments(segments, tolerance, maxTurnDegrees) {
  const cell = tolerance;
  const cellOf = (v) => Math.round(v / cell);
  const bucketKey = (ix, iy) => `${ix}_${iy}`;
  const minCos = Math.cos((maxTurnDegrees * Math.PI) / 180);

  const buckets = new Map();
  const push = (x, y, i) => {
    const k = bucketKey(cellOf(x), cellOf(y));
    const list = buckets.get(k);
    if (list) list.push(i);
    else buckets.set(k, [i]);
  };

  segments.forEach((s, i) => {
    push(s[0], s[1], i);
    push(s[2], s[3], i);
  });

  const near = (x, y) => {
    const ix = cellOf(x), iy = cellOf(y);
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const list = buckets.get(bucketKey(ix + dx, iy + dy));
        if (list) out.push(...list);
      }
    }
    return out;
  };

  const used = new Uint8Array(segments.length);
  const polylines = [];

  /**
   * Walks outward from one end of a segment, consuming the straightest
   * continuation available at each step.
   */
  const walk = (x, y, dirX, dirY) => {
    const path = [];
    let cx = x, cy = y, dx = dirX, dy = dirY;

    for (;;) {
      let best = -1;
      let bestCos = minCos;
      let bestStep = null;

      for (const i of near(cx, cy)) {
        if (used[i]) continue;
        const s = segments[i];

        let ex, ey, fromX, fromY;
        if (Math.hypot(s[0] - cx, s[1] - cy) <= tolerance) {
          fromX = s[0]; fromY = s[1]; ex = s[2]; ey = s[3];
        } else if (Math.hypot(s[2] - cx, s[3] - cy) <= tolerance) {
          fromX = s[2]; fromY = s[3]; ex = s[0]; ey = s[1];
        } else {
          continue;
        }

        const len = Math.hypot(ex - fromX, ey - fromY);
        if (len === 0) continue;
        const vx = (ex - fromX) / len;
        const vy = (ey - fromY) / len;
        const cos = dx * vx + dy * vy;

        if (cos > bestCos) {
          bestCos = cos;
          best = i;
          bestStep = [ex, ey, vx, vy];
        }
      }

      if (best < 0) break;
      used[best] = 1;
      [cx, cy, dx, dy] = bestStep;
      path.push([cx, cy]);
    }

    return path;
  };

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const s = segments[i];

    const len = Math.hypot(s[2] - s[0], s[3] - s[1]) || 1;
    const vx = (s[2] - s[0]) / len;
    const vy = (s[3] - s[1]) / len;

    // Grow in both directions from this seed so a polyline is not cut short
    // just because the walk happened to start in its middle.
    const forward = walk(s[2], s[3], vx, vy);
    const backward = walk(s[0], s[1], -vx, -vy);
    const line = [
      ...backward.reverse(),
      [s[0], s[1]],
      [s[2], s[3]],
      ...forward,
    ];
    if (line.length >= 2) polylines.push(line);
  }

  return polylines;
}

// --- 6. Geometry helpers --------------------------------------------------

function polylineLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return total;
}

/** Ramer-Douglas-Peucker, iterative so long contours cannot blow the stack. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;

  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];

  while (stack.length) {
    const [first, last] = stack.pop();
    if (last - first < 2) continue;

    const [x1, y1] = points[first];
    const [x2, y2] = points[last];
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);

    let maxDist = -1, maxIdx = -1;
    for (let i = first + 1; i < last; i++) {
      const [px, py] = points[i];
      const dist = len === 0
        ? Math.hypot(px - x1, py - y1)
        : Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / len;
      if (dist > maxDist) { maxDist = dist; maxIdx = i; }
    }

    if (maxDist > tolerance) {
      keep[maxIdx] = 1;
      stack.push([first, maxIdx], [maxIdx, last]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

const round = (n) => Math.round(n * 100) / 100;

/**
 * Renders points as a smooth cubic path using Catmull-Rom control points.
 *
 * A traced contour is a staircase of grid-aligned steps; drawn as straight
 * segments it reads as pixel art no matter how finely it is simplified.
 */
function toPath(points, { closed = false, tension = 1 } = {}) {
  if (points.length < 2) return "";
  if (tension === 0 || points.length < 3) {
    const body = points.slice(1).map((p) => `L${round(p[0])} ${round(p[1])}`);
    return `M${round(points[0][0])} ${round(points[0][1])}${body.join("")}${closed ? "Z" : ""}`;
  }

  const at = (i) => {
    if (closed) return points[(i + points.length) % points.length];
    return points[Math.min(points.length - 1, Math.max(0, i))];
  };

  const parts = [`M${round(points[0][0])} ${round(points[0][1])}`];
  const last = closed ? points.length : points.length - 1;

  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    parts.push(
      `C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2[0])} ${round(p2[1])}`
    );
  }

  return parts.join("") + (closed ? "Z" : "");
}

// --- 7. Run ---------------------------------------------------------------

const t0 = Date.now();

const mesh = await loadTriangles(decodeToTemp());
console.log(
  `loaded    ${mesh.indices.length / 3} triangles across ${mesh.regionNames.length} regions`
);

const projected = project(mesh.positions, OPTIONS.viewWidth, OPTIONS.padding);
const { viewHeight } = projected;

const gridW = OPTIONS.res;
const gridH = Math.round((gridW * viewHeight) / OPTIONS.viewWidth);
const raster = rasterize(mesh, projected, gridW, gridH, OPTIONS.viewWidth, viewHeight);
console.log(`raster    ${gridW}x${gridH}, viewBox 0 0 ${OPTIONS.viewWidth} ${viewHeight}`);

// Silhouette.
const rawCoverage = new Uint8Array(gridW * gridH);
for (let i = 0; i < rawCoverage.length; i++) {
  rawCoverage[i] = raster.regionBuf[i] >= 0 ? 1 : 0;
}
const covered = openCoverage(rawCoverage, gridW, gridH, OPTIONS.open);

const { label, sizes } = connectedComponents(covered, gridW, gridH);
const minBlob = gridW * gridH * 0.0004;
const gridToView = OPTIONS.viewWidth / gridW;

const outlinePaths = [];
const keptBlobs = new Set();

sizes.forEach((size, id) => {
  if (size < minBlob) return;
  const contour = traceContour(label, id, gridW, gridH);
  if (contour.length < 8) return;
  const view = contour.map(([x, y]) => [x * gridToView, y * gridToView]);
  const reduced = simplify(view, OPTIONS.simplify);
  if (reduced.length < 4) return;
  outlinePaths.push(toPath(reduced, { closed: true, tension: OPTIONS.tension }));
  keptBlobs.add(id);
});
console.log(
  `outline   ${outlinePaths.length} contour(s) from ${sizes.length} blob(s)`
);

// The mask the folds are clipped to: exactly the area the outlines enclose.
const silhouetteMask = new Uint8Array(gridW * gridH);
for (let i = 0; i < silhouetteMask.length; i++) {
  silhouetteMask[i] = keptBlobs.has(label[i]) ? 1 : 0;
}

// Folds.
const welded = weld(mesh.positions);
const normals = faceNormals(mesh.positions, mesh.indices);
const featureEdges = findFeatureEdges(mesh, welded, normals, OPTIONS.crease);
console.log(`creases   ${featureEdges.length} feature edges at ${OPTIONS.crease}deg`);

const visible = cullHidden(featureEdges, projected, raster, silhouetteMask, OPTIONS);
console.log(`visible   ${visible.length} segments survive occlusion`);

const chained = chainSegments(visible, OPTIONS.chainTolerance, OPTIONS.maxTurn);
const sulciPaths = chained
  .filter((line) => polylineLength(line) >= OPTIONS.minLength)
  .map((line) => simplify(line, OPTIONS.simplify))
  .filter((line) => line.length >= 2)
  .map((line) => toPath(line, { tension: OPTIONS.tension }));
console.log(
  `sulci     ${sulciPaths.length} paths kept of ${chained.length} chained (min length ${OPTIONS.minLength})`
);

// Region centroids, as the seed grid for src/data/brainAnchors.ts. Taken from
// visible pixels, so every one is guaranteed to land on the drawing rather
// than inside a fold that faces away.
const centroids = mesh.regionNames.map(() => ({ x: 0, y: 0, n: 0 }));
for (let i = 0; i < raster.regionBuf.length; i++) {
  const r = raster.regionBuf[i];
  if (r < 0 || silhouetteMask[i] !== 1) continue;
  centroids[r].x += (i % gridW) * gridToView;
  centroids[r].y += ((i / gridW) | 0) * gridToView;
  centroids[r].n++;
}

const anchors = mesh.regionNames
  .map((name, i) => ({
    name,
    x: round(centroids[i].x / (centroids[i].n || 1)),
    y: round(centroids[i].y / (centroids[i].n || 1)),
    pixels: centroids[i].n,
  }))
  .filter((a) => a.pixels > 0);

// --- 8. Write -------------------------------------------------------------

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${OPTIONS.viewWidth} ${viewHeight}" fill="none">`,
  `<g id="brain-outline">`,
  ...outlinePaths.map((d) => `<path d="${d}"/>`),
  `</g>`,
  `<g id="brain-sulci">`,
  ...sulciPaths.map((d) => `<path d="${d}"/>`),
  `</g>`,
  `</svg>`,
].join("\n");

writeFileSync(OUT_SVG, svg + "\n");

mkdirSync(DEBUG_DIR, { recursive: true });
const debug = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${OPTIONS.viewWidth} ${viewHeight}">`,
  `<rect width="100%" height="100%" fill="#F4F2EE"/>`,
  `<g fill="none" stroke="#17171A" stroke-width="1.6" stroke-linecap="round">`,
  ...outlinePaths.map((d) => `<path d="${d}"/>`),
  `</g>`,
  `<g fill="none" stroke="#17171A" stroke-opacity="0.45" stroke-width="0.9" stroke-linecap="round">`,
  ...sulciPaths.map((d) => `<path d="${d}"/>`),
  `</g>`,
  ...anchors.map(
    (a) =>
      `<circle cx="${a.x}" cy="${a.y}" r="5" fill="#C0392B"/>` +
      `<text x="${a.x + 9}" y="${a.y + 4}" font-family="monospace" font-size="13" fill="#C0392B">${a.name}</text>`
  ),
  `<text x="12" y="${viewHeight - 12}" font-family="monospace" font-size="13" fill="#6E6E73">` +
    `crease ${OPTIONS.crease}deg · min-length ${OPTIONS.minLength} · simplify ${OPTIONS.simplify} · res ${OPTIONS.res} · ${sulciPaths.length} folds</text>`,
  `</svg>`,
].join("\n");

writeFileSync(OUT_DEBUG, debug + "\n");

console.log(`\nwrote     public/brain.svg (${(svg.length / 1024).toFixed(1)} KB)`);
console.log(`wrote     scripts/.debug/trace-preview.svg  <- open this one`);
console.log(`\nregion centroids, in viewBox units (seed for src/data/brainAnchors.ts):`);
for (const a of anchors) {
  console.log(`  ${a.name.padEnd(16)} x ${String(a.x).padStart(7)}  y ${String(a.y).padStart(7)}`);
}
console.log(`\ndone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
