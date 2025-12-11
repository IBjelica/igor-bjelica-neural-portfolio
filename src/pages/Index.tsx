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
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector(
      ".mobile-menu-btn"
    ) as HTMLButtonElement;
    const mainNav = document.querySelector(".main-nav") as HTMLElement;

    if (mobileMenuBtn && mainNav) {
      const toggleMenu = () => {
        const isOpen = mainNav.classList.toggle("open");
        mobileMenuBtn.setAttribute("aria-expanded", isOpen.toString());
        mobileMenuBtn.classList.toggle("open");
      };

      mobileMenuBtn.addEventListener("click", toggleMenu);

      // Close mobile menu on link click
      document.querySelectorAll(".main-nav a").forEach((link) => {
        link.addEventListener("click", () => {
          mainNav.classList.remove("open");
          mobileMenuBtn.classList.remove("open");
          mobileMenuBtn.setAttribute("aria-expanded", "false");
        });
      });
    }

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href")!);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    // Header scroll effect
    const header = document.querySelector(".site-header") as HTMLElement;
    let lastScroll = 0;

    const handleScroll = () => {
      const currentScroll = window.pageYOffset;

      if (currentScroll > 100) {
        header?.classList.add("scrolled");
      } else {
        header?.classList.remove("scrolled");
      }

      lastScroll = currentScroll;
    };

    window.addEventListener("scroll", handleScroll);

    // Contact form handling
    const contactForm = document.getElementById(
      "contact-form"
    ) as HTMLFormElement;
    if (contactForm) {
      contactForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const btn = this.querySelector(
          'button[type="submit"]'
        ) as HTMLButtonElement;
        if (btn) {
          btn.textContent = "Message Sent! ✓";
          btn.classList.add("success");

          setTimeout(() => {
            btn.innerHTML = 'Send Message <span class="arrow">→</span>';
            btn.classList.remove("success");
            this.reset();
          }, 3000);
        }
      });
    }

    // Intersection Observer for animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
        }
      });
    }, observerOptions);

    document.querySelectorAll(".section").forEach((section) => {
      observer.observe(section);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
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
