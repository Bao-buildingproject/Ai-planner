"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { applyTheme, isDarkNow, subscribeTheme } from "@/lib/theme";

const snapshot = () => (isDarkNow() ? "dark" : "light");
const serverSnapshot = () => "unknown";

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribeTheme, snapshot, serverSnapshot);
  const label = mode === "dark" ? "Chuyển sang nền sáng" : mode === "light" ? "Chuyển sang nền tối" : "Đổi nền sáng hoặc tối";

  async function toggle() {
    const next = isDarkNow() ? "light" : "dark";
    applyTheme(next);
    try {
      await api("/api/me", { method: "PATCH", body: { theme: next } });
    } catch {
      // The change still applies on this page; it is saved again next time.
    }
  }

  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={label} title={label}>
      {mode === "dark" ? <Sun aria-hidden="true" /> : mode === "light" ? <Moon aria-hidden="true" /> : <SunMoon aria-hidden="true" />}
    </button>
  );
}
