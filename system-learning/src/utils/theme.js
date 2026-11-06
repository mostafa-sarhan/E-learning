// Light/dark theme. The initial theme is applied before first paint by the inline script in
// index.html (same storage key and logic); this module keeps it in sync afterwards.
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "theme";
const media = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set();

function storedTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function apply(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  listeners.forEach((l) => l());
}

export function getTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function setTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (private mode): the choice lasts for this page only.
  }
  apply(theme);
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

// Follow the system setting until the user picks a theme explicitly.
media.addEventListener("change", (e) => {
  if (!storedTheme()) apply(e.matches ? "dark" : "light");
});

export function useTheme() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getTheme
  );
}
