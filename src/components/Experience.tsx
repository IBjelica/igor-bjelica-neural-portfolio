const Experience = () => {
  return (
    <section id="experience" className="section experience-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Career Journey</span>
          <h2 className="section-title">Work Experience</h2>
        </div>
        <div className="experience-timeline">
          <article className="experience-card featured">
            <div className="card-glow"></div>
            <div className="card-header">
              <div className="card-icon">🎂</div>
              <div className="card-meta">
                <span className="card-date">Feb 2023 – Present</span>
                <span className="card-badge current">Current</span>
              </div>
            </div>
            <h3 className="card-title">Software Engineer – Website Development</h3>
            <p className="card-company">CAKE.com</p>
            <p className="card-description">
              Led the complete rebuild of the CAKE.com website, introducing a modern tech stack
              (11ty, Tailwind, GSAP) that replaced legacy monolithic systems and improved performance
              by over <strong>20% in both load times and Lighthouse scores</strong>.
            </p>
            <ul className="card-achievements">
              <li>Developed core components from scratch, laying groundwork for internal component library</li>
              <li>Elevated standards for animations, micro-interactions, and UX</li>
              <li>Maintaining all company web properties including Clockify.me, Pumble.com, Plaky.com</li>
            </ul>
          </article>

          <article className="experience-card">
            <div className="card-glow"></div>
            <div className="card-header">
              <div className="card-icon">🔥</div>
              <div className="card-meta">
                <span className="card-date">Mar 2018 – Feb 2023</span>
              </div>
            </div>
            <h3 className="card-title">CEO & Web Developer</h3>
            <p className="card-company">Firefly Web Studio</p>
            <p className="card-description">
              Founded a company to gain comprehensive experience across all aspects of the project life cycle.
            </p>
            <ul className="card-achievements">
              <li>Front-end and Back-end Development</li>
              <li>WordPress development and theme customization</li>
              <li>Software Requirement Specification and Client negotiation</li>
            </ul>
          </article>

          <article className="experience-card">
            <div className="card-glow"></div>
            <div className="card-header">
              <div className="card-icon">🎯</div>
              <div className="card-meta">
                <span className="card-date">Oct 2018 – Feb 2023</span>
              </div>
            </div>
            <h3 className="card-title">Support Agent for WordPress Themes</h3>
            <p className="card-company">Qode Interactive</p>
            <p className="card-description">
              Started as Support Agent and progressively handled increasingly important development-oriented tasks.
            </p>
            <ul className="card-achievements">
              <li>Debugging both front-end and back-end issues</li>
              <li>Theme customization and development</li>
              <li>Client communication and problem resolution</li>
            </ul>
          </article>

          <article className="experience-card">
            <div className="card-glow"></div>
            <div className="card-header">
              <div className="card-icon">⚡</div>
              <div className="card-meta">
                <span className="card-date">Nov 2017 – 2018</span>
              </div>
            </div>
            <h3 className="card-title">Front-end Web Developer</h3>
            <p className="card-company">ET Energie & Handel</p>
            <p className="card-description">
              Varying responsibilities as the only IT employee at the company.
            </p>
            <ul className="card-achievements">
              <li>Website design and development</li>
              <li>Web-shop development for the company</li>
              <li>Server maintenance and infrastructure improvement</li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
};

export default Experience;