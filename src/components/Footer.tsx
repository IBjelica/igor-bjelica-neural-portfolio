const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-content">
          <a href="#" className="footer-logo">
            <span className="logo-text">IB</span>
          </a>
          <p className="footer-text">
            © 2024 Igor Bjelica. Crafted with passion in Belgrade, Serbia.
          </p>
          <div className="footer-links">
            <a href="#about">About</a>
            <a href="#experience">Experience</a>
            <a href="#projects">Projects</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;