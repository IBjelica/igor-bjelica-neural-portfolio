/**
 * Common frame for every section: the title, an optional opening line, and
 * the body column.
 *
 * The heading carries `tabIndex={-1}` because the shell moves focus to it when
 * a section opens. That is not decorative — parking the brain removes its
 * links from the tab order, so without this a keyboard user is left with focus
 * on an element that is no longer reachable.
 */

import type { ReactNode } from "react";

interface SectionShellProps {
  title: string;
  /** One or two sentences under the title. Optional. */
  lede?: string;
  children: ReactNode;
}

const SectionShell = ({ title, lede, children }: SectionShellProps) => (
  <section className="section">
    <header className="section__head">
      <h1 className="section__title" tabIndex={-1}>
        {title}
      </h1>
      {lede && <p className="section__lede">{lede}</p>}
    </header>
    <div className="section__body">{children}</div>
  </section>
);

export default SectionShell;
