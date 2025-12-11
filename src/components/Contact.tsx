const Contact = () => {
  return (
    <section id="contact" className="section contact-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Get In Touch</span>
          <h2 className="section-title">Let's Work Together</h2>
        </div>
        <div className="contact-grid">
          <div className="contact-info">
            <p className="contact-intro">
              I'm always open to discussing new projects, creative ideas, or
              opportunities to be part of your vision.
            </p>
          </div>
          <div className="contact-info">
            <div className="contact-details">
              {/* <a href="tel:+381649917378" className="contact-item">
                <span className="contact-icon">📱</span>
                <span className="contact-text">+(381) 64 9917378</span>
              </a> */}
              <a href="mailto:contact@igorbjelica.com" className="contact-item">
                <span className="contact-icon">✉️</span>
                <span className="contact-text">contact@igorbjelica.com</span>
              </a>
              <a
                href="https://linkedin.com/in/igor-bjelica"
                className="contact-item"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-icon">💼</span>
                <span className="contact-text">LinkedIn</span>
              </a>
              <a
                href="https://github.com/IBjelica"
                className="contact-item"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-icon">🐙</span>
                <span className="contact-text">GitHub</span>
              </a>
            </div>
          </div>
          {/* <form className="contact-form" id="contact-form">
            <div className="form-group">
              <label htmlFor="name">Your Name</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Your Email</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="john@example.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Your Message</label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                placeholder="Tell me about your project..."
              ></textarea>
            </div>
            <button type="submit" className="btn btn-primary btn-full">
              Send Message <span className="arrow">→</span>
            </button>
          </form> */}
        </div>
      </div>
    </section>
  );
};

export default Contact;
