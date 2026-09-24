/**
 * Employment history, shown under Work.
 *
 * Lifted verbatim from the previous site’s Experience section — the copy was
 * already right, only its presentation changes. Edit here, not in the
 * component.
 */

export interface Role {
  /** Job title as you want it displayed. */
  title: string;
  /** Employer, or "Independent". */
  company: string;
  /** Free text, e.g. "Feb 2023 – Present". Not parsed. */
  period: string;
  /** Marks the role as ongoing. Rendered as a small note, not a badge. */
  current?: boolean;
  /** One paragraph. What the job was. */
  summary: string;
  /** Two to four lines. What you actually did. */
  highlights: string[];
}

export const roles: Role[] = [
  {
    title: "Software Engineer – Website Development",
    company: "CAKE.com",
    period: "Feb 2023 – Present",
    current: true,
    summary:
      "Led the complete rebuild of the CAKE.com website, introducing a modern tech stack (11ty, Tailwind, GSAP) that replaced legacy monolithic systems and improved performance by over 20% in both load times and Lighthouse scores.",
    highlights: [
      "Developed core components from scratch, laying groundwork for an internal component library",
      "Elevated standards for animations, micro-interactions and UX",
      "Maintaining all company web properties including Clockify.me, Pumble.com and Plaky.com",
    ],
  },
  {
    title: "Founder & Developer",
    company: "Firefly Web Studio",
    period: "Mar 2018 – Present",
    summary:
      "Founded a company to gain comprehensive experience across all aspects of the project life cycle.",
    highlights: [
      "Front-end and back-end development",
      "WordPress development and theme customisation",
      "Software requirement specification and client negotiation",
    ],
  },
  {
    title: "Tier 3 Technical Support Engineer",
    company: "Qode Interactive",
    period: "Oct 2018 – Jan 2023",
    summary:
      "Started as a support agent and progressively handled increasingly important development-oriented tasks.",
    highlights: [
      "Debugging both front-end and back-end issues",
      "Theme customisation and development",
      "Client communication and problem resolution",
    ],
  },
  {
    title: "Front-end Web Developer",
    company: "ET Energie & Handel",
    period: "Nov 2017 – 2018",
    summary:
      "Varying responsibilities as the only IT employee at the company.",
    highlights: [
      "Website design and development",
      "Web-shop development for the company",
      "Server maintenance and infrastructure improvement",
    ],
  },
  {
    title: "Freelance Web Developer",
    company: "Independent",
    period: "Jun 2016 – Jan 2017",
    summary:
      "Delivered responsive websites for early clients including Avers Accounting & Consulting and Studio Mina.",
    highlights: [],
  },
];
