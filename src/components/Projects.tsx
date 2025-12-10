const Projects = () => {
  return (
    <section id="projects" className="section projects-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Portfolio</span>
          <h2 className="section-title">Featured Projects</h2>
        </div>
        <div className="projects-grid">
          <article className="project-card featured">
            <div className="project-glow"></div>
            <div className="project-content">
              <div className="project-header">
                <span className="project-badge">Featured</span>
                <h3 className="project-title">igorbjelica.com</h3>
              </div>
              <p className="project-description">
                My personal portfolio showcasing multiple projects and creative web experiments.
                Features custom animations, 3D graphics, and modern design patterns.
              </p>
              <div className="project-tech">
                <span className="tech-tag">Three.js</span>
                <span className="tech-tag">WebGL</span>
                <span className="tech-tag">GSAP</span>
                <span className="tech-tag">React</span>
              </div>
              <a href="https://igorbjelica.com" target="_blank" rel="noopener noreferrer" className="project-link">
                Visit Site <span className="arrow">→</span>
              </a>
            </div>
          </article>

          <article className="project-card">
            <div className="project-glow"></div>
            <div className="project-content">
              <div className="project-header">
                <span className="project-badge">Enterprise</span>
                <h3 className="project-title">CAKE.com Ecosystem</h3>
              </div>
              <p className="project-description">
                Complete rebuild of CAKE.com and maintenance of Clockify.me, Pumble.com, Plaky.com,
                and their help, learn, and blog platforms.
              </p>
              <div className="project-tech">
                <span className="tech-tag">11ty</span>
                <span className="tech-tag">Tailwind</span>
                <span className="tech-tag">GSAP</span>
              </div>
            </div>
          </article>

          <article className="project-card">
            <div className="project-glow"></div>
            <div className="project-content">
              <div className="project-header">
                <span className="project-badge">3D</span>
                <h3 className="project-title">Brain Explorer</h3>
              </div>
              <p className="project-description">
                Interactive 3D brain visualization with region-based exploration.
                Built with Three.js and WebGL for educational purposes.
              </p>
              <div className="project-tech">
                <span className="tech-tag">Three.js</span>
                <span className="tech-tag">WebGL</span>
                <span className="tech-tag">GLTF</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export default Projects;