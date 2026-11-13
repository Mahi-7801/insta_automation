import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ isDarkMode: false, toggleTheme: () => {}, theme: "light" });

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem("dm_theme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    try {
      localStorage.setItem("dm_theme", isDarkMode ? "dark" : "light");
    } catch {}
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((v) => !v);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme: isDarkMode ? "dark" : "light" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
