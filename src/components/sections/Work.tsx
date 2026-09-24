import SectionShell from "./SectionShell";
import { roles } from "@/data/experience";

const Work = () => (
  <SectionShell
    title="Work"
    lede="Seven years of web development, mostly in and around content-heavy marketing sites and the systems behind them."
  >
    <ol className="roles">
      {roles.map((role) => (
        <li key={`${role.company}-${role.period}`} className="role">
          <div className="role__meta">
            <span className="role__period">{role.period}</span>
            {role.current && <span className="role__current">Current</span>}
          </div>
          <div className="role__detail">
            <h2 className="role__title">{role.title}</h2>
            <p className="role__company">{role.company}</p>
            <p className="role__summary">{role.summary}</p>
            {role.highlights.length > 0 && (
              <ul className="role__highlights">
                {role.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  </SectionShell>
);

export default Work;
