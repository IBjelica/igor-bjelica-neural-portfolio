/**
 * The hero: an anatomical plate of a brain whose labels are the navigation.
 *
 * Structure is split between SVG and HTML on purpose. The drawing and the
 * leader lines are SVG, because they are geometry. The words are HTML, because
 * they are links and need real focus rings, real hover targets and real text
 * rendering — all of which are painful inside `<foreignObject>` and worse
 * inside `<text>`.
 *
 * The two layers stay registered because the wrapper is locked to the stage's
 * 16:9 aspect ratio, so a stage coordinate maps to a percentage of the box and
 * nothing drifts when the viewport changes.
 *
 * Five words navigate. Five are notes: lighter, hung off thinner lines, and
 * `aria-hidden`, so nobody is invited to click a thing that does nothing.
 */

import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import { OUTLINE_PATHS, SULCI_PATHS } from "@/lib/brainArt";
import { useParkTransform } from "@/hooks/useParkTransform";
import { usePointerFollow } from "@/hooks/usePointerFollow";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  ANCHORS,
  BRAIN_ORIGIN,
  BRAIN_VIEWBOX,
  STAGE,
  toStage,
  type AnchorId,
} from "@/data/brainAnchors";
import { COLUMN, NAV_LINKS, NAV_NOTES } from "@/data/nav";

/** Rotation centre: the middle of the drawing, in stage units. */
const PIVOT = {
  x: BRAIN_ORIGIN.x + BRAIN_VIEWBOX.width / 2,
  y: BRAIN_ORIGIN.y + BRAIN_VIEWBOX.height / 2,
};

type Side = "left" | "right";

/**
 * Anchor, then a straight run out to the elbow, then a short horizontal shelf
 * into the word. The shelf is what keeps a diagonal from arriving on top of
 * the text it points at.
 */
function leaderPath(id: AnchorId, labelY: number, side: Side): string {
  const anchor = toStage(ANCHORS[id]);
  const column = COLUMN[side];
  const shelfEnd = side === "left" ? column.labelX + 12 : column.labelX - 12;

  return `M${anchor.x} ${anchor.y} L${column.elbowX} ${labelY} L${shelfEnd} ${labelY}`;
}

/** Stage coordinates to a percentage of the wrapper. */
const pct = (value: number, total: number) => `${(value / total) * 100}%`;

interface BrainNavProps {
  /** True once a section is open and the brain has flown to the corner. */
  parked: boolean;
  /** Bring the brain back. Wired to the corner icon. */
  onUnpark: () => void;
}

const BrainNav = ({ parked, onUnpark }: BrainNavProps) => {
  const figureRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<SVGSVGElement>(null);
  const brainRef = useRef<SVGGElement>(null);
  const sulciRef = useRef<SVGGElement>(null);

  // Hover and focus both raise the same state, so a keyboard user sees the
  // same leader line light up that a mouse user does.
  const [active, setActive] = useState<AnchorId | null>(null);

  const reducedMotion = usePrefersReducedMotion();

  useParkTransform({ figure: figureRef, pivot: PIVOT });

  usePointerFollow({
    stage: stageRef,
    brain: brainRef,
    sulci: sulciRef,
    pivot: PIVOT,
    enabled: !parked && !reducedMotion,
  });

  const nodes: Array<{ id: AnchorId; labelY: number; side: Side }> = [
    ...NAV_LINKS.map((link) => ({
      id: link.id,
      labelY: link.labelY,
      side: "left" as const,
    })),
    ...NAV_NOTES.map((note) => ({
      id: note.id,
      labelY: note.labelY,
      side: "right" as const,
    })),
  ];

  return (
    <div className="brain-nav" data-parked={parked || undefined}>
      {/* Everything that flies to the corner lives in the figure, so one
          transform carries the drawing and its labels together. The toggle
          button sits outside it, at a fixed size. */}
      <div ref={figureRef} className="brain-nav__figure">
        <svg
          ref={stageRef}
          className="brain-nav__stage"
          viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          focusable="false"
        >
          <g ref={brainRef} className="brain-nav__brain">
            <g transform={`translate(${BRAIN_ORIGIN.x} ${BRAIN_ORIGIN.y})`}>
              <g className="brain-nav__outline">
                {OUTLINE_PATHS.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
              <g ref={sulciRef} className="brain-nav__sulci">
                {SULCI_PATHS.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
            </g>
          </g>

          <g className="brain-nav__leaders">
            {nodes.map(({ id, labelY, side }, index) => {
              const anchor = toStage(ANCHORS[id]);
              const kind = side === "left" ? "link" : "note";
              return (
                <g
                  key={id}
                  data-kind={kind}
                  data-active={active === id || undefined}
                  // Staggers the draw-in. CSS reads it as a delay multiplier.
                  style={{ ["--leader-index" as string]: index }}
                >
                  {/* pathLength normalises every line to 1 unit, so one
                    dasharray value animates all ten regardless of length. */}
                  <path
                    className="brain-nav__leader"
                    d={leaderPath(id, labelY, side)}
                    pathLength={1}
                  />
                  <circle
                    className="brain-nav__anchor"
                    cx={anchor.x}
                    cy={anchor.y}
                    r={kind === "link" ? 3.5 : 2.5}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        <nav className="brain-nav__links" aria-label="Sections">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.id}
              to={link.slug}
              className="brain-nav__label"
              style={{
                right: pct(STAGE.width - COLUMN.left.labelX, STAGE.width),
                top: pct(link.labelY, STAGE.height),
              }}
              onMouseEnter={() => setActive(link.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(link.id)}
              onBlur={() => setActive(null)}
              tabIndex={parked ? -1 : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Not links, not buttons, not focusable, and not announced. They are
          annotations on a diagram — the same status as the sulci. */}
        <ul className="brain-nav__notes" aria-hidden="true">
          {NAV_NOTES.map((note) => (
            <li
              key={note.id}
              className="brain-nav__note"
              style={{
                left: pct(COLUMN.right.labelX, STAGE.width),
                top: pct(note.labelY, STAGE.height),
              }}
            >
              {note.label}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="brain-nav__toggle"
        onClick={onUnpark}
        aria-expanded={!parked}
        hidden={!parked}
      >
        Show the brain
      </button>
    </div>
  );
};

export default BrainNav;
