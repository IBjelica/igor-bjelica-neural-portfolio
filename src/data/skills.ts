/**
 * The skills matrix, shown under Skills.
 *
 * Carried over from the previous site unchanged apart from dropping the
 * colour-coded badge variants — the redesign has no accent colour, so
 * "accent" and "secondary" had nothing left to mean.
 */

export interface SkillGroup {
  title: string;
  items: string[];
}

export const skillGroups: SkillGroup[] = [
  {
    title: "Frontend Development",
    items: [
      "HTML5",
      "CSS3",
      "Sass/SCSS",
      "JavaScript",
      "TypeScript",
      "React",
    ],
  },
  {
    title: "3D & Graphics",
    items: ["Three.js", "GSAP", "Framer Motion", "Canvas API"],
  },
  {
    title: "Backend & CMS",
    items: ["PHP", "Laravel", "WordPress", "Eleventy (11ty)"],
  },
  {
    title: "Tools & Practices",
    items: ["Git", "UI / UX", "SEO", "Debugging", "Responsive Design"],
  },
  {
    title: "Languages",
    items: ["English – Fluent", "Serbian – Native"],
  },
];
