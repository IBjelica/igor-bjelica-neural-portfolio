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

// Orientation (established by analysis, see plan 010):
//   +Y up, -Z anterior/front, +Z posterior/back, X lateral.
// First rule that matches wins — order matters.
function classify(x, y, z) {
  if (y < -0.3 && Math.hypot(x, z - 0.15) < 0.18) return "Brain_Stem";
  if (y < -0.12 && z > 0.1) return "Cerebellum";
  if (y < 0.05 && Math.abs(x) < 0.12) return "Limbic_System";
  if (y < -0.05 && z < 0.25) return "Temporal_Lobe";
  if (z > 0.32) return "Occipital_Lobe";
  if (z < -0.12) return "Frontal_Lobe";
  return "Parietal_Lobe";
}

const io = new NodeIO();
const doc = await io.read("public/brain.glb");
const root = doc.getRoot();

const srcMesh = root.listMeshes()[0];
const srcPrim = srcMesh.listPrimitives()[0];
const position = srcPrim.getAttribute("POSITION");
const normal = srcPrim.getAttribute("NORMAL");
const texcoord = srcPrim.getAttribute("TEXCOORD_0");
const indices = srcPrim.getIndices().getArray();
const pos = position.getArray();

// --- Subdivision + displacement ---
// The source model is only 3,288 triangles, so it has no folds to catch light
// and its outline reads as a smooth blob. Subdividing 1-to-4 and displacing
// along the normals with ridged noise carves folds into the actual geometry,
// which a normal map cannot do (a normal map cannot change a silhouette).
const SUBDIVISIONS = 2;
const DISPLACE_AMPLITUDE = 0.022;
const DISPLACE_FREQUENCY = 18;

function subdivideOnce(positions, normals, uvs, indices) {
  const p = Array.from(positions);
  const n = Array.from(normals);
  const t = Array.from(uvs);
  const out = [];
  // Midpoints must be shared between adjacent triangles or the mesh cracks.
  const midCache = new Map();

  const midpoint = (a, b) => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    const cached = midCache.get(key);
    if (cached !== undefined) return cached;
    const m = p.length / 3;
    for (let k = 0; k < 3; k++) p.push((p[a * 3 + k] + p[b * 3 + k]) / 2);
    for (let k = 0; k < 3; k++) n.push((n[a * 3 + k] + n[b * 3 + k]) / 2);
    for (let k = 0; k < 2; k++) t.push((t[a * 2 + k] + t[b * 2 + k]) / 2);
    midCache.set(key, m);
    return m;
  };

  for (let i = 0; i < indices.length / 3; i++) {
    const a = indices[i * 3];
    const b = indices[i * 3 + 1];
    const c = indices[i * 3 + 2];
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const ca = midpoint(c, a);
    out.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
  }
  return { positions: p, normals: n, uvs: t, indices: out };
}

function hash3(x, y, z) {
  let h = x * 374761393 + y * 668265263 + z * 1442695040;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}
const smoothStep = (v) => v * v * (3 - 2 * v);

function noise3(x, y, z) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = smoothStep(x - xi);
  const yf = smoothStep(y - yi);
  const zf = smoothStep(z - zi);
  let sum = 0;
  for (let dz = 0; dz < 2; dz++) {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const w =
          (dx ? xf : 1 - xf) * (dy ? yf : 1 - yf) * (dz ? zf : 1 - zf);
        sum += w * hash3(xi + dx, yi + dy, zi + dz);
      }
    }
  }
  return sum;
}

// 1 - |2n-1| turns smooth noise into ridges. Ridges read as sulci; plain
// noise reads as golf-ball dimples.
function ridged(x, y, z) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = DISPLACE_FREQUENCY;
  for (let o = 0; o < 3; o++) {
    sum += amp * (1 - Math.abs(noise3(x * freq, y * freq, z * freq) * 2 - 1));
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
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

let geo = {
  positions: Array.from(pos),
  normals: Array.from(normal.getArray()),
  uvs: Array.from(texcoord.getArray()),
  indices: Array.from(indices),
};
for (let s = 0; s < SUBDIVISIONS; s++) {
  geo = subdivideOnce(geo.positions, geo.normals, geo.uvs, geo.indices);
}

// Displace along the (pre-displacement) normals, then rebuild normals so the
// lighting matches the new surface.
const vertexCount = geo.positions.length / 3;
for (let i = 0; i < vertexCount; i++) {
  const x = geo.positions[i * 3];
  const y = geo.positions[i * 3 + 1];
  const z = geo.positions[i * 3 + 2];
  const d = (ridged(x, y, z) - 0.5) * 2 * DISPLACE_AMPLITUDE;
  geo.positions[i * 3] += geo.normals[i * 3] * d;
  geo.positions[i * 3 + 1] += geo.normals[i * 3 + 1] * d;
  geo.positions[i * 3 + 2] += geo.normals[i * 3 + 2] * d;
}

const newPositions = new Float32Array(geo.positions);
const newNormals = recomputeNormals(newPositions, geo.indices);
const newUVs = new Float32Array(geo.uvs);
const newIndices = geo.indices;

console.log(
  `subdivided ${indices.length / 3} → ${newIndices.length / 3} tris, ` +
    `${pos.length / 3} → ${vertexCount} verts`
);

const buffer = root.listBuffers()[0];
const positionAccessor = doc
  .createAccessor("POSITION")
  .setType("VEC3")
  .setArray(newPositions)
  .setBuffer(buffer);
const normalAccessor = doc
  .createAccessor("NORMAL")
  .setType("VEC3")
  .setArray(newNormals)
  .setBuffer(buffer);
const uvAccessor = doc
  .createAccessor("TEXCOORD_0")
  .setType("VEC2")
  .setArray(newUVs)
  .setBuffer(buffer);

// Strip the texture: 93% of the file, and the app overrides material colour
// at runtime anyway.
const material = srcPrim.getMaterial();
material.setBaseColorTexture(null);
material.setBaseColorFactor([0.72, 0.75, 0.82, 1]);
material.setMetallicFactor(0.1);
material.setRoughnessFactor(0.6);

const buckets = new Map(REGIONS.map((r) => [r, []]));
for (let t = 0; t < newIndices.length / 3; t++) {
  const [a, b, c] = [
    newIndices[t * 3],
    newIndices[t * 3 + 1],
    newIndices[t * 3 + 2],
  ];
  // Classify by triangle centroid so a triangle is never split across regions.
  const cx = (newPositions[a * 3] + newPositions[b * 3] + newPositions[c * 3]) / 3;
  const cy =
    (newPositions[a * 3 + 1] + newPositions[b * 3 + 1] + newPositions[c * 3 + 1]) / 3;
  const cz =
    (newPositions[a * 3 + 2] + newPositions[b * 3 + 2] + newPositions[c * 3 + 2]) / 3;
  buckets.get(classify(cx, cy, cz)).push(a, b, c);
}

const scene = root.listScenes()[0];
for (const node of root.listNodes()) node.dispose();

for (const name of REGIONS) {
  const tri = buckets.get(name);
  console.log(`${name.padEnd(16)} ${String(tri.length / 3).padStart(5)} tris`);
  if (tri.length === 0) continue;

  const idxAccessor = doc
    .createAccessor(`${name}_indices`)
    .setType("SCALAR")
    .setArray(new Uint32Array(tri))
    .setBuffer(root.listBuffers()[0]);

  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", positionAccessor)
    .setAttribute("NORMAL", normalAccessor)
    .setAttribute("TEXCOORD_0", uvAccessor)
    .setIndices(idxAccessor)
    .setMaterial(material);

  const mesh = doc.createMesh(name).addPrimitive(prim);
  scene.addChild(doc.createNode(name).setMesh(mesh));
}

srcMesh.dispose();

// REQUIRED. Detaching the texture from the material does NOT remove the image
// from the file — gltf-transform keeps orphaned resources in the document until
// they are pruned, so the 1.3 MB JPEG would still be written. prune() also drops
// the now-unreferenced TEXCOORD_0 accessor, since the new primitives only carry
// POSITION and NORMAL.
await doc.transform(prune({ keepAttributes: true }));

await io.write("public/brain-regions.glb", doc);
console.log("wrote public/brain-regions.glb");
