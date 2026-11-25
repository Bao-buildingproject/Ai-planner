import type { Theme } from "./validation";

/** Applies a theme to this page right away; the server cookie keeps it for the next visit. */
export function applyTheme(theme: Theme): void {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export function isDarkNow(): boolean {
  const set = document.documentElement.dataset.theme;
  if (set === "dark") return true;
  if (set === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function subscribeTheme(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    media.removeEventListener("change", onChange);
    observer.disconnect();
  };
}
