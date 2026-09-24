/**
 * Makes the brain react to the pointer, in one animation frame loop.
 *
 * Two behaviours, deliberately different in kind so they do not fight:
 *
 *   DRIFT   The whole drawing shifts and tilts toward the pointer. The folds
 *           shift by a little more, so they trail the outline when the pointer
 *           moves quickly and settle flush when it stops. This is the trick
 *           lisa.locomotive.ca uses on its cables: keep two copies of the
 *           pointer lerped at different rates and drive the trailing part by
 *           the difference between them, rather than by the pointer itself.
 *
 *   WAKE    Folds near the cursor darken and thicken slightly, as though the
 *           plate were being read under a lamp.
 *
 * Nothing here touches React state. State updates at 60Hz would re-render the
 * 300-odd paths every frame; instead the loop writes to the DOM directly and
 * the component owns only what the user can actually change.
 */

import { useEffect, useRef, type RefObject } from "react";

/** Chase rates. The gap between them is what produces the trailing folds. */
const LERP_SLOW = 0.04;
const LERP_FAST = 0.1;

/** Drift limits, in stage units and degrees. Small on purpose. */
const SHIFT = 6;
const TILT = 2.5;
/** How much further the folds travel than the outline. */
const TRAIL = 34;

/** Ambient breathing, so the drawing is never perfectly still. */
const BREATH = [
  { speed: 0.51, amplitude: 2.4 },
  { speed: 0.23, amplitude: 1.6 },
];

/**
 * Wake radius, in stage units.
 *
 * How hard the wake hits is NOT here — the loop writes a 0..1 `--wake` per
 * fold and styles.css composes it with the resting stroke values. Writing
 * absolute values from here instead means a fold at low intensity lands below
 * its resting opacity and fades out, which reads as a pale hole following the
 * cursor rather than a lit pool.
 */
const WAKE_RADIUS = 140;
/** Spatial hash cell. Roughly the wake radius keeps the 3x3 probe honest. */
const CELL = 140;
/** Skip a DOM write below this change — most frames move a stroke by nothing. */
const EPSILON = 0.012;

interface Options {
  /** The `<svg>`, used to map client coordinates into stage coordinates. */
  stage: RefObject<SVGSVGElement>;
  /** Group wrapping the whole drawing. Receives the drift transform. */
  brain: RefObject<SVGGElement>;
  /** Group wrapping the folds. Receives the extra trailing offset. */
  sulci: RefObject<SVGGElement>;
  /** Centre of rotation, in stage units. */
  pivot: { x: number; y: number };
  /**
   * Placement of the drawing inside the stage.
   *
   * Needed because `getPointAtLength` reports a point in the path's OWN user
   * space — which is BRAIN space, inside the group that positions and scales
   * the drawing — while the cursor arrives in STAGE space. Comparing the two
   * directly puts the wake a whole brain-origin away from the pointer.
   */
  placement: { x: number; y: number; scale: number };
  /** False while the brain is parked in the corner, or under reduced motion. */
  enabled: boolean;
}

export function usePointerFollow({
  stage,
  brain,
  sulci,
  pivot,
  placement,
  enabled,
}: Options) {
  // Kept in a ref so changing it cannot restart the effect mid-gesture.
  const pivotRef = useRef(pivot);
  pivotRef.current = pivot;

  const { x: originX, y: originY, scale } = placement;

  useEffect(() => {
    const stageEl = stage.current;
    const brainEl = brain.current;
    // Optional: layouts that hide the folds render no sulci group. The drift
    // still has to work without it.
    const sulciEl = sulci.current;
    if (!stageEl || !brainEl) return;

    if (!enabled) {
      brainEl.removeAttribute("transform");
      sulciEl?.removeAttribute("transform");
      return;
    }

    const paths = sulciEl ? Array.from(sulciEl.querySelectorAll("path")) : [];

    // --- Spatial hash over the folds ---------------------------------------
    // Sampling three points per path rather than one stops a long fold from
    // staying dark when the cursor sits over one of its ends.
    const buckets = new Map<string, Set<number>>();
    const key = (x: number, y: number) =>
      `${Math.floor(x / CELL)}_${Math.floor(y / CELL)}`;

    const samples: Array<Array<{ x: number; y: number }>> = paths.map(
      (path, index) => {
        const length = path.getTotalLength();
        const points = [0, 0.5, 1].map((t) => {
          const point = path.getPointAtLength(length * t);
          // BRAIN space to STAGE space, to match the cursor.
          return {
            x: point.x * scale + originX,
            y: point.y * scale + originY,
          };
        });

        for (const point of points) {
          const k = key(point.x, point.y);
          const bucket = buckets.get(k);
          if (bucket) bucket.add(index);
          else buckets.set(k, new Set([index]));
        }

        return points;
      }
    );

    // --- Pointer ------------------------------------------------------------
    // Normalised (-1..1) drives the drift; stage coordinates drive the wake.
    const normalised = { x: 0, y: 0 };
    const inStage = { x: -1e6, y: -1e6 };
    const slow = { x: 0, y: 0 };
    const fast = { x: 0, y: 0 };

    // Reused rather than allocated per event — pointermove fires hard.
    const point = stageEl.createSVGPoint();

    const onPointerMove = (event: PointerEvent) => {
      const rect = stageEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      normalised.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      normalised.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

      // getScreenCTM is the only mapping that survives preserveAspectRatio
      // letterboxing; the rect ratio alone is wrong whenever the container is
      // not exactly 16:9.
      const ctm = stageEl.getScreenCTM();
      if (!ctm) return;
      point.x = event.clientX;
      point.y = event.clientY;
      const local = point.matrixTransform(ctm.inverse());
      inStage.x = local.x;
      inStage.y = local.y;
    };

    const onPointerLeave = () => {
      normalised.x = 0;
      normalised.y = 0;
      inStage.x = -1e6;
      inStage.y = -1e6;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);

    // --- Loop ---------------------------------------------------------------
    const lit = new Map<number, number>();
    const start = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const elapsed = (now - start) / 1000;

      slow.x += (normalised.x - slow.x) * LERP_SLOW;
      slow.y += (normalised.y - slow.y) * LERP_SLOW;
      fast.x += (normalised.x - fast.x) * LERP_FAST;
      fast.y += (normalised.y - fast.y) * LERP_FAST;

      const breathX =
        BREATH[0].amplitude * Math.sin(elapsed * BREATH[0].speed);
      const breathY =
        BREATH[1].amplitude * Math.sin(elapsed * BREATH[1].speed);

      const { x: px, y: py } = pivotRef.current;
      brainEl.setAttribute(
        "transform",
        `translate(${(slow.x * SHIFT + breathX).toFixed(2)} ${(
          slow.y * SHIFT +
          breathY
        ).toFixed(2)}) rotate(${(slow.x * TILT).toFixed(3)} ${px} ${py})`
      );

      // The difference between the two chase rates is a velocity in all but
      // name: large mid-gesture, zero at rest.
      sulciEl?.setAttribute(
        "transform",
        `translate(${((fast.x - slow.x) * TRAIL).toFixed(2)} ${(
          (fast.y - slow.y) *
          TRAIL
        ).toFixed(2)})`
      );

      // --- Wake ---
      // Only folds near the cursor are considered, plus whatever is still
      // fading out. That keeps this to a few dozen elements a frame instead
      // of all three hundred.
      const touched = new Set<number>();
      const cx = Math.floor(inStage.x / CELL);
      const cy = Math.floor(inStage.y / CELL);

      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          const bucket = buckets.get(`${gx}_${gy}`);
          if (!bucket) continue;

          for (const index of bucket) {
            if (touched.has(index)) continue;
            touched.add(index);

            let nearest = Infinity;
            for (const sample of samples[index]) {
              const d = Math.hypot(sample.x - inStage.x, sample.y - inStage.y);
              if (d < nearest) nearest = d;
            }

            const target = Math.max(0, 1 - nearest / WAKE_RADIUS);
            const current = lit.get(index) ?? 0;
            const next = current + (target - current) * 0.2;

            if (Math.abs(next - current) > EPSILON) {
              lit.set(index, next);
              paths[index].style.setProperty("--wake", next.toFixed(3));
            }
          }
        }
      }

      for (const [index, value] of lit) {
        if (touched.has(index)) continue;
        const next = value * 0.85;
        if (next < EPSILON) {
          lit.delete(index);
          paths[index].style.removeProperty("--wake");
        } else {
          lit.set(index, next);
          paths[index].style.setProperty("--wake", next.toFixed(3));
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);

      // Inline styles written by the loop outlive it otherwise, leaving a
      // handful of folds frozen mid-glow.
      for (const path of paths) path.style.removeProperty("--wake");
      brainEl.removeAttribute("transform");
      sulciEl?.removeAttribute("transform");
    };
  }, [stage, brain, sulci, enabled, originX, originY, scale]);
}
