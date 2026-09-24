import SectionShell from "./SectionShell";
import { skillGroups } from "@/data/skills";

const Skills = () => (
  <SectionShell
    title="Skills"
    lede="What I reach for. Roughly in order of how often I actually use it."
  >
    <div className="skills">
      {skillGroups.map((group) => (
        <section key={group.title} className="skills__group">
          <h2 className="skills__title">{group.title}</h2>
          <ul className="skills__list">
            {group.items.map((item) => (
              <li key={item} className="skills__item">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  </SectionShell>
);

export default Skills;
