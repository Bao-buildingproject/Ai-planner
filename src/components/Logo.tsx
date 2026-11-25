/** Ai Planner mark: a notebook page with two binder rings and a highlighter tick. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 34 34" aria-hidden="true" focusable="false">
      <rect x="1" y="4" width="32" height="29" rx="9" fill="var(--ink)" />
      <path d="M10.5 1.8v5.4M23.5 1.8v5.4" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M9.6 19.2c1.9 1.2 3.4 2.9 4.6 5 2.5-5.4 6.1-9.6 10.6-12.9"
        fill="none"
        stroke="var(--hl)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
