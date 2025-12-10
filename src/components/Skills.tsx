const Skills = () => {
  return (
    <section id="skills" className="section skills-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Expertise</span>
          <h2 className="section-title">Skills Matrix</h2>
        </div>
        <div className="skills-matrix">
          <div className="skill-category">
            <h4 className="category-title">Frontend Development</h4>
            <div className="skill-badges">
              <span className="badge">HTML5</span>
              <span className="badge">CSS3</span>
              <span className="badge">Sass/SCSS</span>
              <span className="badge">JavaScript</span>
              <span className="badge">TypeScript</span>
              <span className="badge">React</span>
            </div>
          </div>
          <div className="skill-category">
            <h4 className="category-title">3D & Graphics</h4>
            <div className="skill-badges">
              <span className="badge accent">Three.js</span>
              <span className="badge accent">WebGL</span>
              <span className="badge accent">GSAP</span>
              <span className="badge accent">Canvas API</span>
            </div>
          </div>
          <div className="skill-category">
            <h4 className="category-title">Backend & CMS</h4>
            <div className="skill-badges">
              <span className="badge">PHP</span>
              <span className="badge">Laravel</span>
              <span className="badge">WordPress</span>
              <span className="badge">Eleventy (11ty)</span>
            </div>
          </div>
          <div className="skill-category">
            <h4 className="category-title">Tools & Practices</h4>
            <div className="skill-badges">
              <span className="badge secondary">Git</span>
              <span className="badge secondary">SEO</span>
              <span className="badge secondary">Debugging</span>
              <span className="badge secondary">Responsive Design</span>
            </div>
          </div>
          <div className="skill-category">
            <h4 className="category-title">Languages</h4>
            <div className="skill-badges">
              <span className="badge language">English – Fluent</span>
              <span className="badge language">Serbian – Native</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Skills;