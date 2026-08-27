import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const links = [
  { to: "/", label: "The Encounter" },
  { to: "/book", label: "Life Book" },
  { to: "/research", label: "Research Mode" },
] as const;

export function Chrome({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-card/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="group flex items-baseline gap-3">
            <span className="font-display text-2xl leading-none tracking-tight">PEPYS</span>
            <span className="small-caps-label hidden sm:inline">
              {subtitle ?? "Temporal personality reconstruction"}
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: link.to === "/" }}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {children}
      <footer className="mx-auto max-w-6xl px-5 py-10 text-xs leading-relaxed text-muted-foreground">
        PEPYS is a computational reconstruction of autobiographical identity from surviving
        first-person evidence. It does not claim consciousness, sentience, or resurrection. Primary
        corpus: the diary of Samuel Pepys, 1660–1669.
      </footer>
    </div>
  );
}

export function Gauge({ value, label }: { value: number; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="gauge-track h-1.5 w-24">
        <div className="gauge-fill" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="font-mono text-[11px] text-muted-foreground">
        {label ?? `${Math.round(value * 100)}%`}
      </span>
    </div>
  );
}
