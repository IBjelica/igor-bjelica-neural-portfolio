/**
 * The whole site. One shell, two states.
 *
 * With no section open the brain is the page. Open one and the brain flies to
 * the top-right corner, shrinks to an icon, and the section fades onto the
 * emptied page. The icon toggles back.
 *
 * Both states live at real URLs, so sections are linkable and the back button
 * returns to the brain rather than leaving the site.
 */

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import BrainNav from "@/components/BrainNav";
import Contact from "@/components/sections/Contact";
import Experiments from "@/components/sections/Experiments";
import Projects from "@/components/sections/Projects";
import Skills from "@/components/sections/Skills";
import Work from "@/components/sections/Work";
import { findLinkBySlug } from "@/data/nav";

const SECTIONS: Record<string, () => JSX.Element> = {
  "/work": Work,
  "/skills": Skills,
  "/projects": Projects,
  "/experiments": Experiments,
  "/contact": Contact,
};

const SITE_TITLE = "Igor Bjelica — Software Engineer, Web Developer";

const Index = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  const link = findLinkBySlug(pathname);
  const parked = Boolean(link);
  const Section = link ? SECTIONS[link.slug] : null;

  // Releases the boot sequence. Deferred to an animation frame so the first
  // paint is guaranteed to be the black screen the markup ships with — set it
  // synchronously and a fast machine can skip straight past the fade.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      document.documentElement.dataset.booted = "true";
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    document.title = link ? `${link.label} — Igor Bjelica` : SITE_TITLE;
  }, [link]);

  // Moving focus into the section is what makes this usable by keyboard: the
  // brain's links are gone from the tab order once parked, so focus would
  // otherwise be stranded on a link that no longer exists.
  useEffect(() => {
    if (!parked) return;
    const heading = contentRef.current?.querySelector<HTMLElement>("h1");
    heading?.focus();
  }, [parked, pathname]);

  // Escape closes a section. Cheap to add, and the first thing anyone tries
  // once they realise the corner icon is a toggle.
  useEffect(() => {
    if (!parked) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") navigate("/");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [parked, navigate]);

  return (
    <main className="shell" data-parked={parked || undefined}>
      <BrainNav parked={parked} onUnpark={() => navigate("/")} />

      {Section && (
        // Keyed by slug so switching sections replays the entry animation
        // instead of swapping text inside an already-settled container.
        <div ref={contentRef} className="shell__content" key={link.slug}>
          <Section />
        </div>
      )}
    </main>
  );
};

export default Index;
