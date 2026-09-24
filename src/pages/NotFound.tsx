import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // The boot sequence only releases from the shell, which this page is not
    // part of — without this the 404 renders as black text on a black page.
    document.documentElement.dataset.booted = "true";
    document.title = "Not found — Igor Bjelica";
  }, []);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <main className="notfound">
      <h1 className="notfound__code">404</h1>
      <p className="notfound__text">
        Nothing at <code>{location.pathname}</code>.
      </p>
      <p className="notfound__back">
        <Link to="/">Back to the brain</Link>
      </p>
    </main>
  );
};

export default NotFound;
