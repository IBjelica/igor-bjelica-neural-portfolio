import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { NAV_LINKS } from "./data/nav";

const App = () => (
  // The Pages preview lives under a repository sub-path, so the router has to
  // know where the app starts. Vite reports "/" for the production build.
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Routes>
      {/* Every section renders the same shell. The shell reads the path and
          decides whether the brain is the page or is parked in the corner
          with content beside it — so navigating between sections never
          unmounts the drawing, and the flight animation survives. */}
      <Route path="/" element={<Index />} />
      {NAV_LINKS.map((link) => (
        <Route key={link.slug} path={link.slug} element={<Index />} />
      ))}
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
