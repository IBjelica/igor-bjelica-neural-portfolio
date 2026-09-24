/**
 * Project data for the Work section.
 *
 * This is the single file to edit when adding or changing a case study.
 * Nothing here is inferred at runtime — every field below is rendered
 * literally, so what you write is what the site shows.
 *
 * Screenshots live in `public/work/` and were captured at 1440x900.
 *
 * Copy describes the brief and the build. It deliberately claims no
 * commercial outcomes — the work is shown to be judged on craft.
 */

/**
 * An image with its intrinsic dimensions.
 *
 * `width` and `height` are the image's real pixel dimensions. They are
 * rendered as HTML attributes so the browser can reserve the correct space
 * before the file loads — without them the page shifts as images arrive.
 * They do not control the displayed size; CSS does that.
 */
export interface ProjectImage {
  /** Path under `public/`, e.g. "/work/cake-com-thumb.jpg" */
  src: string;
  /** Describe the content for screen readers. Not "screenshot of website". */
  alt: string;
  /** Intrinsic width in pixels. */
  width: number;
  /** Intrinsic height in pixels. */
  height: number;
}

export interface Project {
  /** URL-safe id. Must be unique. Used as the React key and modal anchor. */
  slug: string;

  /** Project name as you want it displayed, e.g. "CAKE.com". */
  title: string;

  /** Client, employer, or context, e.g. "CAKE.com" or "Personal project". */
  client: string;

  /** One line, shown on the card. Aim for under ~100 characters. */
  summary: string;

  /**
   * Short list for the card's chips. Keep to 3–5 — more than that wraps
   * badly at mobile widths. Use `stack` for the full list.
   */
  tech: string[];

  /** Card thumbnail. A 16:10 crop reads best in the grid. */
  thumbnail: ProjectImage;

  /** Detail view: what problem the work solved. A short paragraph. */
  problem: string;

  /** Detail view: what you specifically did. A short paragraph. */
  role: string;

  /** Detail view: the full technology list. Rendered as chips. */
  stack: string[];

  /** Detail view: 2–4 images. Fewer than 2 looks thin; more than 4 drags. */
  images: ProjectImage[];

  /** Live URL, or `null` if the work is not publicly reachable. */
  liveUrl: string | null;

  /**
   * Highlights one card with a lighter background and an accent border.
   * It does NOT widen the card — spanning two columns was tried and left a
   * hole in the grid (see the `.project-card.featured` note in styles.css).
   * Set this on at most one project.
   */
  featured?: boolean;
}

/** Every capture in `public/work/` shares these dimensions. */
const SHOT = { width: 1440, height: 900 } as const;

export const projects: Project[] = [
  {
    slug: "cake-com",
    title: "CAKE.com",
    client: "CAKE.com",
    summary:
      "Brand site for a three-product suite, with a full motion layer held inside a performance budget.",
    tech: ["Eleventy", "Nunjucks", "Vite", "Tailwind CSS", "GSAP"],
    thumbnail: {
      src: "/work/cake-com-thumb.jpg",
      alt: "CAKE.com homepage: the headline 'cake.com productivity suite' over dark blue, framed by floating product interface panels, above a row of customer logos.",
      ...SHOT,
    },
    problem:
      "CAKE.com needed a brand site covering three separate products — Clockify, Pumble and Plaky — that could carry ambitious motion without paying for it in load time, and that gave the other product properties a shared set of patterns to build from rather than each reinventing its own.",
    role:
      "I owned the site end to end: stack selection, architecture, implementation and release. I built the entire animation and interaction layer in GSAP, and defined the design system, reusable component patterns and frontend standards that were adopted across the company's web properties. I wrote a custom Eleventy image shortcode that handles responsive sizing and inlines SVG assets as markup for performance — it is async, which broke when called from a synchronous Nunjucks macro, and I resolved that with Nunjucks' setAsync tag. I also added Vite to the Eleventy setup for HMR and asset handling, which Eleventy does not require but which made daily development considerably faster. Page performance scores improved by roughly 20%.",
    stack: [
      "Eleventy",
      "Nunjucks",
      "Vite",
      "Tailwind CSS",
      "GSAP",
      "JavaScript",
    ],
    images: [
      {
        src: "/work/cake-com-01.png",
        alt: "The 'Meet our tools' section showing Clockify, with a timekeeping panel listing tracked hours beside a tabbed list of features.",
        ...SHOT,
      },
      {
        src: "/work/cake-com-03.png",
        alt: "A dark panel reading 'Organize your entire workflow in one place', above a section explaining how Clockify, Pumble and Plaky combine into one suite.",
        ...SHOT,
      },
    ],
    liveUrl: "https://cake.com",
    featured: true,
  },
  {
    slug: "avers",
    title: "Avers Consulting & Accounting",
    client: "Avers Consulting & Accounting",
    summary:
      "Bilingual marketing site for a Belgrade financial consultancy, built solo in Next.js.",
    tech: ["Next.js", "TypeScript", "Tailwind CSS", "i18next"],
    thumbnail: {
      src: "/work/avers-thumb.jpg",
      alt: "Avers homepage: the Serbian headline 'Korak ka progresu' set in a high-contrast display serif over a glass office facade at dusk.",
      ...SHOT,
    },
    problem:
      "Avers is a financial consulting and accounting firm in Belgrade. The brief was client acquisition: a site that would present the firm credibly to prospective business clients, and carry that in Serbian and English from the same codebase rather than as two separate builds.",
    role:
      "I designed and built the site on my own. It runs on the Next.js App Router with TypeScript, with a design-token file driving type and colour rather than ad-hoc values, and full Serbian and English localisation through i18next. The contact form posts to a server-side route I wrote that verifies a Cloudflare Turnstile token before sending through Resend, so the API keys never reach the browser and the form degrades gracefully if Cloudflare is unreachable.",
    stack: [
      "Next.js 14",
      "TypeScript",
      "Tailwind CSS",
      "i18next",
      "React Hook Form",
      "Zod",
      "Resend",
      "Cloudflare Turnstile",
      "Vercel",
    ],
    images: [
      {
        src: "/work/avers-01.png",
        alt: "A slate-blue section with the gradient display headline 'Zajedno kreirajmo finansijski uspeh' beside three columns of justified body copy, leading into the services heading.",
        ...SHOT,
      },
      {
        src: "/work/avers-02.png",
        alt: "A stack of collapsible service panels in slate blue, above a client testimonials section with named cards.",
        ...SHOT,
      },
    ],
    liveUrl: "https://aversacc.com",
  },
  {
    slug: "ntsh",
    title: "NTSH",
    client: "Self-initiated",
    summary:
      "My own studio front — a minimal, typography-led site where the page itself is the pitch.",
    tech: ["React", "Vite", "Framer Motion", "SCSS"],
    thumbnail: {
      src: "/work/ntsh-thumb.png",
      alt: "A black screen with 'NOTHING TO SEE HERE' set large in white across two lines, a blue shape bleeding in from the top-left corner.",
      ...SHOT,
    },
    problem:
      "I built NTSH as a studio front to go after client work. The constraint I set myself was that the site had to be the pitch: almost nothing on the page, so whatever is there — the type, the timing, the restraint — has to carry it on its own.",
    role:
      "Built solo, design and code. The motion is composed from per-letter and per-word components that animate type in independently rather than fading whole blocks, so headlines and body copy resolve at different rates. There is a custom cursor trailer, the display face is a custom typeface, and the styles are organised as SCSS partials over a shared variables file.",
    stack: ["React", "Vite", "Framer Motion", "SCSS", "Custom typography"],
    images: [
      {
        src: "/work/ntsh-01.png",
        alt: "Large black type reading 'We embrace the art of the unseen' on white, with the studio description below it mid-way through a fade-in.",
        ...SHOT,
      },
      {
        src: "/work/ntsh-02.png",
        alt: "The same headline with the studio description fully revealed as a justified paragraph, above oversized Email, LinkedIn and Instagram links.",
        ...SHOT,
      },
    ],
    // Hosted on GitHub Pages under /ntsh/. If ntsh.studio is ever revived on
    // HawkHost, point this at the domain instead — the Vite config builds for
    // either target (see BASE_PATH in that repo's vite.config.js).
    liveUrl: "https://ibjelica.github.io/ntsh/",
  },
  {
    slug: "portfolio",
    title: "igorbjelica.com",
    client: "Personal project",
    summary:
      "This site. An anatomical drawing of a brain, traced from a 3D model, that works as the navigation.",
    tech: ["React", "TypeScript", "SVG", "Vite"],
    thumbnail: {
      src: "/work/portfolio-thumb.jpg",
      alt: "A brain drawn in thin black lines on off-white paper, with hairlines running out to single-word labels.",
      ...SHOT,
    },
    problem:
      "A portfolio that reads like a CV gives a studio nothing to judge craft from. I wanted the first thing a visitor meets to be something built rather than described — and I wanted the navigation itself to be the thing, not a menu bar above it.",
    role:
      "The hero is a brain drawn as an anatomical plate, with leader lines running from points on the anatomy out to five words that are the entire navigation. Five more words sit on the same diagram as notes and do nothing, which is the joke. Clicking a word flies the drawing into the top-right corner, where it shrinks into an icon that toggles it back. The drawing is not hand-authored: a build-time script traces a GLTF brain model — orthographic projection, silhouette from a rasterized coverage grid, sulci from crease and silhouette edges with z-buffer hidden-line removal — and emits the SVG plus the anchor coordinates. The brain reacts to the pointer by chasing it with two copies of the cursor position lerped at different rates, driving the folds by the difference between them so they trail the outline and settle when it stops; folds near the cursor darken on a distance falloff. An earlier version of this site rendered the same model live in Three.js with bloom and a particle field. Tracing it instead took WebGL out of the bundle entirely.",
    stack: [
      "React",
      "TypeScript",
      "SVG",
      "Vite",
      "@gltf-transform (build-time tracing)",
    ],
    images: [
      {
        src: "/work/portfolio-01.png",
        alt: "The Work section on off-white paper: employment history set as a two-column list, with the brain reduced to a small outline icon in the top-right corner.",
        ...SHOT,
      },
      {
        src: "/work/portfolio-02.jpg",
        alt: "The full hero: a brain in thin black line art, with Work, Skills, Projects, Experiments and Contact hung off hairlines to the left and Basketball, Family, Music, Chess and Anime to the right.",
        ...SHOT,
      },
    ],
    liveUrl: "https://igorbjelica.com",
  },
];
