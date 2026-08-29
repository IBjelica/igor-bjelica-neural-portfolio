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

// Strip the texture: 93% of the file, and the app overrides material colour
// at runtime anyway.
const material = srcPrim.getMaterial();
material.setBaseColorTexture(null);
material.setBaseColorFactor([0.72, 0.75, 0.82, 1]);
material.setMetallicFactor(0.1);
material.setRoughnessFactor(0.6);

const buckets = new Map(REGIONS.map((r) => [r, []]));
for (let t = 0; t < indices.length / 3; t++) {
  const [a, b, c] = [indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]];
  // Classify by triangle centroid so a triangle is never split across regions.
  const cx = (pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3;
  const cy = (pos[a * 3 + 1] + pos[b * 3 + 1] + pos[c * 3 + 1]) / 3;
  const cz = (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3;
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
    .setAttribute("POSITION", position)
    .setAttribute("NORMAL", normal)
    .setAttribute("TEXCOORD_0", texcoord)
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
