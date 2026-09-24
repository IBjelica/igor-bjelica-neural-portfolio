/**
 * Case studies, read as one long document rather than a grid of cards behind
 * modals. Four projects do not need a browsing interface — putting the whole
 * thing on the page means nothing is a click away from being read.
 */

import SectionShell from "./SectionShell";
import { asset } from "@/lib/asset";
import { projects } from "@/data/projects";

const Projects = () => (
  <SectionShell
    title="Projects"
    lede="Four builds, described by what the brief was and what I did about it."
  >
    <div className="projects">
      {projects.map((project) => (
        <article key={project.slug} className="project">
          <header className="project__head">
            <h2 className="project__title">{project.title}</h2>
            <p className="project__client">{project.client}</p>
          </header>

          <p className="project__summary">{project.summary}</p>

          <div className="project__prose">
            <h3 className="project__label">The brief</h3>
            <p>{project.problem}</p>
            <h3 className="project__label">What I did</h3>
            <p>{project.role}</p>
          </div>

          <ul className="project__stack">
            {project.stack.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="project__shots">
            {project.images.map((image) => (
              <figure key={image.src} className="project__shot">
                <img
                  src={asset(image.src)}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ))}
          </div>

          {project.liveUrl && (
            <p className="project__link">
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                Visit {project.title}
              </a>
            </p>
          )}
        </article>
      ))}
    </div>
  </SectionShell>
);

export default Projects;
