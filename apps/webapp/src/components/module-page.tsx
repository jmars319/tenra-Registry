import Link from "next/link";

interface ModulePageProps {
  title: string;
  summary: string;
  statusNote: string;
}

export function ModulePage({ title, summary, statusNote }: ModulePageProps) {
  return (
    <section className="stack">
      <div className="hero-card">
        <p className="eyebrow">Module</p>
        <h1>{title}</h1>
        <p className="hero-card__summary">{summary}</p>
      </div>

      <div className="placeholder-grid">
        <article className="panel-card">
          <h2>Current module state</h2>
          <p>{statusNote}</p>
        </article>
        <article className="panel-card">
          <h2>Expected next work</h2>
          <p>Connect this module to API handlers, persistence, and the rental operations workflow.</p>
        </article>
      </div>

      <div className="panel-card panel-card--soft">
        <h2>Working principle</h2>
        <p>
          tenra Registry should stay general enough for rental operations while remaining grounded in customers, portable
          units, rentals, receivables, documents, and reports.
        </p>
        <Link className="inline-link" href="/">
          Return to dashboard
        </Link>
      </div>
    </section>
  );
}
