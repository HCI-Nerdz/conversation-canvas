export type DemoTheme = "light" | "dark";

const STORAGE_KEY = "conversation-canvas-theme";

export function readStoredTheme(): DemoTheme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyDemoTheme(theme: DemoTheme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}
