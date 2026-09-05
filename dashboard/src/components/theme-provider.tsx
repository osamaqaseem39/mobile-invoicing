"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "theme";

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {}
  return "system";
}

function applyResolvedTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  // Re-applies after React's dev Strict Mode remount clears the class the
  // inline head script set before hydration; a no-op in production.
  useLayoutEffect(() => {
    const initial = readStoredTheme();
    const resolved = initial === "system" ? getSystemTheme() : initial;
    // localStorage and matchMedia only exist on the client, so the stored theme
    // cannot be read during render without breaking hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(initial);
    setResolvedTheme(resolved);
    applyResolvedTheme(resolved);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      applyResolvedTheme(resolved);
    };
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    const resolved = next === "system" ? getSystemTheme() : next;
    setThemeState(next);
    setResolvedTheme(resolved);
    applyResolvedTheme(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export const THEME_STORAGE_KEY = STORAGE_KEY;
