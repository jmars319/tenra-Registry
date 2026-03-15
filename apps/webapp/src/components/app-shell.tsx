"use client";

import { registryModules, registryWebRoutes } from "@registry/config";
import { formatCountLabel } from "@registry/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";

function isActiveRoute(currentPath: string, href: string): boolean {
  return href === registryWebRoutes.dashboard ? currentPath === href : currentPath.startsWith(href);
}

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <p className="eyebrow">JAMARQ</p>
          <h1>Registry</h1>
          <p className="sidebar__copy">
            Stable operational tracking for customers, assets, assignments, and invoices.
          </p>
        </div>

        <nav aria-label="Primary">
          <ul className="nav-list">
            <li>
              <Link
                className={isActiveRoute(pathname, registryWebRoutes.dashboard) ? "nav-link nav-link--active" : "nav-link"}
                href={registryWebRoutes.dashboard}
              >
                Dashboard
              </Link>
            </li>
            {registryModules.map((module) => (
              <li key={module.key}>
                <Link
                  className={isActiveRoute(pathname, module.href) ? "nav-link nav-link--active" : "nav-link"}
                  href={module.href}
                >
                  {module.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar__footnote">
          <span>{formatCountLabel(registryModules.length, "core module")}</span>
          <span>web-first scaffold</span>
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operational Source Of Truth</p>
            <h2>Admin workspace</h2>
          </div>
          <div className="topbar__badge">Initial scaffold</div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
