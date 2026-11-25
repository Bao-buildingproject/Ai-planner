import Link from "next/link";
import { LogoMark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader({ name, current }: { name: string; current: "week" | "account" }) {
  const initial = (Array.from(name.trim())[0] ?? "?").toUpperCase();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/week" className="brand" aria-current={current === "week" ? "page" : undefined}>
          <LogoMark className="brand-mark" />
          <span>Ai Planner</span>
        </Link>
        <ThemeToggle />
        <Link
          href="/account"
          className="account-chip"
          aria-current={current === "account" ? "page" : undefined}
          aria-label={`Tài khoản: ${name}`}
        >
          <span className="avatar" aria-hidden="true">
            {initial}
          </span>
          <span className="name">{name}</span>
        </Link>
      </div>
    </header>
  );
}
