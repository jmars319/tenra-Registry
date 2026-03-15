import { REGISTRY_APP_NAME, registryModules } from "@registry/config";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <section className="stack">
      <div className="hero-card">
        <p className="eyebrow">Primary Surface</p>
        <h1>{REGISTRY_APP_NAME}</h1>
        <p className="hero-card__summary">
          Initial web-first scaffold for a stable operational system around customers, assets, assignments, and future
          invoicing.
        </p>
      </div>

      <div className="module-grid">
        {registryModules.map((module) => (
          <Link className="module-card" href={module.href} key={module.key}>
            <h3>{module.title}</h3>
            <p>{module.description}</p>
            <span>Open module</span>
          </Link>
        ))}
      </div>

      <section className="panel-card panel-card--soft">
        <h2>Current scaffold state</h2>
        <p>
          The web app establishes the admin layout, module routes, and shared package wiring. Persistence and real
          operator workflows come next.
        </p>
      </section>
    </section>
  );
}
