/**
 * Works out the transform that flies the brain into the top-right corner.
 *
 * Doing this in CSS alone is not possible: the stage is letterboxed inside
 * whatever the viewport happens to be, the brain sits off-centre within that
 * stage, and the corner is a fixed pixel offset from the viewport edge — so
 * the required translation depends on three things CSS cannot combine.
 *
 * Animating width/height/inset instead would avoid the maths but force a
 * layout and an SVG re-render on every frame of a 900ms animation, with 300+
 * paths in the tree. Transform is composited; this hook just supplies its
 * arguments, recomputed on resize rather than per frame.
 *
 * The maths, with transform-origin at the element centre E:
 *
 *     translate(T) scale(s)  maps  P -> E + s * (P - E) + T
 *
 * We want the brain's centre C to land on the corner target G, so
 *
 *     T = G - E - s * (C - E)
 *
 * Writes `--park-x`, `--park-y` and `--park-scale` onto the element. CSS
 * applies them only while the brain is parked.
 */

import { useCallback, useLayoutEffect, type RefObject } from "react";

import { BRAIN_VIEWBOX, brainCentre } from "@/data/brainAnchors";
import type { Layout } from "@/data/layout";

/** Width of the corner icon, in CSS pixels. */
const ICON_WIDTH = 72;
/** Gap between the icon and the top-right corner of the viewport. */
const MARGIN = 30;

interface Options {
  figure: RefObject<HTMLElement>;
  layout: Layout;
}

export function useParkTransform({ figure, layout }: Options) {
  const measure = useCallback(() => {
    const el = figure.current;
    if (!el) return;

    // The transform has to come off before measuring. Landing directly on a
    // section URL renders the figure already parked — with the CSS fallback
    // scale, since this hook has not run yet — so getBoundingClientRect would
    // return the shrunken box and the scale computed from it would be wrong
    // by a factor of the fallback. The icon then renders enormous.
    //
    // Transitions are suppressed for the measurement so that removing and
    // restoring the transform cannot start one. Both writes happen inside a
    // single task, before the browser paints, so nothing flickers.
    const previousTransition = el.style.transition;
    const previousTransform = el.style.transform;
    el.style.transition = "none";
    el.style.transform = "none";

    const rect = el.getBoundingClientRect();

    el.style.transform = previousTransform;
    // Reading the box above flushed style; read again so restoring the
    // transition cannot be coalesced into the same change as the transform.
    void el.offsetHeight;
    el.style.transition = previousTransition;

    if (!rect.width || !rect.height) return;

    // The drawing is smaller than the stage, so scaling to the icon width has
    // to account both for the empty label columns and for the layout's own
    // scale factor.
    const brainWidth =
      rect.width *
      ((BRAIN_VIEWBOX.width * layout.brain.scale) / layout.stage.width);
    const scale = ICON_WIDTH / brainWidth;

    const centre = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    const stageCentre = brainCentre(layout);
    const brain = {
      x: rect.left + rect.width * (stageCentre.x / layout.stage.width),
      y: rect.top + rect.height * (stageCentre.y / layout.stage.height),
    };

    const iconHeight = ICON_WIDTH * (BRAIN_VIEWBOX.height / BRAIN_VIEWBOX.width);
    const target = {
      x: window.innerWidth - MARGIN - ICON_WIDTH / 2,
      y: MARGIN + iconHeight / 2,
    };

    el.style.setProperty(
      "--park-x",
      `${(target.x - centre.x - scale * (brain.x - centre.x)).toFixed(1)}px`
    );
    el.style.setProperty(
      "--park-y",
      `${(target.y - centre.y - scale * (brain.y - centre.y)).toFixed(1)}px`
    );
    el.style.setProperty("--park-scale", scale.toFixed(4));
  }, [figure, layout]);

  // Layout effect, not effect: the custom properties have to be in place
  // before the first paint, or a section loaded directly shows one frame of
  // the icon at the CSS fallback scale.
  useLayoutEffect(() => {
    measure();

    // ResizeObserver catches the cases a window resize listener misses: the
    // scrollbar appearing when a section opens, and the address bar collapsing
    // on mobile. Both change the stage box without a resize event.
    const el = figure.current;
    const observer = new ResizeObserver(measure);
    if (el) observer.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [figure, measure]);
}
