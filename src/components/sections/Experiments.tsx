/**
 * Deliberately empty for now.
 *
 * The section ships with real layout and an honest empty state rather than
 * placeholder work, so filling it later is a data change and not a build.
 */

import SectionShell from "./SectionShell";

const Experiments = () => (
  <SectionShell title="Experiments">
    <p className="empty">
      Nothing here yet. This is where the half-finished things will go — the
      ones built to answer a question rather than to ship.
    </p>
    <p className="empty__aside">
      The brain on the front page started as one of them.
    </p>
  </SectionShell>
);

export default Experiments;
