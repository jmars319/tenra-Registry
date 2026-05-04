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
          <p className="eyebrow">tenra</p>
          <h1>tenra Registry</h1>
          <p className="sidebar__copy">
            Stable operating desk for storage-container rentals, balances, documents, and reports.
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
          <span>rental ops</span>
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Container Rental Source Of Truth</p>
            <h2>Rental desk</h2>
          </div>
          <div className="topbar__badge">Postgres-backed</div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
