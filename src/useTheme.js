import { useEffect, useState } from "react";

const STORAGE_KEY = "discshrink_theme";
const VALID_THEMES = ["original", "dark", "light"];
const DEFAULT_THEME = "original";

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return VALID_THEMES.includes(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME; // localStorage unavailable (private browsing, etc.)
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Non-fatal — the theme still applies for this session, it just
      // won't persist across visits if storage isn't available.
    }
  }, [theme]);

  function setTheme(next) {
    if (VALID_THEMES.includes(next)) setThemeState(next);
  }

  return { theme, setTheme };
}
