import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { projects, type Project } from "../data/projects";

/**
 * Selected work.
 *
 * Detail views are modals rather than routes (`/work/[slug]`). The site is
 * deployed as static files via rsync with no server-side rewrite rules, so a
 * client-side route would 404 on refresh or when a link is shared — which is
 * exactly how a studio would open it. A modal has no such failure mode.
 *
 * Radix Dialog is used directly rather than through `components/ui/dialog`,
 * which is Tailwind-styled and would not match this section's design tokens.
 * The primitives still provide the focus trap, Escape handling, scroll lock,
 * and ARIA wiring.
 */
const Projects = () => {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  return (
    <section id="work" className="section projects-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Portfolio</span>
          <h2 className="section-title">Selected Work</h2>
        </div>

        <div className="projects-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.slug}
              project={project}
              onOpen={() => setOpenSlug(project.slug)}
            />
          ))}
        </div>
      </div>

      {projects.map((project) => (
        <ProjectDialog
          key={project.slug}
          project={project}
          open={openSlug === project.slug}
          onOpenChange={(open) => setOpenSlug(open ? project.slug : null)}
        />
      ))}
    </section>
  );
};

const ProjectCard = ({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: () => void;
}) => (
  <article className={`project-card${project.featured ? " featured" : ""}`}>
    <div className="project-glow"></div>

    <div className="project-thumb">
      <img
        src={project.thumbnail.src}
        alt={project.thumbnail.alt}
        width={project.thumbnail.width}
        height={project.thumbnail.height}
        loading="lazy"
        decoding="async"
      />
    </div>

    <div className="project-content">
      <div className="project-header">
        <span className="project-badge">{project.client}</span>
        <h3 className="project-title">
          {/*
            The button carries the click target for the whole card via a
            stretched ::after overlay, so the card stays one tab stop and the
            accessible name is the project title. A <button> cannot legally
            contain an <h3>, hence this nesting order rather than the reverse.
          */}
          <button
            type="button"
            className="project-card-button"
            onClick={onOpen}
          >
            {project.title}
          </button>
        </h3>
      </div>

      <p className="project-description">{project.summary}</p>

      <div className="project-tech">
        {project.tech.map((tech, i) => (
          // Index-keyed: tech names are not guaranteed unique within a list.
          <span key={`${tech}-${i}`} className="tech-tag">
            {tech}
          </span>
        ))}
      </div>

      <span className="project-link" aria-hidden="true">
        View case study <span className="arrow">→</span>
      </span>
    </div>
  </article>
);

const ProjectDialog = ({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="project-modal-overlay" />
      <Dialog.Content className="project-modal">
        <Dialog.Close className="project-modal-close" aria-label="Close">
          ×
        </Dialog.Close>

        <Dialog.Title className="project-modal-title">
          {project.title}
        </Dialog.Title>
        <Dialog.Description className="project-modal-client">
          {project.client}
        </Dialog.Description>

        <div className="project-modal-body">
          <div className="project-modal-block">
            <h4 className="project-modal-label">The problem</h4>
            <p>{project.problem}</p>
          </div>

          <div className="project-modal-block">
            <h4 className="project-modal-label">My role</h4>
            <p>{project.role}</p>
          </div>

          <div className="project-modal-block">
            <h4 className="project-modal-label">Stack</h4>
            <div className="project-tech">
              {project.stack.map((tech, i) => (
                <span key={`${tech}-${i}`} className="tech-tag">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="project-modal-images">
            {project.images.map((image, i) => (
              <img
                key={`${image.src}-${i}`}
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>

          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="project-link"
            >
              Visit live site <span className="arrow">→</span>
            </a>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export default Projects;
