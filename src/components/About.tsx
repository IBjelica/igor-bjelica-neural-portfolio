const About = () => {
  return (
    <section id="about" className="section about-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Introduction</span>
          <h2 className="section-title">About Me</h2>
        </div>
        <div className="about-grid">
          <div className="about-content">
            <div className="about-logo">
              <span className="logo-text large">IB</span>
            </div>
            <h3 className="about-name">Igor Bjelica</h3>
            <p className="about-role">Web Developer</p>
            <p className="about-bio">
              Web Developer with more than <strong>7 years of experience</strong> in both custom Web and CMS development.
              Enthusiastic about debugging and problem-solving complex issues with developing creative Web ideas.
              I specialize in building performant, accessible, and visually stunning web experiences using modern technologies.
            </p>
            <div className="about-details">
              <div className="detail-item">
                <span className="detail-icon">📍</span>
                <span>Belgrade, Serbia</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">💼</span>
                <span>Available for Projects</span>
              </div>
            </div>
          </div>
          <div className="about-skills">
            <h4 className="skills-heading">Core Technologies</h4>
            <div className="skills-grid">
              <div className="skill-item">
                <span className="skill-icon">⚡</span>
                <span className="skill-name">HTML/CSS</span>
              </div>
              <div className="skill-item">
                <span className="skill-icon">🎨</span>
                <span className="skill-name">Sass</span>
              </div>
              <div className="skill-item">
                <span className="skill-icon">📜</span>
                <span className="skill-name">JavaScript</span>
              </div>
              <div className="skill-item">
                <span className="skill-icon">⚛️</span>
                <span className="skill-name">React</span>
              </div>
              <div className="skill-item">
                <span className="skill-icon">🔷</span>
                <span className="skill-name">Three.js</span>
              </div>
              <div className="skill-item">
                <span className="skill-icon">🎮</span>
                <span className="skill-name">WebGL</span>
              </div>
              <div className="skill-item">
                <span className="skill-icon">🐘</span>
                <span className="skill-name">PHP</span>
              </div>
              <div className="skill-item">
                <span className="skill-icon">🔥</span>
                <span className="skill-name">Laravel</span>
              </div>
              <div className="skill-item">
                <span className="skill-icon">📝</span>
                <span className="skill-name">WordPress</span>
              </div>
              <div className="skill-item">
                <span className="skill-icon">🚀</span>
                <span className="skill-name">Eleventy</span>
              </div>
              <div className="skill-item">
                <span className="skill-icon">✨</span>
                <span className="skill-name">GSAP</span>
              </div>
              <div className="skill-item">
                <span className="skill-icon">🔍</span>
                <span className="skill-name">SEO</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;