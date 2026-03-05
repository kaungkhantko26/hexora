"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const savedTheme: Theme = localStorage.getItem("theme") === "dark" ? "dark" : "light";
    setTheme(savedTheme);
    applyTheme(savedTheme);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme, isMounted]);

  function onToggle() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="btn btn-secondary btn-mono fixed right-4 bottom-4 z-50 shadow-[var(--shadow-soft)]"
      aria-label="Toggle light and dark theme"
    >
      {isMounted ? (theme === "light" ? "Dark Mode" : "Light Mode") : "Theme"}
    </button>
  );
}
