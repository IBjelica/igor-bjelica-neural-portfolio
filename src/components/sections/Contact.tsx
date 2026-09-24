/**
 * Contact, which also carries the biography.
 *
 * The old site had a separate About section. It was two paragraphs and a
 * location, which did not earn its own node on the diagram — so it lives here,
 * where someone deciding whether to get in touch will actually read it.
 */

import SectionShell from "./SectionShell";

const LINKS = [
  { label: "contact@igorbjelica.com", href: "mailto:contact@igorbjelica.com" },
  { label: "LinkedIn", href: "https://linkedin.com/in/igor-bjelica" },
  { label: "GitHub", href: "https://github.com/IBjelica" },
];

const Contact = () => (
  <SectionShell title="Contact">
    <div className="contact">
      <div className="contact__bio">
        <p className="contact__lead">
          Web developer with more than seven years of experience in both custom
          web and CMS development. Enthusiastic about debugging and
          problem-solving complex issues, and about developing creative web
          ideas.
        </p>
        <p>
          I specialise in building performant, accessible and visually
          considered web experiences using modern technologies. Based in
          Belgrade, Serbia, and currently available for projects.
        </p>
        <p>
          I’m always open to discussing new projects, creative ideas, or
          opportunities to be part of your vision.
        </p>
      </div>

      <ul className="contact__links">
        {LINKS.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              {...(link.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  </SectionShell>
);

export default Contact;
