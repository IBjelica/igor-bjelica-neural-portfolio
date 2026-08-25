import { useEffect } from "react";
import Header from "../components/Header";
import BrainExplorer from "../components/BrainExplorer";
import About from "../components/About";
import Experience from "../components/Experience";
import Projects from "../components/Projects";
import Skills from "../components/Skills";
import Contact from "../components/Contact";
import Footer from "../components/Footer";

const Index = () => {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    // Register a listener and queue its removal, so nothing outlives the effect.
    const on = (
      el: Element | Window,
      type: string,
      handler: EventListenerOrEventListenerObject
    ) => {
      el.addEventListener(type, handler);
      cleanups.push(() => el.removeEventListener(type, handler));
    };

    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector(
      ".mobile-menu-btn"
    ) as HTMLButtonElement | null;
    const mainNav = document.querySelector(".main-nav") as HTMLElement | null;

    if (mobileMenuBtn && mainNav) {
      on(mobileMenuBtn, "click", () => {
        const isOpen = mainNav.classList.toggle("open");
        mobileMenuBtn.setAttribute("aria-expanded", isOpen.toString());
        mobileMenuBtn.classList.toggle("open");
      });

      // Close mobile menu on link click
      document.querySelectorAll(".main-nav a").forEach((link) => {
        on(link, "click", () => {
          mainNav.classList.remove("open");
          mobileMenuBtn.classList.remove("open");
          mobileMenuBtn.setAttribute("aria-expanded", "false");
        });
      });
    }

    // Header scroll effect
    const header = document.querySelector(".site-header") as HTMLElement | null;

    on(window, "scroll", () => {
      if (window.pageYOffset > 100) {
        header?.classList.add("scrolled");
      } else {
        header?.classList.remove("scrolled");
      }
    });

    // Smooth scroll with header offset
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      on(anchor, "click", (e) => {
        const href = anchor.getAttribute("href");
        if (!href) return;

        e.preventDefault();

        // A bare "#" (the header and footer logos) means "back to top".
        // It must be handled before querySelector, which throws on "#".
        if (href === "#") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        // Only well-formed id references are valid CSS selectors.
        if (!/^#[A-Za-z][\w-]*$/.test(href)) return;

        const target = document.querySelector(href);
        if (!target) return;

        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition =
          target.getBoundingClientRect().top +
          window.pageYOffset -
          headerHeight -
          20; // 20px extra padding

        window.scrollTo({ top: targetPosition, behavior: "smooth" });
      });
    });

    // Intersection Observer for animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("in-view", entry.isIntersecting);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll(".section").forEach((section) => {
      observer.observe(section);
    });
    cleanups.push(() => observer.disconnect());

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return (
    <>
      <Header />
      <BrainExplorer />
      <About />
      <Experience />
      {/* <Projects /> */}
      <Skills />
      <Contact />
      <Footer />
    </>
  );
};

export default Index;
