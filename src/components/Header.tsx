const Header = () => {
  return (
    <header className="site-header">
      <a href="#" className="logo" aria-label="Igor Bjelica - Home">
        <span className="logo-text">IB</span>
      </a>
      <nav className="main-nav">
        <ul>
          <li><a href="#about">About</a></li>
          <li><a href="#experience">Experience</a></li>
          {/* <li><a href="#projects">Projects</a></li> */}
          <li><a href="#skills">Skills</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>
      <button className="mobile-menu-btn" aria-label="Toggle menu" aria-expanded="false">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </header>
  );
};

export default Header;