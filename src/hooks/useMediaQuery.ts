import { useEffect, useState } from "react";

/**
 * Tracks a media query and re-renders when it flips.
 *
 * The initial value is read synchronously during the first render rather than
 * defaulted to false, so a phone does not paint the desktop layout for one
 * frame before correcting itself.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}
