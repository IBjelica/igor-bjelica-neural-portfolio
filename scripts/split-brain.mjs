import { NodeIO } from "@gltf-transform/core";
import { prune } from "@gltf-transform/functions";

const REGIONS = [
  "Frontal_Lobe",
  "Parietal_Lobe",
  "Temporal_Lobe",
  "Occipital_Lobe",
  "Cerebellum",
  "Brain_Stem",
  "Limbic_System",
];

// --- Boundary wobble ---
// classify() cuts on planes, which makes region borders ruler-straight lines
// that ignore the anatomy underneath. Offsetting every threshold by a shared
// 3D noise value makes the borders wander organically instead.
const WOBBLE_AMPLITUDE = 0.05;
const WOBBLE_FREQUENCY = 7;

function wobbleHash(x, y, z) {
  let h = x * 374761393 + y * 668265263 + z * 1442695040;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function wobble(x, y, z) {
  const f = WOBBLE_FREQUENCY;
  const px = x * f;
  const py = y * f;
  const pz = z * f;
  const xi = Math.floor(px);
  const yi = Math.floor(py);
  const zi = Math.floor(pz);
  const s = (t) => t * t * (3 - 2 * t);
  const xf = s(px - xi);
  const yf = s(py - yi);
  const zf = s(pz - zi);
  let sum = 0;
  for (let dz = 0; dz < 2; dz++) {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const w =
          (dx ? xf : 1 - xf) * (dy ? yf : 1 - yf) * (dz ? zf : 1 - zf);
        sum += w * wobbleHash(xi + dx, yi + dy, zi + dz);
      }
    }
  }
  return (sum - 0.5) * 2 * WOBBLE_AMPLITUDE;
}

// Orientation (established by analysis, see plan 010):
//   +Y up, -Z anterior/front, +Z posterior/back, X lateral.
// First rule that matches wins — order matters.
function classify(x, y, z) {
  const w = wobble(x, y, z);
  if (y < -0.3 + w && Math.hypot(x, z - 0.15) < 0.18 + w) return "Brain_Stem";
  if (y < -0.12 + w && z > 0.1 + w) return "Cerebellum";
  if (y < 0.05 + w && Math.abs(x) < 0.12 + w) return "Limbic_System";
  if (y < -0.05 + w && z < 0.25 + w) return "Temporal_Lobe";
  if (z > 0.32 + w) return "Occipital_Lobe";
  if (z < -0.12 + w) return "Frontal_Lobe";
  return "Parietal_Lobe";
}

// --- Region fade weight ---
// Distance from each vertex to the nearest point where classify() returns a
// different region, found by marching outward in six axis directions. Because
// it depends only on position, a single shared attribute serves all seven
// regions — two regions meeting at a border both read the same low value there
// and fade into each other.
const FADE_BAND = 0.06;
const FADE_STEPS = 4;

function fadeWeight(x, y, z) {
  const here = classify(x, y, z);
  const dirs = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  let nearest = FADE_BAND;
  for (const [dx, dy, dz] of dirs) {
    for (let s = 1; s <= FADE_STEPS; s++) {
      const d = (FADE_BAND * s) / FADE_STEPS;
      if (classify(x + dx * d, y + dy * d, z + dz * d) !== here) {
        if (d < nearest) nearest = d;
        break;
      }
    }
  }
  const t = nearest / FADE_BAND;
  return t * t * (3 - 2 * t);
}

function recomputeNormals(p, idx) {
  const n = new Float32Array(p.length);
  for (let i = 0; i < idx.length / 3; i++) {
    const a = idx[i * 3];
    const b = idx[i * 3 + 1];
    const c = idx[i * 3 + 2];
    const ux = p[b * 3] - p[a * 3];
    const uy = p[b * 3 + 1] - p[a * 3 + 1];
    const uz = p[b * 3 + 2] - p[a * 3 + 2];
    const vx = p[c * 3] - p[a * 3];
    const vy = p[c * 3 + 1] - p[a * 3 + 1];
    const vz = p[c * 3 + 2] - p[a * 3 + 2];
    const fx = uy * vz - uz * vy;
    const fy = uz * vx - ux * vz;
    const fz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      n[v * 3] += fx;
      n[v * 3 + 1] += fy;
      n[v * 3 + 2] += fz;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const len = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= len;
    n[i + 1] /= len;
    n[i + 2] /= len;
  }
  return n;
}

const io = new NodeIO();
const doc = await io.read("/tmp/brain-simplified.glb");
const root = doc.getRoot();

const srcMesh = root.listMeshes()[0];
const srcPrim = srcMesh.listPrimitives()[0];
const srcPos = srcPrim.getAttribute("POSITION").getArray();
const indices = Array.from(srcPrim.getIndices().getArray());

// --- Orientation + normalisation ---
// The MRI source is Z-up with +X posterior (an STL sitting on its build plate).
// The app's convention is +Y up, -Z front. The permutation (x,y,z) -> (y,z,x)
// maps one to the other; it is cyclic, so determinant +1 and triangle winding
// is preserved — no index reversal needed.
//
// It is then centred and scaled so its longest axis spans 1.2 units, matching
// the previous model's coordinate range. That is what lets classify()'s
// thresholds carry over untouched.
const permuted = new Float32Array(srcPos.length);
for (let i = 0; i < srcPos.length / 3; i++) {
  permuted[i * 3] = srcPos[i * 3 + 1];
  permuted[i * 3 + 1] = srcPos[i * 3 + 2];
  permuted[i * 3 + 2] = srcPos[i * 3];
}

const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < permuted.length / 3; i++) {
  for (let d = 0; d < 3; d++) {
    const v = permuted[i * 3 + d];
    if (v < min[d]) min[d] = v;
    if (v > max[d]) max[d] = v;
  }
}
const centre = min.map((v, d) => (v + max[d]) / 2);
const longest = Math.max(...max.map((v, d) => v - min[d]));
const scale = 1.2 / longest;

const positions = new Float32Array(permuted.length);
for (let i = 0; i < permuted.length / 3; i++) {
  for (let d = 0; d < 3; d++) {
    positions[i * 3 + d] = (permuted[i * 3 + d] - centre[d]) * scale;
  }
}

// The source is POSITION-only (STL-derived), so normals must be generated.
const normals = recomputeNormals(positions, indices);

console.log(
  `normalised: ${indices.length / 3} tris, ${positions.length / 3} verts, ` +
    `scale ${scale.toFixed(4)}`
);

// The source has no material either.
const material = doc
  .createMaterial("brain")
  .setBaseColorFactor([0.72, 0.75, 0.82, 1])
  .setMetallicFactor(0.1)
  .setRoughnessFactor(0.6);

const buffer = root.listBuffers()[0];
const positionAccessor = doc
  .createAccessor("POSITION")
  .setType("VEC3")
  .setArray(positions)
  .setBuffer(buffer);
const normalAccessor = doc
  .createAccessor("NORMAL")
  .setType("VEC3")
  .setArray(normals)
  .setBuffer(buffer);

const fade = new Float32Array(positions.length / 3);
for (let i = 0; i < fade.length; i++) {
  fade[i] = fadeWeight(
    positions[i * 3],
    positions[i * 3 + 1],
    positions[i * 3 + 2]
  );
}
const fadeAccessor = doc
  .createAccessor("_REGIONFADE")
  .setType("SCALAR")
  .setArray(fade)
  .setBuffer(buffer);

let faded = 0;
for (let i = 0; i < fade.length; i++) if (fade[i] < 0.99) faded++;
console.log(
  `fade weights: ${faded} of ${fade.length} vertices inside the band ` +
    `(${((faded / fade.length) * 100).toFixed(1)}%)`
);

const buckets = new Map(REGIONS.map((r) => [r, []]));
for (let t = 0; t < indices.length / 3; t++) {
  const a = indices[t * 3];
  const b = indices[t * 3 + 1];
  const c = indices[t * 3 + 2];
  const cx = (positions[a * 3] + positions[b * 3] + positions[c * 3]) / 3;
  const cy =
    (positions[a * 3 + 1] + positions[b * 3 + 1] + positions[c * 3 + 1]) / 3;
  const cz =
    (positions[a * 3 + 2] + positions[b * 3 + 2] + positions[c * 3 + 2]) / 3;
  buckets.get(classify(cx, cy, cz)).push(a, b, c);
}

const scene = root.listScenes()[0];
for (const node of root.listNodes()) node.dispose();

for (const name of REGIONS) {
  const tri = buckets.get(name);
  console.log(`${name.padEnd(16)} ${String(tri.length / 3).padStart(6)} tris`);
  if (tri.length === 0) continue;

  const idxAccessor = doc
    .createAccessor(`${name}_indices`)
    .setType("SCALAR")
    .setArray(new Uint32Array(tri))
    .setBuffer(buffer);

  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", positionAccessor)
    .setAttribute("NORMAL", normalAccessor)
    .setAttribute("_REGIONFADE", fadeAccessor)
    .setIndices(idxAccessor)
    .setMaterial(material);

  const mesh = doc.createMesh(name).addPrimitive(prim);
  scene.addChild(doc.createNode(name).setMesh(mesh));
}

srcMesh.dispose();
await doc.transform(prune({ keepAttributes: true }));
await io.write("public/brain-regions.glb", doc);
console.log("wrote public/brain-regions.glb");
