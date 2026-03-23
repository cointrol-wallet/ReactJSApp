import * as React from "react";

type Theme = "light" | "dark" | "system";

type ThemeCtx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** Resolved value after applying system preference */
  resolved: "light" | "dark";
};

const Ctx = React.createContext<ThemeCtx>({
  theme: "system",
  setTheme: () => {},
  resolved: "light",
});

const STORAGE_KEY = "cointrol_theme";

function getSystemPref(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === "light" || stored === "dark" || stored === "system") ? stored : "system";
  });

  const [systemPref, setSystemPref] = React.useState<"light" | "dark">(getSystemPref);

  // Listen for OS preference changes
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPref(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolved = theme === "system" ? systemPref : theme;

  // Apply .dark class to <html>
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  function setTheme(t: Theme) {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  }

  return (
    <Ctx.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  return React.useContext(Ctx);
}
