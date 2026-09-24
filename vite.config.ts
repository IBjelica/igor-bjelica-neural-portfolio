import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/**
 * The GitHub Pages build is a preview, served from a repository sub-path —
 * https://ibjelica.github.io/igor-bjelica-neural-portfolio/ — while the
 * production build is served from the root of igorbjelica.com. The only thing
 * that differs is `base`, so it is switched by an env var the Pages workflow
 * sets rather than by a separate config.
 */
const PAGES_PREVIEW = process.env.GITHUB_PAGES === "true";
const PAGES_BASE = "/igor-bjelica-neural-portfolio/";

/**
 * Keeps the preview out of search results.
 *
 * It is a public, byte-identical copy of the real site. Left indexable it
 * competes with igorbjelica.com for its own content, and the canonical and
 * og:url tags in index.html still point at the real domain, so the preview
 * would be indexed as a duplicate of a page it is not.
 */
function noindexPreview() {
  return {
    name: "noindex-preview",
    transformIndexHtml(html: string) {
      if (!PAGES_PREVIEW) return html;
      return html.replace(
        "</head>",
        '    <meta name="robots" content="noindex, nofollow" />\n  </head>'
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: PAGES_PREVIEW ? PAGES_BASE : "/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), noindexPreview()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
}));
